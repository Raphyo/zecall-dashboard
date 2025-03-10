import SignUpForm from '@/app/ui/signup/signup-form';
import AcmeLogo from '@/app/ui/acme-logo';

export default function SignUpPage() {
  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4">
        <div className="flex h-20 w-full items-center justify-center rounded-lg p-3 md:h-36">
          <div className="w-48 md:w-56">
            <AcmeLogo />
          </div>
        </div>
        <SignUpForm />
      </div>
    </main>
  );
}