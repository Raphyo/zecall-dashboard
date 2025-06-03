import EmailView from '@/app/components/EmailView';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Email View - ZeCall Dashboard',
  description: 'View and interact with email content',
};

interface Props {
  params: Promise<{
    messageId: string;
  }>;
}

export default async function EmailViewPage({ params }: Props) {
  const { messageId } = await params;
  
  return (
    <div className="p-6">
      <EmailView messageId={messageId} />
    </div>
  );
} 