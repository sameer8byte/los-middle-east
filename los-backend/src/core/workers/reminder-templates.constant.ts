/**
 * Communication Templates for Drop-off Stages
 * Based on Communication Plan at Drop-off Stages
 * 
 * Requirements:
 * 1. Reach out via various channels multiple times to ensure completion
 * 2. Check if step is completed before triggering communication
 * 3. Track delivery/open rates for all communications
 * 4. Add secondary tag for conversion tracking (beyond UTM tags)
 */

export enum ReminderChannel {
  SMS = "SMS",
  WHATSAPP = "WhatsApp",
  EMAIL = "Email",
  IVR = "IVR",
  IVR_SMS = "IVR+SMS",
}

/**
 * Time intervals in minutes for reminder triggers
 */
export enum ReminderTimeSinceDrop {
  THIRTY_MINUTES = 30,
  TWO_HOURS = 120,
  FOUR_HOURS = 240,
  TWENTY_FOUR_HOURS = 1440,
  FORTY_EIGHT_HOURS = 2880,
  SEVENTY_TWO_HOURS = 4320,
  SEVEN_DAYS = 10080,
}

export interface ReminderTemplate {
  dropOffStep: string;
  sequence: number;
  triggerCondition: string;
  channel: ReminderChannel;
  timeSinceDrop: ReminderTimeSinceDrop;
  subject?: string; // For email
  message: string;
  ivrScript?: string; // For IVR communications
  smsMessage?: string; // For IVR+SMS (SMS part)
}

/**
 * ============================================================================
 * STAGE 1: OTP VERIFICATION
 * ============================================================================
 */
export const OTP_VERIFICATION_TEMPLATES: ReminderTemplate[] = [
  // T + 30 mins group
  {
    dropOffStep: "OTP verification",
    sequence: 1,
    triggerCondition: "User drops off in OTP step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.THIRTY_MINUTES,
    message: `Complete your application at {{brand_name}}.
Minimal paperwork, fast processing — just a few steps to your funds. {{link}}`,
  },
  {
    dropOffStep: "OTP verification",
    sequence: 2,
    triggerCondition: "User drops off in OTP step",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.THIRTY_MINUTES,
    message: `Complete your application at {{brand_name}}.
Minimal paperwork, fast processing — just a few steps to your funds. {{link}}`,
  },
  {
    dropOffStep: "OTP verification",
    sequence: 3,
    triggerCondition: "User drops off in OTP step",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.THIRTY_MINUTES,
    subject: "Complete Your {{brand_name}} Application",
    message: `Complete your {{brand_name}} application right now.
Minimal paperwork, fast processing — just a few steps to your funds.

{{Go to Application button}}`,
  },
  // T + 2 hrs group
  {
    dropOffStep: "OTP verification",
    sequence: 4,
    triggerCondition: "User does not complete the OTP step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Continue with your {{brand_name}} application.
A few quick steps separate you from fast loan access. {{link}}`,
  },
  {
    dropOffStep: "OTP verification",
    sequence: 5,
    triggerCondition: "User does not complete the OTP step",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Continue with your {{brand_name}} application.
A few quick steps separate you from fast loan access. {{link}}`,
  },
  {
    dropOffStep: "OTP verification",
    sequence: 6,
    triggerCondition: "User does not complete the OTP step",
    channel: ReminderChannel.IVR_SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    ivrScript: `Hello, this is {{brand_name}}.
Your application is waiting for completion.
To proceed, please click the link sent to you via SMS.
Thank you for choosing {{brand_name}}.`,
    smsMessage: `Don't miss out! Your {{brand_name}} application is waiting.
Complete it now with just a few quick steps. {{link}}`,
    message: `IVR: Hello, this is {{brand_name}}. Your application is waiting for completion. To proceed, please click the link sent to you via SMS. Thank you for choosing {{brand_name}}.

SMS: Don't miss out! Your {{brand_name}} application is waiting. Complete it now with just a few quick steps. {{link}}`,
  },
  // T + 24 hrs group
  {
    dropOffStep: "OTP verification",
    sequence: 7,
    triggerCondition: "User does not complete the OTP step after 24 hours",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    subject: "Your {{brand_name}} application is on hold",
    message: `We noticed you haven't completed your {{brand_name}} application yet. 

Don't let this opportunity pass by! Finish your application in just a few minutes and access fast funds with minimal documentation.

{{Go to Application button}}`,
  },
  {
    dropOffStep: "OTP verification",
    sequence: 8,
    triggerCondition: "User does not complete the OTP step after 24 hours",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    message: `Last chance! Complete your {{brand_name}} application and unlock fast funds. {{link}}`,
  },
];

