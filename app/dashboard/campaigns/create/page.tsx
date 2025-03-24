'use client';

import { useState, useEffect, useCallback } from 'react';
import { DocumentIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { getPhoneNumbers, createCampaign, type PhoneNumber } from '@/app/lib/api';
import { useSession } from 'next-auth/react';
import { toast, Toaster } from 'react-hot-toast';

interface CampaignForm {
  name: string;
  status: string;
  scheduled_date: string;
  phoneNumberId: string;
  contactsFile: File | null;
  retry_frequency: number;
  max_retries: number;
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [contactsCount, setContactsCount] = useState(0);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [isLoadingPhones, setIsLoadingPhones] = useState(true);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignForm>({
    name: '',
    status: 'brouillon',
    scheduled_date: '',
    phoneNumberId: '',
    contactsFile: null,
    retry_frequency: 5,
    max_retries: 2,
  });

  const loadPhoneNumbers = useCallback(async () => {
    console.log('loadPhoneNumbers called');
    try {
      setIsLoadingPhones(true);
      setPhoneError(null);
      if (!session?.user?.id) {
        throw new Error('User ID not found');
      }
      console.log('Fetching phone numbers...');
      const numbers = await getPhoneNumbers(session.user.id);
      console.log('Received phone numbers:', numbers);
      setPhoneNumbers(numbers.filter(n => n.status === 'active'));
    } catch (err) {
      console.error('Detailed error:', err);
      setPhoneError('Erreur lors du chargement des numéros');
    } finally {
      setIsLoadingPhones(false);
    }
  }, [session]);

  useEffect(() => {
    console.log('useEffect triggered');
    if (session) {
      loadPhoneNumbers();
    }
  }, [session, loadPhoneNumbers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!campaign.name.trim()) {
      toast.error('Le nom de la campagne est requis');
      return;
    }

    if (!campaign.contactsFile) {
      toast.error('La liste des contacts est requise');
      return;
    }

    if (!campaign.phoneNumberId) {
      toast.error('Un numéro de téléphone est requis');
      return;
    }

    try {
      setIsSubmitting(true);

      // Check credits before proceeding
      const estimatedDurationMinutes = contactsCount * 2; // 2 minutes per contact
      const creditsResponse = await fetch(`/api/credits/check?duration_minutes=${estimatedDurationMinutes}`);
      const creditsData = await creditsResponse.json();

      if (!creditsResponse.ok) {
        throw new Error(creditsData.error || 'Failed to check credits');
      }

      if (!creditsData.has_sufficient_credits) {
        const requiredCredits = creditsData.estimated_cost;
        const currentBalance = creditsData.current_balance;
        toast.error(
          <div className="text-sm">
            <p className="font-medium mb-1">Crédits insuffisants</p>
            <p>Vous avez {currentBalance.toFixed(2)}€ mais cette campagne nécessite environ {requiredCredits.toFixed(2)}€</p>
            <p className="mt-2">Veuillez recharger votre compte.</p>
          </div>,
          {
            duration: 6000,
            style: {
              maxWidth: '500px',
            },
          }
        );
        setIsSubmitting(false);
        return;
      }

      const apiFormData = new FormData();
      apiFormData.append('name', campaign.name);
      apiFormData.append('contacts_file', campaign.contactsFile as File);
      apiFormData.append('phone_number_id', campaign.phoneNumberId);
      apiFormData.append('max_retries', campaign.max_retries.toString());
      // Only append retry_frequency if max_retries > 1
      if (campaign.max_retries > 1) {
        apiFormData.append('retry_frequency', campaign.retry_frequency.toString());
      }
      // Set status based on submission type
      const status = selectedDate ? 'planifiée' : 'en-cours';
      apiFormData.append('status', status);
      if (session?.user?.id) {
        apiFormData.append('user_id', session.user.id);
      }
      if (selectedDate) {
        apiFormData.append('scheduled_date', selectedDate);
      }

      console.log('Creating campaign with status:', status);
      await createCampaign(apiFormData);

      router.replace('/dashboard/campaigns');
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création de la campagne');
      setIsSubmitting(false);
    }
  };

  // Separate handler for draft saving
  const handleSaveAsDraft = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const apiFormData = new FormData();
      apiFormData.append('name', campaign.name);
      if (campaign.contactsFile) {
        apiFormData.append('contacts_file', campaign.contactsFile);
      }
      apiFormData.append('phone_number_id', campaign.phoneNumberId);
      apiFormData.append('max_retries', campaign.max_retries.toString());
      apiFormData.append('status', 'brouillon');
      if (session?.user?.id) {
        apiFormData.append('user_id', session.user.id);
      }

      await createCampaign(apiFormData);
      router.replace('/dashboard/campaigns');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement du brouillon');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Veuillez sélectionner un fichier CSV');
      e.target.value = '';  // Reset the file input
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Validate CSV structure
      const headers = text.split('\n')[0].toLowerCase();
      if (!headers.includes('phone_number') || !headers.includes('name') || !headers.includes('email')) {
        toast.error('Le fichier CSV doit contenir les colonnes "phone_number", "name" et "email"');
        setCampaign(prev => ({ ...prev, contactsFile: null }));
        e.target.value = '';  // Reset the file input
        return;
      }
      const rows = text.split('\n').filter(row => row.trim()).length - 1;
      setContactsCount(rows);
      setCampaign(prev => ({ ...prev, contactsFile: file }));  // Set file only after validation
    };
    reader.readAsText(file);
  };

  return (
    <>
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        containerStyle={{
          bottom: '24px',
          right: '24px',
        }}
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#374151',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            borderRadius: '8px',
            padding: '16px',
          },
          success: {
            duration: 4000,
            style: {
              background: '#F0FDF4',
              color: '#166534',
              border: '1px solid #DCFCE7',
            },
          },
          error: {
            duration: 6000,
            style: {
              background: '#FEF2F2',
              color: '#991B1B',
              border: '1px solid #FEE2E2',
            },
          },
        }}
      />
      {isSubmitting ? (
        <div className="w-full max-w-3xl mx-auto">
          <div className="h-8 w-48 bg-gray-200 rounded mb-6 animate-pulse" />
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-8 space-y-12">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border-b border-gray-900/10 pb-12">
                  <div className="h-5 w-32 bg-gray-200 rounded mb-4 animate-pulse" />
                  <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
              <div className="flex justify-end">
                <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-8 py-6 border-b border-gray-200">
              <h1 className="text-2xl font-semibold text-gray-900">Créer une nouvelle campagne</h1>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-12">
                {/* Campaign Name Section */}
                <section className="border-b border-gray-900/10 pb-12">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Nom de la campagne <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={campaign.name}
                      onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                </section>

                {/* Phone Number Selection */}
                <section className="border-b border-gray-900/10 pb-12">
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                      Numéro de téléphone <span className="text-red-500">*</span>
                    </label>
                    {isLoadingPhones ? (
                      <div className="mt-1 text-sm text-gray-500">
                        Chargement des numéros...
                      </div>
                    ) : phoneError ? (
                      <div className="mt-1 text-sm text-red-500">
                        {phoneError}
                      </div>
                    ) : phoneNumbers.length > 0 ? (
                      <div className="mt-1">
                        <select
                          id="phoneNumber"
                          value={campaign.phoneNumberId}
                          onChange={(e) => setCampaign({ ...campaign, phoneNumberId: e.target.value })}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                          required
                        >
                          <option value="">Sélectionnez un numéro</option>
                          {phoneNumbers.map((number) => (
                            <option key={number.id} value={number.id}>
                              {number.number} ({number.type === 'local' ? 'Numéro local' : 
                                number.type === 'mobile' ? 'Numéro mobile' : 'Numéro vert'})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-gray-500">
                        <p>Aucun numéro de téléphone disponible. Contactez l'administrateur pour obtenir un numéro.</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Contacts CSV Section */}
                <section className="border-b border-gray-900/10 pb-12">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Liste des contacts <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-2 flex items-center gap-x-3">
                      <div className="relative">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className={`cursor-pointer inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm
                            ${campaign.contactsFile 
                              ? 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                              : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                        >
                          {campaign.contactsFile ? 'Remplacer le fichier' : 'Sélectionner un fichier'}
                        </label>
                      </div>
                      {campaign.contactsFile && (
                        <div className="text-sm text-gray-500">
                          <DocumentIcon className="h-5 w-5 inline-block mr-1" />
                          {campaign.contactsFile.name}
                          <span className="ml-2 text-gray-400">({contactsCount} contacts)</span>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Fichier CSV avec les colonnes "phone_number", "name" et "email"
                    </p>
                  </div>
                </section>

                {/* Add Retry Settings Section before the Schedule Section */}
                <section className="border-b border-gray-900/10 pb-12">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Paramètres de rappel
                    </label>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm text-gray-700">
                          Nombre maximum de tentatives
                        </label>
                        <select
                          value={campaign.max_retries}
                          onChange={(e) => setCampaign({ ...campaign, max_retries: parseInt(e.target.value) })}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        >
                          <option value={1}>1 tentative (pas de rappel)</option>
                          <option value={2}>2 tentatives (1 rappel)</option>
                          <option value={3}>3 tentatives (2 rappels)</option>
                          <option value={4}>4 tentatives (3 rappels)</option>
                          <option value={5}>5 tentatives (4 rappels)</option>
                          <option value={6}>6 tentatives (5 rappels)</option>
                          <option value={7}>7 tentatives (6 rappels)</option>
                          <option value={8}>8 tentatives (7 rappels)</option>
                          <option value={9}>9 tentatives (8 rappels)</option>
                          <option value={10}>10 tentatives (9 rappels)</option>
                          <option value={11}>11 tentatives (10 rappels)</option>
                          <option value={12}>12 tentatives (11 rappels)</option>
                          <option value={13}>13 tentatives (12 rappels)</option>
                          <option value={14}>14 tentatives (13 rappels)</option>
                          <option value={15}>15 tentatives (14 rappels)</option>
                        </select>
                      </div>

                      {campaign.max_retries > 1 && (
                        <div>
                          <label className="block text-sm text-gray-700">
                            Délai entre les tentatives
                          </label>
                          <select
                            value={campaign.retry_frequency}
                            onChange={(e) => setCampaign({ ...campaign, retry_frequency: parseInt(e.target.value) })}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                          >
                            <option value={1}>1 minute</option>
                            <option value={5}>5 minutes</option>
                            <option value={1440}>1 jour</option>
                            <option value={2880}>2 jours</option>
                            <option value={4320}>3 jours</option>
                            <option value={5760}>4 jours</option>
                            <option value={7200}>5 jours</option>
                            <option value={8640}>6 jours</option>
                            <option value={10080}>7 jours</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Schedule Section */}
                <section className="pb-12">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Planification <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate('');
                          const dateInput = document.getElementById('schedule-date') as HTMLInputElement;
                          if (dateInput) dateInput.setCustomValidity('');
                        }}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
                          !selectedDate 
                            ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Lancer maintenant
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          setSelectedDate(tomorrow.toISOString().split('T')[0]);
                        }}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
                          selectedDate 
                            ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Planifier pour plus tard
                      </button>
                    </div>
                    {selectedDate && (
                      <div className="mt-4">
                        <input
                          id="schedule-date"
                          type="datetime-local"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                          required={!!selectedDate}
                          onInvalid={(e) => {
                            const target = e.target as HTMLInputElement;
                            target.setCustomValidity('Veuillez sélectionner une date de planification');
                          }}
                          onInput={(e) => {
                            const target = e.target as HTMLInputElement;
                            target.setCustomValidity('');
                          }}
                        />
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="mt-6 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => router.replace('/dashboard/campaigns')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsDraft}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Enregistrer en brouillon
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {isSubmitting ? 'Création en cours...' : 'Créer la campagne'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}