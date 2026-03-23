"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsTokenizations = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.PaymentsTokenizations = utils_1.model.define("payment_payments_tokenizations", {
    id: utils_1.model.id({ prefix: "ptok" }).primaryKey(),
    customer_id: utils_1.model.text().index(),
    provider: utils_1.model.text(),
    card_token: utils_1.model.text(),
    brand: utils_1.model.text(),
    exp_month: utils_1.model.text(),
    exp_year: utils_1.model.text(),
    last4: utils_1.model.text(),
    is_active: utils_1.model.boolean().default(false),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF5bWVudHMtdG9rZW5pemF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3BheW1lbnRzL21vZGVscy9wYXltZW50cy10b2tlbml6YXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFEQUFpRDtBQUVwQyxRQUFBLHFCQUFxQixHQUFHLGFBQUssQ0FBQyxNQUFNLENBQUMsZ0NBQWdDLEVBQUU7SUFDbEYsRUFBRSxFQUFFLGFBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUU7SUFDN0MsV0FBVyxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUU7SUFDakMsUUFBUSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDdEIsVUFBVSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDeEIsS0FBSyxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDbkIsU0FBUyxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDdkIsUUFBUSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDdEIsS0FBSyxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDbkIsU0FBUyxFQUFFLGFBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0NBQzFDLENBQUMsQ0FBQSJ9