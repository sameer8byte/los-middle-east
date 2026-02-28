import aaBankList from '../constant/aaBankList.json';

// Map IFSC bank codes to AA bank details for O(1) lookup
const IFSC_TO_AA_BANK: Map<string, { fipId: string; fipName: string }> = new Map([
  ['CGGB', { fipId: 'CGGBFIP0001', fipName: 'Chaitanya Godavari Grameena Bank' }],
  ['INDB', { fipId: 'fiplive@indusind', fipName: 'IndusInd Bank Ltd.' }],
  ['PUNB', { fipId: 'PNB-FIP', fipName: 'Punjab National Bank' }],
  ['AUBL', { fipId: 'AUBank-FIP', fipName: 'AU Small Finance Bank' }],
  ['ICIC', { fipId: 'ICICI-FIP', fipName: 'ICICI Bank' }],
  ['IDIB', { fipId: 'IBFIP', fipName: 'Indian Bank' }],
  ['IOBA', { fipId: 'IOB-FIP', fipName: 'Indian Overseas Bank' }],
  ['UCBA', { fipId: 'UCOB-FIP', fipName: 'UCO Bank' }],
  ['FDRL', { fipId: 'FDRLFIPPROD', fipName: 'FEDERAL BANK' }],
  ['PSIB', { fipId: 'PSFIP', fipName: 'Punjab and Sind Bank' }],
  ['YESB', { fipId: 'YESB-FIP', fipName: 'Yes Bank Ltd' }],
  ['HDFC', { fipId: 'HDFC-FIP', fipName: 'HDFC Bank' }],
  ['CBIN', { fipId: 'CENTRALFIP', fipName: 'Central Bank' }],
  ['IDFC', { fipId: 'IDFCFirstBank-FIP', fipName: 'IDFC FIRST BANK' }],
  ['BARB', { fipId: 'BARBFIP', fipName: 'BANK OF BARODA' }],
  ['KKBK', { fipId: 'KotakMahindraBank-FIP', fipName: 'Kotak Mahindra Bank' }],
  ['UBIN', { fipId: 'UBI-FIP', fipName: 'Union Bank Of India' }],
  ['KARB', { fipId: 'KBL-FIP', fipName: 'Karnataka Bank Ltd' }],
  ['MAHB', { fipId: 'BOM_FIP', fipName: 'Bank of Maharashtra' }],
  ['KVBL', { fipId: 'KarurVysyaBank-FIP', fipName: 'Karur Vysya Bank' }],
  ['IBKL', { fipId: 'idbibank-fip', fipName: 'IDBI Bank Ltd.' }],
  ['SBIN', { fipId: 'sbi-fip', fipName: 'STATE BANK OF INDIA' }],
  ['CNRB', { fipId: 'fiplive@canarabank', fipName: 'Canara Bank' }],
  ['UTIB', { fipId: 'AXIS001', fipName: 'Axis Bank' }],
  ['BKID', { fipId: 'BOI-FIP', fipName: 'Bank Of India' }],
]);

/**
 * Check AA eligibility directly from IFSC code
 * @param ifscCode - IFSC code (e.g., "SBIN0016804")
 * @returns Eligibility result with fipId and fipName if eligible
 */
export const checkAAEligibilityByIFSC = (
  ifscCode: string
): { isEligible: boolean; fipId?: string; fipName?: string } => {
  console.log(`[AA Eligibility] Input IFSC code: "${ifscCode}"`);
  
  if (!ifscCode || ifscCode.length < 4) {
    console.log('[AA Eligibility] ❌ Invalid IFSC code');
    return { isEligible: false };
  }

  const bankCode = ifscCode.substring(0, 4).toUpperCase();
  console.log(`[AA Eligibility] Extracted bank code: "${bankCode}"`);
  
  const aaBank = IFSC_TO_AA_BANK.get(bankCode);
  
  if (aaBank) {
    console.log(`[AA Eligibility] ✅ MATCH FOUND!`);
    console.log(`[AA Eligibility] Matched with: "${aaBank.fipName}" (fipId: ${aaBank.fipId})`);
    return { isEligible: true, fipId: aaBank.fipId, fipName: aaBank.fipName };
  }

  console.log('[AA Eligibility] ❌ Bank code not found in AA bank list');
  console.log('[AA Eligibility] Supported bank codes:', Array.from(IFSC_TO_AA_BANK.keys()).slice(0, 10).join(', '));
  
  return { isEligible: false };
};
