'use client';

import { useSession } from 'next-auth/react';

export default function ProfilePage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-10 divide-y divide-gray-900/10">
      {/* Personal Information Section */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 pt-10 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base font-semibold leading-7 text-gray-900">
            Informations personnelles
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Vos informations de profil.
          </p>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
          <div className="px-4 py-6 sm:p-8">
            <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  Prénom
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    value={session?.user?.name || ''}
                    disabled
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 bg-gray-50 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  Email
                </label>
                <div className="mt-2">
                  <input
                    type="email"
                    value={session?.user?.email || ''}
                    disabled
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 bg-gray-50 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  User ID
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    value={session?.user?.id || 'Not available'}
                    disabled
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 bg-gray-50 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security and Notifications sections removed */}
    </div>
  );
}