/**
 * Email sending utilities
 *
 * All functions accept an EmailServiceClient as the first parameter.
 * Rendering is done via @react-email/components render() and sent
 * through the svc-mailer Service Binding.
 */

import { render } from '@react-email/components'
import React from 'react'
import type { EmailServiceClient } from '../service-client'
import {
  CancellationEmailTemplate,
  ContactTemplate,
  EmailVerificationTemplate,
  OrganizationInvitationTemplate,
  SignInTemplate,
  WelcomeEmailTemplate,
} from '../templates'

/**
 * Send a welcome email to a specific email address.
 */
export async function sendWelcomeEmail(
  mailer: EmailServiceClient,
  userEmail: string,
  planName: string
) {
  try {
    const html = await render(React.createElement(WelcomeEmailTemplate, { planName }))
    await mailer.send({
      to: userEmail,
      subject: `Welcome to the Zhop ${planName} Plan`,
      html,
    })
  } catch (error) {
    console.error(`[Email] Failed to send welcome email to ${userEmail}:`, error)
    throw error
  }
}

/**
 * Send a cancellation email to a specific email address.
 */
export async function sendCancellationEmail(mailer: EmailServiceClient, userEmail: string) {
  try {
    const html = await render(React.createElement(CancellationEmailTemplate, {}))
    await mailer.send({
      to: userEmail,
      subject: 'Zhop Subscription Cancelled',
      html,
    })
  } catch (error) {
    console.error(`[Email] Failed to send cancellation email to ${userEmail}:`, error)
    throw error
  }
}

/**
 * Send an organization invitation email.
 */
export async function sendOrganizationInvitation(
  mailer: EmailServiceClient,
  options: {
    email: string
    invitedByUsername: string
    invitedByEmail: string
    teamName: string
    inviteLink: string
  }
) {
  const { email, invitedByUsername, invitedByEmail, teamName, inviteLink } = options
  try {
    const html = await render(
      React.createElement(OrganizationInvitationTemplate, {
        invitedByUsername,
        invitedByEmail,
        teamName,
        inviteLink,
      })
    )
    await mailer.send({
      to: email,
      subject: 'Invitation to join a team on Zhop',
      html,
    })
  } catch (error) {
    console.error(`[Email] Failed to send organization invitation to ${email}:`, error)
    throw error
  }
}

/**
 * Send a sign-in verification email with OTP code.
 */
export async function sendSignInEmail(mailer: EmailServiceClient, userEmail: string, otp: string) {
  try {
    const html = await render(React.createElement(SignInTemplate, { otp }))
    await mailer.send({
      to: userEmail,
      subject: 'Zhop - Sign-in Verification Code',
      html,
    })
  } catch (error) {
    console.error(`[Email] Failed to send sign-in email to ${userEmail}:`, error)
    throw error
  }
}

/**
 * Send an email verification code.
 */
export async function sendEmailVerification(
  mailer: EmailServiceClient,
  userEmail: string,
  otp: string
) {
  try {
    const html = await render(React.createElement(EmailVerificationTemplate, { otp }))
    await mailer.send({
      to: userEmail,
      subject: 'Zhop - Email Verification Code',
      html,
    })
  } catch (error) {
    console.error(`[Email] Failed to send email verification to ${userEmail}:`, error)
    throw error
  }
}

/**
 * Send a contact form submission notification.
 */
export async function sendContactFormNotification(
  mailer: EmailServiceClient,
  options: {
    name: string
    email: string
    message: string
    recipientEmail: string
  }
) {
  const { name, email, message, recipientEmail } = options
  try {
    const html = await render(React.createElement(ContactTemplate, { name, email, message }))
    await mailer.send({
      to: recipientEmail,
      subject: 'Zhop Contact Form Submission',
      html,
    })
  } catch (error) {
    console.error(`[Email] Failed to send contact form notification to ${recipientEmail}:`, error)
    throw error
  }
}
