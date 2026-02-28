export interface DecryptedDataDto {
  action: string;
  screen: string;
  data: any;
  version: string;
  flow_token: string;
  phone_number?: string;
}