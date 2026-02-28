import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { AddressProofEnum } from "@prisma/client";
import { AlternateAddressService } from "src/shared/alternate-address/alternate-address.service";
import { UpdateAlternateAddressDto } from "src/shared/alternate-address/dto/update-alternate-address.dto";
import { UpdateUserDetailsDto } from "src/shared/user-details/dto/update-user-details.dto";
import { UserDetailsService } from "src/shared/user-details/user-details.service";

@Injectable()
export class WebPersonalDetailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userDetailsService: UserDetailsService,
    private readonly alternateAddressService: AlternateAddressService,
    private readonly awsS3Service: AwsPublicS3Service,
  ) {}

  // get user details by id
  async getPersonalDetails(id: string) {
    const userDetails = await this.userDetailsService.findOne(id);
    if (!userDetails) {
      throw new NotFoundException(`User details with id ${id} not found`);
    }
    return userDetails;
  }

  // update user details
  async updatePersonalDetails(id: string, dto: UpdateUserDetailsDto) {
    const userDetails = await this.userDetailsService.update(id, dto);
    if (!userDetails) {
      throw new NotFoundException(`User details with id ${id} not found`);
    }
    return userDetails;
  }

  // get alternate address by user id
  async getAlternateAddress(userId: string) {
    const alternateAddress = await this.prisma.alternateAddress.findFirst({
      where: {
        userId: userId,
      },
    });

    return alternateAddress;
  }

  // upsert alternate address
  async upsertAlternateAddress(userId: string, dto: UpdateAlternateAddressDto) {
    // get user details
    const alternateAddress = await this.prisma.alternateAddress.findFirst({
      where: {
        userId: userId,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { brandId: true },
    });

    if (!alternateAddress) {
      // create new alternate address
      const newAlternateAddress = await this.prisma.alternateAddress.create({
        data: {
          userId: userId,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          pincode: dto.pincode,
          country: "India",
          residenceType: dto.residenceType,
          addressProofType: dto.addressProofType,
        },
      });
      if (!newAlternateAddress) {
        throw new NotFoundException(
          `Alternate address with user id ${userId} not found`
        );
      }
      return newAlternateAddress;
    }

    const updatedAddress = await this.prisma.alternateAddress.update({
      where: { id: alternateAddress.id },
      data: {
        ...dto,
      },
    });
    return updatedAddress;
  }

  // upload user details document proof
  async uploadUserDetailsDocumentProof(
    userDetailsId: string,
    addressProofType: AddressProofEnum,
    file: Express.Multer.File
  ) {
    const userDetails = await this.userDetailsService.findOne(userDetailsId);
    if (!userDetails) {
      throw new NotFoundException(
        `User details with id ${userDetailsId} not found`
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userDetails.userId },
    });
    const { key } = await this.awsS3Service.uploadPrivateDocument(
      file,
      user.brandId,
      userDetails.userId,
      "documents"
    );
    const response = await this.prisma.userDetails.update({
      where: { id: userDetailsId },
      data: {
        filePrivateKey: key,
        addressProofType: addressProofType,
      },
    });
    if (!response) {
      throw new NotFoundException(
        `User details with id ${userDetailsId} not found`
      );
    }
    return response;
  }
  // upload alternate address document proof
  async uploadAlternateAddressDocumentProof(
    brandId: string,
    userId: string,
    alternateAddressId: string,
    addressProofType: AddressProofEnum,
    file: Express.Multer.File
  ) {
    const { key, url } = await this.awsS3Service.uploadPrivateDocument(
      file,
      brandId,
      userId,
      "documents"
    );
    const alternateAddress = await this.prisma.alternateAddress.update({
      where: { id: alternateAddressId },
      data: {
        filePrivateKey: key,
        addressProofType: addressProofType,
      },
    });
    if (!alternateAddress) {
      throw new NotFoundException(
        `Alternate address with user id ${userId} not found`
      );
    }
    return alternateAddress;
  }
  // handel remove user details document proof
  async removeUserDetailsDocumentProof(userDetailsId: string) {
    const userDetails = await this.userDetailsService.findOne(userDetailsId);
    if (!userDetails) {
      throw new NotFoundException(
        `User details with id ${userDetailsId} not found`
      );
    }
    await this.awsS3Service.deleteDocument(userDetails.filePrivateKey);
    return await this.userDetailsService.update(userDetailsId, {
      filePrivateKey: null,
      addressProofType: null,
    });
  }

  // handel remove alternate address document proof
  async removeAlternateAddressDocumentProof(alternateAddressId: string) {
    const alternateAddress =
      await this.alternateAddressService.findOne(alternateAddressId);
    if (!alternateAddress) {
      throw new NotFoundException(
        `Alternate address with id ${alternateAddressId} not found`
      );
    }
    await this.awsS3Service.deleteDocument(alternateAddress.filePrivateKey);
    return await this.prisma.alternateAddress.update({
      where: { id: alternateAddressId },
      data: {
        filePrivateKey: null,
      },
    });
  }

  // get user Geo tags
  async getUserGeoTags(userId: string) {
    const geoTags = await this.prisma.userGeoTag.findFirst({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return geoTags;
  }

  // update user geolocation
  async updateUserGeolocation(id: string, geoLatitude: number, geoLongitude: number) {
    const userDetails = await this.userDetailsService.findOne(id);
    if (!userDetails) {
      throw new NotFoundException(`User details with id ${id} not found`);
    }

    // Use direct Prisma update instead of DTO to avoid validation issues
    const updatedUserDetails = await this.prisma.userDetails.update({
      where: { id },
      data: {
        geoLatitude,
        geoLongitude,
      },
    });
    return updatedUserDetails;
  }
}
