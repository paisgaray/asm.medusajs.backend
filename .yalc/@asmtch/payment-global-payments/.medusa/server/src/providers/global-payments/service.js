"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
//import { v4 as uuidv4 } from "uuid"
const globalpayments_api_1 = require("globalpayments-api");
class GlobalPaymentsProvider extends utils_1.AbstractPaymentProvider {
    constructor(container, options) {
        super(container, options);
        this.logger_ = container.logger;
        this.options_ = options;
        //if (!options?.appKey || !options?.appId || !options?.merchantId || !options?.environment) {
        //  throw new Error("Global Payments configuration missing")
        //}
        if (!options?.appKey)
            throw new Error("Global Payments appKey is required");
        if (!options?.environment)
            throw new Error("Global Payments environment is required");
        if (!options?.appId)
            throw new Error("Global Payments appId is required");
        if (!options?.merchantId)
            throw new Error("Global Payments merchantId is required");
        this.logger_.info("-- GlobalPaymentsProvider loaded successfully --");
    }
    /**
     * Inicia un pago y devuelve un payment session válido para Medusa
     */
    async initiatePayment({ currency_code, amount, data, context, }) {
        // Devuelve una sesión simulada para habilitar el botón
        const sessionId = "gp_" + Date.now();
        return {
            id: sessionId,
            status: utils_1.PaymentSessionStatus.PENDING,
            data: {
                id: sessionId,
                status: "pending",
                session_id: sessionId,
                amount: amount,
                currency_code: currency_code,
                metadata: {
                    amount: amount,
                    currency_code: currency_code
                },
                raw: {},
            },
        };
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
             * 4. Devolver el token de Global Payments
             * ------------------------------------------------------------------ */
            return _token;
        }
        catch (error) {
            if (error instanceof globalpayments_api_1.GatewayError) {
                this.logger_.error(`GlobalPayments GatewayError [${error.responseCode}]: ${error.message}`);
            }
            else {
                this.logger_.error("Unexpected tokenization error", error);
            }
            throw new Error(error.message || "Error tokenizing card with Global Payments");
        }
    }
    /**
     * Autoriza un pago usando un token
     */
    //async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    async authorizePayment(input) {
        //this.logger_.info("-- authorizePayment --")    
        const metadata = input.data?.metadata;
        const token = input.data?.token;
        //if (!token || typeof token !== "string") throw new Error("Invalid payment token")
        const amountMinor = Number(metadata?.amount || 0);
        //if (isNaN(amount)) throw new Error("Invalid amount")    
        if (!token || typeof token !== "string" || isNaN(amountMinor)) {
            return { status: utils_1.PaymentSessionStatus.ERROR };
        }
        const amount = amountMinor / 100; // convert minor -> major units
        const currency = (metadata?.currency_code || "EUR").toUpperCase();
        const sessionId = metadata?.session_id || Date.now();
        const orderId = typeof input.data?.id === "string"
            ? input.data.id
            : `medusa-${Date.now()}`;
        //this.logger_.info(`ORDER ID: ${orderId}`)
        const context = input.data?.context;
        const billingAddress = context.cart?.billing_address;
        /**
         * Construcción de Address compatible con Global Payments
         */
        const gpAddress = new globalpayments_api_1.Address();
        if (billingAddress) {
            const { address_1, address_2, city, province, postal_code, country_code, } = billingAddress;
            if (address_1 && city && postal_code && country_code) {
                gpAddress.streetAddress1 = address_1;
                gpAddress.streetAddress2 = address_2 ?? "";
                gpAddress.city = city;
                gpAddress.state = province ?? "";
                gpAddress.postalCode = postal_code;
                gpAddress.country = country_code.toUpperCase();
                gpAddress.countryCode = country_code.toUpperCase();
            }
        }
        try {
            /* ------------------------------------------------------------------
             * 1. Configurar Global Payments
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
            config.deviceCurrency = currency;
            config.country = "ES";
            config.enableLogging = true;
            config.accessTokenInfo = new globalpayments_api_1.AccessTokenInfo();
            config.accessTokenInfo.transactionProcessingAccountName = "transaction_processing";
            globalpayments_api_1.ServicesContainer.configureService(config);
            /* ------------------------------------------------------------------
             * 2. Construir tarjeta con TOKEN
             * ------------------------------------------------------------------ */
            const creditCard = new globalpayments_api_1.CreditCardData();
            creditCard.token = token;
            /* ------------------------------------------------------------------
             * 3. AUTORIZACIÓN
             * ------------------------------------------------------------------ */
            const transaction = await creditCard
                //.authorize(amount / 100)
                .authorize(amount)
                .withCurrency(currency)
                .withOrderId(orderId)
                .withAddress(gpAddress)
                .withConvenienceAmt(2)
                .withOfflineAuthCode("123456")
                .execute();
            //this.logger_.info(`GP TRANSACTION FULL: ${JSON.stringify(transaction, null, 2)}`)
            const mapped = mapGpTransaction(transaction);
            /* ------------------------------------------------------------------
             * 4. Devolver estado compatible con Medusa
             * ------------------------------------------------------------------ */
            // return {
            //   //status: "authorized",
            //   status: PaymentSessionStatus.AUTHORIZED,
            //   data: {
            //     provider_id: GlobalPaymentsProvider.identifier,
            //     //status: "authorized",
            //     status: PaymentSessionStatus.AUTHORIZED,
            //     /**
            //      * Se usa luego en capturePayment()
            //      */
            //     transaction_id: transaction.transactionId,
            //     raw: transaction,
            //   },
            // }
            /* ---------- 3DS ---------- */
            if (mapped.redirectUrl) {
                return {
                    status: utils_1.PaymentSessionStatus.PENDING,
                    data: {
                        provider_id: GlobalPaymentsProvider.identifier,
                        transaction_id: transaction.transactionId,
                        redirect_url: mapped.redirectUrl,
                        raw: transaction,
                    },
                };
            }
            /* ---------- DECLINE ---------- */
            if (mapped.userMessage) {
                return {
                    status: utils_1.PaymentSessionStatus.ERROR,
                    data: {
                        provider_id: GlobalPaymentsProvider.identifier,
                        message: mapped.userMessage,
                        raw: transaction,
                    },
                };
            }
            /* ---------- AUTHORIZED ---------- */
            return {
                status: utils_1.PaymentSessionStatus.AUTHORIZED,
                data: {
                    provider_id: GlobalPaymentsProvider.identifier,
                    transaction_id: transaction.transactionId,
                    raw: transaction,
                },
            };
        }
        catch (error) {
            let message = "Error authorizing payment";
            if (error instanceof globalpayments_api_1.GatewayError) {
                message = `GlobalPayments AUTH error [${error.responseCode}]: ${error.message}`;
                this.logger_.error(`GlobalPayments AUTH error [${error.responseCode}]: ${error.message}`);
            }
            else {
                message = error?.message || message;
                this.logger_.error("Unexpected authorization error", error);
            }
            // Devuelve un estado compatible con Medusa
            return {
                status: utils_1.PaymentSessionStatus.ERROR,
                data: {
                    provider_id: GlobalPaymentsProvider.identifier,
                    message,
                    raw: error,
                },
            };
        }
    }
    async capturePayment(input) {
        //this.logger_.info("-- capturePayment --")    
        const transactionId = input.data?.transaction_id;
        if (!transactionId || typeof transactionId !== "string")
            throw new Error("Invalid transaction");
        try {
            /* ------------------------------------------------------------------
              * 1. Configurar Global Payments
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
            globalpayments_api_1.ServicesContainer.configureService(config);
            /* ------------------------------------------------------------------
             * 2. CAPTURE de la autorización existente
             * ------------------------------------------------------------------ */
            const transaction = await globalpayments_api_1.Transaction
                .fromId(transactionId)
                .capture()
                .execute();
            //this.logger_.info(`GP TRANSACTION FULL CAPTURE: ${JSON.stringify(transaction, null, 2)}`)      
            const captured = transaction.responseCode === "SUCCESS" &&
                transaction.responseMessage === "CAPTURED";
            if (!captured) {
                return {
                    data: {
                        provider_id: GlobalPaymentsProvider.identifier,
                        //status: "failed",
                        status: utils_1.PaymentSessionStatus.ERROR,
                        raw: transaction,
                    },
                };
            }
            /* ------------------------------------------------------------------
             * 3. Devolver estado compatible con Medusa
             * ------------------------------------------------------------------ */
            return {
                data: {
                    provider_id: GlobalPaymentsProvider.identifier,
                    //status: "captured",
                    transaction_id: transaction.transactionId,
                    raw: transaction,
                },
            };
        }
        catch (error) {
            if (error instanceof globalpayments_api_1.GatewayError) {
                this.logger_.error(`GlobalPayments AUTH error [${error.responseCode}]: ${error.message}`);
            }
            else {
                this.logger_.error("Unexpected authorization error", error);
            }
            throw error; // obligatorio para que Medusa marque fallo
        }
    }
    /**
     * Reembolso no desarrollado
     */
    async refundPayment(input) {
        throw new Error("Refund method not allowed");
    }
    /**
     * Cancelación no desarrollado
     */
    async cancelPayment(input) {
        //return { data: { id: input.data?.id } }
        throw new Error("Cancel method not allowed");
    }
    /**
     * Eliminación no desarrollado
     */
    async deletePayment(input) {
        return { data: input.data };
    }
    /**
     * Modificación no desarrollado
     */
    async updatePayment(input) {
        return { data: input.data };
    }
    /**
     * Recuperar pago enviado no desarrollado
     */
    async retrievePayment(input) {
        return { data: input.data };
    }
    async getPaymentStatus(input) {
        const rawStatus = input.data?.status;
        //return { status: rawStatus ?? "pending" }
        return {
            status: input.data?.status ??
                utils_1.PaymentSessionStatus.PENDING,
        };
    }
    async getWebhookActionAndData(payload) {
        const { data } = payload;
        const sessionId = typeof data.metadata?.session_id === "string" ? data.metadata.session_id : "";
        const amount = typeof data.amount === "number" ? new utils_1.BigNumber(data.amount) : new utils_1.BigNumber(0);
        switch (data.event_type) {
            case "authorized_amount":
                return { action: "authorized", data: { session_id: sessionId, amount } };
            case "success":
                return { action: "captured", data: { session_id: sessionId, amount } };
            default:
                return { action: "not_supported", data: { session_id: sessionId, amount } };
        }
    }
    async createAccountHolder({ context }) {
        // GP has no external customer API. We use the Medusa customer ID as the
        // account holder identifier so Medusa creates the DB record.
        const customerId = context?.customer?.id;
        if (!customerId) {
            throw new Error("GlobalPaymentsProvider.createAccountHolder: missing customer.id in context");
        }
        this.logger_.info(`GlobalPaymentsProvider: createAccountHolder for customer ${customerId}`);
        // Store id in both external_id and data.id so ensure-account-holder-step
        // can find the existing account holder on subsequent calls via ah.data?.id.
        return { id: customerId, data: { id: customerId } };
    }
    async listPaymentMethods({ context }) {
        const paymentMethods = context?.account_holder?.data?.payment_methods ?? [];
        return paymentMethods.map((pm) => ({
            id: pm.id,
            data: {
                ...pm,
                card: pm.card ?? {
                    brand: pm.brand ?? null,
                    last4: pm.last4 ?? null,
                    exp_month: pm.exp_month ?? null,
                    exp_year: pm.exp_year ?? null,
                },
            },
        }));
    }
    async updateAccountHolder({ context }) {
        const { account_holder } = context;
        return { data: account_holder.data };
    }
    async savePaymentMethod({ data, context }) {
        // The adapter layer already converted the single-use token to multi-use
        // and fetched the card details. We just package them for Medusa storage.
        const { token, brand, last4, exp_month, exp_year } = data ?? {};
        if (!token) {
            throw new Error("GlobalPaymentsProvider.savePaymentMethod: missing token in data");
        }
        return {
            id: token,
            data: {
                token,
                card: {
                    brand: brand ?? null,
                    last4: last4 ?? null,
                    exp_month: exp_month ?? null,
                    exp_year: exp_year ?? null,
                },
            },
        };
    }
}
GlobalPaymentsProvider.identifier = "global-payments";
exports.default = GlobalPaymentsProvider;
function mapGpTransaction(transaction) {
    const code = transaction.responseCode;
    const message = transaction.responseMessage;
    const FRIENDLY = {
        INSUFFICIENT_FUNDS: "Insufficient funds",
        EXPIRED_CARD: "Expired card",
        INVALID_CARD: "Invalid card",
        DECLINE: "Payment rejected by the bank",
        CVV_FAILURE: "CVV failure",
    };
    /* 3DS */
    if (message === "CHALLENGE_REQUIRED") {
        return {
            redirectUrl: transaction.payerAuthenticationUrl ||
                transaction.authentication?.redirectUrl,
        };
    }
    /* OK */
    if (code === "SUCCESS" && message === "PREAUTHORIZED") {
        return {};
    }
    /* DECLINE */
    return {
        userMessage: FRIENDLY[message] ||
            transaction.responseText ||
            "Payment rejected by the bank",
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9wcm92aWRlcnMvZ2xvYmFsLXBheW1lbnRzL3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxREFJa0M7QUF5QmxDLHFDQUFxQztBQUVyQywyREFXMkI7QUFvRDNCLE1BQXFCLHNCQUF1QixTQUFRLCtCQUE4QztJQUtoRyxZQUFZLFNBQTZCLEVBQUUsT0FBOEI7UUFDdkUsS0FBSyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN6QixJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUE7UUFFL0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUE7UUFFdkIsNkZBQTZGO1FBQzdGLDREQUE0RDtRQUM1RCxHQUFHO1FBQ0gsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFBO1FBQzNFLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVztZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQTtRQUNyRixJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUs7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUE7UUFDekUsSUFBSSxDQUFDLE9BQU8sRUFBRSxVQUFVO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFBO1FBRW5GLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGtEQUFrRCxDQUFDLENBQUE7SUFDdkUsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGVBQWUsQ0FBQyxFQUNwQixhQUFhLEVBQ2IsTUFBTSxFQUNOLElBQUksRUFDSixPQUFPLEdBQ2M7UUFDckIsdURBQXVEO1FBQ3ZELE1BQU0sU0FBUyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxF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