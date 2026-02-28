// shared/http/http.service.ts
import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { lastValueFrom } from "rxjs";
import { AxiosRequestConfig } from "axios";

@Injectable()
export class HttpServiceWrapper {
  constructor(private readonly httpService: HttpService) {}

  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const response$ = this.httpService.request<T>(config);
    const response = await lastValueFrom(response$);
    return response.data;
  }
}
