import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  ICICIFundTransferRequest,
  ICICIFundTransferResponse,
  ICICIStatusCheckRequest,
  ICICIStatusCheckResponse,
  ICICIPriorityEnum,
  IPaymentProvider,
} from "../dto/payment/icici-disbursement.dto";
import * as dayjs from "dayjs";
const _dayjs = dayjs.default;

interface ICICIEncryptedRequest {
  requestId?: string;
  service: string;
  encryptedKey: string;
  oaepHashingAlgorithm: string;
  iv: string;
  encryptedData: string;
  clientInfo?: string;
  optionalParam?: string;
}
export interface BankTransferResponse {
  ActCode: string; // "0" usually means success
  BankRRN: string;
  success: boolean;
  BeneName: string;
  Response: string;
  TransRefNo: string;
}
@Injectable()
export class ICICIProvider implements IPaymentProvider {
  private readonly logger = new Logger(ICICIProvider.name);
  private config: {
    apiKey: string;
    debitAccount: string;
    crpId: string;
    crpUser: string;

    aggrId: string;
    aggrName: string;

    urn: string;
    mobile: string;
    impsPassCode?: string;

    impsBcId?: string;
    impsRetailerCode: string;
    compositePaymentUrl: string;
    compositeStatusUrl: string;
    workflowReqd: string;
  };

  constructor(private readonly configService: ConfigService) {
    this.loadConfig();
  }

  private loadConfig(): void {
    this.config = {
      apiKey: this.configService.get("ICICI_API_KEY") || "",
      debitAccount: this.configService.get("ICICI_DEBIT_ACCOUNT_NO") || "",
      crpId: this.configService.get("ICICI_CRP_ID") || "",
      crpUser: this.configService.get("ICICI_CRP_USER") || "",
      aggrId: this.configService.get("ICICI_AGGR_ID") || "",
      aggrName: this.configService.get("ICICI_AGGR_NAME") || "",
      urn: this.configService.get("ICICI_URN") || "",
      mobile: this.configService.get("ICICI_MOBILE") || "",

      impsPassCode: this.configService.get("ICICI_IMPS_PASSCODE"),
      impsBcId: this.configService.get("ICICI_IMPS_BCID"),
      impsRetailerCode:
        this.configService.get("ICICI_IMPS_RETAILER_CODE") || "rcode",

      compositePaymentUrl:
        this.configService.get("ICICI_COMPOSITE_PAYMENT_URL") ||
        "https://apibankingone.icici.bank.in/api/v1/composite-payment",
      compositeStatusUrl:
        this.configService.get("ICICI_COMPOSITE_STATUS_URL") ||
        "https://apibankingone.icici.bank.in/api/v1/composite-status",

      workflowReqd: this.configService.get("ICICI_WORKFLOW_REQD") || "N",
    };
  }

