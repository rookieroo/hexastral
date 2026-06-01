import { Heading, Text, Section } from '@react-email/components';
import type * as React from 'react';
import { Button, ContentSection, EmailContainer } from '../../components';

export interface OrganizationInvitationTemplateProps {
  invitedByUsername: string;
  invitedByEmail: string;
  teamName: string;
  inviteLink: string;
}

/**
 * Email inviting a user to join a team / organization.
 */
export const OrganizationInvitationTemplate: React.FC<OrganizationInvitationTemplateProps> = ({
  invitedByUsername,
  invitedByEmail,
  teamName,
  inviteLink,
}) => {
  return (
    <EmailContainer
      title="Team invitation on Zhop"
      previewText={`${invitedByUsername} invited you to join ${teamName}`}
    >
      <ContentSection>
        <Heading as="h2" className="mt-0 text-gray-800 text-xl font-semibold">
          {"You're invited to join a team"}
        </Heading>
        <Text className="mb-4 text-gray-600 leading-relaxed">
          <strong>{invitedByUsername}</strong> ({invitedByEmail}) has invited you to join{' '}
          <strong>{teamName}</strong> on Zhop.
        </Text>
        <Section className="mb-6 text-center">
          <Button href={inviteLink} variant="primary">
            Accept invitation
          </Button>
        </Section>
        <Text className="text-sm text-gray-500 leading-relaxed">
          If the button does not work, copy and paste this link into your browser:
        </Text>
        <Text className="break-all text-sm text-gray-700 leading-relaxed">{inviteLink}</Text>
      </ContentSection>
    </EmailContainer>
  );
};

export default OrganizationInvitationTemplate;