/**
 * ============================================================================
 * STAGE 2: PERSONAL DETAILS
 * ============================================================================
 */
export const PERSONAL_DETAILS_TEMPLATES: ReminderTemplate[] = [
  // T + 30 mins group
  {
    dropOffStep: "Personal details",
    sequence: 1,
    triggerCondition: "User drops off in personal details step",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.THIRTY_MINUTES,
    message: `Complete your application at {{brand_name}}.
Minimal paperwork, fast processing — just a few steps to your funds. {{link}}`,
  },
  {
    dropOffStep: "Personal details",
    sequence: 2,
    triggerCondition: "User drops off in personal details step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.THIRTY_MINUTES,
    message: `Complete your application at {{brand_name}}.
Minimal paperwork, fast processing — just a few steps to your funds. {{link}}`,
  },
  {
    dropOffStep: "Personal details",
    sequence: 3,
    triggerCondition: "User drops off in personal details step",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.THIRTY_MINUTES,
    subject: "Complete Your {{brand_name}} Application",
    message: `Complete your {{brand_name}} application right now.
Minimal paperwork, fast processing — just a few steps to your funds.

{{Go to Application button}}`,
  },
  // T + 2 hrs group
  {
    dropOffStep: "Personal details",
    sequence: 4,
    triggerCondition: "User does not complete the personal details step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Continue with your {{brand_name}} application.
A few quick steps separate you from fast loan access. {{link}}`,
  },
  {
    dropOffStep: "Personal details",
    sequence: 5,
    triggerCondition: "User does not complete the personal details step",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Continue with your {{brand_name}} application.
A few quick steps separate you from fast loan access. {{link}}`,
  },
  {
    dropOffStep: "Personal details",
    sequence: 6,
    triggerCondition: "User does not complete the personal details step",
    channel: ReminderChannel.IVR_SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    ivrScript: `Hello, this is {{brand_name}}.
Your application is waiting for you.
To continue, please click the link sent to you via SMS.
Thank you for choosing {{brand_name}}.`,
    smsMessage: `Your {{brand_name}} application is waiting! Complete it now and get funds fast. {{link}}`,
    message: `IVR: Hello, this is {{brand_name}}. Your application is waiting for you. To continue, please click the link sent to you via SMS. Thank you for choosing {{brand_name}}.

SMS: Your {{brand_name}} application is waiting! Complete it now and get funds fast. {{link}}`,
  },
  // T + 24 hrs group
  {
    dropOffStep: "Personal details",
    sequence: 7,
    triggerCondition: "User does not complete the personal details step after 24 hours",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    subject: "Your {{brand_name}} application is on hold",
    message: `We noticed you haven't completed your personal details yet.

Don't let this opportunity pass by! Finish your application in just a few minutes and access fast funds with minimal documentation.

{{Go to Application button}}`,
  },
  {
    dropOffStep: "Personal details",
    sequence: 8,
    triggerCondition: "User does not complete the personal details step after 24 hours",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    message: `Last chance! Complete your {{brand_name}} application and unlock fast funds. {{link}}`,
  },
];

/**
 * ============================================================================
 * STAGE 3: EMAIL VERIFICATION
 * ============================================================================
 */
