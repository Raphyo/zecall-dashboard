'use client';

import { KeyIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/app/ui/button';
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword } from '@/app/lib/reset-password-actions';

function UpdateButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button className="mt-4 w-full" aria-disabled={pending}>
      {pending ? (
        <div className="flex items-center justify-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
          Mise à jour en cours...
        </div>
      ) : (
        <>
          Mettre à jour le mot de passe
        </>
      )}
    </Button>
  );
}

export default function UpdatePasswordForm({
  token,
  userId
}: {
  token: string;
  userId: number;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(updatePassword, { message: '', success: false });

  if (state?.success) {
    router.push('/login?success=password_updated');
    return null;
  }

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
            Nouveau mot de passe
          </h2>
          <p className="text-gray-600">
            Choisissez votre nouveau mot de passe.
          </p>
        </div>

        <form action={formAction} className="space-y-6">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="userId" value={userId} />

          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-1.5"
              htmlFor="password"
            >
              Nouveau mot de passe
            </label>
            <div className="relative group">
              <input
                className="block w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
                id="password"
                type="password"
                name="password"
                placeholder="Entrez votre nouveau mot de passe"
                required
                minLength={8}
              />
              <KeyIcon className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-200" />
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-1.5"
              htmlFor="confirmPassword"
            >
              Confirmer le mot de passe
            </label>
            <div className="relative group">
              <input
                className="block w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                placeholder="Confirmez votre nouveau mot de passe"
                required
                minLength={8}
              />
              <KeyIcon className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-200" />
            </div>
          </div>

          <UpdateButton />

          {state?.message && !state.success && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
              <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
              <p>{state.message}</p>
            </div>
          )}
        </form>
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