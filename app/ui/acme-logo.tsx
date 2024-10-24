import { CpuChipIcon } from '@heroicons/react/24/outline';
import { lusitana } from '@/app/ui/fonts';

export default function ZecallLogo() {
  return (
    <div
      className={`${lusitana.className} flex flex-row items-center leading-none text-white`}
    >
      <CpuChipIcon className="h-12 w-12 mr-4 rotate-[15deg]" />
      <p className="text-[44px]">Zecall.ai</p>
    </div>
  );
}