export const EMAIL_VERIFICATION_TEMPLATES: ReminderTemplate[] = [
  // T + 30 mins group
  {
    dropOffStep: "Email Verification",
    sequence: 1,
    triggerCondition: "User drops off in email verification step",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.THIRTY_MINUTES,
    message: `Complete your application at {{brand_name}}.
Minimal paperwork, fast processing — just a few steps to your funds. {{link}}`,
  },
  {
    dropOffStep: "Email Verification",
    sequence: 2,
    triggerCondition: "User drops off in email verification step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.THIRTY_MINUTES,
    message: `Complete your application at {{brand_name}}.
Minimal paperwork, fast processing — just a few steps to your funds. {{link}}`,
  },
  {
    dropOffStep: "Email Verification",
    sequence: 3,
    triggerCondition: "User drops off in email verification step",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.THIRTY_MINUTES,
    subject: "Verify Your Email - {{brand_name}} Application",
    message: `Complete your email verification to proceed with your {{brand_name}} application.
Just one click away from fast funds!

{{Go to Application button}}`,
  },
  // T + 2 hrs group
  {
    dropOffStep: "Email Verification",
    sequence: 4,
    triggerCondition: "User does not complete the email verification step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Continue with your {{brand_name}} application.
A few quick steps separate you from fast loan access. {{link}}`,
  },
  {
    dropOffStep: "Email Verification",
    sequence: 5,
    triggerCondition: "User does not complete the email verification step",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Continue with your {{brand_name}} application.
A few quick steps separate you from fast loan access. {{link}}`,
  },
  {
    dropOffStep: "Email Verification",
    sequence: 6,
    triggerCondition: "User does not complete the email verification step",
    channel: ReminderChannel.IVR_SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    ivrScript: `Hello, this is {{brand_name}}.
Verify your email to complete your application.
Click the link sent to you via SMS.
Thank you for choosing {{brand_name}}.`,
    smsMessage: `Verify your email and complete your {{brand_name}} application now. {{link}}`,
    message: `IVR: Hello, this is {{brand_name}}. Verify your email to complete your application. Click the link sent to you via SMS. Thank you for choosing {{brand_name}}.

SMS: Verify your email and complete your {{brand_name}} application now. {{link}}`,
  },
  // T + 24 hrs group
  {
    dropOffStep: "Email Verification",
    sequence: 7,
    triggerCondition: "User does not complete the email verification step after 24 hours",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    subject: "Don't lose your chance - Verify email now",
    message: `Your {{brand_name}} application is waiting for email verification.

Complete it now and unlock fast funds with minimal documentation.

{{Go to Application button}}`,
  },
  {
    dropOffStep: "Email Verification",
    sequence: 8,
    triggerCondition: "User does not complete the email verification step after 24 hours",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    message: `Last chance! Verify your email to get fast funds from {{brand_name}}. {{link}}`,
  },
];

/**
 * ============================================================================
 * STAGE 4: BANK DETAILS
 * ============================================================================
 */
export const BANK_DETAILS_TEMPLATES: ReminderTemplate[] = [
  // T + 2 hrs group
  {
    dropOffStep: "Bank details",
    sequence: 1,
    triggerCondition: "User drops off in bank details step",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Your {{brand_name}} application is nearing completion.
Add bank details now to move closer to quick disbursal with minimal documentation. {{link}}`,
  },
  {
    dropOffStep: "Bank details",
    sequence: 2,
    triggerCondition: "User drops off in bank details step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Your {{brand_name}} application is nearing completion.
Add bank details now to move closer to quick disbursal with minimal documentation. {{link}}`,
  },
  {
    dropOffStep: "Bank details",
    sequence: 3,
    triggerCondition: "User drops off in bank details step",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    subject: "Almost done - Add your bank details",
    message: `You're so close to completing your {{brand_name}} application! Just add your bank details and you're done.

{{Go to Application button}}`,
  },
  // T + 24 hrs group
  {
    dropOffStep: "Bank details",
    sequence: 4,
    triggerCondition: "User does not complete the bank details step",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    subject: "✅ Almost done — your {{brand_name}} application",
    message: `You're making great progress on your {{brand_name}} application. Just a few steps remain to complete it and unlock your funds.

Why take a loan from us?
✔ Fast funds
✔ Minimal documentation
✔ Boost your credit score

Take a moment now to complete the steps and move closer to approval.

{{Go to Application button}}`,
  },
  {
    dropOffStep: "Bank details",
    sequence: 5,
    triggerCondition: "User does not complete the bank details step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    message: `Complete your {{brand_name}} application and get fast funds. Add your bank details now! {{link}}`,
  },
  {
    dropOffStep: "Bank details",
    sequence: 6,
    triggerCondition: "User does not complete the bank details step",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    message: `Your {{brand_name}} application is nearly complete! Add bank details and unlock your funds. {{link}}`,
  },
  // T + 48 hrs group
  {
    dropOffStep: "Bank details",
    sequence: 7,
    triggerCondition: "User does not complete the bank details step",
    channel: ReminderChannel.IVR_SMS,
    timeSinceDrop: ReminderTimeSinceDrop.FORTY_EIGHT_HOURS,
    ivrScript: `Hello, this is {{brand_name}}.
Your application is in progress.
To complete your application, please click the link sent to you via SMS.
Thank you for choosing {{brand_name}}.`,
    smsMessage: `Almost there! Your {{brand_name}} application is moving ahead.
Finish the remaining steps to get your loan quickly with minimal paperwork. {{link}}`,
    message: `IVR: Hello, this is {{brand_name}}. Your application is in progress. To complete your application, please click the link sent to you via SMS. Thank you for choosing {{brand_name}}.

SMS: Almost there! Your {{brand_name}} application is moving ahead. Finish the remaining steps to get your loan quickly with minimal paperwork. {{link}}`,
  },
  {
    dropOffStep: "Bank details",
    sequence: 8,
    triggerCondition: "User does not complete the bank details step",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.FORTY_EIGHT_HOURS,
    subject: "Don't lose your chance - Complete now",
    message: `This is your last reminder to complete your {{brand_name}} application.

Add your bank details and get access to fast funds with minimal documentation today!

{{Go to Application button}}`,
  },
  {
    dropOffStep: "Bank details",
    sequence: 9,
    triggerCondition: "User does not complete the bank details step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.FORTY_EIGHT_HOURS,
    message: `Last chance! Complete your {{brand_name}} application now and get fast funds. {{link}}`,
  },
];

