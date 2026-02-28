export enum GenderEnum {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}
export enum MaritalStatusEnum {
  SINGLE = "SINGLE",
  MARRIED = "MARRIED",
  DIVORCED = "DIVORCED",
  WIDOWED = "WIDOWED",
}

export enum ResidenceTypeEnum {
  RENTED = "RENTED",
  OWNED = "OWNED",
}
export enum ReligionEnum {
  HINDUISM = "HINDUISM",
  ISLAM = "ISLAM",
  CHRISTIANITY = "CHRISTIANITY",
  SIKHISM = "SIKHISM",
  BUDDHISM = "BUDDHISM",
  JAINISM = "JAINISM",
  JUDAISM = "JUDAISM",
  ZOROASTRIANISM = "ZOROASTRIANISM",
  BAHAI = "BAHAI",
  ANIMISM = "ANIMISM",
  ATHEIST = "ATHEIST",
  AGNOSTIC = "AGNOSTIC",
  OTHER = "OTHER",
  PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY",
}

export enum AddressProofEnum {
  GAS_BILL = "GAS_BILL",
  WATER_BILL = "WATER_BILL",
  ELECTRICITY_BILL = "ELECTRICITY_BILL",
  WIFI_BILL = "WIFI_BILL",
  POSTPAID_BILL = "POSTPAID_BILL",
  CREDIT_CARD_STATEMENT = "CREDIT_CARD_STATEMENT",
  RENT_AGREEMENT = "RENT_AGREEMENT",
}
export interface UserDetails {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  gender: GenderEnum;
  dateOfBirth: Date;
  profilePicUrl: string;
  address: string;
  profileVideoUrl: string;
  city: string;
  state: string;
  pincode: string;
  maritalStatus: MaritalStatusEnum;
  spouseName: string;
  fathersName: string;
  middleName: string;
  isCommunicationAddress: boolean;
  religion: ReligionEnum;
  residenceType: ResidenceTypeEnum;
  filePrivateKey: string;
  addressProofType: AddressProofEnum;
  geoLatitude: number;
  geoLongitude: number;
  linkedAadhaarNumberByPanPlus: string | null;
  aadhaarPanLinkedByPanPlus: boolean;
}

export interface AlternateAddress {
  id?: string;
  userId: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  residenceType: ResidenceTypeEnum;
  filePrivateKey: string;
  addressProofType: AddressProofEnum;
}
