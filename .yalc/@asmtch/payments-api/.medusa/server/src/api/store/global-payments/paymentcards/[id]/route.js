"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = DELETE;
exports.PUT = PUT;
const utils_1 = require("@medusajs/framework/utils");
const types_1 = require("../../../../../types");
/**
 * DELETE /store/global-payments/paymentcards/:id
 */
async function DELETE(req, res) {
    // Recuperamos customerId, ya sea de la sesión o del body
    let customerId;
    // 1️- Verificar sesión
    if (req.auth_context) {
        const { actor_id, actor_type } = req.auth_context;
        if (actor_type !== "customer") {
            throw new utils_1.MedusaError(utils_1.MedusaError.Types.UNAUTHORIZED, "Not a customer");
        }
        customerId = actor_id;
    }
    else if (req.body?.customerId) {
        customerId = req.body.customerId;
    }
    if (!customerId) {
        return res.status(401).json({
            message: "Customer not authenticated",
        });
    }
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            message: "Payment card ID is required",
        });
    }
    try {
        const paymentsService = req.scope.resolve("payment_payments_api");
        const card = await paymentsService.deletePaymentCard(types_1.PaymentProviderKeys.GLOBAL_PAYMENTS, id, customerId);
        return res.status(201).json({ card });
    }
    catch (err) {
        console.error("Error deleting payment card:", err);
        return res.status(500).json({
            message: err.message || "Failed to delete payment card",
        });
    }
}
/**
 * PUT /store/global-payments/paymentcards/:id
 */
async function PUT(req, res) {
    // Recuperamos customerId, ya sea de la sesión o del body
    let customerId;
    // 1️- Verificar sesión
    if (req.auth_context) {
        const { actor_id, actor_type } = req.auth_context;
        if (actor_type !== "customer") {
            throw new utils_1.MedusaError(utils_1.MedusaError.Types.UNAUTHORIZED, "Not a customer");
        }
        customerId = actor_id;
    }
    if (!customerId) {
        return res.status(401).json({
            message: "Customer not authenticated",
        });
    }
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            message: "Payment card ID is required",
        });
    }
    const { is_active } = req.body || {};
    if (typeof is_active === "undefined") {
        return res.status(400).json({
            message: "Nothing to update",
        });
    }
    try {
        const paymentsService = req.scope.resolve("payment_payments_api");
        const card = await paymentsService.updatePaymentCard(types_1.PaymentProviderKeys.GLOBAL_PAYMENTS, id, customerId, { is_active });
        return res.status(201).json({ card });
    }
    catch (err) {
        console.error("Error updating payment card:", err);
        return res.status(500).json({
            message: err.message || "Failed to update payment card",
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3N0b3JlL2dsb2JhbC1wYXltZW50cy9wYXltZW50Y2FyZHMvW2lkXS9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQWVBLHdCQXVEQztBQUtELGtCQStEQztBQXpJRCxxREFBdUQ7QUFDdkQsZ0RBQTBEO0FBVTFEOztHQUVHO0FBQ0ksS0FBSyxVQUFVLE1BQU0sQ0FDeEIsR0FBMkQsRUFDM0QsR0FBbUI7SUFHckIseURBQXlEO0lBQ3pELElBQUksVUFBOEIsQ0FBQTtJQUVsQyx1QkFBdUI7SUFDdkIsSUFBRyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDcEIsTUFBTSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFBO1FBQ2pELElBQUksVUFBVSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQzlCLE1BQU0sSUFBSSxtQkFBVyxDQUNuQixtQkFBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQzlCLGdCQUFnQixDQUNqQixDQUFBO1FBQ0gsQ0FBQztRQUVELFVBQVUsR0FBRyxRQUFRLENBQUE7SUFDdkIsQ0FBQztTQUFNLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQztRQUNoQyxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFvQixDQUFBO0lBQzVDLENBQUM7SUFFRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDaEIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsNEJBQTRCO1NBQ3RDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFRCxNQUFNLEVBQUUsRUFBRSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQXdCLENBQUE7SUFFM0MsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ1IsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsNkJBQTZCO1NBQ3ZDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSCxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FDdkMsc0JBQXNCLENBQ2hCLENBQUE7UUFFUixNQUFNLElBQUksR0FBRyxNQUFNLGVBQWUsQ0FBQyxpQkFBaUIsQ0FDbEQsMkJBQW1CLENBQUMsZUFBZSxFQUNuQyxFQUFFLEVBQ0YsVUFBVSxDQUFDLENBQUE7UUFFYixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztRQUNsQixPQUFPLENBQUMsS0FBSyxDQUFDLDhCQUE4QixFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBRWxELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPLElBQUksK0JBQStCO1NBQ3hELENBQUMsQ0FBQTtJQUNKLENBQUM7QUFDSCxDQUFDO0FBRUQ7O0dBRUc7QUFDSSxLQUFLLFVBQVUsR0FBRyxDQUN2QixHQUEyRCxFQUMzRCxHQUFtQjtJQUduQix5REFBeUQ7SUFDekQsSUFBSSxVQUE4QixDQUFBO0lBRWxDLHVCQUF1QjtJQUN2QixJQUFHLEdBQUcsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNwQixNQUFNLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUE7UUFDakQsSUFBSSxVQUFVLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDOUIsTUFBTSxJQUFJLG1CQUFXLENBQ25CLG1CQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFDOUIsZ0JBQWdCLENBQ2pCLENBQUE7UUFDSCxDQUFDO1FBRUQsVUFBVSxHQUFHLFFBQVEsQ0FBQTtJQUN2QixDQUFDO0lBRUQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLDRCQUE0QjtTQUN0QyxDQUFDLENBQUE7SUFDSixDQUFDO0lBRUQsTUFBTSxFQUFFLEVBQUUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUF3QixDQUFBO0lBRTNDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNSLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLDZCQUE2QjtTQUN2QyxDQUFDLENBQUE7SUFDSixDQUFDO0lBRUQsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFBO0lBRXBDLElBQUksT0FBTyxTQUFTLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDckMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsbUJBQW1CO1NBQzdCLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSCxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FDdkMsc0JBQXNCLENBQ2hCLENBQUE7UUFFUixNQUFNLElBQUksR0FBRyxNQUFNLGVBQWUsQ0FBQyxpQkFBaUIsQ0FDbEQsMkJBQW1CLENBQUMsZUFBZSxFQUNuQyxFQUFFLEVBQ0YsVUFBVSxFQUNWLEVBQUUsU0FBUyxFQUFFLENBQ2QsQ0FBQTtRQUVELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO1FBQ2xCLE9BQU8sQ0FBQyxLQUFLLENBQUMsOEJBQThCLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFbEQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU8sSUFBSSwrQkFBK0I7U0FDeEQsQ0FBQyxDQUFBO0lBQ0osQ0FBQztBQUNILENBQUMifQ==