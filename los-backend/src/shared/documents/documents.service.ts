import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateDocumentDto, UpdateDocumentDto } from "./dto";
import { PrismaService } from "../../prisma/prisma.service";
import { DocumentTypeEnum, user_data_status } from "@prisma/client";

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDocumentDto: CreateDocumentDto) {
    return this.prisma.document.create({
      data: {
        ...createDocumentDto,
        userId,
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.document.findMany({
      where: {
        userId,
      },
    });
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: {
        id,
      },
    });

    if (!document) {
      throw new NotFoundException(
        `Document with ID ${id} not found for this user`,
      );
    }

    return document;
  }

  async update(
    id: string,
    userId: string,
    updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.prisma.document.update({
      where: { id },
      data: updateDocumentDto,
    });
  }

  async remove(id: string) {
    // Check if document exists for this user
    await this.findOne(id);

    return this.prisma.document.delete({
      where: { id },
    });
  }
  async getDocumentByType(userId: string, type: DocumentTypeEnum) {
    return this.prisma.document.findUnique({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
    });
  }

  //  by findAllByUserId
  async findAllByUserId(userId: string) {
    return this.prisma.document.findMany({
      where: {
        userId,
      },
    });
  }

  /**
   *
   * @param userId
   * @param panNumber
   * @returns
   */
  async createNotVarifiedPanDocument(userId: string, panNumber: string | null) {
    const existingPanDoc = (await this.findAllByUser(userId)).find(
      (doc) => doc.type === DocumentTypeEnum.PAN,
    );

    if (!existingPanDoc) {
      return this.create(userId, {
        userId,
        type: DocumentTypeEnum.PAN,
        frontDocumentUrl: "",
        backDocumentUrl: "",
        documentNumber: panNumber,
      });
    }

    if (existingPanDoc.userDataStatus === user_data_status.NOT_VERIFIED) {
      return this.update(existingPanDoc.id, userId, {
        type: DocumentTypeEnum.PAN,
        documentNumber: existingPanDoc.documentNumber || panNumber,
        frontDocumentUrl: existingPanDoc.frontDocumentUrl || "",
        backDocumentUrl: existingPanDoc.backDocumentUrl || "",
      });
    }

    return existingPanDoc;
  }

  // create not verified document addhar number
  async createNotVarifiedAadhaarDocument(
    userId: string,
    adharNumber: string | null,
  ) {
    const existingAdharDoc = (await this.findAllByUser(userId)).find(
      (doc) => doc.type === DocumentTypeEnum.AADHAAR,
    );

    if (!existingAdharDoc) {
      return this.create(userId, {
        userId,
        type: DocumentTypeEnum.AADHAAR,
        frontDocumentUrl: "",
        backDocumentUrl: "",
        documentNumber: adharNumber,
      });
    }

    if (existingAdharDoc.userDataStatus === user_data_status.NOT_VERIFIED) {
      return this.update(existingAdharDoc.id, userId, {
        type: DocumentTypeEnum.AADHAAR,
        documentNumber: existingAdharDoc.documentNumber || adharNumber,
        frontDocumentUrl: existingAdharDoc.frontDocumentUrl || "",
        backDocumentUrl: existingAdharDoc.backDocumentUrl || "",
      });
    }

    return existingAdharDoc;
  }
}
