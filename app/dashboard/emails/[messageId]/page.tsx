import EmailView from '@/app/components/EmailView';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Email View - ZeCall Dashboard',
  description: 'View and interact with email content',
};

export default function EmailViewPage({ params }: { params: { messageId: string } }) {
  return (
    <div className="p-6">
      <EmailView messageId={params.messageId} />
    </div>
  );
} 