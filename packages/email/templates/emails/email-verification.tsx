import { Heading, Section, Text } from '@react-email/components'
import type * as React from 'react'
import { Button, ContentSection, EmailContainer, OtpCode } from '../../components'

interface EmailVerificationTemplateProps {
  otp: string
}

/**
 * Email verification template with OTP code
 */
export const EmailVerificationTemplate: React.FC<EmailVerificationTemplateProps> = ({ otp }) => {
  return (
    <EmailContainer
      title='Zhop Email Verification'
      previewText={`Zhop email verification code: ${otp}`}
    >
      <ContentSection>
        <Heading as='h2' className='mt-0 text-gray-800 text-xl font-semibold'>
          Verify Your Email Address
        </Heading>

        <Text className='mb-6 text-gray-600 leading-relaxed'>
          Hello! Thank you for signing up with Zhop. Please use the following verification code to
          confirm your email address:
        </Text>

        {/* Verification Code Box - Using OtpCode component */}
        <OtpCode code={otp} />

        {/* Instructions and Security Notes */}
        <Text className='text-gray-600 mb-2 leading-relaxed'>
          This verification code will expire in <strong>10 minutes</strong>.
        </Text>
        <Text className='text-gray-600 mb-6 leading-relaxed'>
          If you didn't create an account with us, please ignore this email.
        </Text>

        {/*/!* Call to Action Button *!/*/}
        {/*<Section className="text-center mb-7">*/}
        {/*  <Button href="https://zhop.app" variant="primary">*/}
        {/*    Complete Verification*/}
        {/*  </Button>*/}
        {/*</Section>*/}

        {/* Help Section */}
        <Section className='border-t border-gray-200 pt-5 mt-2'>
          <Text className='text-sm text-gray-500 mb-0 leading-relaxed'>
            Need help? Contact our support team or visit our help center.
          </Text>
        </Section>
      </ContentSection>
    </EmailContainer>
  )
}

export default EmailVerificationTemplate
