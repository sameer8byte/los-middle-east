import { Injectable, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { AxiosError } from "axios";
import { GeoCodingConfig } from "./interfaces/geocoding-config.interface";

@Injectable()
export class GeoCodingService {
  constructor(
    private readonly httpService: HttpService,
    @Inject("GEOCODING_CONFIG") private readonly config: GeoCodingConfig
  ) {}

  private getHeaders() {
    return {
      "Content-Type": "application/json",
    };
  }

  async getFullAddressDetails(
    latitude: number,
    longitude: number
  ): Promise<{
    formattedAddress: string;
    postalCode?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    street?: string;
    sublocality?: string;
    latitude: number;
    longitude: number;
  }> {
    const url = `${this.config.baseUrl}/geocode/json?latlng=${latitude},${longitude}&key=${this.config.apiKey}`;
    const headers = this.getHeaders();

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, { headers })
      );
      if (data.status !== "OK" || data.results.length === 0) {
        throw new HttpException("No address found", HttpStatus.NOT_FOUND);
      }

      const result = data.results[0];
      const components = result.address_components;

      const getComponent = (type: string) =>
        components.find((c) => c.types.includes(type))?.long_name;

      return {
        formattedAddress: result.formatted_address,
        postalCode: getComponent("postal_code"),
        city: getComponent("locality") || getComponent("postal_town"),
        district: getComponent("administrative_area_level_2"),
        state: getComponent("administrative_area_level_1"),
        country: getComponent("country"),
        street: getComponent("route"),
        sublocality:
          getComponent("sublocality_level_1") || getComponent("sublocality"),
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      };
    } catch (error) {
      console.error(
        "Error fetching address:",
        {
          latitude,
          longitude,
        },
        error
      );
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data || "Error fetching address",
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw new HttpException(
        "Error fetching address",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