/**
 * ============================================================================
 * STAGE 5: EMPLOYMENT DETAILS
 * ============================================================================
 */
export const EMPLOYMENT_DETAILS_TEMPLATES: ReminderTemplate[] = [
  // T + 2 hrs group
  {
    dropOffStep: "Employment Details",
    sequence: 1,
    triggerCondition: "User drops off in employment details",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Just a few steps away from completing your {{brand_name}} application.
Complete your journey now to stay on track for quick disbursal. {{link}}`,
  },
  {
    dropOffStep: "Employment Details",
    sequence: 2,
    triggerCondition: "User drops off in employment details",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Just a few steps away from completing your {{brand_name}} application.
Complete your journey now to stay on track for quick disbursal. {{link}}`,
  },
  {
    dropOffStep: "Employment Details",
    sequence: 3,
    triggerCondition: "User drops off in employment details",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    subject: "Add your employment details - {{brand_name}}",
    message: `Complete your employment details to finish your {{brand_name}} application.

You're almost there!

{{Go to Application button}}`,
  },
  // T + 24 hrs group
  {
    dropOffStep: "Employment Details",
    sequence: 4,
    triggerCondition: "User does not complete the employment details",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    subject: "✅ Almost done — your {{brand_name}} application",
    message: `You're making great progress on your {{brand_name}} application. Just a few steps remain to complete it and unlock your funds.

Why take a loan from us?
✔ Fast funds
✔ Minimal documentation
✔ Boost your credit score

Take a moment now to complete the steps and move closer to approval.

{{Go to Application button}}`,
  },
  {
    dropOffStep: "Employment Details",
    sequence: 5,
    triggerCondition: "User does not complete the employment details",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    message: `Complete your {{brand_name}} application and get fast funds. Add employment details now! {{link}}`,
  },
  {
    dropOffStep: "Employment Details",
    sequence: 6,
    triggerCondition: "User does not complete the employment details",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    message: `Your {{brand_name}} application is nearly complete! Add employment details and unlock your funds. {{link}}`,
  },
  // T + 48 hrs group
  {
    dropOffStep: "Employment Details",
    sequence: 7,
    triggerCondition: "User does not complete the employment details",
    channel: ReminderChannel.IVR_SMS,
    timeSinceDrop: ReminderTimeSinceDrop.FORTY_EIGHT_HOURS,
    ivrScript: `Hello, this is {{brand_name}}.
Your application is in progress.
To complete your application, please click the link sent to you via SMS.
Thank you for choosing {{brand_name}}.`,
    smsMessage: `Almost there! Your {{brand_name}} application is moving ahead.
Finish the remaining steps to get your loan quickly with minimal paperwork. {{link}}`,
    message: `IVR: Hello, this is {{brand_name}}. Your application is in progress. To complete your application, please click the link sent to you via SMS. Thank you for choosing {{brand_name}}.

SMS: Almost there! Your {{brand_name}} application is moving ahead. Finish the remaining steps to get your loan quickly with minimal paperwork. {{link}}`,
  },
  {
    dropOffStep: "Employment Details",
    sequence: 8,
    triggerCondition: "User does not complete the employment details",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.FORTY_EIGHT_HOURS,
    subject: "Don't lose your chance - Complete now",
    message: `This is your last reminder to complete your {{brand_name}} application.

Add your employment details and get access to fast funds with minimal documentation today!

{{Go to Application button}}`,
  },
  {
    dropOffStep: "Employment Details",
    sequence: 9,
    triggerCondition: "User does not complete the employment details",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.FORTY_EIGHT_HOURS,
    message: `Last chance! Complete your {{brand_name}} application now and get fast funds. {{link}}`,
  },
];

/**
 * ============================================================================
 * STAGE 6: SELFIE / VIDEO VERIFICATION
 * ============================================================================
 */
