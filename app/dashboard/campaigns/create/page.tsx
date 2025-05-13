'use client';

import { useState, useEffect, useCallback } from 'react';
import { DocumentIcon, PhoneIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { getPhoneNumbers, createCampaign, type PhoneNumber } from '@/app/lib/api';
import { useSession } from 'next-auth/react';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';

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
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showRegulationModal, setShowRegulationModal] = useState(false);

  const loadPhoneNumbers = useCallback(async () => {
    try {
      setIsLoadingPhones(true);
      setPhoneError(null);
      if (!session?.user?.id) {
        throw new Error('User ID not found');
      }
      const numbers = await getPhoneNumbers(session.user.id);
      setPhoneNumbers(numbers.filter(n => n.status === 'active'));
    } catch (err) {
      setPhoneError('Erreur lors du chargement des numéros');
    } finally {
      setIsLoadingPhones(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      loadPhoneNumbers();
    }
  }, [session, loadPhoneNumbers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let loadingToast: string | undefined;
    
    // Validate required fields
    if (!campaign.name.trim()) {
      toast.error('Le nom de la campagne est requis');
      setIsSubmitting(false);
      return;
    }

    if (!campaign.contactsFile) {
      toast.error('La liste des contacts est requise');
      setIsSubmitting(false);
      return;
    }

    if (!campaign.phoneNumberId) {
      toast.error('Un numéro de téléphone est requis');
      setIsSubmitting(false);
      return;
    }

    // Check if the selected phone number has an assigned agent
    const selectedPhoneNumber = phoneNumbers.find(n => n.id === campaign.phoneNumberId);
    if (!selectedPhoneNumber?.agent_id) {
      toast.error(
        <div className="text-sm">
          <p className="font-medium mb-1">Agent IA non assigné</p>
          <p>Veuillez assigner un agent IA au numéro de téléphone sélectionné avant de lancer la campagne.</p>
          <p className="mt-2">
            <Link href="/dashboard/phone-numbers" className="text-blue-600 hover:text-blue-800">
              Gérer les agents IA →
            </Link>
          </p>
        </div>,
        { duration: 6000 }
      );
      setIsSubmitting(false);
      return;
    }

    try {
      setIsSubmitting(true);

      // Check credits before proceeding
      const estimatedMinutes = Math.ceil(contactsCount * 2); // 2 minutes per contact
      const creditsResponse = await fetch('/api/credits');
      const creditsData = await creditsResponse.json();

      if (!creditsResponse.ok) {
        throw new Error(creditsData.error || 'Failed to check credits');
      }

      const minutesBalance = creditsData.credits.minutes_balance;
      const hasSufficientCredits = minutesBalance >= estimatedMinutes;

      if (!hasSufficientCredits) {
        toast.error(
          <div className="text-sm">
            <p className="font-medium mb-1">Minutes insuffisantes</p>
            <p>Vous avez {minutesBalance} minutes disponibles mais cette campagne nécessite environ {estimatedMinutes} minutes</p>
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

      // Check business hours
      const now = new Date();
      const scheduleDate = selectedDate ? new Date(selectedDate) : now;

      // Convert to French time (UTC+1)
      const frenchTime = new Date(scheduleDate.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
      const hours = frenchTime.getHours();
      const minutes = frenchTime.getMinutes();
      const day = frenchTime.getDay();

      // Check if it's a weekend (0 is Sunday, 6 is Saturday)
      if (day === 0 || day === 6) {
        toast.error(
          <div className="text-sm">
            <p className="font-medium">Horaires non autorisés</p>
            <p>Les campagnes ne peuvent être lancées que pendant les jours ouvrables (lundi au vendredi).</p>
          </div>,
          { duration: 5000 }
        );
        setIsSubmitting(false);
        return;
      }

      // Check if it's within business hours (10:00-13:00 and 14:00-21:00 French time)
      if (hours < 10 || hours === 13 || hours >= 23) {
        toast.error(
          <div className="text-sm">
            <p className="font-medium">Horaires non autorisés</p>
            <p>Les campagnes ne peuvent être lancées qu'entre 10h et 21h (hors 13h-14h).</p>
          </div>,
          { duration: 5000 }
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
      
      // Show loading toast without auto-dismiss
      loadingToast = toast.loading('Création de la campagne en cours...', {
        duration: Infinity,  // Make toast stay until manually dismissed
        position: 'bottom-right',
      });

      const response = await createCampaign(apiFormData);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // If we get here, the campaign was created successfully
      toast.success('Campagne créée avec succès', {
        duration: 4000,
        position: 'bottom-right',
      });

      // Add a small delay before navigation to ensure toast is visible
      setTimeout(() => {
        router.push('/dashboard/campaigns');
      }, 500);
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      // Dismiss any existing toasts
      toast.dismiss(loadingToast);
      
      // Show detailed error message from API if available
      const errorMessage = error.message || 'Erreur lors de la création de la campagne';
      toast.error(errorMessage, {
        duration: 6000,  // Show error for longer
        position: 'bottom-right',
      });
    } finally {
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

  const handleFileSelectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowConsentModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowConsentModal(false);
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
      const lines = text.split('\n');
      const headers = lines[0].toLowerCase();
      
      // Validate CSV structure
      if (!headers.includes('phone_number')) {
        toast.error(
          <div className="text-sm">
            <p className="font-medium mb-1">Structure du fichier CSV invalide</p>
            <p className="mb-2">Le fichier doit contenir une colonne nommée "phone_number"</p>
            <p className="text-xs text-red-600">Colonnes trouvées:</p>
            <pre className="text-xs mt-1 bg-red-50 p-2 rounded">{headers}</pre>
          </div>,
          { duration: 8000 }
        );
        setCampaign(prev => ({ ...prev, contactsFile: null }));
        e.target.value = '';  // Reset the file input
        return;
      }

      // Find phone_number column index
      const headerColumns = headers.split(',').map(h => h.trim());
      const phoneNumberIndex = headerColumns.indexOf('phone_number');

      // Validate phone numbers format
      const invalidPhoneNumbers = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue; // Skip empty lines
        
        const columns = lines[i].split(',');
        let phoneNumber = columns[phoneNumberIndex]?.trim();
        
        if (!phoneNumber) continue; // Skip empty phone numbers
        
        // Remove spaces, hyphens, and non-numeric characters except '+'
        phoneNumber = phoneNumber.replace(/[\s-]/g, '');
        
        // Add + prefix if missing for numbers starting with country code
        if (!phoneNumber.startsWith('+') && (phoneNumber.startsWith('972') || phoneNumber.startsWith('33'))) {
          phoneNumber = '+' + phoneNumber;
        }
        
        // Check all valid formats:
        // 1. French format starting with +33 followed by 9 digits
        // 2. French format starting with 0 followed by 9 digits
        // 3. Israeli format starting with +972 followed by 9 digits
        const isValidFormat = (
          /^\+33\d{9}$/.test(phoneNumber) ||
          /^0\d{9}$/.test(phoneNumber) ||
          /^\+972\d{9}$/.test(phoneNumber)
        );
        
        if (!isValidFormat) {
          invalidPhoneNumbers.push({ line: i + 1, number: columns[phoneNumberIndex]?.trim() });
          if (invalidPhoneNumbers.length >= 3) break; // Limit the number of examples
        }
      }

      if (invalidPhoneNumbers.length > 0) {
        const examples = invalidPhoneNumbers
          .map(({ line, number }) => `Ligne ${line}: ${number}`)
          .join('\n');
        
        toast.error(
          <div className="text-sm">
            <p className="font-medium mb-1">Format de numéro de téléphone invalide</p>
            <p className="mb-2">Les formats acceptés sont:</p>
            <ul className="list-disc pl-4 mb-2 text-xs">
              <li>Format français: +33612345678 ou 0612345678 ou 33612345678</li>
            </ul>
            <p className="text-xs text-red-600">Exemples d'erreurs:</p>
            <pre className="text-xs mt-1 bg-red-50 p-2 rounded">{examples}</pre>
          </div>,
          { duration: 8000 }
        );
        setCampaign(prev => ({ ...prev, contactsFile: null }));
        e.target.value = '';  // Reset the file input
        return;
      }

      const rows = lines.filter(row => row.trim()).length - 1;
      setContactsCount(rows);
      setCampaign(prev => ({ ...prev, contactsFile: file }));  // Set file only after all validations pass
    };
    reader.readAsText(file);
  };

  return (
    <>
      {/* Regulation Modal */}
      {showRegulationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full flex flex-col max-h-[90vh]">
            <div className="p-6 border-b">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-orange-100 p-3">
                  <InformationCircleIcon className="h-6 w-6 text-orange-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-center">Réglementation sur la protection des données</h3>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="space-y-6 text-sm text-gray-600">
                <p className="font-medium">
                  Votre fichier doit être 100% OPT-IN, et vous devez être en mesure de fournir la preuve du consentement explicite de vos contacts.
                </p>

                <div>
                  <p className="font-medium mb-2">Cette preuve doit inclure au minimum :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>La date du consentement.</li>
                    <li>Les données collectées.</li>
                    <li>Les finalités pour lesquelles les données ont été collectées (ex. : offres promotionnelles, relances commerciales, enquêtes de satisfaction, etc.).</li>
                    <li>Les canaux de communication autorisés (téléphone, SMS, email, etc.).</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-2">Votre fichier contient-il des données sensibles ?</p>
                  <p className="mb-2">Si votre base de contacts contient des données sensibles, des obligations supplémentaires s'appliquent.</p>
                  <p className="mb-2">Sont considérées comme données sensibles :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>L'origine raciale ou ethnique</li>
                    <li>Les opinions politiques, philosophiques ou religieuses</li>
                    <li>L'appartenance syndicale</li>
                    <li>La santé ou la vie sexuelle</li>
                  </ul>
                </div>

                <div>
                  <p className="mb-2">Si vos fichiers contiennent l'une de ces informations, vous devez être en mesure de prouver au moins l'une des conditions suivantes en cas de contrôle :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Votre contact a donné son consentement exprès (écrit, clair et explicite) et vous pouvez en apporter la preuve.</li>
                    <li>Les données sont traitées à des fins médicales ou de recherche en santé, et vous justifiez d'une activité dans ce domaine.</li>
                    <li>Les données concernent les membres d'une association, organisation philosophique, politique ou syndicale.</li>
                    <li>Vous disposez d'une autorisation de la CNIL pour le traitement de ces données.</li>
                  </ul>
                </div>

                <p>
                  En cas de contrôle, nous nous réservons le droit de vous demander à tout moment la preuve du consentement des contacts de vos fichiers.
                </p>

                <p>
                  Pour vous aider à respecter la réglementation, nous avons mis en place des ressources et guides dédiés. Accédez à nos documentations ici : <a href="https://www.app.zecall.ai/conditions-generales-dutilisation" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">https://www.app.zecall.ai/conditions-generales-dutilisation</a>
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-between gap-4 border-t">
              <button
                type="button"
                onClick={() => setShowRegulationModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRegulationModal(false);
                  document.getElementById('file-upload')?.click();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Je suis conscient de mes obligations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consent Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-orange-100 p-3">
                  <InformationCircleIcon className="h-6 w-6 text-orange-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-center mb-4">Important</h3>
              <div className="space-y-4 text-sm text-gray-600">
                <p>
                  En utilisant notre solution pour vos campagnes d'appels, vous importez un fichier de contacts sous votre entière responsabilité.
                </p>
                <div>
                  <p className="mb-2">La réglementation impose que :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Votre fichier de contacts soit 100% opt-in.</li>
                    <li>Vous ayez conservé la preuve du consentement explicite de vos contacts.</li>
                  </ul>
                </div>
                <p>
                  Le traitement des données personnelles et sensibles est strictement encadré. Notre plateforme étant utilisée librement pour toutes vos campagnes d'appels, nous ne pourrons être tenus responsables en cas de non-conformité.
                </p>
                <p
                  className="text-blue-600 hover:text-blue-700 cursor-pointer"
                  onClick={() => {
                    setShowConsentModal(false);
                    setShowRegulationModal(true);
                  }}
                >
                  En savoir plus sur la réglementation en vigueur
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-between gap-4">
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConsentModal(false);
                  document.getElementById('file-upload')?.click();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Je suis conscient de mes obligations
              </button>
            </div>
          </div>
        </div>
      )}

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
                          onClick={handleFileSelectClick}
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
                      Votre fichier CSV doit contenir une colonne nommée "phone_number" qui contient les numéros de téléphone des contacts.
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
                            <option value={1}>Toutes les minutes</option>
                            <option value={60}>Toutes les heures</option>
                            <option value={120}>Toutes les 2 heures</option>
                            <option value={240}>Toutes les 4 heures</option>
                            <option value={360}>Toutes les 6 heures</option>
                            <option value={480}>Toutes les 8 heures</option>
                            <option value={720}>Toutes les 12 heures</option>
                            <option value={1440}>Tous les jours</option>
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
                        disabled={true}
                        title="Cette fonctionnalité n'est pas encore disponible"
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed opacity-50 bg-white text-gray-700 border border-gray-300`}
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