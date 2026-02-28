import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IPaymentProvider,
  FundTransferRequest,
  FundTransferResponse,
  // TransactionStatusRequest,
  TransactionStatusResponse,
  // TransferType,
  TransferTypeEnum,
} from "../dto/payment/idfc-disbursement.dto";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
// import { TransferMode } from "src/constant/roles";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

interface IDFCFundTransferRequest {
  initiateAuthGenericFundTransferAPIReq: {
    transactionID: string;
    debitAccountNumber: string;
    creditAccountNumber: string;
    remitterName: string;
    amount: string;
    currency: string;
    transactionType: string;
    paymentDescription: string;
    beneficiaryIFSC: string;
    beneficiaryName: string;

    mobileNo: string;
    beneficiaryAddress?: string;
    emailId?: string;
  };
}

interface IDFCTransactionStatusRequest {
  paymentTransactionStatusReq: {
    tellerBranch: string;
    tellerID: string;
    transactionType: string;
    transactionReferenceNumber: string;
    paymentReferenceNumber: string;
    transactionDate: string;
  };
}

interface IDFCBeneficiaryValidationRequest {
  accountNumber: string;
  ifscCode: string;
}

interface IDFCBalanceRequest {
  accountNumber: string;
}

@Injectable()
export class IDFCProvider implements IPaymentProvider {
  private readonly logger = new Logger(IDFCProvider.name);
  private accessToken: string;
  private tokenExpiry: Date;

  constructor(private readonly configService: ConfigService) {}