export const SELFIE_TEMPLATES: ReminderTemplate[] = [
  // T + 2 hrs group
  {
    dropOffStep: "Selfie / Video Verification",
    sequence: 1,
    triggerCondition: "User drops off in selfie / video verification step",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Just a few steps away from completing Your {{brand_name}} application.
Complete your journey now to stay on track for quick disbursal. {{link}}`,
  },
  {
    dropOffStep: "Selfie / Video Verification",
    sequence: 2,
    triggerCondition: "User drops off in selfie / video verification step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Just a few steps away from completing Your {{brand_name}} application.
Complete your journey now to stay on track for quick disbursal. {{link}}`,
  },
  {
    dropOffStep: "Selfie / Video Verification",
    sequence: 3,
    triggerCondition: "User drops off in selfie / video verification step",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    subject: "Complete your video verification - {{brand_name}}",
    message: `Complete your video verification to finish your {{brand_name}} application.

You're almost there!

{{Go to Application button}}`,
  },
  // T + 24 hrs group
  {
    dropOffStep: "Selfie / Video Verification",
    sequence: 4,
    triggerCondition: "User does not complete the selfie / video verification step",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    subject: "✅ Almost done — your {{brand_name}} application",
    message: `You're making great progress on your {{brand_name}} application. Just a few steps remain to complete it and unlock your funds.

Why take a loan from us?
✔ Fast funds
✔ Minimal documentation
✔ Boost your credit score

Take a moment now to complete the steps and move closer to approval.

{{Go to Application button}}`,
  },
  {
    dropOffStep: "Selfie / Video Verification",
    sequence: 5,
    triggerCondition: "User does not complete the selfie / video verification step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    message: `Complete your {{brand_name}} application and get fast funds. Finish video verification now! {{link}}`,
  },
  {
    dropOffStep: "Selfie / Video Verification",
    sequence: 6,
    triggerCondition: "User does not complete the selfie / video verification step",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    message: `Your {{brand_name}} application is nearly complete! Complete video verification and unlock your funds. {{link}}`,
  },
  // T + 48 hrs group
  {
    dropOffStep: "Selfie / Video Verification",
    sequence: 7,
    triggerCondition: "User does not complete the selfie / video verification step",
    channel: ReminderChannel.IVR_SMS,
    timeSinceDrop: ReminderTimeSinceDrop.FORTY_EIGHT_HOURS,
    ivrScript: `Hello, this is {{brand_name}}.
Your application is in progress.
To complete your application, please click the link sent to you via SMS.
Thank you for choosing {{brand_name}}.`,
    smsMessage: `Almost there! Your {{brand_name}} application is moving ahead.
Finish the remaining steps to get your loan quickly with minimal paperwork. {{link}}`,
    message: `IVR: Hello, this is {{brand_name}}. Your application is in progress. To complete your application, please click the link sent to you via SMS. Thank you for choosing {{brand_name}}.

SMS: Almost there! Your {{brand_name}} application is moving ahead. Finish the remaining steps to get your loan quickly with minimal paperwork. {{link}}`,
  },
  {
    dropOffStep: "Selfie / Video Verification",
    sequence: 8,
    triggerCondition: "User does not complete the selfie / video verification step",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.FORTY_EIGHT_HOURS,
    subject: "Don't lose your chance - Complete now",
    message: `This is your last reminder to complete your {{brand_name}} application.

Finish your video verification and get access to fast funds with minimal documentation today!

{{Go to Application button}}`,
  },
  {
    dropOffStep: "Selfie / Video Verification",
    sequence: 9,
    triggerCondition: "User does not complete the selfie / video verification step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.FORTY_EIGHT_HOURS,
    message: `Last chance! Complete your {{brand_name}} application now and get fast funds. {{link}}`,
  },
];

/**
 * ============================================================================
 * STAGE 7: KYC (AADHAAR)
 * ============================================================================
 */
