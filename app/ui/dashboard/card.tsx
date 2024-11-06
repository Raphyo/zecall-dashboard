import { lusitana } from '@/app/ui/fonts';
import {
  PhoneArrowDownLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const iconMap = {
  calls: PhoneArrowDownLeftIcon,
  duration: ClockIcon,
  success: CheckCircleIcon,
  users: UserGroupIcon,
};

export function Card({
  title,
  value,
  type,
}: {
  title: string;
  value: string;
  type: 'calls' | 'duration' | 'success' | 'users';
}) {
  const Icon = iconMap[type];

  return (
    <div className="rounded-xl bg-gray-50 p-2 shadow-sm">
      <div className="flex p-4">
        {Icon ? <Icon className="h-5 w-5 text-gray-700" /> : null}
        <h3 className="ml-2 text-sm font-medium">{title}</h3>
      </div>
      <p className={`${lusitana.className} truncate rounded-xl bg-white px-4 py-8 text-center text-2xl`}>
        {value}
      </p>
    </div>
  );
}