



export enum platformType {
    WEB = 'WEB',
    PARTNER = 'PARTNER',
  }
  
export interface UserDevice {
    id: string
    brandId: string
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
    platformType:keyof typeof platformType
}