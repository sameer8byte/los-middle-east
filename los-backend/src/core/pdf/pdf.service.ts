import { BadRequestException, Injectable } from "@nestjs/common";
import * as ejs from "ejs";
import * as path from "path";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { Readable } from "stream";
import * as puppeteer from "puppeteer";
import { platform_type } from "@prisma/client";

@Injectable()
export class PdfService {
  constructor(private readonly awsS3Service: AwsPublicS3Service) {}
  private readonly isDev: boolean = process.env.NODE_ENV !== "production";

  async generatePdfFromTemplate(
    data: {
      [key: string]: any;
      brandId: string;
      userId: string;
    },
    templateName: string,
    platform: platform_type,
  ) {
    const tempPath = platform === platform_type.WEB ? "web" : "partner";
    const templatePath = this.isDev
      ? path.join(
          process.cwd(),
          "src",
          "templates",
          tempPath,
          "ejs",
          `${templateName}.ejs`,
        )
      : path.join(
          process.cwd(),
          "src",
          "templates",
          tempPath,
          "ejs",
          `${templateName}.ejs`,
        );

    const htmlContent = (await ejs.renderFile(templatePath, data)) as string;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();
    const pdf = Buffer.from(pdfBuffer);
    const file: Express.Multer.File = {
      fieldname: "file",
      originalname: `${data.userId}-${Date.now()}.pdf`,
      encoding: "7bit",
      mimetype: "application/pdf",
      buffer: pdf,
      size: pdf.length,
      destination: "",
      filename: "",
      path: "",
      stream: new Readable(),
    };
    const url = await this.awsS3Service.uploadPublicFile(
      file,
      data.brandId,
      data.userId,
      "documents",
    );
    return url;
  }

  async generatePdfFromHtml(
    htmlContent: string,
    brandId: string,
    userId: string,
  ) {
    const browser = await puppeteer.launch({
      // executablePath:
      //   process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();
    const pdf = Buffer.from(pdfBuffer);
    const file: Express.Multer.File = {
      fieldname: "file",
      originalname: `${userId}-${Date.now()}.pdf`,
      encoding: "7bit",
      mimetype: "application/pdf",
      buffer: pdf,
      size: pdf.length,
      destination: "",
      filename: "",
      path: "",
      stream: new Readable(),
    };
    const url = await this.awsS3Service.uploadPublicFile(
      file,
      brandId,
      userId,
      "documents",
    );
    return url;
  }

  async decodeBase64ToPdf(base64Data: string, brandId: string, userId: string) {
    // Remove data URL prefix if present (e.g., "data:application/pdf;base64,")
    const base64String = base64Data.replace(
      /^data:application\/pdf;base64,/,
      "",
    );

    try {
      const pdfBuffer = Buffer.from(base64String, "base64");

      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: `${userId}-${Date.now()}.pdf`,
        encoding: "7bit",
        mimetype: "application/pdf",
        buffer: pdfBuffer,
        size: pdfBuffer.length,
        destination: "",
        filename: "",
        path: "",
        stream: new Readable(),
      };
      const awsS3S = await this.awsS3Service.uploadPrivateDocument(
        file,
        brandId,
        userId,
        "documents",
      );
      return awsS3S;
    } catch (error) {
      throw new BadRequestException(
        `Failed to decode Base64 PDF: ${error.message}`,
      );
    }
  }

  async generatePdfBase64AndUploadToS3(
    data: any,
    templateName: string,
    platform: platform_type,
    brandId: string,
    userId: string,
  ): Promise<{ base64: string; s3Url: string }> {
    try {
      const tempPath = platform === platform_type.WEB ? "web" : "partner";
      const templatePath = this.isDev
        ? path.join(
            process.cwd(),
            "src",
            "templates",
            tempPath,
            "ejs",
            `${templateName}.ejs`,
          )
        : path.join(
            process.cwd(),
            "src",
            "templates",
            tempPath,
            "ejs",
            `${templateName}.ejs`,
          );

      const htmlContent = (await ejs.renderFile(templatePath, data)) as string;

      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
      });

      await browser.close();

      const base64 = Buffer.from(pdfBuffer).toString("base64");

      // Prepare Express.Multer.File
      const file: Express.Multer.File = {
        fieldname: "file",
        originalname: `${userId}-${Date.now()}.pdf`,
        encoding: "7bit",
        mimetype: "application/pdf",
        buffer: Buffer.from(pdfBuffer),
        size: pdfBuffer.length,
        destination: "",
        filename: "",
        path: "",
        stream: new Readable(),
      };

      // Always upload to public S3
      const s3Url = await this.awsS3Service.uploadPublicFile(
        file,
        brandId,
        userId,
        "documents",
      );

      return { base64, s3Url };
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate PDF and upload to S3: ${error.message}`,
      );
    }
  }

  async generatePdfBase64(
    data: any,
    templateName: string,
    platform: platform_type,
    brandId: string,
    userId: string,
  ): Promise<string> {
    try {
      const tempPath = platform === platform_type.WEB ? "web" : "partner";
      const templatePath = this.isDev
        ? path.join(
            process.cwd(),
            "src",
            "templates",
            tempPath,
            "ejs",
            `${templateName}.ejs`,
          )
        : path.join(
            process.cwd(),
            "src",
            "templates",
            tempPath,
            "ejs",
            `${templateName}.ejs`,
          );

      const htmlContent = (await ejs.renderFile(templatePath, data)) as string;

      const browser = await puppeteer.launch({
        // executablePath: !this.isDev
        //   ? process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium"
        //   : undefined,
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
      });

      await browser.close();

      const base64 = Buffer.from(pdfBuffer).toString("base64");

      return base64;
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate PDF and upload to S3: ${error.message}`,
      );
    }
  }
}
