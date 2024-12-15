import { auth } from '@/auth';
import CampaignForm from '@/app/ui/campaigns/campaign-form';

export default async function CreateCampaignPage() {
  await auth();
  
  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-2xl">Create Campaign</h1>
      </div>
      <div className="mt-8">
        <CampaignForm />
      </div>
    </div>
  );
}