'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { createCampaign } from '@/app/lib/actions';

// Type for creating new contacts
type CreateContact = {
  name: string;
  phone_number: string;
};

export default function CampaignForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!file) {
      setError('Please select a CSV file');
      setLoading(false);
      return;
    }

    try {
      const contacts: CreateContact[] = await new Promise((resolve, reject) => {
        Papa.parse<string[]>(file, {
          complete: (results) => {
            const validContacts = results.data
              .filter(row => row.length >= 2 && row[0] && row[1])
              .map(row => ({
                name: String(row[0]).trim(),
                phone_number: String(row[1]).trim(),
              }));
            resolve(validContacts);
          },
          error: (error) => reject(error),
          header: false,
          skipEmptyLines: true,
        });
      });

      if (contacts.length === 0) {
        throw new Error('No valid contacts found in CSV');
      }

      await createCampaign({
        name,
        contacts,
      });

      router.push('/dashboard/campaigns');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Campaign Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="csv" className="block text-sm font-medium text-gray-700">
          Contact List (CSV)
        </label>
        <div className="mt-1">
          <input
            type="file"
            id="csv"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            required
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Upload a CSV file with two columns: name and phone number
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.push('/dashboard/campaigns')}
          className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex h-10 items-center rounded-lg bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-400 disabled:bg-blue-300"
        >
          {loading ? 'Creating...' : 'Create Campaign'}
        </button>
      </div>
    </form>
  );
}