'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EmailList from '@/app/components/EmailList';

// Client component that uses useSearchParams
function EmailListWithParams() {
  const searchParams = useSearchParams();
  const shouldCompose = searchParams.get('compose') === 'true';
  
  return <EmailList initialCompose={shouldCompose} />;
}

// Loading fallback for Suspense
function EmailListLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-12 bg-gray-200 rounded w-3/4"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  );
}

export default function EmailsPage() {
  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Mes Emails</h1>
        <p className="text-sm text-gray-600 mt-1">
          Consultez et gérez vos emails Gmail
        </p>
      </div>
      
      <Suspense fallback={<EmailListLoading />}>
        <EmailListWithParams />
      </Suspense>
    </div>
  );
} 