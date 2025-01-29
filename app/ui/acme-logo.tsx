import Image from 'next/image';

export default function ZecallLogo() {
  return (
    <div className="flex items-center">
      <Image
        src="/logo.jpeg"
        alt="Zecall.ai Logo"
        width={250}
        height={84}
        priority
      />
    </div>
  );
}