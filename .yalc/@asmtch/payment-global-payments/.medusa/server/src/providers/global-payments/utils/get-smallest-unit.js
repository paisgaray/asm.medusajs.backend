"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSmallestUnit = getSmallestUnit;
const big_number_utils_1 = require("./big-number-utils");
const zeroDecimalCurrencies = ["JPY", "KRW", "VND", "CLP"];
function getSmallestUnit(amount, currency) {
    const numericAmount = (0, big_number_utils_1.toNumber)(amount);
    if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
        return Math.round(numericAmount);
    }
    return Math.round(numericAmount * 100);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXNtYWxsZXN0LXVuaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvcHJvdmlkZXJzL2dsb2JhbC1wYXltZW50cy91dGlscy9nZXQtc21hbGxlc3QtdW5pdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUtBLDBDQVFHO0FBYkgseURBQW1FO0FBR25FLE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUUxRCxTQUFnQixlQUFlLENBQUMsTUFBNEIsRUFBRSxRQUFnQjtJQUMxRSxNQUFNLGFBQWEsR0FBRyxJQUFBLDJCQUFRLEVBQUMsTUFBTSxDQUFDLENBQUE7SUFFdEMsSUFBSSxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUMzRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsR0FBRyxDQUFDLENBQUE7QUFDeEMsQ0FBQyJ9