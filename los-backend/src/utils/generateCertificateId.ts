import { certificate_type_enum } from "@prisma/client";

export function generateCertificateId(
  userIdOrLoanId: string,
  certificateType: certificate_type_enum
): string {
  let type = "NO-DUES";
  if (certificateType === certificate_type_enum.WRITE_OFF_LETTER) {
    type = "WRITE-OFF";
  } else if (certificateType === certificate_type_enum.SETTLEMENT_LETTER) {
    type = "SETTLEMENT";
  } else if (certificateType === certificate_type_enum.NO_DUE_LETTER) {
    type = "NO-DUES";
  }

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `NO-DUES-${yyyy}${mm}${dd}-${hh}${min}${ss}-${userIdOrLoanId}`;
}