export const KYC_TEMPLATES: ReminderTemplate[] = [
  // T + 2 hrs group
  {
    dropOffStep: "KYC (Aadhaar)",
    sequence: 1,
    triggerCondition: "User drops off in Aadhaar KYC step",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Just a few steps away from completing Your {{brand_name}} application.
Complete your journey now to stay on track for quick disbursal. {{link}}`,
  },
  {
    dropOffStep: "KYC (Aadhaar)",
    sequence: 2,
    triggerCondition: "User drops off in Aadhaar KYC step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Just a few steps away from completing Your {{brand_name}} application.
Complete your journey now to stay on track for quick disbursal. {{link}}`,
  },
  {
    dropOffStep: "KYC (Aadhaar)",
    sequence: 3,
    triggerCondition: "User drops off in Aadhaar KYC step",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    subject: "Complete your KYC - {{brand_name}}",
    message: `Complete your Aadhaar KYC to finish your {{brand_name}} application.

You're almost there!

{{Go to Application button}}`,
  },
  // T + 24 hrs group
  {
    dropOffStep: "KYC (Aadhaar)",
    sequence: 4,
    triggerCondition: "User does not complete the Aadhaar KYC step",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    subject: "✅ Almost done — your {{brand_name}} application",
    message: `You're making great progress on your {{brand_name}} application. Just a few steps remain to complete it and unlock your funds.

Why take a loan from us?
✔ Fast funds
✔ Minimal documentation
✔ Boost your credit score

Take a moment now to complete the steps and move closer to approval.

{{Go to Application button}}`,
  },
  {
    dropOffStep: "KYC (Aadhaar)",
    sequence: 5,
    triggerCondition: "User does not complete the Aadhaar KYC step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    message: `Complete your {{brand_name}} application and get fast funds. Finish KYC now! {{link}}`,
  },
  {
    dropOffStep: "KYC (Aadhaar)",
    sequence: 6,
    triggerCondition: "User does not complete the Aadhaar KYC step",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    message: `Your {{brand_name}} application is nearly complete! Complete KYC and unlock your funds. {{link}}`,
  },
  // T + 48 hrs group
  {
    dropOffStep: "KYC (Aadhaar)",
    sequence: 7,
    triggerCondition: "User does not complete the Aadhaar KYC step",
    channel: ReminderChannel.IVR_SMS,
    timeSinceDrop: ReminderTimeSinceDrop.FORTY_EIGHT_HOURS,
    ivrScript: `Hello, this is {{brand_name}}.
Your application is in progress.
To complete your application, please click the link sent to you via SMS.
Thank you for choosing {{brand_name}}.`,
    smsMessage: `Almost there! Your {{brand_name}} application is moving ahead.
Finish the remaining steps to get your loan quickly with minimal paperwork. {{link}}`,
    message: `IVR: Hello, this is {{brand_name}}. Your application is in progress. To complete your application, please click the link sent to you via SMS. Thank you for choosing {{brand_name}}.

SMS: Almost there! Your {{brand_name}} application is moving ahead. Finish the remaining steps to get your loan quickly with minimal paperwork. {{link}}`,
  },
  {
    dropOffStep: "KYC (Aadhaar)",
    sequence: 8,
    triggerCondition: "User does not complete the Aadhaar KYC step",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.FORTY_EIGHT_HOURS,
    subject: "Don't lose your chance - Complete now",
    message: `This is your last reminder to complete your {{brand_name}} application.

Finish your KYC and get access to fast funds with minimal documentation today!

{{Go to Application button}}`,
  },
  {
    dropOffStep: "KYC (Aadhaar)",
    sequence: 9,
    triggerCondition: "User does not complete the Aadhaar KYC step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.FORTY_EIGHT_HOURS,
    message: `Last chance! Complete your {{brand_name}} application now and get fast funds. {{link}}`,
  },
];

/**
 * ============================================================================
 * STAGE 8: LOAN APPLICATION INITIAL
 * ============================================================================
 */
export const LOAN_APPLICATION_TEMPLATES: ReminderTemplate[] = [
  {
    dropOffStep: "Loan Application Start",
    sequence: 1,
    triggerCondition: "User hasn't started loan application",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.THIRTY_MINUTES,
    message: `Start your {{brand_name}} application now. Fast approval, minimal paperwork. {{link}}`,
  },
  {
    dropOffStep: "Loan Application Start",
    sequence: 2,
    triggerCondition: "User hasn't started loan application",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.THIRTY_MINUTES,
    message: `Start your {{brand_name}} application now. Fast approval, minimal paperwork. {{link}}`,
  },
  {
    dropOffStep: "Loan Application Start",
    sequence: 3,
    triggerCondition: "User hasn't started loan application",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.THIRTY_MINUTES,
    subject: "Start Your {{brand_name}} Loan Application",
    message: `Ready to get fast funds? Start your {{brand_name}} application now!

With minimal paperwork and quick approval, you can get access to funds in no time.

{{Go to Application button}}`,
  },
];

/**
 * ============================================================================
 * STAGE 9: APPLICATION STATUS CHECK
 * ============================================================================
 */
