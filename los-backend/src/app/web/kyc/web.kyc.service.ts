import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { DigitapService } from "src/external/digitap/digitap.service";
import {
  Document,
  DocumentTypeEnum,
  document_status_enum,
} from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateKycDto } from "./dto/kyc.dto";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { CreateAlternatePhoneNumberDto } from "./dto/alternate-phone-number.dto";
import {
  AadhaarKycApiResponse,
  DigitapUnifiedUrlResponse,
} from "src/libs/interfaces/digitap";
import { DocumentsService } from "src/shared/documents/documents.service";
import { PanAadhaarService } from "src/shared/pan-aadhaar/pan-aadhaar.service";
import { SmsService } from "src/core/communication/services/sms.service";
import { PanDetailsPlusService } from "src/external/panDetailsPlus";
import { DigiLocker20Service } from "src/external/digiLocker2.0";

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly digitapService: DigitapService,
    private readonly digiLocker20Service: DigiLocker20Service,
    private readonly documentsService: DocumentsService,
    private readonly panAadhaarService: PanAadhaarService,
    private readonly awsS3Service: AwsPublicS3Service, // Assuming you have an AwsService for S3 uploads,
    private readonly smsService: SmsService, // Assuming you have an SmsService for sending SMS
    private readonly panDetailsPlusService: PanDetailsPlusService,
  ) {}

  private async validateUserAndDocument(
    userId: string,
    documentType: DocumentTypeEnum,
    documentNumber: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { brand: true },
    });

    // Check if the same document already exists with different userId
    const isDublicate = await this.prisma.document.findFirst({
      where: {
        documentNumber,
        type: documentType,
        userId: { not: userId },
        user: { brandId: user?.brandId },
      },
    });

    // Check if the document number already exists for another user
    if (isDublicate) {
      throw new BadRequestException(
        `Document with number ${documentNumber} already exists for another user`,
      );
    }

    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    const existingDoc = await this.documentsService.getDocumentByType(
      userId,
      documentType,
    );

    if (existingDoc) {
      switch (existingDoc.status) {
        case document_status_enum.APPROVED:
          throw new BadRequestException("Your document is already approved");
        case document_status_enum.REJECTED:
          throw new BadRequestException("Your document is rejected");
      }
    }
    return { user, existingDoc };
  }

  private async createOrUpdateDocument(
    userId: string,
    dto: CreateKycDto,
    existingDoc?: Document,
  ) {
    if (existingDoc) {
      await this.documentsService.update(existingDoc.id, userId, {
        documentNumber: dto.documentNumber,
        frontDocumentUrl: dto.frontDocumentUrl,
        backDocumentUrl: dto.backDocumentUrl,
      });
      return { ...existingDoc, documentNumber: dto.documentNumber };
    }

    return this.prisma.document.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async aadhaar(userId: string, dto: CreateKycDto) {
    const { user, existingDoc } = await this.validateUserAndDocument(
      userId,
      dto.type,
      dto.documentNumber,
    );
    const aadhaar = await this.createOrUpdateDocument(
      user.id,
      dto,
      existingDoc,
    );
    const digitapData = await this.digiLocker20Service.generateUrlWithFallback({
      userId: user.id,
      brandId: user.brandId,
    });
    return {
      aadhaar: aadhaar,
      digitapData,
    };
  }
  // new method to verify aadhar using digitap service
  async verifyAadharKyc(userId: string, brandId: string) {
    const digiLocker20 = await this.digiLocker20Service.generateUrlWithFallback(
      {
        userId,
        brandId,
      },
    );
    return digiLocker20;
  }

  // Get the last two successful DigiLocker URLs for a user
  async getRecentDigiLockerUrls(userId: string, brandId: string) {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      const recentLogs = await this.prisma.aadhaar_digi_locker_log.findMany({
        where: {
          userId,
          brandId,
          status: "SUCCESS",
          createdAt: {
            gte: fifteenMinutesAgo,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 2,
        select: {
          id: true,
          provider: true,
          response: true,
          createdAt: true,
          digiLockerId: true,
        },
      });

      const formattedUrls = recentLogs.map((log) => {
        const resp = log.response as any;

        // extract url safely from both formats
        const url =
          resp?.url ||
          resp?.result?.url ||
          resp?.model?.url ||
          resp?.result?.model?.url ||
          "";

        const isValid = !!url;

        return {
          id: log.id,
          url,
          provider: log.provider,
          createdAt: log.createdAt,
          digiLockerId: log.digiLockerId,
          isValid,
        };
      });

      return {
        success: true,
        urls: formattedUrls,
        hasValidUrls: formattedUrls.some((u) => u.isValid),
      };
    } catch (error: any) {
      console.error("Error fetching recent DigiLocker URLs:", error);
      return {
        success: false,
        urls: [],
        hasValidUrls: false,
        error: error.message,
      };
    }
  }

  async verifyAadhar(userId: string) {
    // Step 1: Validate user and existing Aadhaar document
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        documents: {
          where: { type: DocumentTypeEnum.AADHAAR },
          select: {
            id: true,
            type: true,
            status: true,
            frontDocumentUrl: true,
            backDocumentUrl: true,
            documentNumber: true,
          },
        },
      },
    });

    const documentId = user?.documents?.[0]?.id;
    // Check if the user exists
    if (!documentId) {
      throw new BadRequestException("Aadhaar document not found for the user.");
    }

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const document = await this.documentsService.findOne(documentId);
    // Check if the document exists
    if (!document) {
      throw new BadRequestException("Document not found.");
    }
    // Check if the document belongs to the user
    const { type, status } = document;
    // Check if the document type is AADHAAR
    if (type !== "AADHAAR") {
      throw new BadRequestException("Invalid document type.");
    }
    // Check if the document is already approved
    if (status === "APPROVED") {
      return document;
    }
    // Check if the document is rejected
    if (status === "REJECTED") {
      throw new BadRequestException("Document has been rejected.");
    }

    const digitapSomeTable = await this.prisma.digitapSomeTable.findUnique({
      where: {
        userId_brandId: {
          userId: user.id,
          brandId: user.brandId,
        },
      },
      select: {
        kycUnifiedv1GenerateUrl: true,
        kycUnifiedv1Details: true,
      },
    });
    if (!digitapSomeTable) {
      throw new BadRequestException("Digitap data not found for the user.");
    }
    // Step 2: Verify Aadhaar document using Digitap service
    const kycUnifiedv1GenerateUrl: DigitapUnifiedUrlResponse =
      digitapSomeTable.kycUnifiedv1GenerateUrl as unknown as DigitapUnifiedUrlResponse;
    if (!kycUnifiedv1GenerateUrl) {
      throw new BadRequestException("KYC URL not found for the user.");
    }
    const unifiedTransactionId =
      kycUnifiedv1GenerateUrl.model.unifiedTransactionId;
    if (!unifiedTransactionId) {
      throw new BadRequestException("Unified transaction ID not found.");
    }
    function getFormattedResponse(jsonData: AadhaarKycApiResponse) {
      const model = jsonData?.model;
      const address = model?.address;

      return {
        personalDetails: {
          name: model?.name ?? "",
          dob: model?.dob ?? "",
          gender: model?.gender ?? "",
          careOf: model?.careOf ?? "",
          aadhaarNumber: model?.maskedAdharNumber ?? "",
        },
        addressDetails: {
          house: address?.house ?? "",
          street: address?.street ?? "",
          landmark: address?.landmark ?? "",
          locality: address?.loc ?? "",
          postOfficeName: address?.po ?? "",
          subDistrict: address?.subdist ?? "",
          district: address?.dist ?? "",
          state: address?.state ?? "",
          country: address?.country ?? "",
          pincode: address?.pc ?? "",
          vtcName: address?.vtc ?? "",
        },
        documentLinks: {
          downloadLink: model?.pdfLink ?? "",
          xmlLink: model?.link ?? "",
          imageBase64: model?.image ?? "",
        },
        verification: {
          isXmlValid: !!model?.link,
          passCode: model?.passCode ?? "",
          uniqueId: model?.uniqueId ?? "",
          referenceId: model?.referenceId ?? "",
          source: model?.source ?? "",
        },
      };
    }

    const data = await this.digitapService.getUnifiedKycDetails(
      userId,
      user.brandId,
      unifiedTransactionId,
    );

    // check if pen card is in brand blocklist
    const isBlocked = await this.prisma.brandBlocklistedAadhar.findUnique({
      where: {
        aadharNumber_brandId: {
          aadharNumber: document.documentNumber,
          brandId: user.brandId,
        },
      },
    });
    if (isBlocked) {
      throw new BadRequestException("Aadhaar number is blocked.");
    }

    //document.documentNumber
    await this.prisma.userDetails.update({
      where: { userId: userId },
      data: {
        aAdharName: data?.model?.name ?? "",
      },
    });

    return this.prisma.document.update({
      where: {
        id: documentId,
      },
      data: {
        status: document_status_enum.APPROVED,
        verifiedAt: new Date(),
        providerData: JSON.parse(JSON.stringify(getFormattedResponse(data))),
      },
    });
  }

  async aadharDocumentUpload(data) {
    // get the userId from the file metadata
    const userId = data.userId;

    // Step 1: Validate user and existing Aadhaar document (if any)
    if (!userId) {
      throw new BadRequestException("User ID is required");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { brand: true },
    });
    // Step 2: Upload the document to S3
    const fileUrl = await this.awsS3Service.uploadPrivateDocument(
      data.file,

      user.brandId,
      userId,
      data.documentType,
    );

    // check document exists
    const existingDoc = await this.documentsService.getDocumentByType(
      userId,
      DocumentTypeEnum.AADHAAR,
    );

    if (existingDoc) {
      await this.documentsService.update(existingDoc.id, userId, {
        frontDocumentUrl:
          data.side === "front" ? fileUrl.key : existingDoc.frontDocumentUrl,
        backDocumentUrl:
          data.side === "back" ? fileUrl.key : existingDoc.backDocumentUrl,
      });
      return {
        ...existingDoc,
        frontDocumentUrl:
          data.side === "front" ? fileUrl.key : existingDoc.frontDocumentUrl,
        backDocumentUrl:
          data.side === "back" ? fileUrl.key : existingDoc.backDocumentUrl,
      };
    }
    // Step 3: Create or update Aadhaar document
    const aadhaarDoc = await this.prisma.document.create({
      data: {
        type: DocumentTypeEnum.AADHAAR,
        userId,
        frontDocumentUrl: data.side === "front" ? fileUrl.key : null,
        backDocumentUrl: data.side === "back" ? fileUrl.key : null,
        documentNumber: data.documentNumber,
      },
    });

    if (!aadhaarDoc) {
      throw new BadRequestException("Failed to save Aadhaar document.");
    }

    if (aadhaarDoc.status === document_status_enum.REJECTED) {
      throw new BadRequestException("Aadhaar document is rejected.");
    }

    return aadhaarDoc;
  }

  async pan(userId: string, dto: CreateKycDto) {
    // Step 1: Validate user and existing PAN document (if any)
    const { user, existingDoc } = await this.validateUserAndDocument(
      userId,
      dto.type,
      dto.documentNumber,
    );

    // Step 3: Create or update PAN document
    const panDoc = await this.createOrUpdateDocument(user.id, dto, existingDoc);

    if (!panDoc) {
      throw new BadRequestException("Failed to save PAN document.");
    }

    if (panDoc.status === document_status_enum.REJECTED) {
      throw new BadRequestException("PAN document is rejected.");
    }

    // Step 4: Return existing verification if found
    const existingVerification = await this.panAadhaarService.findOne(
      panDoc.id,
    );

    if (existingVerification) {
      if (panDoc.status !== document_status_enum.APPROVED) {
        await this.documentsService.update(panDoc.id, userId, {
          status: document_status_enum.APPROVED,
        });
      }
      return existingVerification;
    }

    // check if pen card is in brand blocklist
    const isBlocked = await this.prisma.brandBlocklistedPan.findUnique({
      where: {
        pancard_brandId: {
          pancard: dto.documentNumber,
          brandId: user.brandId,
        },
      },
    });

    if (isBlocked) {
      throw new BadRequestException("PAN card is blocked.");
    }

    const panVerification =
      await this.panDetailsPlusService.verifyPanWithFallback(
        dto.documentNumber,
        userId,
        user.brandId,
      );
    if (!panVerification.success) {
      throw new BadRequestException("Failed to verify PAN document.");
    }

    const document = await this.prisma.document.update({
      where: { id: panDoc.id },
      data: {
        status: document_status_enum.APPROVED,
        verifiedAt: new Date(),
        providerData: panVerification.raw,
      },
      include: {
        user: {
          include: {
            userDetails: {
              select: {
                firstName: true,
                lastName: true,
                middleName: true,
                dateOfBirth: true,
              },
            },
          },
        },
      },
    });

    return {
      document,
      manualVerification: !(
        document?.user?.userDetails?.firstName &&
        document?.user?.userDetails?.lastName &&
        document?.user?.userDetails?.dateOfBirth
      ),
    };
  }

  async initiateAlternatePhoneNumberVerification(
    userId: string,
    dto: CreateAlternatePhoneNumberDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (dto.phone === user.phoneNumber) {
      throw new BadRequestException("Phone number already exists");
    }
    const isAlredyExists = await this.prisma.alternatePhoneNumber.findFirst({
      where: {
        userId: userId,
        phone: dto.phone,
        isVerified: true,
      },
    });

    if (isAlredyExists) {
      throw new BadRequestException("Alternate phone number already exists");
    }
    // generate otp 6 digit
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const updatePhone = await this.prisma.alternatePhoneNumber.upsert({
      where: {
        userId_phone: {
          userId: userId,
          phone: dto.phone,
        },
      },
      create: {
        userId: userId,
        phone: dto.phone,
        otp: otp,
        isVerified: false,
        relationship: dto.relationship,
        name: dto.name,
        label: dto.label,
      },
      update: {
        otp: otp,
        isVerified: false,
        relationship: dto.relationship,
        name: dto.name,
        label: dto.label,
      },
    });
    await this.smsService.sendSms({
      text: `Your OTP code is ${otp}`,
      to: dto.phone,
      otp: otp,
      name: dto.name,
    });
    return {
      id: updatePhone.id,
      userId: userId,
      phone: updatePhone.phone,
      label: updatePhone.label,
      isVerified: false,
      verifiedAt: null,
      name: updatePhone.name,
      relationship: updatePhone.relationship,
      verificationType: updatePhone.verificationType,
    };
  }

  async verifyAlternatePhoneNumber(
    userId: string,
    dto: { id: string; otp: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const alternatePhoneNumber =
      await this.prisma.alternatePhoneNumber.findUnique({
        where: { id: dto.id },
      });
    if (!alternatePhoneNumber) {
      throw new NotFoundException("Alternate phone number not found");
    }

    if (alternatePhoneNumber.otp !== dto.otp) {
      throw new BadRequestException("Invalid OTP");
    }

    return this.prisma.alternatePhoneNumber.update({
      where: { id: dto.id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
  }

  async manualPanUpload(data: {
    userId: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    dateOfBirth: string;
  }) {
    if (!data.userId) {
      throw new BadRequestException("User ID is required");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      include: { brand: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${data.userId} not found`);
    }

    const updateData: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
    };

    if (data.dateOfBirth) {
      updateData.dateOfBirth = new Date(data.dateOfBirth);
    }

    await this.prisma.userDetails.update({
      where: { userId: data.userId },
      data: updateData,
    });

    return {
      message: "PAN document approved via manual verification",
      status: true,
    };
  }
}
