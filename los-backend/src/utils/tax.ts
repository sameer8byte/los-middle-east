type TaxType = "inclusive" | "exclusive";

interface TaxCalculationResult {
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
}

/**
 * Calculates tax based on type (inclusive or exclusive)
 *
 * @param amount - The input amount (base for exclusive, total for inclusive)
 * @param taxRate - Tax rate as a percentage (e.g. 18 for 18%)
 * @param type - 'inclusive' or 'exclusive' (default is 'exclusive')
 * @returns Object with baseAmount, taxAmount, and totalAmount
 */
export function calculateTax(
  amount: number,
  taxRate: number,
  type: TaxType = "exclusive",
): TaxCalculationResult {
  let baseAmount: number;
  let taxAmount: number;
  let totalAmount: number;

  if (type === "exclusive") {
    taxAmount = amount * (taxRate / 100);
    baseAmount = amount;
    totalAmount = baseAmount + taxAmount;
  } else if (type === "inclusive") {
    baseAmount = amount / (1 + taxRate / 100);
    taxAmount = amount - baseAmount;
    totalAmount = amount;
  } else {
    throw new Error("Invalid tax type. Use 'inclusive' or 'exclusive'.");
  }

  return {
    baseAmount: parseFloat(baseAmount.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
}
