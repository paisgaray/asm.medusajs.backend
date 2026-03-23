"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = void 0;
const utils_1 = require("@medusajs/framework/utils");
const types_1 = require("../../../../types");
const zod_1 = require("zod");
// Esquema Zod para validar la entrada de la tarjeta
const CardSchema = zod_1.z.object({
    cardHolderName: zod_1.z.string().min(1, "Card holder name is required"),
    number: zod_1.z.string().min(12, "Card number is required"),
    brand: zod_1.z.string().min(1, "Brand is required"),
    //expMonth: z.number().min(1).max(12),
    //expYear: z.number().min(2023),
    expMonth: zod_1.z.preprocess((val) => Number(val), zod_1.z.number()),
    expYear: zod_1.z.preprocess((val) => Number(val), zod_1.z.number()),
    cvn: zod_1.z.string().min(3).max(4),
    token: zod_1.z.string().optional()
});
/**
 * GET /store/globalpayments/paymentcards
 */
const GET = async (req, res) => {
    let isActive;
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
    else if (req.query?.customer_id) {
        customerId = req.query.customer_id;
        isActive = true;
    }
    if (!customerId) {
        return res.status(401).json({
            message: "Customer not authenticated",
        });
    }
    try {
        const paymentsService = req.scope.resolve("payment_payments_api");
        // Recupera tarjetas guardadas del servicio
        const cards = await paymentsService.listPaymentCards(types_1.PaymentProviderKeys.GLOBAL_PAYMENTS, customerId, isActive);
        return res.status(200).json({ cards });
    }
    catch (err) {
        console.error("Error fetching payment cards:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch payment cards" });
    }
};
exports.GET = GET;
/**
 * POST /store/globalpayments/paymentcards
 */
//export async function POST(req: MedusaRequest, res: MedusaResponse) {
const POST = async (req, res) => {
    const body = CardSchema.extend({
        customerId: zod_1.z.string().optional(), // agregamos customerId opcional
    }).parse(req.body);
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
    else if (body.customerId) {
        customerId = body.customerId;
    }
    if (!customerId) {
        return res.status(401).json({
            message: "Customer not authenticated",
        });
    }
    // PARSEAMOS EL BODY CORRECTAMENTE
    const { cardHolderName, number, brand, expMonth, expYear, cvn, token } = body;
    if (!number || !expMonth || !expYear || !cvn || !cardHolderName) {
        throw new utils_1.MedusaError(utils_1.MedusaError.Types.UNAUTHORIZED, "Missing card details");
        //return res.status(400).json({ error: "Missing card details" })
    }
    try {
        const paymentsService = req.scope.resolve("payment_payments_api");
        const card_ = await paymentsService.createPaymentCard(types_1.PaymentProviderKeys.GLOBAL_PAYMENTS, {
            card: {
                cardHolderName,
                number,
                expMonth,
                expYear,
                cvn,
                brand,
                token
            },
            customerId
        });
        return res.status(201).json({ card_ });
    }
    catch (err) {
        console.error("Error creating payment card:", err);
        return res.status(500).json({
            error: err.message || "Failed to create payment card",
        });
    }
};
exports.POST = POST;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3N0b3JlL2dsb2JhbC1wYXltZW50cy9wYXltZW50Y2FyZHMvcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EscURBQXVEO0FBQ3ZELDZDQUF1RDtBQUV2RCw2QkFBdUI7QUFXdkIsb0RBQW9EO0FBQ3BELE1BQU0sVUFBVSxHQUFHLE9BQUMsQ0FBQyxNQUFNLENBQUM7SUFDMUIsY0FBYyxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLDhCQUE4QixDQUFDO0lBQ2pFLE1BQU0sRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSx5QkFBeUIsQ0FBQztJQUNyRCxLQUFLLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLENBQUM7SUFDN0Msc0NBQXNDO0lBQ3RDLGdDQUFnQztJQUNoQyxRQUFRLEVBQUUsT0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUN4RCxPQUFPLEVBQUUsT0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUN2RCxHQUFHLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzdCLEtBQUssRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFO0NBQzdCLENBQUMsQ0FBQTtBQUtGOztHQUVHO0FBQ0ksTUFBTSxHQUFHLEdB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