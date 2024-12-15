import { Campaign } from '@/app/lib/definitions';
import { EyeIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { formatDateToLocal } from '@/app/lib/utils';
import DeleteButton from './delete-button';
import clsx from 'clsx';

export default function CampaignsList({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <div className="md:hidden">
            {campaigns?.map((campaign) => (
              <div
                key={campaign.id}
                className="mb-2 w-full rounded-md bg-white p-4"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <div className="mb-2 flex items-center">
                      <p className="text-sm text-gray-500">{campaign.name}</p>
                    </div>
                  </div>
                </div>
                <div className="flex w-full items-center justify-between pt-4">
                  <div>
                    <p className="text-xl font-medium">
                      {formatDateToLocal(campaign.created_at)}
                    </p>
                    <p className={clsx(
                      'text-sm',
                      {
                        'text-green-600': campaign.status === 'completed',
                        'text-yellow-600': campaign.status === 'in_progress',
                        'text-red-600': campaign.status === 'failed',
                        'text-gray-600': campaign.status === 'created',
                      }
                    )}>
                      {campaign.status}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}`}
                      className="rounded-md border p-2 hover:bg-gray-100"
                    >
                      <EyeIcon className="w-5" />
                    </Link>
                    <DeleteButton campaignId={campaign.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Name
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Created At
                </th>
                <th scope="col" className="relative py-3 pl-6 pr-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {campaigns?.map((campaign) => (
                <tr
                  key={campaign.id}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex items-center gap-3">
                      <p>{campaign.name}</p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={clsx(
                      'inline-flex items-center rounded-full px-2 py-1 text-xs',
                      {
                        'bg-green-100 text-green-700': campaign.status === 'completed',
                        'bg-yellow-100 text-yellow-700': campaign.status === 'in_progress',
                        'bg-red-100 text-red-700': campaign.status === 'failed',
                        'bg-gray-100 text-gray-700': campaign.status === 'created',
                      }
                    )}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatDateToLocal(campaign.created_at)}
                  </td>
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/dashboard/campaigns/${campaign.id}`}
                        className="rounded-md border p-2 hover:bg-gray-100"
                      >
                        <EyeIcon className="w-5" />
                      </Link>
                      <DeleteButton campaignId={campaign.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {campaigns.length === 0 && (
            <div className="text-center py-10">
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No campaigns</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new campaign.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}