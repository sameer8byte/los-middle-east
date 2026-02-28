import { Module } from "@nestjs/common";
import { CartDataExtractorService } from "./services/cart-data-extractor.service";

@Module({
  providers: [CartDataExtractorService],
  exports: [CartDataExtractorService],
})
export class CartExtractorModule {}
