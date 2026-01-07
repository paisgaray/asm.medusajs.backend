import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { Modules } from '@medusajs/framework/utils';

export async function PATCH(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  try {
    const { id } = req.params;
    const salesChannelService = req.scope.resolve(Modules.SALES_CHANNEL);

    let salesChannel;
    try {
      if (typeof salesChannelService.retrieveSalesChannel === 'function') {
        salesChannel = await salesChannelService.retrieveSalesChannel(id);
      } else {
        const channels = await salesChannelService.listSalesChannels({ id });
        if (!channels?.length) {
          res.status(404).json({ message: `Sales channel with id ${id} not found` });
          return;
        }
        salesChannel = channels[0];
      }
    } catch {
      res.status(404).json({ message: `Sales channel with id ${id} not found` });
      return;
    }

    const body = req.body as { metadata?: Record<string, unknown> };
    if (body.metadata) {
      const updatedMetadata = { ...(salesChannel.metadata || {}), ...body.metadata };

      if (typeof salesChannelService.upsertSalesChannels === 'function') {
        await salesChannelService.upsertSalesChannels([{ id, metadata: updatedMetadata }]);
      } else if (typeof salesChannelService.updateSalesChannels === 'function') {
        await salesChannelService.updateSalesChannels(id, { metadata: updatedMetadata });
      } else {
        throw new Error('No update method available');
      }
    }

    let updated;
    if (typeof salesChannelService.retrieveSalesChannel === 'function') {
      updated = await salesChannelService.retrieveSalesChannel(id);
    } else {
      const channels = await salesChannelService.listSalesChannels({ id });
      updated = channels[0];
    }

    res.json({ sales_channel: updated });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating sales channel',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
