"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
const payments_tokenizations_1 = require("../modules/payments/models/payments-tokenizations");
class PaymentsBase extends (0, utils_1.MedusaService)({
    PaymentsTokenizations: payments_tokenizations_1.PaymentsTokenizations,
}) {
    constructor(container, options) {
        super(container);
        this.logger_ = container.logger;
        this.options_ = options;
        this.manager_ = container.manager;
        this.tokenizationsRepo = container.manager.getRepository(payments_tokenizations_1.PaymentsTokenizations);
    }
    async listPaymentCards(provider, customerId, isActive) {
        if (!customerId)
            return [];
        const filters = {
            customer_id: customerId,
            provider
        };
        if (isActive !== undefined) {
            filters.is_active = isActive;
        }
        // Busca todas las tokenizaciones de este cliente
        const paymentCards = await this.listPaymentsTokenizations(filters);
        // Mapea al tipo que espera tu frontend
        return paymentCards.map((card) => ({
            id: card.id,
            brand: card.brand,
            last4: card.last4,
            exp_month: card.exp_month,
            exp_year: card.exp_year,
            card_token: card.card_token,
            is_active: card.is_active
        }));
    }
    async createPaymentCard(provider, { card, customerId, }) {
        if (!customerId) {
            throw new Error("Customer not authenticated");
        }
        if (!card?.number || !card.expMonth || !card.expYear || !card.cvn) {
            throw new Error("Invalid card data");
        }
        try {
            /**
             * 1️- Tokenizar tarjeta solo si no existe card.token
             *    createPaymentCard se llama desde el checkout y desde myAccount
             *    - si se llama desde el checkout el token de tarjeta ya existe, porqué el proceso de tokenización se realiza antes de guardar la tarjeta
             *    - si se llama desde myAccount se tiene que conseguir el token de tarjeta
             */
            let token;
            token =
                card.token ??
                    await this.tokenizeCard(card, {
                        cart: { customer_id: customerId },
                    });
            // if (card.token) {
            //   token = card.token        
            // } else {
            //   const context: MedusaPaymentContext = {
            //     cart: {
            //       customer_id: customerId
            //     }
            //   }
            //   //token = await this.tokenizeCard(card, context)      
            // }
            /**
             * 2- Guardar tarjeta
             */
            const last4 = card.number.slice(-4);
            const paymentCard = this.tokenizationsRepo.create({
                customer_id: customerId,
                provider,
                card_token: token,
                brand: card.brand,
                exp_month: String(card.expMonth).padStart(2, "0"),
                exp_year: String(card.expYear),
                last4,
                is_active: true,
            });
            /**
             * 3- Guardar en la base de datos
             */
            await this.manager_.persistAndFlush(paymentCard);
            /**
             * 4- Devolver datos seguros (frontend)
             */
            return {
                id: paymentCard.id
            };
        }
        catch (error) {
            this.logger_.error("Error creating payment card", error);
            throw error;
        }
    }
    async deletePaymentCard(provider, cardId, customerId) {
        if (!customerId) {
            throw new Error("Customer not authenticated");
        }
        try {
            const card = await this.tokenizationsRepo.findOne({
                id: cardId,
                customer_id: customerId,
                provider
            });
            if (!card)
                throw new Error("Payment card not found");
            await this.manager_.nativeDelete(payments_tokenizations_1.PaymentsTokenizations, {
                id: cardId,
                customer_id: customerId,
            });
            return {
                success: true,
                id: cardId,
            };
        }
        catch (error) {
            this.logger_.error("Error creating payment card", error);
            throw error;
        }
    }
    async updatePaymentCard(provider, cardId, customerId, data) {
        if (!customerId) {
            throw new Error("Customer not authenticated");
        }
        try {
            const card = await this.tokenizationsRepo.findOne({
                id: cardId,
                customer_id: customerId,
                provider
            });
            if (!card)
                throw new Error("Payment card not found");
            // Actualizar la tarjeta actual
            await this.manager_.nativeUpdate(payments_tokenizations_1.PaymentsTokenizations, {
                id: cardId,
                customer_id: customerId,
            }, {
                ...data,
            });
            return {
                success: true,
                id: cardId,
            };
        }
        catch (error) {
            this.logger_.error("Error updating payment card", error);
            throw error;
        }
    }
}
exports.default = PaymentsBase;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF5bWVudHMtYmFzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9jb3JlL3BheW1lbnRzLWJhc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxREFBeUQ7QUFDekQsOEZBQXlGO0FBOEN6RixNQUFlLFlBQWEsU0FBUSxJQUFBLHFCQUFhLEVBQUM7SUFDaEQscUJBQXFCLEVBQXJCLDhDQUFxQjtDQUN0QixDQUFDO0lBTUEsWUFBc0IsU0FBMkMsRUFBRSxPQUFZO1FBQzdFLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNoQixJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUE7UUFDL0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUE7UUFDdkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFBO1FBQ2pDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyw4Q0FBcUIsQ0FBQyxDQUFBO0lBQ2pGLENBQUM7SUFJRCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsUUFBZ0IsRUFBRSxVQUFrQixFQUFFLFFBQWtCO1FBQzdFLElBQUksQ0FBQyxVQUFVO1lBQUUsT0FBTyxFQUFFLENBQUE7UUFFMUIsTUFBTSxPQUFPLEdBQVE7WUFDbkIsV0FBVyxFQUFFLFVBQVU7WUFDdkIsUUFBUTtTQUNULENBQUE7UUFFRCxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMzQixPQUFPLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtRQUM5QixDQUFDO1FBRUQsaURBQWlEO1FBQ2pELE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRWxFLHVDQUF1QztRQUN2QyxPQUFPLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDakMs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