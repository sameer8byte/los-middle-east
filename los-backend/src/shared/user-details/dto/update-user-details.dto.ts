import { PartialType } from "@nestjs/mapped-types";
import { CreateUserDetailsDto } from "./create-user-details.dto";

export class UpdateUserDetailsDto extends PartialType(CreateUserDetailsDto) {}
