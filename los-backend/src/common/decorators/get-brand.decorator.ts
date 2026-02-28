import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const GetBrand = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    
    // Try to get brand ID from partnerUser (partner auth)
    if (request.partnerUser?.brandId) {
      return request.partnerUser.brandId;
    }

    // Try to get brand ID from user (web/api-key auth)
    if (request.user?.brandId) {
      return request.user.brandId;
    }

    // Try to get from apiKeyData (api-key auth)
    if (request.apiKeyData?.brand_id) {
      return request.apiKeyData.brand_id;
    }

    return null;
  },
);
