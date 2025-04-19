'use client';

import { AtSymbolIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/ui/button';
import { useFormStatus, useFormState } from 'react-dom';
import Link from 'next/link';
import { resetPassword, type ResetPasswordState } from '@/app/lib/reset-password-actions';

function ResetButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button className="mt-4 w-full" aria-disabled={pending}>
      {pending ? (
        <div className="flex items-center justify-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
          Envoi en cours...
        </div>
      ) : (
        <>
          Réinitialiser le mot de passe
        </>
      )}
    </Button>
  );
}

export default function ResetPasswordForm() {
  const [state, formAction] = useFormState(resetPassword, { message: '', success: false });

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
            Mot de passe oublié
          </h2>
          <p className="text-gray-600">
            Entrez votre email pour réinitialiser votre mot de passe.
          </p>
        </div>

        <form action={formAction} className="space-y-6">
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

          <ResetButton />

          {state?.message && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
              state.success ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'
            }`}>
              <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
              <p>{state.message}</p>
            </div>
          )}
        </form>

        <p className="text-center text-sm text-gray-600">
          Retourner à la{' '}
          <Link href="/login" className="font-semibold text-purple-600 hover:text-purple-500 hover:underline transition-all duration-200">
            page de connexion
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