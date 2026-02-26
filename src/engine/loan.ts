/**
 * Loan payment calculator.
 *
 * Standard amortization formula to calculate monthly payments
 * from principal, annual interest rate, and term in months.
 */

export function calculateMonthlyPayment(
  principal: number,
  annualRatePercent: number,
  termMonths: number
): number {
  if (termMonths <= 0 || principal <= 0) return 0;

  // 0% interest — simple division
  if (annualRatePercent === 0) {
    return Math.round((principal / termMonths) * 100) / 100;
  }

  const monthlyRate = annualRatePercent / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const payment = principal * (monthlyRate * factor) / (factor - 1);

  return Math.round(payment * 100) / 100;
}
