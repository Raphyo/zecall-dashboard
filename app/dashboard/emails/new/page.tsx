import EmailView from '@/app/components/EmailView';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nouveau message - ZeCall Dashboard',
  description: 'Composer un nouveau message email',
};

export default function ComposeEmailPage() {
  return (
    <div className="p-6">
      <EmailView messageId="new" />
    </div>
  );
} 