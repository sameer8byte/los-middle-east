export interface BsaReportInterface {
  name: string;

  uploadStatement(
    brandId: string,
    userId: string,
    userBankAccountId: string,
    bankAccountStatementId: string,
    file: Express.Multer.File,
  ): Promise<void>;

  initReport(
    brandId: string,
    userId: string,
    userBankAccountId: string,
    bankAccountStatementId: string,
  ): Promise<any>; // Replace `any` with actual ScoreMe entity type if available

  generateReport(
    brandId: string,
    userId: string,
    userBankAccountId: string,
    bankAccountStatementId: string,
  ): Promise<any>; // Replace `any` with actual ScoreMe entity type if available

  formatReport(
    brandId: string,
    userId: string,
    userBankAccountId: string,
    bankAccountStatementId: string,
  ): Promise<{
    excel: string | null;
    data: {
      [key: string]: any;
    };
  }>;
}
