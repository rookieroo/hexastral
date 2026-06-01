// Export all email templates for easier imports
export { CancellationEmailTemplate } from './cancellation-email'
export { EmailVerificationTemplate } from './email-verification'
export { SignInTemplate } from './sign-in'
export { WelcomeEmailTemplate } from './welcomeEmail'

// Template subject mapping
export const emailSubjects = {
  'sign-in': 'HexAstral - Sign-in Verification Code',
  'email-verification': 'HexAstral - Email Verification Code',
  welcome: 'Welcome to HexAstral!',
  cancellation: 'HexAstral Subscription Cancelled',
}
