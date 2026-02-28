import { HttpService } from "@nestjs/axios";
import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { PdfService } from "src/core/pdf/pdf.service";
import { stateCode } from "src/utils/stateCode";
import { Parser } from "xml2js";

const EQUIFAX_BASE_URL = process.env.EQUIFAX_BASE_URL;
const EQUIFAX_CIR360_ENDPOINT = process.env.EQUIFAX_CIR360_ENDPOINT;
const EQUIFAX_SOAP_ENDPOINT = process.env.EQUIFAX_SOAP_ENDPOINT;
const EQUIFAX_CUSTOMER_ID = process.env.EQUIFAX_CUSTOMER_ID;
const EQUIFAX_USER_ID = process.env.EQUIFAX_USER_ID;
const EQUIFAX_PASSWORD = process.env.EQUIFAX_PASSWORD;
const EQUIFAX_MEMBER_NUMBER = process.env.EQUIFAX_MEMBER_NUMBER;
const EQUIFAX_SECURITY_CODE = process.env.EQUIFAX_SECURITY_CODE;
const EQUIFAX_CUST_REF_FIELD = process.env.EQUIFAX_CUST_REF_FIELD;
const EQUIFAX_PRODUCT_CODE = process.env.EQUIFAX_PRODUCT_CODE;
const EQUIFAX_PRODUCT_VERSION = process.env.EQUIFAX_PRODUCT_VERSION;

@Injectable()
export class EquifaxService {
  private readonly logger = new Logger(EquifaxService.name);

  constructor(
    private readonly httpService: HttpService
    // private readonly pdfService: PdfService,
  ) {}

  async fetchCibil({
    fName,
    mName,
    lName,
    dob,
    mobile,
    pan,
    pinCode,
    city,
    leadState,
  }: {
    fName: string;
    mName: string;
    lName: string;
    dob: string;
    mobile: string;
    pan: string;
    pinCode: string;
    city: string;
    leadState: string;
  }) {
    if (!fName || !lName || !dob || !mobile || !pan || !pinCode) {
      throw new HttpException(
        "Missing required parameters",
        HttpStatus.BAD_REQUEST
      );
    }

    const state = stateCode(leadState);
    if (!state) {
      throw new HttpException("Invalid state code", HttpStatus.BAD_REQUEST);
    }
    const data = {
      RequestHeader: {
        CustomerId: EQUIFAX_CUSTOMER_ID,
        UserId: EQUIFAX_USER_ID,
        Password: EQUIFAX_PASSWORD,
        MemberNumber: EQUIFAX_MEMBER_NUMBER,
        SecurityCode: EQUIFAX_SECURITY_CODE,
        CustRefField: EQUIFAX_CUST_REF_FIELD,
        ProductCode: [EQUIFAX_PRODUCT_CODE],
      },
      RequestBody: {
        InquiryPurpose: "00",
        FirstName: fName,
        MiddleName: mName ?? "",
        LastName: lName ?? "",
        DOB: dob,
        InquiryAddresses: [
          {
            seq: "1",
            AddressType: ["H"],
            AddressLine1: `${city}`,
            State: `${state}`,
            Postal: `${pinCode}`,
          },
        ],
        InquiryPhones: [
          {
            seq: "1",
            Number: mobile.startsWith("+91") ? mobile.substring(3) : mobile,
            PhoneType: ["M"],
          },
        ],
        IDDetails: [
          { seq: "1", IDType: "T", IDValue: pan, Source: "Inquiry" },
          { seq: "2", IDType: "P", IDValue: "", Source: "Inquiry" },
          { seq: "3", IDType: "V", IDValue: "", Source: "Inquiry" },
          { seq: "4", IDType: "D", IDValue: "", Source: "Inquiry" },
          { seq: "5", IDType: "M", IDValue: "", Source: "Inquiry" },
          { seq: "6", IDType: "R", IDValue: "", Source: "Inquiry" },
          { seq: "7", IDType: "O", IDValue: "", Source: "Inquiry" },
        ],
        MFIDetails: {
          FamilyDetails: [
            { seq: "1", AdditionalNameType: "K01", AdditionalName: "" },
            { seq: "2", AdditionalNameType: "K01", AdditionalName: "" },
          ],
        },
        CustomFields: [
          {
            key: "EmbeddedPdf",
            value: "Y",
          },
        ],
      },
      Score: [
        {
          Type: "ERS",
          Version: "4.0",
        },
      ],
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(EQUIFAX_CIR360_ENDPOINT, data, {
          headers: { "Content-Type": "application/json" },
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error("Error in fetchCibil", error);
      throw new HttpException(
        error?.response?.data || error.message || "Unknown error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
