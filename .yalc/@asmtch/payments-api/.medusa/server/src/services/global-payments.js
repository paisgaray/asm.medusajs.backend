"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const payments_base_1 = __importDefault(require("../core/payments-base"));
const types_1 = require("../types");
const globalpayments_api_1 = require("globalpayments-api");
class GlobalPaymentsService extends payments_base_1.default {
    // constructor(_, options) {
    //   super(_, options)
    // }
    constructor(container, options) {
        super(container, options);
    }
    /**
     * Tokeniza una tarjeta usando Global Payments
     */
    async tokenizeCard(card, context) {
        //this.logger_.info("-- tokenizeCard --")
        try {
            const billingAddress = context.cart?.billing_address;
            /* ------------------------------------------------------------------
             * 1. Configurar Global Payments - se hace en el constructor
             * ------------------------------------------------------------------ */
            const config = new globalpayments_api_1.GpApiConfig();
            config.appId = this.options_.appId;
            config.appKey = this.options_.appKey;
            config.merchantId = this.options_.merchantId;
            config.environment =
                this.options_.environment === "sandbox"
                    ? globalpayments_api_1.Environment.Test
                    : globalpayments_api_1.Environment.Production;
            config.channel = globalpayments_api_1.Channel.CardNotPresent;
            config.enableLogging = true;
            //config.deviceCurrency = "EUR"
            //config.country = "ES"
            //config.deviceCurrency = "USD"
            //config.country = "US"
            globalpayments_api_1.ServicesContainer.configureService(config);
            /* ------------------------------------------------------------------
             * 2. Construcción de la tarjeta
             * ------------------------------------------------------------------ */
            // const creditCard = new CreditCardData()
            // //creditCard.number = "4263970000005262"
            // creditCard.number = "4222000006285344"      
            // creditCard.expMonth = "12"
            // creditCard.expYear = "2026"
            // creditCard.cvn = "123"
            // creditCard.cardHolderName = "John Smith"
            const creditCard = new globalpayments_api_1.CreditCardData();
            creditCard.number = card.number;
            creditCard.expMonth = String(card.expMonth).padStart(2, "0");
            creditCard.expYear = String(card.expYear);
            creditCard.cvn = card.cvn;
            creditCard.cardHolderName = card.cardHolderName;
            /**
             * Construcción de Address compatible con Global Payments
             */
            const gpAddress = new globalpayments_api_1.Address();
            if (billingAddress) {
                const { address_1, address_2, city, province, postal_code, country_code, } = billingAddress;
                if (address_1 && city && postal_code && country_code) {
                    gpAddress.type = globalpayments_api_1.AddressType.Billing;
                    gpAddress.streetAddress1 = address_1;
                    gpAddress.streetAddress2 = address_2 ?? "";
                    gpAddress.city = city;
                    gpAddress.state = province ?? "";
                    gpAddress.postalCode = postal_code;
                    gpAddress.country = country_code.toUpperCase();
                    gpAddress.countryCode = country_code.toUpperCase();
                }
            }
            /* ------------------------------------------------------------------
             * 3. Tokenización
             * ------------------------------------------------------------------ */
            const tokenizeResponse = await creditCard
                .tokenize()
                //.withCurrency("USD")
                //.withCurrency("EUR")
                .withAddress(gpAddress)
                .execute();
            if (!tokenizeResponse || tokenizeResponse.responseCode !== "SUCCESS") {
                throw new Error(`Tokenization failed: ${tokenizeResponse?.responseMessage ?? "Unknown error"}`);
            }
            const _token = tokenizeResponse.token;
            // this.logger_.info("Card tokenized successfully")
            // this.logger_.info(`Token: ${_token}`)
            /* ------------------------------------------------------------------
             * 4. Devolver el token
             * ------------------------------------------------------------------ */
            return _token;
        }
        catch (error) {
            let cleanMessage = "Error tokenizing card with Global Payments";
            if (error instanceof globalpayments_api_1.GatewayError) {
                this.logger_.error(`GlobalPayments GatewayError [${error.responseCode}]: ${error.message}`);
                // LIMPIEZA DEL MENSAJE
                if (typeof error.message === "string") {
                    const parts = error.message.split(" - ");
                    cleanMessage = parts.length > 1 ? parts.slice(1).join(" - ") : error.message;
                }
            }
            else {
                this.logger_.error("Unexpected tokenization error", error);
                cleanMessage = error.message;
            }
            //throw new Error(error.message || "Error tokenizing card with Global Payments")
            throw new Error(cleanMessage);
        }
    }
}
GlobalPaymentsService.identifier = types_1.PaymentProviderKeys.GLOBAL_PAYMENTS;
exports.default = GlobalPaymentsService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsLXBheW1lbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3NlcnZpY2VzL2dsb2JhbC1wYXltZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLDBFQUFnRDtBQUNoRCxvQ0FBOEM7QUFHOUMsMkRBUzZCO0FBK0M3QixNQUFNLHFCQUFzQixTQUFRLHVCQUFZO0lBRzlDLDRCQUE0QjtJQUM1QixzQkFBc0I7SUFDdEIsSUFBSTtJQUNKLFlBQVksU0FBMkMsRUFBRSxPQUFZO1FBQ25FLEtBQUssQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFlLEVBQUUsT0FBNkI7UUFDL0QseUNBQXlDO1FBRXpDLElBQUksQ0FBQztZQUNILE1BQU0sY0FBYyxHQUNsQixPQUFPLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQTtZQUUvQjs7b0ZBRXdFO1lBQ3hFLE1BQU0sTUFBTSxHQUFHLElBQUksZ0NBQVcsRUFBRSxDQUFBO1lBQ2hDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUE7WUFDbEMsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQTtZQUNwQyxNQUFNLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFBO1lBQzVDLE1BQU0sQ0FBQyxXQUFXO2dCQUNoQixJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsS0FBSyxTQUFTO29CQUNyQyxDQUFDLENBQUMsZ0NBQVcsQ0FBQyxJQUFJO29CQUNsQixDQUFDLENBQUMsZ0NBQVcsQ0FBQyxVQUFVLENBQUE7WUFDNUIsTUFBTSxDQUFDLE9BQU8sR0FBRyw0QkFBTyxDQUFDLGNBQWMsQ0FBQTtZQUN2QyxNQUFNLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQTtZQUMzQiwrQkFBK0I7WUFDL0IsdUJBQXVCO1lBQ3ZCLCtCQUErQjtZQUMvQix1QkFBdUI7WUFFdkIsc0NBQWlCLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7WUFFMUM7O29GQUV3RTtZQUN4RSwwQ0FBMEM7WUFDMUMsMkNBQTJDO1lBQzNDLCtDQUErQztZQUMvQyw2QkFBNkI7WUFDN0IsOEJBQThCO1lBQzlCLHlCQUF5QjtZQUN6QiwyQ0FBMkM7WUFDM0MsTUFBTSxVQUFVLEdBQUcsSUFBSSxtQ0FBYyxFQUFFLENBQUE7WUFDdkMsVUFBVSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO1lBQy9CLFVBQVUsQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQzVELFVBQVUsQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN6QyxVQUFVLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7WUFDekIsVUFBVSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFBO1lBRS9DOztlQUVHO1lBQ0gsTUFBTSxTQUFTLEdBQUcsSUFBSSw0QkFBTyxFQUFFLENBQUE7WUFDL0IsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDbkIsTUFBTSxFQUNKLFNBQVMsRUFDVCxTQUFTLEVBQ1QsSUFBSSxFQUNKLFFBQVEsRUFDUixXQUFXLEVBQ1gsWUFBWSxHQUNiLEdBQUcsY0FBYyxDQUFBO2dCQUVsQixJQUFJLFNBQVMsSUFBSSxJQUFJLElBQUksV0FBVyxJQUFJLFlBQVksRUFBRSxDQUFDO29CQUNyRCxTQUFTLENBQUMsSUFBSSxHQUFHLGdDQUFXLENBQUMsT0FBTyxDQUFBO29CQUNwQyxTQUFTLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQTtvQkFDcEMsU0FBUyxDQUFDLGNBQWMsR0FBRyxTQUFTLElBQUksRUFBRSxDQUFBO29CQUMxQyxTQUFTLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtvQkFDckIsU0FBUyxDQUFDLEtBQUssR0FBRyxRQUFRLElBQUksRUFBRSxDQUFBO29CQUNoQyxTQUFTLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQTtvQkFDbEMsU0FBUyxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUE7b0JBQzlDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFBO2dCQUNwRCxDQUFDO1lBQ0gsQ0FBQztZQUVEOztvRkFFd0U7WUFDeEUsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLFVBQVU7aUJBQ3RDLFFBQVEsRUFBRTtnQkFDWCxzQkFBc0I7Z0JBQ3RCLHNCQUFzQjtpQkFDckIsV0FBVyxDQUFDLFNBQVMsQ0FBQztpQkFDdEIsT0FBTyxFQUFFLENBQUE7WUFFWixJQUFJLENBQUMsZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNyRSxNQUFNLElBQUksS0FBSyxDQUNiLHdCQUF3QixnQkFBZ0IsRUFBRSxlQUFlLElBQUksZUFBZSxFQUFFLENBQy9FLENBQUE7WUFDSCxDQUFDO1lBQ0QsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO1lBRXRDLG1EQUFtRDtZQUNuRCx3Q0FBd0M7WUFFeEM7O29GQUV3RTtZQUN4RSxPQUFPLE1BQU0sQ0FBQTtRQUVmLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ3BCLElBQUksWUFBWSxHQUFHLDRDQUE0QyxDQUFBO1lBRS9ELElBQUksS0FBSyxZQUFZLGlDQUFZLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQ2hCLGdDQUFnQyxLQUFLLENBQUMsWUFBWSxNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FDeEUsQ0FBQTtnQkFFRCx1QkFBdUI7Z0JBQ3ZCLElBQUksT0FBTyxLQUFLLENBQUMsT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUN0QyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDeEMsWUFBWSxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQTtnQkFDOUUsQ0FBQztZQUNILENBQUM7aUJBQU0sQ0FBQztnQkFDTixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDMUQsWUFBWSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUE7WUFDOUIsQ0FBQztZQUVELGdGQUFnRjtZQUNoRixNQUFNLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQy9CLENBQUM7SUFDSCxDQUFDOztBQWhJTSxnQ0FBVSxHQUFHLDJCQUFtQixDQUFDLGVBQWUsQ0FBQTtBQW1JekQsa0JBQWUscUJBQXFCLENBQUEifQ==