import { Heading, Text, Section } from '@react-email/components';
import type * as React from 'react';
import { ContentSection, EmailContainer, InfoBox } from '../../components';

export interface ContactTemplateProps {
  name: string;
  email: string;
  message: string;
}

/**
 * Internal notification when someone submits the contact form.
 */
export const ContactTemplate: React.FC<ContactTemplateProps> = ({ name, email, message }) => {
  return (
    <EmailContainer
      title="Zhop Contact Form Submission"
      previewText={`New message from ${name}`}
    >
      <ContentSection>
        <Heading as="h2" className="mt-0 text-gray-800 text-xl font-semibold">
          New contact form message
        </Heading>
        <Text className="mb-4 text-gray-600 leading-relaxed">
          You have received a new submission through the Zhop contact form.
        </Text>
        <InfoBox title="Sender" variant="info">
          <Text className="m-0 text-sm text-gray-700 leading-relaxed">
            <strong>Name:</strong> {name}
          </Text>
          <Text className="m-0 mt-2 text-sm text-gray-700 leading-relaxed">
            <strong>Email:</strong> {email}
          </Text>
        </InfoBox>
        <Section className="mt-6">
          <Text className="mb-2 text-sm font-semibold text-gray-800">Message</Text>
          <Text className="m-0 whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed">
            {message}
          </Text>
        </Section>
      </ContentSection>
    </EmailContainer>
  );
};

export default ContactTemplate;