  async initiateTransfer(
    request: FundTransferRequest,
    correlationId: string,
    transactionType: TransferTypeEnum
  ): Promise<FundTransferResponse> {
    try {
      this.logger.log(
        `Initiating IDFC transfer for correlationId: ${correlationId}`
      );

      // Create proper IDFC payload structure
      let payload: IDFCFundTransferRequest = {
        initiateAuthGenericFundTransferAPIReq: {
          transactionID: correlationId,
          debitAccountNumber:
            this.configService.get("IDFC_DEBIT_ACCOUNT") || "",
          creditAccountNumber: request.beneficiaryAccount,
          remitterName: this.configService.get("IDFC_REMITTER_NAME") || "",
          amount: request.amount,
          currency: "INR",
          transactionType: transactionType,
          paymentDescription: "Payment disbursed",
          beneficiaryIFSC: request.beneficiaryIFSC,
          beneficiaryName: request.beneficiaryName,
          mobileNo: request.mobileNo,
        },
      };
      if (transactionType !== TransferTypeEnum.IMPS) {
        // NEFT requires additional fields
        payload.initiateAuthGenericFundTransferAPIReq.beneficiaryAddress =
          request?.beneficiaryAddress;
        payload.initiateAuthGenericFundTransferAPIReq.emailId =
          request?.emailId;
      }

      this.logger.debug(`Transfer payload: ${JSON.stringify(payload)}`);

      // Use PHP-compatible encryption
      const encryptedPayload = this.encryptPayload(payload);

      const response = await this.makeRequest(
        "/payment-txn/v1/fund-transfer",
        encryptedPayload,
        correlationId
      );

      return this.parseFundTransferResponse(response);
    } catch (error) {
      this.logger.error(
        `IDFC transfer initiation failed: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  // async checkStatus(
  //   request: TransactionStatusRequest
  // ): Promise<TransactionStatusResponse> {
  //   try {
  //     const payload: IDFCTransactionStatusRequest = {
  //       paymentTransactionStatusReq: {
  //         tellerBranch: "",
  //         tellerID: "",
  //         transactionType: TransferMode.IMPS,
  //         transactionReferenceNumber: request.transactionId,
  //         paymentReferenceNumber: request.referenceNumber,
  //         transactionDate: this.formatDate(new Date()), // DDMMYYYY format
  //       },
  //     };

  //     const encryptedPayload = this.encryptPayload(payload);

  //     const response = await this.makeRequest(
  //       "/payment-enq/v1/transaction-status",
  //       encryptedPayload,
  //       request.correlationId
  //     );

  //     return this.parseStatusResponse(response);
  //   } catch (error) {
  //     this.logger.error(
  //       `IDFC status check failed: ${error.message}`,
  //       error.stack
  //     );
  //     throw error;
  //   }
  // }

  async validateBeneficiary(
    accountNumber: string,
    ifscCode: string,
    correlationId: string
  ): Promise<any> {
    try {
      const payload: IDFCBeneficiaryValidationRequest = {
        accountNumber,
        ifscCode,
      };

      const encryptedPayload = this.encryptPayload(payload);

      return await this.makeRequest(
        "/payment-enq/v1/benevalidation",
        encryptedPayload,
        correlationId
      );
    } catch (error) {
      this.logger.error(
        `IDFC beneficiary validation failed: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async getBalance(correlationId: string): Promise<any> {
    try {
      const payload: IDFCBalanceRequest = {
        accountNumber: this.configService.get("IDFC_DEBIT_ACCOUNT") || "",
      };

      const encryptedPayload = this.encryptPayload(payload);

      return await this.makeRequest(
        "/acctenq/v2/prefetchAccount",
        encryptedPayload,
        correlationId
      );
    } catch (error) {
      this.logger.error(
        `IDFC balance check failed: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  private async ensureToken(): Promise<void> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return;
    }
    await this.generateToken();
  }

  private async generateToken(): Promise<void> {
    const authUrl = this.configService.get("IDFC_AUTH_URL");
    const clientId = this.configService.get("IDFC_CLIENT_ID");
    const audience = this.configService.get("IDFC_AUDIENCE");
    const kid = this.configService.get("IDFC_KID");
    const scope = this.configService.get("IDFC_SCOPE");

    this.logger.log(
      "Generating new IDFC access token using JWT authentication"
    );

    try {
      const jwtToken = this.generateJWTToken(clientId, audience, kid);

      const requestBody = new URLSearchParams({
        grant_type: "client_credentials",
        scope: scope,
        client_id: clientId,
        client_assertion_type:
          "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: jwtToken,
      });

      const response = await fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: requestBody.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Token request failed: ${response.status} ${response.statusText}`
        );
        console.error(`Error response: ${errorText}`);
        throw new Error(
          `Token request failed: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const responseText = await response.text();
      this.logger.debug(`Token response received`);

      const tokenData: TokenResponse = JSON.parse(responseText);

      if (!tokenData.access_token) {
        throw new Error("No access_token in response");
      }

      this.accessToken = tokenData.access_token;

      const expiresIn = tokenData.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      this.logger.log("IDFC access token generated successfully");
      this.logger.debug(`Token expires at: ${this.tokenExpiry}`);
    } catch (error) {
      this.logger.error(
        `IDFC token generation failed: ${error.message}`,
        error.stack
      );
      throw new Error(`Failed to generate IDFC access token: ${error.message}`);
    }
  }

  private generateJWTToken(
    clientId: string,
    audience: string,
    kid: string
  ): string {
    try {
      const privateKey = this.readKeyFromFile("private_key.txt");

      if (!privateKey) {
        throw new Error("Private key not found or empty");
      }

      const header = {
        alg: "RS256",
        typ: "JWT",
        kid: kid,
      };

      const now = Math.floor(Date.now() / 1000);

      const payload = {
        jti: `jwt_${now}_${Math.random().toString(36).substring(2, 15)}`,
        sub: clientId,
        iss: clientId,
        aud: audience,
        exp: now + 300,
      };

      this.logger.debug(`JWT Payload: ${JSON.stringify(payload)}`);

      const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
        "base64url"
      );
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        "base64url"
      );

      const signingInput = `${encodedHeader}.${encodedPayload}`;

      const sign = crypto.createSign("RSA-SHA256");
      sign.update(signingInput);
      sign.end();

      const signature = sign.sign(privateKey, "base64url");

      const jwt = `${signingInput}.${signature}`;

      this.logger.debug(`Generated JWT token successfully`);

      return jwt;
    } catch (error) {
      this.logger.error("JWT token generation failed:", error);
      throw new Error(`Failed to generate JWT token: ${error.message}`);
    }
  }

  private readKeyFromFile(filename: string): string {
    try {
      const keyPath = path.join("/home/ubuntu/secure-keys", filename);

      const keyContent = fs.readFileSync(keyPath, "utf8").trim();

      this.logger.debug(
        `Loaded key file "${filename}" successfully (length: ${keyContent.length})`
      );

      return keyContent;
    } catch (error) {
      this.logger.error(
        `Failed to read key file "${filename}" at /home/ubuntu/secure-keys/`,
        error
      );
      throw new Error(
        `Failed to read key file "${filename}": ${error.message}`
      );
    }
  }

  private encryptPayload(payload: any): string {
    try {
      const aesKeyHex = this.configService.get("IDFC_AES_KEY");
      const jsonString = JSON.stringify(payload);

      this.logger.debug(`Payload to encrypt: ${jsonString}`);
      this.logger.debug(`AES Key: ${aesKeyHex}`);

      if (!aesKeyHex) {
        throw new Error(
          "IDFC_AES_KEY is not configured in environment variables"
        );
      }

      // Convert hex key to Buffer
      const keyBuffer = Buffer.from(aesKeyHex, "hex");

      // Ensure key is exactly 32 bytes for AES-256
      if (keyBuffer.length !== 32) {
        throw new Error(
          `AES key must be exactly 32 bytes (64 hex chars), got ${keyBuffer.length} bytes`
        );
      }

      // Generate IV exactly as per IDFC spec: 16 ASCII characters from 47-126
      const iv = this.generateIDFCCompatibleIV();
      this.logger.debug(`Generated IV (hex): ${iv.toString("hex")}`);
      this.logger.debug(`Generated IV (ascii): ${iv.toString("ascii")}`);

      // Encrypt using AES-256-CBC
      const cipher = crypto.createCipheriv("aes-256-cbc", keyBuffer, iv);
      cipher.setAutoPadding(true);

      let encrypted = cipher.update(jsonString, "utf8");
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Combine IV and encrypted data (IV first, then encrypted data)
      const ivAndEncrypted = Buffer.concat([iv, encrypted]);

      // Base64 encode the combined buffer
      const result = ivAndEncrypted.toString("base64");

      this.logger.debug(
        `Encryption successful - Total length: ${result.length} chars`
      );
      this.logger.debug(`Base64 result: ${result}`);

      return result;
    } catch (error) {
      this.logger.error("AES encryption failed:", error);
      throw new Error(`Failed to encrypt payload: ${error.message}`);
    }
  }

  private generateIDFCCompatibleIV(): Buffer {
    // Generate exactly as per IDFC spec: 16 ASCII characters from 47-126
    const ivChars = [];
    for (let i = 0; i < 16; i++) {
      // ASCII range 47-126: includes numbers, letters, and special characters
      const charCode = Math.floor(Math.random() * (126 - 47 + 1)) + 47;
      ivChars.push(String.fromCharCode(charCode));
    }
    const ivString = ivChars.join("");
    return Buffer.from(ivString, "ascii");
  }

  private decryptPayload(encryptedData: string): any {
    try {
      const aesKeyHex = this.configService.get("IDFC_AES_KEY");

      if (!aesKeyHex) {
        throw new Error("IDFC_AES_KEY is not configured");
      }

      const keyBuffer = Buffer.from(aesKeyHex, "hex");

      if (keyBuffer.length !== 32) {
        throw new Error("AES key must be exactly 32 bytes");
      }

      // Decode base64
      const ivAndEncrypted = Buffer.from(encryptedData, "base64");

      if (ivAndEncrypted.length < 16) {
        throw new Error("Encrypted data too short to contain IV");
      }

      // Extract IV (first 16 bytes) and encrypted data
      const iv = ivAndEncrypted.subarray(0, 16);
      const encrypted = ivAndEncrypted.subarray(16);

      this.logger.debug(
        `Decryption - IV length: ${iv.length}, Encrypted length: ${encrypted.length}`
      );
      this.logger.debug(`IV (hex): ${iv.toString("hex")}`);
      this.logger.debug(`IV (ascii): ${iv.toString("ascii")}`);

      // Decrypt
      const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuffer, iv);
      decipher.setAutoPadding(true);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      // Parse JSON
      const result = JSON.parse(decrypted.toString("utf8"));
      this.logger.debug(`Decryption successful: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error("Decryption failed:", error);
      this.logger.debug(`Raw encrypted data length: ${encryptedData.length}`);
      this.logger.debug(
        `Raw encrypted data (first 100 chars): ${encryptedData.substring(0, 100)}`
      );
      throw new Error(`Failed to decrypt response: ${error.message}`);
    }
  }

  private async makeRequest(
    endpoint: string,
    encryptedPayload: string,
    correlationId: string
  ): Promise<any> {
    const baseUrl = this.configService.get("IDFC_BASE_URL");
    const source = this.configService.get("IDFC_SOURCE");

    await this.ensureToken();

    this.logger.log(`Making IDFC API request to: ${endpoint}`);
    this.logger.debug(`Correlation ID: ${correlationId}`);
    this.logger.debug(`Payload length: ${encryptedPayload.length}`);
    const url = `${baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          source: source,
          correlationId: correlationId,
          "Content-Type": "application/octet-stream",
        },
        body: encryptedPayload,
      });

      const responseText = await response.text();
      this.logger.debug(`Response status: ${response.status}`);
      this.logger.debug(
        `Response content-length: ${response.headers.get("content-length")}`
      );

      // Log the exact raw response for debugging
      this.logger.debug(`Raw response text: ${responseText}`);
      this.logger.debug(`Raw response length: ${responseText.length}`);
      this.logger.debug(
        `Raw response (hex): ${Buffer.from(responseText).toString("hex")}`
      );

      if (!response.ok) {
        this.logger.error(
          `IDFC API request failed: ${response.status} ${response.statusText}`
        );

        // Try to decrypt if it's encrypted
        if (responseText && responseText.length > 0) {
          try {
            const decryptedError = this.decryptPayload(responseText);
            this.logger.error(
              `Decrypted error: ${JSON.stringify(decryptedError)}`
            );
          } catch (decryptError) {
            this.logger.error(`Could not decrypt - raw error: ${responseText}`);
            // It might be a plain text error, log it as is
            if (responseText.length < 100) {
              this.logger.error(`Error message: ${responseText}`);
            }
          }
        }

        throw new Error(
          `IDFC API request failed: ${response.status} ${response.statusText}`
        );
      }

      if (!responseText) {
        throw new Error("Empty response from IDFC API");
      }

      return this.decryptPayload(responseText);
    } catch (error) {
      this.logger.error(`Request failed: ${error.message}`);
      throw error;
    }
  }

  private parseFundTransferResponse(response: any): FundTransferResponse {
    this.logger.debug(
      `Parsing fund transfer response: ${JSON.stringify(response)}`
    );

    if (response && response?.initiateAuthGenericFundTransferAPIResp) {
      const metadata = response.initiateAuthGenericFundTransferAPIResp.metaData;
      const resourceData =
        response.initiateAuthGenericFundTransferAPIResp.resourceData;
      if (metadata?.status === "SUCCESS" && resourceData?.status === "ACPT") {
        this.logger.log("IDFC transfer initiated successfully");
        return {
          data: response?.initiateAuthGenericFundTransferAPIResp || null,
          success: true,
          status: "SUCCESS",
          transactionId: resourceData.transactionID,
          referenceNumber: resourceData.transactionReferenceNo,
          message: "Transaction initiated successfully",
        };
      }

      this.logger.error(`IDFC transfer failed: ${metadata?.message}`);
      return {
        data: response?.initiateAuthGenericFundTransferAPIResp || null,
        success: false,
        status: "FAILED",
        errorCode: metadata?.code,
        message: metadata?.message || "Transaction initiation failed",
      };
    }

    this.logger.error("Unexpected response format from IDFC");
    return {
      data: null,
      success: false,
      status: "UNKNOWN",
      message: "Unexpected response format from IDFC",
    };
  }

  private parseStatusResponse(response: any): TransactionStatusResponse {
    if (response && response.paymentTransactionStatusResp) {
      const metadata = response.paymentTransactionStatusResp.metaData;
      const resourceData = response.paymentTransactionStatusResp.resourceData;

      if (metadata?.status !== "SUCCESS") {
        return {
          success: false,
          status: "ERROR",
          errorCode: metadata?.code,
          errorMessage: metadata?.message,
        };
      }

      const transactionType = resourceData?.transactionType;

      if (transactionType === "IMPS") {
        return this.handleIMPSStatus(resourceData);
      }

      if (["NEFT", "RTGS"].includes(transactionType)) {
        return this.handleNEFTStatus(resourceData);
      }

      if (transactionType === "IFT") {
        return this.handleIFTStatus(resourceData);
      }
    }

    return {
      success: false,
      status: "UNKNOWN",
      errorMessage: "Unknown response format or transaction type",
    };
  }

  private handleIMPSStatus(resourceData: any): TransactionStatusResponse {
    const respCode = resourceData.respCode;

    if (respCode === "A") {
      return {
        success: true,
        status: "SUCCESS",
        respCode,
        utrNumber: resourceData.utrNumber,
      };
    }

    if (["D", "F"].includes(respCode)) {
      return {
        success: false,
        status: "FAILED",
        respCode,
        errorMessage: resourceData.errorDescription,
      };
    }

    if (["S", "T", "V", "R"].includes(respCode)) {
      return {
        success: false,
        status: "SUSPECTED",
        respCode,
        errorMessage: "Transaction suspected, requires retry",
      };
    }

    return {
      success: false,
      status: "UNKNOWN",
      respCode,
      errorMessage: `Unknown response code: ${respCode}`,
    };
  }

  private handleNEFTStatus(resourceData: any): TransactionStatusResponse {
    const status1 = resourceData.status1;
    const utrNumber = resourceData.utrNumber;

    if (["PROCESSED", "SETTLED", "REMITTED"].includes(status1)) {
      return {
        success: true,
        status: "SUCCESS",
        status1,
        utrNumber,
      };
    }

    if (["RETURNED/UNPAID", "REVERSED"].includes(status1)) {
      return {
        success: false,
        status: "FAILED",
        status1,
        utrNumber,
        errorMessage: `Transaction failed with status: ${status1}`,
      };
    }

    if (status1 === "PENDN04CONF") {
      return {
        success: false,
        status: "PENDING",
        status1,
        utrNumber,
      };
    }

    return {
      success: false,
      status: "UNKNOWN",
      status1,
      utrNumber,
      errorMessage: `Unknown status: ${status1}`,
    };
  }

  private handleIFTStatus(resourceData: any): TransactionStatusResponse {
    if (resourceData.errorId === "0") {
      return {
        success: true,
        status: "SUCCESS",
        utrNumber: resourceData.utrNumber,
      };
    }

    return {
      success: false,
      status: "FAILED",
      errorMessage: resourceData.errorMessage,
      errorCode: resourceData.errorId,
    };
  }

  private formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}${month}${year}`;
  }
}
