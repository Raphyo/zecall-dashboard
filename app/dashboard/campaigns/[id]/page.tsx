import { fetchCampaignDetails } from '@/app/lib/data';
import { Campaign } from '@/app/lib/definitions';
import { formatDateToLocal } from '@/app/lib/utils';
import { StartCampaignButton } from '@/app/ui/campaigns/start-campaign-button';
import { auth } from '@/auth';
import clsx from 'clsx';

export default async function CampaignPage({
  params,
}: {
    params: { id: string } | Promise<{ id: string }>;
}) {
  await auth();
  const resolvedParams = 'then' in params ? await params : params;
  const campaign = await fetchCampaignDetails(resolvedParams.id) as Campaign;
  if (!campaign) {
    return <div>Campaign not found</div>;
  }

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-2xl">{campaign.name}</h1>
        <div className="flex items-center gap-4">
          <span className={clsx(
            'inline-flex items-center rounded-full px-3 py-1 text-sm',
            {
              'bg-green-100 text-green-700': campaign.status === 'completed',
              'bg-yellow-100 text-yellow-700': campaign.status === 'in_progress',
              'bg-red-100 text-red-700': campaign.status === 'failed',
              'bg-gray-100 text-gray-700': campaign.status === 'created',
            }
          )}>
            {campaign.status}
          </span>
          {campaign.status === 'created' && (
            <StartCampaignButton campaignId={campaign.id} />
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium">Contacts</h2>
        <div className="mt-4 flow-root">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Called At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaign.contacts?.map((contact) => (
                <tr key={contact.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {contact.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {contact.phone_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={clsx(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      {
                        'bg-gray-100 text-gray-800': contact.status === 'pending',
                        'bg-green-100 text-green-800': contact.status === 'completed',
                        'bg-red-100 text-red-800': contact.status === 'failed'
                      }
                    )}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.called_at ? formatDateToLocal(contact.called_at) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}