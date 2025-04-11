'use client';

import { lusitana } from '@/app/ui/fonts';
import {
  AtSymbolIcon,
  KeyIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { Button } from '@/app/ui/button';
import { authenticate } from '@/app/lib/actions';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

function LoginButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button className="mt-4 w-full" aria-disabled={pending}>
      {pending ? (
        <div className="flex items-center justify-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
          Connexion en cours...
        </div>
      ) : (
        <>
          Se connecter <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" />
        </>
      )}
    </Button>
  );
}

export default function LoginForm() {
  const [errorMessage, formAction] = useActionState(authenticate, undefined);

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-100 via-white to-purple-50 flex flex-col items-center justify-center overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-[5%] left-[5%] w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-[15%] right-[5%] w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[5%] left-[15%] w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-md w-full backdrop-blur-sm bg-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-8 p-8 border border-white/20 mx-4">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-400">
            Connexion
          </h2>
          <p className="text-gray-600">
            Veuillez vous connecter pour continuer.
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="group w-full flex items-center justify-center gap-3 px-4 py-3.5 border-2 border-gray-200 rounded-xl bg-white/50 text-gray-700 hover:bg-white hover:border-purple-200 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            className="h-5 w-5 group-hover:scale-110 transition-transform duration-200"
          />
          <span className="text-base font-medium">Continuer avec Google</span>
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-4 bg-white/80 text-gray-500 backdrop-blur-sm">Ou continuer avec</span>
          </div>
        </div>

        <form action={formAction} className="space-y-6">
          <div className="space-y-5">
            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-1.5"
                htmlFor="email"
              >
                Email
              </label>
              <div className="relative group">
                <input
                  className="block w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Entrez votre adresse email"
                  required
                />
                <AtSymbolIcon className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-200" />
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium text-gray-700 mb-1.5"
                htmlFor="password"
              >
                Mot de passe
              </label>
              <div className="relative group">
                <input
                  className="block w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Entrez votre mot de passe"
                  required
                  minLength={6}
                />
                <KeyIcon className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-200" />
              </div>
            </div>
          </div>

          <LoginButton />

          {errorMessage && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
              <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
              <p>{errorMessage === 'Invalid credentials.' ? 'Identifiants invalides.' : errorMessage}</p>
            </div>
          )}
        </form>

        <p className="text-center text-sm text-gray-600">
          Vous n'avez pas de compte ?{' '}
          <Link href="/signup" className="font-semibold text-purple-600 hover:text-purple-500 hover:underline transition-all duration-200">
            S'inscrire
          </Link>
        </p>
      </div>

      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}