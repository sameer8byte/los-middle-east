import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private privateKey: string;
  private privateKeyPassphrase: string;

  constructor(private configService: ConfigService) {
    const privateKeyPath = this.configService.get<string>('PRIVATE_KEY_PATH');
    this.privateKeyPassphrase = this.configService.get<string>('PRIVATE_KEY_PASSPHRASE');
    
    // Check if the file exists before trying to read it
    if (!privateKeyPath) {
      this.logger.warn('PRIVATE_KEY_PATH environment variable not set');
      this.privateKey = '';
    } else if (!fs.existsSync(privateKeyPath)) {
      this.logger.warn(`Private key file not found at: ${privateKeyPath}`);
      this.privateKey = '';
    } else {
      try {
        this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      } catch (error) {
        this.logger.error(`Failed to read private key file: ${error.message}`);
        this.privateKey = '';
      }
    }
  }

decryptRequest(
  encryptedFlowData: string,
  encryptedAesKey: string,
  initialVector: string,
): { decryptedData: any; aesKey: Buffer } {
  if (!this.privateKey) {
    const error = new Error('Private key not loaded - cannot decrypt. Please configure PRIVATE_KEY_PATH environment variable.');
    this.logger.error(error.message);
    throw error;
  }

  try {
    // Decrypt the AES key using RSA private key
    const decryptedAesKey = crypto.privateDecrypt(
      {
        key: this.privateKey,
        passphrase: this.privateKeyPassphrase,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(encryptedAesKey, 'base64'),
    );

    // Decrypt the flow data using AES-128-GCM
    const flowDataBuffer = Buffer.from(encryptedFlowData, 'base64');
    const initialVectorBuffer = Buffer.from(initialVector, 'base64');

    const TAG_LENGTH = 16;
    const encrypted = flowDataBuffer.subarray(0, flowDataBuffer.length - TAG_LENGTH);
    const tag = flowDataBuffer.subarray(flowDataBuffer.length - TAG_LENGTH);

    const decipher = crypto.createDecipheriv(
      'aes-128-gcm',
      decryptedAesKey,
      initialVectorBuffer,
    );
    decipher.setAuthTag(tag);

    const decryptedData = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return {
      decryptedData: JSON.parse(decryptedData.toString('utf-8')),
      aesKey: decryptedAesKey, // Return the decrypted AES key as Buffer
    };
  } catch (error) {
    this.logger.error('Decryption error:', error);
    throw error;
  }
}

encryptResponse(
  response: any,
  aesKey: Buffer, // Accept Buffer, not string
  initialVector: string,
): string {
  try {
    const responseString = JSON.stringify(response);
    // Flip the initialization vector
    const ivBuffer = Buffer.from(initialVector, 'base64');
    const flippedIv = Buffer.from(ivBuffer.map(byte => byte ^ 0xFF));
    
    const cipher = crypto.createCipheriv(
      'aes-128-gcm',
      aesKey, 
      flippedIv,
    );

    const encrypted = Buffer.concat([
      cipher.update(responseString, 'utf8'),
      cipher.final(),
    ]);

    return Buffer.concat([encrypted, cipher.getAuthTag()]).toString('base64');
  } catch (error) {
    this.logger.error('Encryption error:', error);
    throw error;
  }
}
}