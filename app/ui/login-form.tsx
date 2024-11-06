'use client';

import { useFormStatus } from 'react-dom';
import {useActionState} from 'react'
import { authenticate } from '@/app/lib/actions';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [errorMessage, dispatch] = useActionState(authenticate, undefined);
  const { pending } = useFormStatus();

  return (
    <form action={dispatch} className="space-y-3">
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
        <h1 className={`mb-3 text-2xl`}>
          Please log in to continue.
        </h1>
        <div className="w-full">
          <div>
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="email"
            >
              Email
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email address"
                required
                disabled={pending}
              />
            </div>
          </div>
          <div>
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="password"
                type="password"
                name="password"
                placeholder="Enter password"
                required
                disabled={pending}
              />
            </div>
          </div>
        </div>
        <button
          className="mt-4 w-full rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-400 disabled:bg-blue-300"
          disabled={pending}
        >
          {pending ? 'Signing in...' : 'Sign in'}
        </button>
        {errorMessage && (
          <div className="mt-4 text-sm text-red-500">
            {errorMessage}
          </div>
        )}
      </div>
    </form>
  );
}