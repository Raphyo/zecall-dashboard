import Image from 'next/image';

export default function ZecallLogo() {
  return (
    <div className="flex items-center justify-center">
      <Image
        src="/logo.png"
        alt="Zecall.ai Logo"
        width={250}
        height={84}
        priority
        unoptimized
      />
    </div>
  );
}