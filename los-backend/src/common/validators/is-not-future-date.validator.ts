import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";

@ValidatorConstraint({ name: "isNotFutureDate", async: false })
export class IsNotFutureDateConstraint implements ValidatorConstraintInterface {
  validate(date: Date, args: ValidationArguments) {
    if (!(date instanceof Date)) return false;
    const now = new Date();
    return date <= now;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} should not be a future date`;
  }
}
