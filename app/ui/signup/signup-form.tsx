'use client';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { register } from '@/app/lib/actions';
import { Button } from '@/app/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" aria-disabled={pending}>
      Sign up <span className="ml-2">→</span>
    </Button>
  );
}

export default function SignUpForm() {
  const router = useRouter();
  const initialState = { message: '', success: false };
  const [state, formAction] = useActionState(register, initialState);
  const [phoneNumber, setPhoneNumber] = useState<string>();

  useEffect(() => {
    if (state?.success) {
      router.push('/login');
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
        <h1 className="mb-3 text-2xl">Create an account.</h1>
        <div className="w-full">
          {/* Name field */}
          <div>
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="name"
            >
              Name
            </label>
            <input
              className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
              id="name"
              type="text"
              name="name"
              placeholder="Enter your name"
              required
            />
          </div>

          {/* Email field */}
          <div>
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="email"
            >
              Email
            </label>
            <input
              className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email address"
              required
            />
          </div>

                    {/* Phone Number field */}
                    <div>
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="phoneNumber"
            >
              Phone Number
            </label>
            <div className="phone-input-container">
              <PhoneInput
                international
                countryCallingCodeEditable={false}
                defaultCountry="US"
                value={phoneNumber}
                onChange={setPhoneNumber}
                name="phoneNumber"
                id="phoneNumber"
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="password"
            >
              Password
            </label>
            <input
              className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
              id="password"
              type="password"
              name="password"
              placeholder="Enter password"
              required
              minLength={6}
            />
          </div>
        </div>
        <SubmitButton />
        {state?.message && !state.success && (
          <div className="mt-4 text-red-500">{state.message}</div>
        )}
      </div>
    </form>
  );
}