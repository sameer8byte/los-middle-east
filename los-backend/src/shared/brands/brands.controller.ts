import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { BrandsService } from "./brands.service";
import { CreateBrandDto, UpdateBrandDto } from "./dto";
import { AuthType } from "src/common/decorators/auth.decorator";

@Controller("brands")
@AuthType("partner")
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  async create(@Body() createBrandDto: CreateBrandDto) {
    return this.brandsService.create(createBrandDto);
  }

  @Get()
  async findAll() {
    return this.brandsService.findAll();
  }
  // get brand by

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.brandsService.findOne(id);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    return this.brandsService.update(id, updateBrandDto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.brandsService.remove(id);
  }
  @Delete("loan-rules/:id")
  async removeLoanRule(@Param("id") id: string) {
    return this.brandsService.removeLoanRule(id);
  }
}
