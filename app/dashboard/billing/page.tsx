'use client';

import { useState } from 'react';
import { CreditCardIcon, ReceiptRefundIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function BillingPage() {
  const [currentPlan] = useState('pro');
  const [billingCycle] = useState('monthly');

  const plans = [
    {
      name: 'Basic',
      price: '250',
      features: [
        '1200 minutes d\'appels (0,21€/minutes)',
        '0,22€ par minutes additionnelles',
        'Accès au Dashboard de suivi d\'analyse conversationnelle',
        'Support dédiée'
      ],
    },
    {
      name: 'Avancé',
      price: '500',
      features: [
        '3000 minutes d\'appels (0,17€/minutes)',
        '0,20€ par minutes additionnelles',
        'Accès au Dashboard de suivi d\'analyse conversationnelle',
        'Support dédiée'
      ],
    },
    {
      name: 'Expert',
      price: '1000',
      features: [
        '6500 minutes d\'appels (0,15/minutes)',
        '0,18€ par minutes additionnelles',
        'Accès au Dashboard de suivi d\'analyse conversationnelle',
        'Support dédiée'
      ],
    },
  ];

  const invoices = [
    { id: 1, date: '2024-03-01', amount: '250.00', status: 'Payée' },
    { id: 2, date: '2024-02-01', amount: '250.00', status: 'Payée' },
    { id: 3, date: '2024-01-01', amount: '250.00', status: 'Payée' },
  ];

  const description = "Nous proposons des plans de paiement adaptés aux besoins et au budget de chaque équipe, garantissant ainsi l'accessibilité et la simplicité pour tous.";

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Facturation</h1>

      <p className="text-gray-600 text-center mb-8">{description}</p>

      <div className="bg-white rounded-lg shadow divide-y">
        {/* Current Plan */}
        <div className="p-6">
          <div className="flex items-center mb-6">
            <CreditCardIcon className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium">Plan actuel</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-lg border p-6 ${
                  currentPlan === plan.name.toLowerCase()
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <h3 className="text-lg font-medium mb-2">{plan.name}</h3>
                <p className="text-3xl font-bold mb-4">
                  {plan.price}€
                  <span className="text-sm text-gray-500"> par mois</span>
                </p>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="text-sm text-gray-600">✓ {feature}</li>
                  ))}
                </ul>
                {currentPlan === plan.name.toLowerCase() ? (
                  <button
                    className="mt-4 w-full px-4 py-2 border border-blue-500 rounded-md text-blue-600 text-sm font-medium"
                    disabled
                  >
                    Démarrer
                  </button>
                ) : (
                  <button
                    className="mt-4 w-full px-4 py-2 border border-blue-600 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                  >
                    Démarrer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div className="p-6">
          <div className="flex items-center mb-6">
            <CreditCardIcon className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium">Mode de paiement</h2>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center">
              <img src="/visa.svg" alt="Visa" className="h-8 w-8 mr-4" />
              <div>
                <p className="font-medium">Visa se terminant par 4242</p>
                <p className="text-sm text-gray-500">Expire le 12/2024</p>
              </div>
            </div>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Modifier
            </button>
          </div>
        </div>

        {/* Billing History */}
        <div className="p-6">
          <div className="flex items-center mb-6">
            <ReceiptRefundIcon className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium">Historique des factures</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Facture
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.amount}€
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800">
                      <button>Télécharger</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}