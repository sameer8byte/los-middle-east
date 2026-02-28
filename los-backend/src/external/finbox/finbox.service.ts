import { Injectable, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { AxiosError } from "axios";
import { PrismaService } from "src/prisma/prisma.service";
import { FinboxConfig } from "./interfaces/finbox-config.interface";
import { UploadStatementDto } from "./dto/upload-statement.dto";
import { CreateSessionDto } from "./dto/create-session.dto";
import * as FormData from "form-data"; // Make sure you are importing form-data
import * as dayjs from "dayjs";

// Access the default function from the namespace import
const _dayjs = dayjs.default;

@Injectable()
export class FinboxService {
  constructor(
    private readonly httpService: HttpService,
    @Inject("FINBOX_CONFIG") private readonly config: FinboxConfig,
    private readonly prisma: PrismaService,
  ) {}

  private getHeaders() {
    return {
      base_url: this.config.baseUrl,
      "x-api-key": this.config.secretKey,
      "server-hash": this.config.serverHash,
      "Content-Type": "application/json",
    };
  }

  //   {{base_url}}/bank-connect/v1/session/
  async createSession(
    userId: string,
    brandId: string,
    userBankAccountId: string,
    bankAccountStatementId: string,
    dto: CreateSessionDto,
  ) {
    const url = `${this.config.baseUrl}/bank-connect/v1/session/`;
    const headers = this.getHeaders();
    const body = {
      api_key: this.config.secretKey,
      link_id: userId,
      //   01/04/2025
      from_date: _dayjs(dto.from_date).format("DD/MM/YYYY"),
      to_date: _dayjs(dto.to_date).format("DD/MM/YYYY"),
      redirect_url: dto.redirect_url,
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url, body, { headers }),
      );

      await this.prisma.finboxSomeTable.create({
        data: {
          userId,
          userBankAccountId,
          bankAccountStatementId,
          sessionId: data.session_id,
          sessionResponse: data,
        },
        //   sessionId: data.session_id,
      });
      return data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data || "Error creating session",
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        "Error creating session",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // {{base_url}}/bank-connect/v1/statement/upload_session/

  async uploadSession(
    userId: string,
    brandId: string,
    // file: Express.Multer.File,
    dto: UploadStatementDto,
  ) {
    const url = `${this.config.baseUrl}/bank-connect/v1/statement/upload_session/`;
    const headers = this.getHeaders();
    const formData = new FormData.default();
    formData.append("api_key", this.config.secretKey);
    formData.append("file_url", dto.file_url);
    formData.append("bank_name", dto.bank_name);
    formData.append("session_id", dto.session_id);
    formData.append("upload_type", dto.upload_type);
    if (dto.pdf_password) {
      formData.append("pdf_password", dto.pdf_password);
    }
    // formData.append("file", new Blob([file.buffer]), {
    //   filename: file.originalname,
    //   contentType: file.mimetype,
    // });

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url, formData, {
          headers: {
            ...headers,
            ...formData.getHeaders(), // Merge form-data headers
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }),
      );

      await this.prisma.finboxSomeTable.update({
        where: {
          sessionId: dto.session_id,
        },
        data: {
          statementId: data.statement_id,
          statementUploadSession: data,
        },
        //   sessionId: data.session_id,
      });
      return data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data || "Error uploading session",
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        "Error uploading session",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // {{base_url}}/bank-connect/v1/session_data/{{session_id}}/session_upload_status/
  async getSessionUploadStatus(
    userId: string,
    brandId: string,
    sessionId: string,
  ) {
    const url = `${this.config.baseUrl}/bank-connect/v1/session_data/${sessionId}/session_upload_status/`;
    const headers = this.getHeaders();

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers }),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data || "Error fetching session upload status",
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        "Error fetching session upload status",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // {{base_url}}/bank-connect/v1/session_data/{{session_id}}/statement/
  async getStatus(userId: string, brandId: string, sessionId: string) {
    const url = `${this.config.baseUrl}/bank-connect/v1/session_data/${sessionId}/statement/`;
    const headers = this.getHeaders();

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers }),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data || "Error fetching statement",
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        "Error fetching statement",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //   {{base_url}}/bank-connect/v1/session_data/{{session_id}}/initiate_processing/
  async initiateProcessing(userId: string, brandId: string, sessionId: string) {
    const url = `${this.config.baseUrl}/bank-connect/v1/session_data/${sessionId}/initiate_processing/`;
    const headers = this.getHeaders();
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url, {}, { headers }),
      );
      await this.prisma.finboxSomeTable.update({
        where: {
          sessionId: sessionId,
        },
        data: {
          initiateProcessing: data,
        },
        //   sessionId: data.session_id,
      });
      return data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data || "Error initiating processing",
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        "Error initiating processing",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // {{base_url}}/bank-connect/v1/session_data/{{session_id}}/progress/
  async getProgress(userId: string, brandId: string, sessionId: string) {
    const url = `${this.config.baseUrl}/bank-connect/v1/session_data/${sessionId}/progress/`;
    const headers = this.getHeaders();

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers }),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data || "Error fetching progress",
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        "Error fetching progress",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // {{base_url}}/bank-connect/v1/session_data/{{session_id}}/session_status/
  async getSessionStatus(userId: string, brandId: string, sessionId: string) {
    const url = `${this.config.baseUrl}/bank-connect/v1/session_data/${sessionId}/session_status/`;
    const headers = this.getHeaders();

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers }),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data || "Error fetching session status",
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        "Error fetching session status",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // {{base_url}}/bank-connect/v1/session_data/{{session_id}}/insights/
  async getInsights(userId: string, brandId: string, sessionId: string) {
    const url = `${this.config.baseUrl}/bank-connect/v1/session_data/${sessionId}/insights/`;
    const headers = this.getHeaders();

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers }),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data || "Error fetching insights",
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        "Error fetching insights",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // {{base_url}}/bank-connect/v1/session_data/{{session_id}}/get_pdfs/
  async getPdfs(userId: string, brandId: string, sessionId: string) {
    const url = `${this.config.baseUrl}/bank-connect/v1/session_data/${sessionId}/get_pdfs/`;
    const headers = this.getHeaders();

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers }),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data || "Error fetching PDFs",
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        "Error fetching PDFs",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // {{base_url}}/bank-connect/v1/banks/catalogue
  async getBanks() {
    const url = `${this.config.baseUrl}/bank-connect/v1/banks/catalogue`;
    const headers = this.getHeaders();

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers }),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data || "Error fetching banks",
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        "Error fetching banks",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // {{base_url}}/bank-connect/v1/session_data/{{session_id}}/delete/
  async deleteSession(userId: string, brandId: string, sessionId: string) {
    const url = `${this.config.baseUrl}/bank-connect/v1/session_data/${sessionId}/delete/`;
    const headers = this.getHeaders();

    try {
      const response = await firstValueFrom(
        this.httpService.delete(url, { headers }),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data || "Error deleting session",
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        "Error deleting session",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateWebhook(
    userId: string,
    brandId: string,
    sessionId: string,
    webhookUrl: string,
  ) {
    const url = `${this.config.baseUrl}/bank-connect/v1/session_data/update_webhook/`;
    const headers = this.getHeaders();

    const body = {
      session_id: sessionId,
      webhook_url: webhookUrl,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, body, { headers }),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data || "Error updating webhook",
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        "Error updating webhook",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
