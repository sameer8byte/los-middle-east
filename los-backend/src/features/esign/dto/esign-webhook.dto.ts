// src/your-module/dto/esign-webhook.dto.ts

import { IsString } from "class-validator";

export class EsignWebhookDto {
  @IsString()
  status: string;

  @IsString()
  message: string;

  @IsString()
  document_id: string;

  @IsString()
  signer_id: string;
}
