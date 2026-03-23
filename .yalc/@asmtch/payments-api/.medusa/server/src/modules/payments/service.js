"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
const types_1 = require("../../types");
const services_1 = require("../../services");
class PaymentsModuleService extends (0, utils_1.MedusaService)({}) {
    constructor(container, options) {
        super(container);
        this.logger_ = container.logger;
        /**
         * Registrar providers disponibles
         */
        this.providers_ = {
            [types_1.PaymentProviderKeys.GLOBAL_PAYMENTS]: new services_1.GlobalPaymentsService(container, options.globalpayments),
        };
    }
    async tokenizeCard(provider, card, context) {
        const service = this.providers_[provider];
        if (!service) {
            throw new Error(`Payment provider ${provider} not found`);
        }
        return service.tokenizeCard(card, context);
    }
    async listPaymentCards(provider, customerId, isActive) {
        const service = this.providers_[provider];
        if (!service) {
            throw new Error(`Payment provider ${provider} not found`);
        }
        // delega al base
        return service.listPaymentCards(provider, customerId, isActive);
    }
    async createPaymentCard(provider, args) {
        const service = this.providers_[provider];
        if (!service) {
            throw new Error(`Payment provider ${provider} not found`);
        }
        // delega al base
        return service.createPaymentCard(provider, args);
    }
    async updatePaymentCard(provider, cardId, customerId, data) {
        const service = this.providers_[provider];
        if (!service) {
            throw new Error(`Payment provider ${provider} not found`);
        }
        // delega al base
        return service.updatePaymentCard(provider, cardId, customerId, data);
    }
    async deletePaymentCard(provider, cardId, customerId) {
        const service = this.providers_[provider];
        if (!service) {
            throw new Error(`Payment provider ${provider} not found`);
        }
        // delega al base
        return service.deletePaymentCard(provider, cardId, customerId);
    }
}
exports.default = PaymentsModuleService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3BheW1lbnRzL3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxREFBeUQ7QUFHekQsdUNBQWlEO0FBRWpELDZDQUFzRDtBQW1CdEQsTUFBTSxxQkFBc0IsU0FBUSxJQUFBLHFCQUFhLEVBQUMsRUFBRSxDQUFDO0lBSW5ELFlBQVksU0FBUyxFQUFFLE9BQU87UUFDNUIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRWhCLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQTtRQUUvQjs7V0FFRztRQUNILElBQUksQ0FBQyxVQUFVLEdBQUc7WUFDaEIsQ0FBQywyQkFBbUIsQ0FBQyxlQUFlLENBQUMsRUFBRSxJQUFJLGdDQUFxQixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsY0FBYyxDQUFDO1NBQ3BHLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FDaEIsUUFBZ0IsRUFDaEIsSUFBZSxFQUNmLE9BQTZCO1FBRTdCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFekMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsUUFBUSxZQUFZLENBQUMsQ0FBQTtRQUMzRCxDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsS0FBSyxDQUFDLGdCQUFnQixDQUNwQixRQUFnQixFQUNoQixVQUFrQixFQUNsQixRQUFrQjtRQUVsQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRXpDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLFFBQVEsWUFBWSxDQUFDLENBQUE7UUFDM0QsQ0FBQztRQUVELGlCQUFpQjtRQUNqQixPQUFPLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQ3JCLFFBQWdCLEVBQ2hCLElBR0M7UUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRXpDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLFFBQVEsWUFBWSxDQUFDLENBQUE7UUFDM0QsQ0FBQztRQUVELGlCQUFpQjtRQUNqQixPQUFPLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVELEtBQUssQ0FBQyxpQkFBaUIsQ0FDckIsUUFBZ0IsRUFDaEIsTUFBYyxFQUNkLFVBQWtCLEVBQ2xCLElBRUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRXpDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLFFBQVEsWUFBWSxDQUFDLENBQUE7UUFDM0QsQ0FBQztRQUVELGlCQUFpQjtRQUNqQixPQUFPLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUN0RSxDQUFDO0lBRUQsS0FBSyxDQUFDLGlCQUFpQixDQUNyQixRQUFnQixFQUNoQixNQUFjLEVBQ2QsVUFBa0I7UUFFbEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUV6QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDYixNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixRQUFRLFlBQVksQ0FBQyxDQUFBO1FBQzNELENBQUM7UUFFRCxpQkFBaUI7UUFDakIsT0FBTyxPQUFPLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0NBQ0Y7QUFFRCxrQkFBZSxxQkFBcUIsQ0FBQSJ9