"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const types_1 = require("../../../../types");
// GET de prueba
async function GET(req, res) {
    res.json({ message: "[GET] Global Payments API is reachable" });
}
/**
 * POST /store/global-payments/token
 * Body: {
 *   number: string,
 *   expMonth: number,
 *   expYear: number,
 *   cvn: string,
 *   cardHolderName: string
 *   brand: string
 *   context: MedusaPaymentContext
 *   saveCard?: boolean
 *   token?: string
 * }
 */
async function POST(req, res) {
    const body = req.body;
    const { number, expMonth, expYear, cvn, cardHolderName, brand, context } = body;
    if (!number || !expMonth || !expYear || !cvn || !cardHolderName) {
        return res.status(400).json({ error: "Missing card details" });
    }
    if (!context || !context.cart?.id) {
        return res.status(400).json({ error: "Missing payment context" });
    }
    try {
        const paymentsService = req.scope.resolve("payment_payments_api");
        const token_ = await paymentsService.tokenizeCard(types_1.PaymentProviderKeys.GLOBAL_PAYMENTS, {
            number,
            expMonth,
            expYear,
            cvn,
            cardHolderName,
            brand
        }, context);
        return res.status(200).json({ token_ });
    }
    catch (err) {
        console.error("Error tokenizing card:", err);
        return res.status(500).json({ error: err.message || "Failed to tokenize card" });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3N0b3JlL2dsb2JhbC1wYXltZW50cy90b2tlbi9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQWlEQSxrQkFFQztBQWdCRCxvQkE2Q0M7QUEvR0QsNkNBQXVEO0FBK0N2RCxnQkFBZ0I7QUFDVCxLQUFLLFVBQVUsR0FBRyxDQUFDLEdBQWtCLEVBQUUsR0FBbUI7SUFDL0QsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx3Q0FBd0MsRUFBRSxDQUFDLENBQUE7QUFDakUsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7O0dBYUc7QUFDSSxLQUFLLFVBQVUsSUFBSSxDQUFDLEdBQWtCLEVBQUUsR0FBbUI7SUFFaEUsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQWlCLENBQUE7SUFDbEMsTUFBTSxFQUNKLE1BQU0sRUFDTixRQUFRLEVBQ1IsT0FBTyxFQUNQLEdBQUcsRUFDSCxjQUFjLEVBQ2QsS0FBSyxFQUNMLE9BQU8sRUFDUixHQUFHLElBQUksQ0FBQTtJQUVSLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNoRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLHNCQUFzQixFQUFFLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUM7UUFDbEMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUN2QyxzQkFBc0IsQ0FDaEIsQ0FBQTtRQUVSLE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDLFlBQVksQ0FDL0MsMkJBQW1CLENBQUMsZUFBZSxFQUNuQztZQUNFLE1BQU07WUFDTixRQUFRO1lBQ1IsT0FBTztZQUNQLEdBQUc7WUFDSCxjQUFjO1lBQ2QsS0FBSztTQUNOLEVBQ0QsT0FBTyxDQUNSLENBQUE7UUFFRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUV6QyxDQUFDO0lBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztRQUNsQixPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sSUFBSSx5QkFBeUIsRUFBRSxDQUFDLENBQUE7SUFDbEYsQ0FBQztBQUNILENBQUMifQ==