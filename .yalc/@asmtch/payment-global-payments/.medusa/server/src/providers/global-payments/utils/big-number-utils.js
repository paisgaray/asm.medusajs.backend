"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toNumber = toNumber;
/**
 * Convierte cualquier tipo BigNumberInput de Medusa a number
 */
function toNumber(value) {
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return parseFloat(value);
    // IBigNumber
    if ("numeric" in value && typeof value.numeric === "number")
        return value.numeric;
    if ("toNumber" in value && typeof value.toNumber === "function")
        return value.toNumber();
    // BigNumberRawValue (string | number | bigint)
    return parseFloat(value.toString());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmlnLW51bWJlci11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9wcm92aWRlcnMvZ2xvYmFsLXBheW1lbnRzL3V0aWxzL2JpZy1udW1iZXItdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFVQSw0QkFVQztBQWJEOztHQUVHO0FBQ0gsU0FBZ0IsUUFBUSxDQUFDLEtBQTJCO0lBQ2xELElBQUksT0FBTyxLQUFLLEtBQUssUUFBUTtRQUFFLE9BQU8sS0FBSyxDQUFBO0lBQzNDLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUTtRQUFFLE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBRXZELGFBQWE7SUFDYixJQUFJLFNBQVMsSUFBSSxLQUFLLElBQUksT0FBTyxLQUFLLENBQUMsT0FBTyxLQUFLLFFBQVE7UUFBRSxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUE7SUFDakYsSUFBSSxVQUFVLElBQUksS0FBSyxJQUFJLE9BQU8sS0FBSyxDQUFDLFFBQVEsS0FBSyxVQUFVO1FBQUUsT0FBTyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7SUFFeEYsK0NBQStDO0lBQy9DLE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO0FBQ3JDLENBQUMifQ==