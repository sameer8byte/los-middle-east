import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedPartnerUser, AuthenticatedWebUser } from "../types/partner-user.types";

export const GetUser = createParamDecorator(
  (data: keyof AuthenticatedWebUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

export const GetPartnerUser = createParamDecorator(
  (data: keyof AuthenticatedPartnerUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const partnerUser = request.partnerUser;

    return data ? partnerUser?.[data] : partnerUser;
  },
);
