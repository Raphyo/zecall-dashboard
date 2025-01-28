'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentIcon } from '@heroicons/react/24/outline';
import { Campaign } from '@/app/lib/definitions';

export default function EditCampaignPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState('');
  const [contactsCount, setContactsCount] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    contactsFile: null as File | null,
  });

  useEffect(() => {
    const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
    const currentCampaign = campaigns.find((c: Campaign) => c.id === params.id);
    
    if (currentCampaign) {
      setFormData({
        name: currentCampaign.name,
        contactsFile: null,
      });
      setSelectedDate(currentCampaign.scheduled_date);
      setContactsCount(currentCampaign.contacts_count);
    } else {
      router.push('/dashboard/campaigns');
    }
  }, [params.id, router]);

  const handleSubmit = (e: React.FormEvent, status: 'brouillon' | 'planifiée') => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Le nom de la campagne est requis');
      return;
    }

    if (selectedDate && !selectedDate.trim()) {
      alert('La date de planification est requise');
      return;
    }

    const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
    const updatedCampaigns = campaigns.map((c: Campaign) => {
      if (c.id === params.id) {
        return {
          ...c,
          name: formData.name,
          status: status,
          contacts_file: formData.contactsFile?.name || c.contacts_file,
          contacts_count: contactsCount,
          scheduled_date: selectedDate || c.scheduled_date,
        };
      }
      return c;
    });

    localStorage.setItem('campaigns', JSON.stringify(updatedCampaigns));
    router.push('/dashboard/campaigns');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').filter(row => row.trim()).length - 1;
      setContactsCount(rows);
    };
    reader.readAsText(file);
    setFormData(prev => ({ ...prev, contactsFile: file }));
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-8 py-6 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">Modifier la campagne</h1>
        </div>
        
        <form onSubmit={(e) => handleSubmit(e, 'planifiée')} className="p-8">
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
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
            </section>

            {/* Contacts CSV Section */}
            <section className="border-b border-gray-900/10 pb-12">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Liste des contacts <span className="text-red-500">*</span>
                </label>
                <div className="mt-4 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                  <div className="space-y-2 text-center">
                    <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer rounded-md bg-white font-medium text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:text-blue-500">
                        <span>Télécharger un fichier CSV</span>
                        <input
                          id="contacts-upload"
                          name="contacts-upload"
                          type="file"
                          accept=".csv"
                          className="sr-only"
                          onChange={handleFileUpload}
                        />
                      </label>
                      <p className="pl-1">ou faites un glisser-déposer</p>
                    </div>
                    {contactsCount > 0 && (
                      <p className="text-sm text-gray-500">
                        {contactsCount} contacts détectés
                      </p>
                    )}
                  </div>
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
                    <p className="mt-2 text-sm text-gray-500">
                      {selectedDate ? 'Date de planification sélectionnée' : 'Veuillez sélectionner une date'}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="mt-6 flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard/campaigns')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e as any, 'brouillon')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Enregistrer en brouillon
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Créer la campagne
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}