export const APPLICATION_STATUS_TEMPLATES: ReminderTemplate[] = [
  {
    dropOffStep: "Application Status",
    sequence: 1,
    triggerCondition: "User wants to check application status",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Check your {{brand_name}} application status: {{link}}`,
  },
  {
    dropOffStep: "Application Status",
    sequence: 2,
    triggerCondition: "User wants to check application status",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Check your {{brand_name}} application status: {{link}}`,
  },
  {
    dropOffStep: "Application Status",
    sequence: 3,
    triggerCondition: "User wants to check application status",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    subject: "Your {{brand_name}} Application Status",
    message: `Check the latest status of your {{brand_name}} application.

{{Go to Application button}}`,
  },
];

/**
 * ============================================================================
 * STAGE 10: ADDRESS VERIFICATION
 * ============================================================================
 */
export const ADDRESS_VERIFICATION_TEMPLATES: ReminderTemplate[] = [
  {
    dropOffStep: "Address Verification",
    sequence: 1,
    triggerCondition: "User drops off in address verification step",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Complete your address verification to finalize your {{brand_name}} application. {{link}}`,
  },
  {
    dropOffStep: "Address Verification",
    sequence: 2,
    triggerCondition: "User drops off in address verification step",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Complete your address verification to finalize your {{brand_name}} application. {{link}}`,
  },
  {
    dropOffStep: "Address Verification",
    sequence: 3,
    triggerCondition: "User drops off in address verification step",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    subject: "Complete Your Address Verification",
    message: `Complete your address verification to finalize your {{brand_name}} application.

Just one more step to unlock your funds!

{{Go to Application button}}`,
  },
  {
    dropOffStep: "Address Verification",
    sequence: 4,
    triggerCondition: "User does not complete address verification after 24 hours",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    message: `Last reminder! Complete your address verification to get your {{brand_name}} loan. {{link}}`,
  },
];

/**
 * ============================================================================
 * STAGE 11: APPLICATION REVIEW
 * ============================================================================
 */
export const APPLICATION_REVIEW_TEMPLATES: ReminderTemplate[] = [
  {
    dropOffStep: "Application Review",
    sequence: 1,
    triggerCondition: "Application submitted for review",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.FOUR_HOURS,
    message: `Your {{brand_name}} application is under review. Check status: {{link}}`,
  },
  {
    dropOffStep: "Application Review",
    sequence: 2,
    triggerCondition: "Application submitted for review",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.FOUR_HOURS,
    message: `Your {{brand_name}} application is under review. Check status: {{link}}`,
  },
  {
    dropOffStep: "Application Review",
    sequence: 3,
    triggerCondition: "Application submitted for review",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.FOUR_HOURS,
    subject: "Your {{brand_name}} Application is Under Review",
    message: `Your {{brand_name}} application has been submitted and is under review.

We'll notify you of the outcome shortly. In the meantime, check your application status anytime.

{{Go to Application button}}`,
  },
  {
    dropOffStep: "Application Review",
    sequence: 4,
    triggerCondition: "Application still under review after 24 hours",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWENTY_FOUR_HOURS,
    message: `Your {{brand_name}} application is being reviewed. We'll update you soon! {{link}}`,
  },
];

/**
 * ============================================================================
 * STAGE 12: APPLICATION SUBMISSION
 * ============================================================================
 */
export const APPLICATION_SUBMISSION_TEMPLATES: ReminderTemplate[] = [
  {
    dropOffStep: "Application Submission",
    sequence: 1,
    triggerCondition: "User ready to submit application",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.THIRTY_MINUTES,
    message: `Last step! Submit your {{brand_name}} application now: {{link}}`,
  },
  {
    dropOffStep: "Application Submission",
    sequence: 2,
    triggerCondition: "User ready to submit application",
    channel: ReminderChannel.WHATSAPP,
    timeSinceDrop: ReminderTimeSinceDrop.THIRTY_MINUTES,
    message: `Last step! Submit your {{brand_name}} application now: {{link}}`,
  },
  {
    dropOffStep: "Application Submission",
    sequence: 3,
    triggerCondition: "User ready to submit application",
    channel: ReminderChannel.EMAIL,
    timeSinceDrop: ReminderTimeSinceDrop.THIRTY_MINUTES,
    subject: "Final Step - Submit Your {{brand_name}} Application",
    message: `You're all set! Just submit your application to complete the process.

Once submitted, our team will review it and get back to you shortly.

{{Go to Application button}}`,
  },
  {
    dropOffStep: "Application Submission",
    sequence: 4,
    triggerCondition: "User hasn't submitted after 2 hours",
    channel: ReminderChannel.SMS,
    timeSinceDrop: ReminderTimeSinceDrop.TWO_HOURS,
    message: `Don't miss out! Submit your {{brand_name}} application now and get fast funds. {{link}}`,
  },
];

