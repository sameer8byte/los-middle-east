import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsUUID,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

export class SendSmsDto {
  @IsPhoneNumber("IN") // Adjust the region as needed
  phone: string;

  @IsUUID()
  brandId: string;
}

@ValidatorConstraint({ name: "phoneOrEmail", async: false })
export class PhoneOrEmailConstraint implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments) {
    const object = args.object as any;
    return !!(object.phone || object.email);
  }

  defaultMessage() {
    return "Either phone number or email must be provided";
  }
}
export class LoginDto {
  @IsOptional()
  @IsPhoneNumber("IN")
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsUUID()
  brandId: string;

  @Validate(PhoneOrEmailConstraint)
  checkPhoneOrEmail: string;
}
