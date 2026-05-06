import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

// ─── Types ────────────────────────────────────────────────────────────────────

type Fulfillment = {
  id: string;
  delivered_at: string | null;
  canceled_at: string | null;
};

// ─── Step 1: Resolve order_id from fulfillment_id ────────────────────────────

const resolveOrderFromFulfillmentStep = createStep(
  'resolve-order-from-fulfillment-step',
  async ({ fulfillment_id }: { fulfillment_id: string }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const {
      data: [fulfillment],
    } = await query.graph({
      entity: 'fulfillment',
      fields: ['id', 'order.id'],
      filters: { id: fulfillment_id },
    });

    if (!fulfillment?.order?.id) {
      throw new Error(`[AutoComplete] Fulfillment ${fulfillment_id} has no linked order`);
    }

    return new StepResponse({ order_id: fulfillment.order.id as string });
  },
);

// ─── Step 2: Check fulfillments and complete the order if all are delivered ───
// Combines the check + action in one step to avoid workflow conditional branching.

const completeOrderIfAllDeliveredStep = createStep(
  'complete-order-if-all-delivered-step',
  async ({ order_id }: { order_id: string }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const {
      data: [order],
    } = await query.graph({
      entity: 'order',
      fields: ['id', 'status', 'fulfillments.id', 'fulfillments.delivered_at', 'fulfillments.canceled_at'],
      filters: { id: order_id },
    });

    if (!order) {
      throw new Error(`[AutoComplete] Order ${order_id} not found`);
    }

    const fulfillments: Fulfillment[] = order.fulfillments ?? [];

    // Already completed — nothing to do
    if (order.status === 'completed') {
      return new StepResponse({ completed: false, reason: 'already_completed' });
    }

    // No fulfillments at all — nothing to complete
    if (fulfillments.length === 0) {
      return new StepResponse({ completed: false, reason: 'no_fulfillments' });
    }

    const active = fulfillments.filter((f) => !f.canceled_at);

    // All fulfillments were canceled — skip
    if (active.length === 0) {
      return new StepResponse({ completed: false, reason: 'all_canceled' });
    }

    const allDelivered = active.every((f) => Boolean(f.delivered_at));

    if (!allDelivered) {
      return new StepResponse({ completed: false, reason: 'pending_deliveries' });
    }

    // All active fulfillments are delivered — complete the order
    const orderModuleService = container.resolve(Modules.ORDER);
    await orderModuleService.completeOrder([order_id]);

    return new StepResponse({ completed: true, reason: 'all_delivered' });
  },
);

// ─── Workflow ─────────────────────────────────────────────────────────────────

type Input = {
  fulfillment_id: string;
};

export const completeOrderWhenAllDeliveredWorkflow = createWorkflow(
  'complete-order-when-all-delivered',
  function (input: Input) {
    const { order_id } = resolveOrderFromFulfillmentStep({ fulfillment_id: input.fulfillment_id });
    const result = completeOrderIfAllDeliveredStep({ order_id });

    return new WorkflowResponse(result);
  },
);
