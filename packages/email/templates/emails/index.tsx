// Export all email templates for easier imports
export { CancellationEmailTemplate } from './cancellation-email'
export { ContactTemplate } from './contact'
export { EmailVerificationTemplate } from './email-verification'
export { OrganizationInvitationTemplate } from './organization-invitation'
export { SignInTemplate } from './sign-in'
export { WelcomeEmailTemplate } from './welcomeEmail'

// Template subject mapping
export const emailSubjects = {
  'sign-in': 'HexAstral - Sign-in Verification Code',
  'email-verification': 'HexAstral - Email Verification Code',
  welcome: 'Welcome to HexAstral!',
  cancellation: 'HexAstral Subscription Cancelled',
  'organization-invitation': 'Invitation to join a team on Zhop',
  contact: 'Zhop Contact Form Submission',
}
