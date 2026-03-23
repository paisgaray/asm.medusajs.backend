"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
const service_1 = __importDefault(require("./service"));
const services = [
    service_1.default,
];
exports.default = (0, utils_1.ModuleProvider)(utils_1.Modules.PAYMENT, {
    services: [service_1.default],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvcHJvdmlkZXJzL2dsb2JhbC1wYXltZW50cy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHFEQUFtRTtBQUNuRSx3REFBcUQ7QUFFckQsTUFBTSxRQUFRLEdBQUc7SUFDZixpQkFBNkI7Q0FDOUIsQ0FBQTtBQUVELGtCQUFlLElBQUEsc0JBQWMsRUFBQyxlQUFPLENBQUMsT0FBTyxFQUFFO0lBQzdDLFFBQVEsRUFBRSxDQUFDLGlCQUE2QixDQUFDO0NBQzFDLENBQUMsQ0FBQSJ9