'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import EmailList from '@/app/components/EmailList';

export default function EmailsPage() {
  const searchParams = useSearchParams();
  const shouldCompose = searchParams.get('compose') === 'true';

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Mes Emails</h1>
        <p className="text-sm text-gray-600 mt-1">
          Consultez et gérez vos emails Gmail
        </p>
      </div>
      
      <EmailList initialCompose={shouldCompose} />
    </div>
  );
} 