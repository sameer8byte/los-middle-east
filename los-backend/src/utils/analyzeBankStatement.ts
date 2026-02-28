/**
 * Analyzes bank statement data to produce a structured financial summary.
 *
 * @param {object} statementData The raw bank statement data in JSON format.
 * @returns {object} A structured analysis of the bank statement.
 */
export default function analyzeBankStatement(statementData) {
  if (!statementData || typeof statementData !== "object") {
    return {
      accountSummary: {},
      salaryCredits: {},
      error: "Invalid statement data",
    };
  }

  const profile = statementData?.Profile?.Holders?.Holder ?? {};
  const summary = statementData?.Summary ?? {};
  const transactions = Array.isArray(statementData?.Transactions?.Transaction)
    ? statementData.Transactions.Transaction
    : [];

  const startDate = new Date(
    statementData?.Transactions?.startDate ?? Date.now(),
  );
  const endDate = new Date(statementData?.Transactions?.endDate ?? Date.now());

  let totalCredits = 0;
  let totalDebits = 0;
  let balances = [];

  const salaryKeywords = ["salary", "payroll", "credit salary", "neft-salary"];
  const salaryDetails = [];

  for (const txn of transactions) {
    const amount = parseFloat(txn?.amount ?? "0");
    const balance = parseFloat(txn?.currentBalance ?? "0");
    const txnType = txn?.type ?? "";
    const narration = txn?.narration?.toLowerCase?.() ?? "";
    const txnDate = new Date(
      txn?.transactionTimestamp?.split?.("T")?.[0] ?? Date.now(),
    );

    if (!isNaN(balance)) balances.push(balance);

    if (txnType === "CREDIT") {
      totalCredits += isNaN(amount) ? 0 : amount;

      if (salaryKeywords.some((keyword) => narration.includes(keyword))) {
        salaryDetails.push({ amount, narration, date: txnDate });
      }
    } else if (txnType === "DEBIT") {
      totalDebits += isNaN(amount) ? 0 : amount;
    }
  }

  const averageBalance =
    balances.length > 0
      ? balances.reduce((a, b) => a + b, 0) / balances.length
      : 0;

  const minBalance = balances.length > 0 ? Math.min(...balances) : 0;
  const maxBalance = balances.length > 0 ? Math.max(...balances) : 0;

  const totalSalaryAmount = salaryDetails.reduce(
    (sum, s) => sum + (s.amount || 0),
    0,
  );

  const last6Months = new Date(endDate);
  last6Months.setMonth(last6Months.getMonth() - 6);

  const last3Months = new Date(endDate);
  last3Months.setMonth(last3Months.getMonth() - 3);

  const salaryLast6Months = salaryDetails.filter((s) => s.date >= last6Months);
  const salaryLast3Months = salaryDetails.filter((s) => s.date >= last3Months);

  return {
    accountSummary: {
      accountNumber: "NA", // masked
      bankName: summary.bankName ?? "Indian Bank",
      accountHolderName: profile.name ?? "NA",
      periodStart: startDate.toISOString().split("T")[0],
      periodEnd: endDate.toISOString().split("T")[0],
      averageBalance: Number(averageBalance.toFixed(2)),
      minimumBalance: Number(minBalance.toFixed(2)),
      maximumBalance: Number(maxBalance.toFixed(2)),
      totalCredits: Number(totalCredits.toFixed(2)),
      totalDebits: Number(totalDebits.toFixed(2)),
      fraudScore: 0, // Placeholder
    },
    salaryCredits: {
      last6MonthsCount: salaryLast6Months.length,
      last3MonthsCount: salaryLast3Months.length,
      totalSalaryAmount: Number(totalSalaryAmount.toFixed(2)),
      salaryDetails,
      avgMonthlySalary:
        salaryLast6Months.length > 0
          ? Number((totalSalaryAmount / 6).toFixed(2))
          : 0,
      hasSalaryCredits: salaryDetails.length > 0,
    },
  };
}
