/**
 * Reject Report Generator - Updated to match Excel format
 * This script generates sample data that matches the Reject Report structure
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const generateRejectReportData = () => {
  const domains = [
    "Personal Loan",
    "Business Loan", 
    "Home Loan",
    "Car Loan",
    "Education Loan",
    "Credit Card"
  ];

  const rejectReasons = [
    "Incomplete Documentation",
    "Poor Repayment track",
    "Overleveraged",
    "Low Credit Score",
    "Insufficient Income",
    "Employment Verification Failed",
    "Bank Statement Issues",
    "Document Verification Failed",
    "High Debt-to-Income Ratio",
    "Age Criteria Not Met"
  ];

  const creditManagers = [
    "Mr. X",
    "Mr. Y", 
    "Mr. Z",
    "Ms. A",
    "Mr. B",
    "Ms. C"
  ];

  const months = ["01/24", "02/24", "03/24", "04/24", "05/24", "06/24"];
  
  // Generate Domain-wise Reject Analysis Data
  const domainWiseData = domains.map(domain => {
    const openingStock = Math.floor(Math.random() * 500) + 100;
    const freshApplications = Math.floor(Math.random() * 800) + 200;
    const totalToProcess = openingStock + freshApplications;
    const sanctioned = Math.floor(Math.random() * 400) + 100;
    const rejected = Math.floor(Math.random() * 300) + 50;
    const appDecisioned = sanctioned + rejected;
    const rejectPercent = ((rejected / appDecisioned) * 100).toFixed(2);
    const wip = totalToProcess - rejected;
    
    return {
      domain,
      month: months[Math.floor(Math.random() * months.length)],
      openingStock,
      freshApplications,
      totalToProcess,
      appDecisioned,
      rejected,
      sanctioned,
      rejectPercent,
      wip
    };
  });

  // Generate Reject Reason-wise Data
  const rejectReasonData = rejectReasons.map((reason, index) => {
    const cases = Math.floor(Math.random() * 200) + 10;
    const valueInLakhs = (Math.random() * 50 + 5).toFixed(2);
    
    return {
      sNo: index + 1,
      domain: domains[Math.floor(Math.random() * domains.length)],
      month: months[Math.floor(Math.random() * months.length)],
      rejectReason: reason,
      cases,
      percentage: ((cases / 1000) * 100).toFixed(2), // Assuming 1000 total cases
      valueInLakhs,
      valuePercentage: ((parseFloat(valueInLakhs) / 500) * 100).toFixed(2) // Assuming 500 lakhs total
    };
  });

  // Add Approved and Total rows for reject reason data
  const approvedCases = Math.floor(Math.random() * 600) + 400;
  const totalDecisioned = rejectReasonData.reduce((sum, item) => sum + item.cases, 0) + approvedCases;

  rejectReasonData.push({
    sNo: "Approved",
    domain: "",
    month: "",
    rejectReason: "",
    cases: approvedCases,
    percentage: ((approvedCases / totalDecisioned) * 100).toFixed(2),
    valueInLakhs: (Math.random() * 200 + 100).toFixed(2),
    valuePercentage: ""
  });

  rejectReasonData.push({
    sNo: "Total Decisioned Cases",
    domain: "",
    month: "",
    rejectReason: "",
    cases: totalDecisioned,
    percentage: "100.00",
    valueInLakhs: "",
    valuePercentage: ""
  });

  // Generate Credit Manager-wise Data
  const creditManagerData = creditManagers.map(manager => {
    const casesApproved = Math.floor(Math.random() * 150) + 50;
    const casesRejected = Math.floor(Math.random() * 100) + 20;
    const totalDecisioned = casesApproved + casesRejected;
    const rejectPercent = ((casesRejected / totalDecisioned) * 100).toFixed(2);
    const approvePercent = ((casesApproved / totalDecisioned) * 100).toFixed(2);
    const rejectValuePercent = (Math.random() * 30 + 5).toFixed(2);
    const approveValuePercent = (100 - parseFloat(rejectValuePercent)).toFixed(2);

    return {
      domain: domains[Math.floor(Math.random() * domains.length)],
      month: months[Math.floor(Math.random() * months.length)],
      creditManager: manager,
      casesApproved,
      casesRejected,
      totalDecisioned,
      rejectPercent,
      approvePercent,
      rejectValuePercent,
      approveValuePercent
    };
  });

  // Add Total row for credit manager data
  const totalApproved = creditManagerData.reduce((sum, item) => sum + item.casesApproved, 0);
  const totalRejected = creditManagerData.reduce((sum, item) => sum + item.casesRejected, 0);
  const grandTotalDecisioned = totalApproved + totalRejected;

  creditManagerData.push({
    domain: "",
    month: "",
    creditManager: "Total Decisioned Cases",
    casesApproved: totalApproved,
    casesRejected: totalRejected,
    totalDecisioned: grandTotalDecisioned,
    rejectPercent: ((totalRejected / grandTotalDecisioned) * 100).toFixed(2),
    approvePercent: ((totalApproved / grandTotalDecisioned) * 100).toFixed(2),
    rejectValuePercent: "",
    approveValuePercent: ""
  });

  return {
    domainWiseData,
    rejectReasonData,
    creditManagerData
  };
};

const createExcelFile = (data) => {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Create "Rough" sheet
  const roughSheetData = [
    // Domain-wise Reject Analysis Report
    ["Two Reject reports required to understand Reject analysis"],
    [""],
    ["Overhaul Reject Analysis Report Domain wise"],
    ["Domain", "XXXX", "Month", "MM/YY", "", "", "", "", ""],
    ["Opening stock", "Fresh application", "Total application to be processesd", "App Decesioned", "Rejected", "Sanctioned", "Reject %", "WIP"],
    ["XXx", "XXXX", "", "", "", "", "", ""],
    ["1", "2", "3 ( 1+2)", "4 ( 5+6)", "5", "6", "7 = 5/4", "8 = (3-5)"],
    ...data.domainWiseData.map(row => [
      row.domain,
      "", // XXXX placeholder
      row.month,
      "", // MM/YY placeholder
      row.openingStock,
      row.freshApplications,
      row.totalToProcess,
      row.appDecisioned,
      row.rejected,
      row.sanctioned,
      row.rejectPercent,
      row.wip
    ]),
    [""],
    [""],
    [""],
    [""],
    // Reject reason wise Report
    ["Reject reason wise Report"],
    ["S no", "Domain", "XXXX", "Month", "MM/YY", "", "", "", ""],
    ["", "Reject reason", "cases #", "%", "Value ( in lakhs)", "value %", "", "", ""],
    ...data.rejectReasonData.map(row => [
      row.sNo,
      row.domain,
      "", // XXXX placeholder
      row.month,
      "", // MM/YY placeholder
      row.rejectReason,
      row.cases,
      row.percentage,
      row.valueInLakhs,
      row.valuePercentage
    ]),
    [""],
    [""],
    // Reject reason wise - Credit Manager wise
    ["Reject reason wise - Credit Manager wise"],
    ["Domain", "", "", "Month", "MM/YY", "", "", "", ""],
    ["Credit manager", "Cases Approved", "cases Rejected", "TL Cases Decesioned (Reject+ approved)", "Reject %", "Approved %", "Reject value %", "Approved value %"],
    ...data.creditManagerData.map(row => [
      row.domain,
      "", // placeholder
      "", // placeholder
      row.month,
      "", // MM/YY placeholder
      row.creditManager,
      row.casesApproved,
      row.casesRejected,
      row.totalDecisioned,
      row.rejectPercent,
      row.approvePercent,
      row.rejectValuePercent,
      row.approveValuePercent
    ])
  ];

  const roughSheet = XLSX.utils.aoa_to_sheet(roughSheetData);
  XLSX.utils.book_append_sheet(workbook, roughSheet, "Rough");

  // Create "Fina;" sheet (Final formatted version)
  const finalSheetData = [
    ["🧮 Reject Analysis Dashboard – Monthly Snapshot"],
    [""],
    ["1. 📊 Domain-Wise Reject Analysis"],
    [""],
    ["Domain", "Month", "Opening Stock", "Fresh Applications", "Total to Process (1+2)", "Applications Decisioned (5+6)", "Rejected", "Sanctioned", "Reject % (5/4)", "WIP (3–5)"],
    ["XXXX", "MM/YY", "1", "2", "3", "4", "5", "6", "7", "8"],
    ...data.domainWiseData.map(row => [
      row.domain,
      row.month,
      row.openingStock,
      row.freshApplications,
      row.totalToProcess,
      row.appDecisioned,
      row.rejected,
      row.sanctioned,
      row.rejectPercent,
      row.wip
    ]),
    [""],
    ["🔍 Use this table to track pipeline health, decision velocity, and rejection trends across domains."],
    [""],
    [""],
    ["2. 🚫 Reject Reason-Wise Analysis"],
    [""],
    ["S. No", "Domain", "Month", "Reject Reason", "Cases (#)", "% of Total", "Value (₹ Lakhs)", "Value %"],
    ...data.rejectReasonData.map(row => [
      row.sNo,
      row.domain,
      row.month,
      row.rejectReason,
      row.cases,
      row.percentage,
      row.valueInLakhs,
      row.valuePercentage
    ]),
    [""],
    ["📈 Helps pinpoint top rejection drivers and prioritize corrective actions (e.g., documentation nudges, score filters)."],
    [""],
    [""],
    ["3. 🧑‍💼 Credit Manager-Wise Reject Analysis"],
    [""],
    ["Domain", "Month", "Credit Manager", "Cases Approved", "Cases Rejected", "Total Decisioned", "Reject %", "Approve %", "Reject Value %", "Approve Value %"],
    ...data.creditManagerData.map(row => [
      row.domain,
      row.month,
      row.creditManager,
      row.casesApproved,
      row.casesRejected,
      row.totalDecisioned,
      row.rejectPercent,
      row.approvePercent,
      row.rejectValuePercent,
      row.approveValuePercent
    ]),
    [""],
    ["🧭 Enables performance benchmarking, training needs identification, and fair allocation of leads."]
  ];

  const finalSheet = XLSX.utils.aoa_to_sheet(finalSheetData);
  XLSX.utils.book_append_sheet(workbook, finalSheet, "Fina;");

  return workbook;
};

// Main execution
const main = () => {
  console.log('🚀 Starting Reject Report Generation...\n');
  
  try {
    // Install xlsx package if not already installed
    // npm install xlsx
    
    // Generate report data
    const reportData = generateRejectReportData();
    
    // Create Excel workbook
    const workbook = createExcelFile(reportData);
    
    // Save to file
    const outputPath = path.join(__dirname, 'Reject-Reports.xlsx');
    XLSX.writeFile(workbook, outputPath);
    
    // Display results
    console.log(`✅ Reject Report generated successfully!`);
    console.log(`📁 File saved at: ${outputPath}`);
    console.log(`📊 Generated data for:`);
    console.log(`   - ${reportData.domainWiseData.length} domains`);
    console.log(`   - ${reportData.rejectReasonData.length - 2} reject reasons + summary`);
    console.log(`   - ${reportData.creditManagerData.length - 1} credit managers + summary`);
    
    console.log(`\n📋 Report includes:`);
    console.log(`   🏷️  Domain-wise reject analysis`);
    console.log(`   📉 Reject reason breakdown`);
    console.log(`   👨‍💼 Credit manager performance`);
    console.log(`\n🎯 Excel file is ready with both "Rough" and "Fina;" sheets!`);
    
  } catch (error) {
    console.error('❌ Error generating reject report:', error.message);
    console.log('💡 Make sure you have installed the required package:');
    console.log('   npm install xlsx');
    process.exit(1);
  }
};

// Run the script if executed directly
if (require.main === module) {
  main();
}

module.exports = { generateRejectReportData, createExcelFile };