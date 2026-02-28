import { Injectable, NotFoundException } from "@nestjs/common";
import {
  CreateBrandDto,
  UpdateBrandDto,
  CreateDocumentRuleDto,
  CreateLoanRuleDto,
} from "./dto";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(createBrandDto: CreateBrandDto) {
    return this.prisma.brand.create({
      data: createBrandDto,
    });
  }

  async findAll(include?: Prisma.BrandInclude) {
    return this.prisma.brand.findMany({
      include: include ?? {}, // fallback to empty object if not provided
    });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        // documentRules: true,
        loanRules: true,
      },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    return brand;
  }

  async update(id: string, updateBrandDto: UpdateBrandDto) {
    // Check if brand exists
    await this.findOne(id);

    return this.prisma.brand.update({
      where: { id },
      data: updateBrandDto,
    });
  }

  async remove(id: string) {
    // Check if brand exists
    await this.findOne(id);

    return this.prisma.brand.delete({
      where: { id },
    });
  }

  // async addDocumentRule(
  //   brandId: string,
  //   createDocumentRuleDto: CreateDocumentRuleDto,
  // ) {
  //   // Check if brand exists
  //   await this.findOne(brandId);

  //   return this.prisma.documentRule.create({
  //     data: {
  //       ...createDocumentRuleDto,
  //       brandId,
  //     },
  //   });
  // }

  // async updateDocumentRule(
  //   id: string,
  //   createDocumentRuleDto: CreateDocumentRuleDto,
  // ) {
  //   const documentRule = await this.prisma.documentRule.findUnique({
  //     where: { id },
  //   });

  //   if (!documentRule) {
  //     throw new NotFoundException(`Document rule with ID ${id} not found`);
  //   }

  //   return this.prisma.documentRule.update({
  //     where: { id },
  //     data: createDocumentRuleDto,
  //   });
  // }

  // async removeDocumentRule(id: string) {
  //   const documentRule = await this.prisma.documentRule.findUnique({
  //     where: { id },
  //   });

  //   if (!documentRule) {
  //     throw new NotFoundException(`Document rule with ID ${id} not found`);
  //   }

  //   return this.prisma.documentRule.delete({
  //     where: { id },
  //   });
  // }

  async removeLoanRule(id: string) {
    const loanRule = await this.prisma.loanRule.findUnique({
      where: { id },
    });

    if (!loanRule) {
      throw new NotFoundException(`Loan rule with ID ${id} not found`);
    }

    return this.prisma.loanRule.delete({
      where: { id },
    });
  }

  // get brand by domain
  async findByDomain(domain: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { 
        brand_sub_domains: {
          some: { subdomain: domain }
        }
      },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with domain ${domain} not found`);
    }

    return brand;
  }
}