  async initiateTransfer(
    request: ICICIFundTransferRequest,
    correlationId: string,
  ): Promise<ICICIFundTransferResponse> {
    try {
      const payload = this.buildRequestPayload(request, correlationId);
      this.logger.log("ICICI Initiate Transfer Payload:", payload);
      const encryptedPayload = this.encryptPayload(
        payload,
        "composite-payment",
      );

      const response = await this.makeRequest(
        this.config.compositePaymentUrl,
        encryptedPayload,
        request.priority,
        correlationId,
      );

      return this.parseFundTransferResponse(response);
    } catch (error) {
      this.logger.error(`ICICI transfer failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async checkStatus(
    request: ICICIStatusCheckRequest,
    correlationId: string,
  ): Promise<ICICIStatusCheckResponse> {
    try {
      const payload = this.buildStatusCheckPayload(request);

      const encryptedPayload = this.encryptPayload(payload, "composite-status");

      const response = await this.makeRequest(
        this.config.compositeStatusUrl,
        encryptedPayload,
        request.priority,
        correlationId,
      );

      return this.parseStatusResponse(response, request);
    } catch (error) {
      this.logger.error(
        `ICICI status check failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // IMPS → NEFT Fallback Executor
  async initiateTransferWithFallback(
    request: Partial<ICICIFundTransferRequest>,
    correlationId: string,
  ): Promise<ICICIFundTransferResponse> {
    try {
      // Build request with fallback priority
      const fallbackPayload = this.buildRequestPayload(
        {
          ...request,
          crpId: this.config.crpId,
          crpUsr: this.config.crpUser,
          aggrId: this.config.aggrId,
          aggrName: this.config.aggrName,
          urn: this.config.urn,
        } as ICICIFundTransferRequest,
        correlationId,
        true,
      );
      this.logger.log("ICICI Fallback Transfer Payload:", fallbackPayload);
      const encryptedPayload = this.encryptPayload(
        fallbackPayload,
        "composite-payment",
      );

      const response = await this.makeRequest(
        this.config.compositePaymentUrl,
        encryptedPayload,
        ICICIPriorityEnum.IMPS_NEFT_FALLBACK,
        correlationId,
      );
      return this.parseFundTransferResponse(response);
    } catch (error) {
      this.logger.error(
        `Fallback transfer failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ENCRYPTION METHODS
  private encryptPayload(
    payload: any,
    serviceType: string,
  ): ICICIEncryptedRequest {
    try {
      // Validate payload before encryption
      if (!payload) {
        this.logger.error("Payload is null or undefined");
        throw new Error("Payload is null or undefined");
      }
      const payloadStr = JSON.stringify(payload);
      this.logger.debug("Payload validated and stringified", {
        size: payloadStr.length,
      });

      // Generate random session key (32 bytes for AES-256)
      const sessionKey = crypto.randomBytes(32);
      this.logger.debug("Session key generated for AES-256", {
        length: sessionKey.length,
        hex: sessionKey.toString("hex"),
      });

      // Generate IV (16 bytes)
      const iv = crypto.randomBytes(16);
      this.logger.debug("IV generated", {
        length: iv.length,
        hex: iv.toString("hex"),
      });

      const iciciPublicKey = this.readKeyFromFile("public_key.txt");
      this.logger.debug("ICICI public key loaded", {
        length: iciciPublicKey.length,
      });

      // Encrypt session key with RSA/ECB/PKCS1
      try {
        this.logger.debug("Encrypting session key with RSA-PKCS1", {
          sessionKeyLength: sessionKey.length,
          sessionKeyHex: sessionKey.toString("hex"),
        });

        const encryptedKey = crypto.publicEncrypt(
          {
            key: iciciPublicKey,
            padding: crypto.constants.RSA_PKCS1_PADDING,
          },
          sessionKey,
        );
        this.logger.debug("Session key encrypted successfully", {
          encryptedKeyLength: encryptedKey.length,
          encryptedKeyBase64: encryptedKey.toString("base64").substring(0, 64),
        });

        const cipher = crypto.createCipheriv("aes-256-cbc", sessionKey, iv);
        cipher.setAutoPadding(true);

        this.logger.debug("Cipher created successfully", {
          sessionKeyLength: sessionKey.length,
          ivLength: iv.length,
        });

        let encrypted = cipher.update(payloadStr, "utf8");
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        this.logger.debug("Payload encrypted successfully", {
          encryptedLength: encrypted.length,
        });

        // Combine IV + encrypted data
        const ivAndEncrypted = Buffer.concat([iv, encrypted]);
        this.logger.debug("IV combined with encrypted data", {
          totalLength: ivAndEncrypted.length,
          structure: `IV(16) + EncryptedData(${encrypted.length})`,
        });

        const result = {
          service: serviceType,
          encryptedKey: encryptedKey.toString("base64"),
          oaepHashingAlgorithm: "NONE",
          iv: "", // IV included in encryptedData
          encryptedData: ivAndEncrypted.toString("base64"),
          clientInfo: "",
          optionalParam: "",
        };
        this.logger.debug("Encrypted payload created successfully", {
          service: result.service,
          encryptedKeyLength: result.encryptedKey.length,
          encryptedDataLength: result.encryptedData.length,
        });

        return result;
      } catch (encryptError) {
        this.logger.error("RSA/Cipher operation failed", {
          message: encryptError.message,
          keyLength: iciciPublicKey?.length,
          sessionKeyLength: sessionKey.length,
          ivLength: iv.length,
          payloadLength: payloadStr.length,
        });
        throw encryptError;
      }
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`, error.stack);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  private decryptResponse(
    encryptedResponse: ICICIEncryptedRequest,
  ): BankTransferResponse {
    try {
      // Read client private key
      const privateKey = this.readKeyFromFile("private_key.txt");

      const encryptedKeyBuffer = Buffer.from(
        encryptedResponse.encryptedKey,
        "base64",
      );

      const sessionKey = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        encryptedKeyBuffer,
      );

      const sessionKeyLength = sessionKey.length;

      // Determine cipher algorithm based on session key length
      let cipherAlgorithm: string;
      if (sessionKeyLength === 32) {
        cipherAlgorithm = "aes-256-cbc";
      } else if (sessionKeyLength === 16) {
        cipherAlgorithm = "aes-128-cbc";
      } else {
        throw new Error(
          `Invalid session key length: ${sessionKeyLength}, expected 16 or 32`,
        );
      }

      // Decode encrypted data
      const encryptedDataBuffer = Buffer.from(
        encryptedResponse.encryptedData,
        "base64",
      );
      if (encryptedDataBuffer.length < 16) {
        throw new Error("Encrypted data too short");
      }

      // Extract IV (first 16 bytes)
      const iv = encryptedDataBuffer.subarray(0, 16);
      const actualEncryptedData = encryptedDataBuffer.subarray(16);

      const decipher = crypto.createDecipheriv(
        cipherAlgorithm as any,
        sessionKey,
        iv,
      );
      decipher.setAutoPadding(true);

      let decrypted = decipher.update(actualEncryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      const decryptedText = decrypted.toString("utf8");

      const parsedData = JSON.parse(decryptedText);
      return parsedData;
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`, error.stack);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  private readKeyFromFile(filename: string): string {
    try {
      const keyPath = path.join("/home/ubuntu/secure-keys", filename);

      let keyContent = fs.readFileSync(keyPath, "utf8").trim();

      // Handle key format conversion for files without PEM headers
      if (filename.includes("private_key")) {
        if (
          !keyContent.includes("-----BEGIN PRIVATE KEY-----") &&
          !keyContent.includes("-----BEGIN RSA PRIVATE KEY-----")
        ) {
          keyContent = `-----BEGIN PRIVATE KEY-----\n${keyContent}\n-----END PRIVATE KEY-----`;
        }
      } else if (filename.includes("public_key")) {
        if (
          !keyContent.includes("-----BEGIN PUBLIC KEY-----") &&
          !keyContent.includes("-----BEGIN CERTIFICATE-----")
        ) {
          keyContent = `-----BEGIN PUBLIC KEY-----\n${keyContent}\n-----END PUBLIC KEY-----`;
        }
      }

      return keyContent;
    } catch (error) {
      this.logger.error(
        `Failed to read key file "${filename}" at /home/ubuntu/secure-keys/`,
        error.stack,
      );
      throw new Error(
        `Failed to read key file "${filename}": ${error.message}`,
      );
    }
  }

  // REQUEST BUILDING
  private buildRequestPayload(
    request: ICICIFundTransferRequest,
    correlationId: string,
    isFallback: boolean = false,
  ): any {
    if (
      isFallback ||
      request.priority === ICICIPriorityEnum.IMPS_NEFT_FALLBACK
    ) {
      // IMPS → NEFT Fallback payload
      const payload = {
        amount: request.amount,
        tranRefNo: request.tranRefNo,
        localTxnDtTime:
          request.localTxnDtTime || this.formatDateTime(new Date()),
        beneIFSC: request.beneIFSC,
        mobile: (request.mobile || this.config.mobile)
          ?.replace(/\D/g, "")
          .slice(-10),
        txnType: request.txnType || "RGS",
        passCode: request.passCode || this.config.impsPassCode,
        narration1: `${
          request.formattedLoanId
        } FS ${_dayjs().format("YYYYMMDDHHmmss")}`,
        aggrId: request.aggrId || this.config.aggrId,
        paymentRef: request.formattedLoanId,
        urn: request.urn || this.config.urn,
        senderName: request.senderName || this.config.aggrName,
        bcID: request.bcID || this.config.impsBcId,
        senderAcctNo: request.senderAcctNo || this.config.debitAccount,
        crpId: request.crpId || this.config.crpId,
        beneName: request.beneName,
        crpUsr: request.crpUsr || this.config.crpUser,
        beneAccNo: request.beneAccNo,
        retailerCode: request.retailerCode || this.config.impsRetailerCode,
        aggrName: request.aggrName || this.config.aggrName,
      };
      return payload;
    }

    // if (request.transferType === TransferTypeEnum.IMPS) {
    //   // Regular IMPS payload
    //   const payload = {
    //     localTxnDtTime:
    //       request.localTxnDtTime || this.formatDateTime(new Date()),
    //     beneAccNo: request.beneAccNo,
    //     beneIFSC: request.beneIFSC,
    //     amount: request.amount,
    //     tranRefNo: tranRefNo,
    //     paymentRef: request.remarks,
    //     senderName: request.senderName || this.config.aggrName,
    //     mobile: request.mobile || this.config.mobile,
    //     retailerCode: request.retailerCode || this.config.impsRetailerCode,
    //     passCode: request.passCode || this.config.impsPassCode,
    //     bcID: request.bcID || this.config.impsBcId,
    //     crpId: request.crpId || this.config.crpId,
    //     crpUsr: request.crpUsr || this.config.crpUser,
    //     aggrId: request.aggrId || this.config.aggrId,
    //     urn: request.urn || this.config.urn,
    //   };
    //   return payload;
    // }

    // if (request.transferType === TransferTypeEnum.NEFT) {
    //   // NEFT payload
    //   const payload = {
    //     tranRefNo: tranRefNo,
    //     amount: request.amount,
    //     senderAcctNo: request.senderAcctNo || this.config.debitAccount,
    //     beneAccNo: request.beneAccNo,
    //     beneName: request.beneName,
    //     beneIFSC: request.beneIFSC,
    //     narration1: request.narration1 || request.remarks,
    //     narration2: request.narration2 || "",
    //     crpId: request.crpId || this.config.crpId,
    //     crpUsr: request.crpUsr || this.config.crpUser,
    //     aggrId: request.aggrId || this.config.aggrId,
    //     aggrName: request.aggrName || this.config.aggrName,
    //     urn: request.urn || this.config.urn,
    //     txnType: request.txnType || "RGS",
    //     WORKFLOW_REQD: request.workflowReqd || this.config.workflowReqd,
    //     bnfId: "",
    //     BENLEI: "",
    //   };
    //   return payload;
    // }
    throw new Error(`Unsupported transfer type: ${request.transferType}`);
  }

  private buildStatusCheckPayload(request: ICICIStatusCheckRequest): any {
    if (request.priority === ICICIPriorityEnum.IMPS) {
      const payload = {
        transRefNo: request.transRefNo || request.originalSeqNo,
        date: request.date || this.formatDate(new Date(), "MM/DD/YYYY"),
        recon360: request.recon360 || "N",
        passCode: request.passCode || this.config.impsPassCode,
        bcID: request.bcID || this.config.impsBcId,
        "Channel-code": "BC",
      };

      return payload;
    }

    if (request.priority === ICICIPriorityEnum.NEFT) {
      const payload = {
        UNIQUEID: request.uniqueId || request.originalSeqNo,
        AGGRID: this.config.aggrId,
        CORPID: this.config.crpId,
        USERID: this.config.crpUser,
        URN: this.config.urn,
        "UTR NUMBER": request.utrNumber || "",
      };
      return payload;
    }

    console.error(
      `❌ Unsupported priority for status check: ${request.priority}`,
    );
    throw new Error(
      `Unsupported priority for status check: ${request.priority}`,
    );
  }

  // API CALL
  private async makeRequest(
    url: string,
    encryptedPayload: ICICIEncryptedRequest,
    priority: string,
    correlationId: string,
  ): Promise<any> {
    try {
      // Validate encrypted payload structure
      if (!encryptedPayload.encryptedKey) {
        this.logger.warn("Missing encryptedKey in payload");
      }
      if (!encryptedPayload.encryptedData) {
        this.logger.warn("Missing encryptedData in payload");
      }
      if (!encryptedPayload.service) {
        this.logger.warn("Missing service in payload");
      }

      const headers = {
        apikey: this.config.apiKey,
        "x-priority": priority,
        "Content-Type": "application/json",
        correlationId: correlationId,
      };

      const requestBody = JSON.stringify(encryptedPayload);

      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: requestBody,
      });

      if (!response.ok) {
        this.logger.error("API request failed", {
          status: response.status,
          statusText: response.statusText,
          url,
          method: "POST",
          payloadStructure: {
            service: encryptedPayload.service,
            encryptedKeyLength: encryptedPayload.encryptedKey?.length,
            encryptedDataLength: encryptedPayload.encryptedData?.length,
          },
        });
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
      }
      const responseText = await response.text();

      if (!responseText) {
        this.logger.error("Empty response from API");
        throw new Error("Empty response from API");
      }

      const encryptedResponse = JSON.parse(responseText);

      return this.decryptResponse(encryptedResponse);
    } catch (error) {
      this.logger.error(`Request failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // RESPONSE PARSING
  private parseFundTransferResponse(
    response: BankTransferResponse,
  ): ICICIFundTransferResponse {
    this.logger.log("ICICI Fund Transfer Response:", response);

    /**
     * ✅ ICICI IMPS SUCCESS
     */
    if (response?.ActCode === "0") {
      return {
        success: true,
        status: "SUCCESS",
        transactionId: response.TransRefNo,
        referenceNumber: response.BankRRN,
        message: response.Response,
        data: response,
      };
    }

    /**
     * ✅ Generic gateway success (NEFT / RTGS etc)
     */
    if (response?.success === true) {
      return {
        success: true,
        status: "SUCCESS",
        transactionId: response.TransRefNo || null,
        referenceNumber: response.BankRRN || null,
        message: response.Response,
        data: response,
      };
    }

    /**
     * ❌ Failure
     */
    return {
      success: false,
      status: "FAILED",
      errorCode: response?.ActCode || "UNKNOWN",
      message: response?.Response || "Transaction failed",
      data: response,
      transactionId: "",
      referenceNumber: "",
    };
  }

  private parseStatusResponse(
    response: any,
    request: ICICIStatusCheckRequest,
  ): ICICIStatusCheckResponse {
    if (request.priority === ICICIPriorityEnum.IMPS) {
      if (response.ImpsResponse?.CheckStatusCode === "0") {
        return {
          success: true,
          status: "SUCCESS",
          originalTransactionStatus: response.ImpsResponse?.ActCode,
          currentTransactionStatus: response.ImpsResponse?.CheckStatusMessage,
          bankRRN: response.BankRRN,
          message: response.Response,
          data: response,
        };
      } else {
        return {
          success: false,
          status: "FAILED",
          errorCode: response.ImpsResponse?.CheckStatusCode,
          message: response.ImpsResponse?.CheckStatusMessage,
          data: response,
        };
      }
    }

    if (request.priority === ICICIPriorityEnum.NEFT) {
      if (response.RESPONSE === "SUCCESS") {
        this.logger.log("NEFT status check SUCCESS");
        return {
          success: true,
          status: "SUCCESS",
          originalTransactionStatus: response.STATUS,
          currentTransactionStatus: response.STATUS,
          utrNumber: response["UTR NUMBER"],
          message: response.RESPONSE,
          data: response,
        };
      } else {
        this.logger.warn("NEFT status check FAILED");
        return {
          success: false,
          status: "FAILED",
          errorCode: response.ErrorCode,
          message: response.MESSAGE || response.RESPONSE,
          data: response,
        };
      }
    }

    this.logger.warn("Unknown status response format");
    return {
      success: false,
      status: "UNKNOWN",
      message: "Unknown status response",
      data: response,
    };
  }

  // HELPER METHODS
  private formatDateTime(date: Date): string {
    const result = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}${date.getHours().toString().padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}${date.getSeconds().toString().padStart(2, "0")}`;
    return result;
  }

  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    let result;
    if (format === "MM/DD/YYYY") {
      result = `${month}/${day}/${year}`;
    } else {
      result = `${day}/${month}/${year}`;
    }

    return result;
  }
}
