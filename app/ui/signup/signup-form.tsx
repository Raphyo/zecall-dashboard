'use client';
import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { register } from '@/app/lib/actions';
import { Button } from '@/app/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { lusitana } from '@/app/ui/fonts';
import { signIn } from 'next-auth/react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full mt-4" aria-disabled={pending}>
      S'inscrire <span className="ml-2">→</span>
    </Button>
  );
}

export default function SignUpForm() {
  const router = useRouter();
  const initialState = { message: '', success: false };
  const [state, formAction] = useFormState(register, initialState);

  useEffect(() => {
    if (state?.success) {
      router.push('/login');
    }
  }, [state, router]);

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="space-y-3">
      <form action={formAction} className="space-y-3">
        <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
          <h1 className={`${lusitana.className} mb-3 text-2xl`}>Créer un compte</h1>
          <div className="w-full">
            {/* Name field */}
            <div>
              <label
                className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                htmlFor="name"
              >
                Nom
              </label>
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="name"
                type="text"
                name="name"
                placeholder="Entrez votre nom"
                required
              />
            </div>
            <div className="mt-4 text-center text-sm">
                Vous avez déjà un compte ?{' '}
                <Link href="/login" className="text-blue-500 hover:text-blue-600">
                  Se connecter
                </Link>
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
                placeholder="Entrez votre adresse email"
                required
              />
            </div>

            {/* Password field */}
            <div>
              <label
                className="mb-3 mt-5 block text-xs font-medium text-gray-900"
                htmlFor="password"
              >
                Mot de passe
              </label>
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="password"
                type="password"
                name="password"
                placeholder="Entrez votre mot de passe"
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

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">Ou</span>
        </div>
      </div>

      <button
        onClick={handleGoogleSignIn}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
      >
        <img
          src="https://www.google.com/favicon.ico"
          alt="Google"
          className="h-5 w-5"
        />
        Continuer avec Google
      </button>
    </div>
  );
}