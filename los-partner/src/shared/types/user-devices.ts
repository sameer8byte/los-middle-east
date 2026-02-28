import { PlatformType } from "../../constant/enum"


 
  
export interface UserDevice {
    id: string
    brandId: string | null
    lastActiveAt: Date |null
    createdAt: Date
    updatedAt: Date |null
    fpId: string,
    deviceType: string,
    os: string,
    appVersion: string,
    fcmToken: string,
    ipAddress: string,
    userAgent: string
    platformType:keyof typeof PlatformType
}