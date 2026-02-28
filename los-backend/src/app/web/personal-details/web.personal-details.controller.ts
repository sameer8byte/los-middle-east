import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { WebPersonalDetailsService } from "./web.personal-details.service";
import { AuthType } from "src/common/decorators/auth.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  CreateAlternateAddressDocumentProofDto,
  CreateUserDetailsDocumentProofDto,
} from "./dto/user-details-document-proof.dto";
import { UpdateUserDetailsDto } from "src/shared/user-details/dto/update-user-details.dto";
import { UpdateGeolocationDto } from "./dto/update-geolocation.dto";

@AuthType("web")
@Controller("web/personal-details")
export class WebPersonalDetailsController {
  constructor(
    private readonly webPersonalDetailsService: WebPersonalDetailsService,
  ) {}

  @Get(":id")
  async getUserDetails(@Param("id") id: string) {
    const userDetails =
      await this.webPersonalDetailsService.getPersonalDetails(id);
    return userDetails;
  }

  @Post(":id")
  async updateUserDetails(
    @Param("id") id: string,
    @Body() dto: UpdateUserDetailsDto,
  ) {
    const userDetails =
      await this.webPersonalDetailsService.updatePersonalDetails(id, dto);
    if (!userDetails) {
      throw new NotFoundException(`User details with id ${id} not found`);
    }
    return userDetails;
  }

  @Get("alternate-address/:userId")
  async getAlternateAddress(@Param("userId") userId: string) {
    const alternateAddress =
      await this.webPersonalDetailsService.getAlternateAddress(userId);
    return alternateAddress;
  }

  @Patch("alternate-address/:userId")
  async upsertAlternateAddress(
    @Param("userId") userId: string,
    @Body() dto: UpdateUserDetailsDto,
  ) {
    const alternateAddress =
      await this.webPersonalDetailsService.upsertAlternateAddress(userId, dto);
    if (!alternateAddress) {
      throw new NotFoundException(
        `Alternate address with user id ${userId} not found`,
      );
    }
    return alternateAddress;
  }

  @Patch("user-details-document-proof")
  @UseInterceptors(FileInterceptor("file"))
  async uploadUserDetailsDocumentProof(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: CreateUserDetailsDocumentProofDto,
  ) {
    return await this.webPersonalDetailsService.uploadUserDetailsDocumentProof(
      data.userDetailsId,
      data.addressProofType,
      file,
    );
  }

  @Patch("remove-user-details-document-proof")
  async removeUserDetailsDocumentProof(
    @Body("userDetailsId") userDetailsId: string,
  ) {
    return await this.webPersonalDetailsService.removeUserDetailsDocumentProof(
      userDetailsId,
    );
  }

  @Patch("alternate-address-document-proof")
  @UseInterceptors(FileInterceptor("file"))
  async uploadAlternateAddressDocumentProof(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: CreateAlternateAddressDocumentProofDto,
  ) {
    return await this.webPersonalDetailsService.uploadAlternateAddressDocumentProof(
      data.brandId,
      data.userId,
      data.alternateAddressId,
      data.addressProofType,
      file,
    );
  }

  @Patch("remove-alternate-address-document-proof")
  async removeAlternateAddressDocumentProof(
    @Body("alternateAddressId") alternateAddressId: string,
  ) {
    return await this.webPersonalDetailsService.removeAlternateAddressDocumentProof(
      alternateAddressId,
    );
  }

  //getUserGeoTags
  @Get("geo-tags/:userId")
  async getUserGeoTags(@Param("userId") userId: string) {
    return await this.webPersonalDetailsService.getUserGeoTags(userId);
  }

  // Update user geolocation
  @Post("geolocation/:id")
  async updateUserGeolocation(
    @Param("id") id: string,
    @Body() dto: UpdateGeolocationDto,
  ) {
    return await this.webPersonalDetailsService.updateUserGeolocation(
      id,
      dto.geoLatitude,
      dto.geoLongitude,
    );
  }
}