/**
 * ============================================================================
 * TEMPLATE REGISTRY
 * Maps reminder types to their communication templates
 * ============================================================================
 */
export const REMINDER_TEMPLATES_REGISTRY = {
  PhoneVerification: OTP_VERIFICATION_TEMPLATES,
  EmailVerification: EMAIL_VERIFICATION_TEMPLATES,
  LoanApplication: LOAN_APPLICATION_TEMPLATES,
  CurrentStatus: APPLICATION_STATUS_TEMPLATES,
  LoanApplicationPersonalInfo: PERSONAL_DETAILS_TEMPLATES,
  LoanApplicationBankDetails: BANK_DETAILS_TEMPLATES,
  LoanApplicationEmploymentInfo: EMPLOYMENT_DETAILS_TEMPLATES,
  LoanApplicationSelfie: SELFIE_TEMPLATES,
  LoanApplicationKyc: KYC_TEMPLATES,
  LoanApplicationAddressVerification: ADDRESS_VERIFICATION_TEMPLATES,
  LoanApplicationReview: APPLICATION_REVIEW_TEMPLATES,
  LoanApplicationSubmit: APPLICATION_SUBMISSION_TEMPLATES,
};

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Convert ReminderTimeSinceDrop enum to human-readable format
 */
export function formatTimeSinceDrop(timeSinceDrop: ReminderTimeSinceDrop): string {
  const timeMap = {
    [ReminderTimeSinceDrop.THIRTY_MINUTES]: "T + 30 mins",
    [ReminderTimeSinceDrop.TWO_HOURS]: "T + 2 hrs",
    [ReminderTimeSinceDrop.FOUR_HOURS]: "T + 4 hrs",
    [ReminderTimeSinceDrop.TWENTY_FOUR_HOURS]: "T + 24 hrs",
    [ReminderTimeSinceDrop.FORTY_EIGHT_HOURS]: "T + 48 hrs",
    [ReminderTimeSinceDrop.SEVENTY_TWO_HOURS]: "T + 72 hrs",
    [ReminderTimeSinceDrop.SEVEN_DAYS]: "T + 7 days",
  };

  return timeMap[timeSinceDrop] || `${timeSinceDrop} minutes`;
}

/**
 * Get templates for a specific reminder type
 */
export function getTemplatesForType(
  type: string
): ReminderTemplate[] {
  return REMINDER_TEMPLATES_REGISTRY[type] || [];
}

/**
 * Get template by type and sequence
 */
export function getTemplateByTypeAndSequence(
  type: string,
  sequence: number
): ReminderTemplate | undefined {
  const templates = getTemplatesForType(type);
  return templates.find((t) => t.sequence === sequence);
}

/**
 * Get all templates grouped by time since drop
 */
export function getTemplatesGroupedByTime(
  templates: ReminderTemplate[]
): Map<ReminderTimeSinceDrop, ReminderTemplate[]> {
  const grouped = new Map<ReminderTimeSinceDrop, ReminderTemplate[]>();

  templates.forEach((template) => {
    if (!grouped.has(template.timeSinceDrop)) {
      grouped.set(template.timeSinceDrop, []);
    }
    const group = grouped.get(template.timeSinceDrop);
    if (group) {
      group.push(template);
    }
  });

  return grouped;
}

/**
 * Get all templates grouped by channel
 */
export function getTemplatesGroupedByChannel(
  templates: ReminderTemplate[]
): Map<ReminderChannel, ReminderTemplate[]> {
  const grouped = new Map<ReminderChannel, ReminderTemplate[]>();

  templates.forEach((template) => {
    if (!grouped.has(template.channel)) {
      grouped.set(template.channel, []);
    }
    const group = grouped.get(template.channel);
    if (group) {
      group.push(template);
    }
  });

  return grouped;
}

/**
 * Format message with variables
 * Replaces {{brandName}}, {{link}}, {{Name}}, etc.
 */
export function formatMessage(
  template: string,
  variables: Record<string, string>
): string {
  let formatted = template;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    formatted = formatted.replace(regex, value || "");
  });

  return formatted;
}

/**
 * Get contact method from channel
 */
export function getContactMethodFromChannel(channel: ReminderChannel): string {
  const methodMap = {
    [ReminderChannel.SMS]: "SMS",
    [ReminderChannel.WHATSAPP]: "WhatsApp",
    [ReminderChannel.EMAIL]: "Email",
    [ReminderChannel.IVR]: "IVR",
    [ReminderChannel.IVR_SMS]: "IVR+SMS",
  };

  return methodMap[channel] || channel;
}
