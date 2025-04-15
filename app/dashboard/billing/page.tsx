'use client';

import { useEffect, useState } from 'react';
import { CreditCardIcon, ReceiptRefundIcon, PlusIcon, ClockIcon, CheckBadgeIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useSubscription } from '@/app/contexts/SubscriptionContext';

const packages = {
  essential: {
    displayName: 'Essentiel',
    minutes: 200,
    phoneNumbers: 1,
  },
  professional: {
    displayName: 'Professionnel',
    minutes: 800,
    phoneNumbers: 2,
  },
  premium: {
    displayName: 'Premium',
    minutes: 3200,
    phoneNumbers: 3,
  },
  custom: {
    displayName: 'Sur-Mesure',
    minutes: null,
    phoneNumbers: null,
  }
} as const;

interface PaymentMethod {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export default function BillingPage() {
  const router = useRouter();
  const { subscription, isLoading: isLoadingSubscription } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(true);
  const [payments, setPayments] = useState<Array<{
    id: string;
    date: number;
    amount: number;
    status: string;
    description: string;
    receipt_url: string | null;
  }>>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);

  useEffect(() => {
    fetchPaymentMethods();
    fetchPaymentHistory();
  }, []);

  useEffect(() => {
    // Check for successful subscription
    const urlParams = new URLSearchParams(window.location.search);
    const subscriptionStatus = urlParams.get('subscription');
    
    if (subscriptionStatus === 'success') {
      toast.success('Abonnement activé avec succès !');
      // Clean URL after showing success message
      router.replace('/dashboard/billing');
    }
  }, [router]);

  const fetchPaymentHistory = async () => {
    try {
      setIsLoadingPayments(true);
      const response = await fetch('/api/stripe/invoices');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment history');
      }

      // Filter to only show subscription payments
      const subscriptionPayments = data.payments.filter(
        (payment: any) => payment.description.toLowerCase().includes('abonnement')
      );
      setPayments(subscriptionPayments);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Impossible de charger l\'historique des paiements');
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      setIsLoadingPaymentMethods(true);
      const response = await fetch('/api/stripe/payment-methods');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment methods');
      }

      setPaymentMethods(data.paymentMethods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Impossible de charger les moyens de paiement');
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  const handleManagePayments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error) {
      console.error('Error redirecting to customer portal:', error);
      toast.error('Impossible d\'accéder aux paramètres de paiement. Veuillez réessayer plus tard.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentStatusStyle = (status: string) => {
    switch (status) {
      case 'succeeded':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'requires_payment_method':
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'succeeded':
      case 'paid':
        return 'Payé';
      case 'processing':
        return 'En cours';
      case 'requires_payment_method':
      case 'unpaid':
        return 'Échec';
      default:
        return status;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Abonnement</h1>
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        {/* Current Subscription */}
        <div className="p-6">
          <div className="flex items-center mb-6">
            <CheckBadgeIcon className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium">Forfait actuel</h2>
          </div>
          
          {isLoadingSubscription ? (
            <div className="text-center py-6">
              <svg className="animate-spin h-8 w-8 mx-auto text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : subscription?.plan ? (
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {packages[subscription.plan as keyof typeof packages]?.displayName || subscription.plan}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {subscription.status === 'active' ? 'Abonnement actif' : 'Abonnement inactif'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {subscription.status === 'active' && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Actif
                      </span>
                    )}
                    {subscription.autoRenew && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        Renouvellement auto.
                      </span>
                    )}
                  </div>
                </div>
                {packages[subscription.plan as keyof typeof packages] && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center bg-gray-50 px-4 py-2 rounded-md">
                      <ClockIcon className="h-5 w-5 text-gray-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {packages[subscription.plan as keyof typeof packages].minutes} minutes
                        </p>
                        <p className="text-xs text-gray-500">Minutes incluses</p>
                      </div>
                    </div>
                    <div className="flex items-center bg-gray-50 px-4 py-2 rounded-md">
                      <PhoneIcon className="h-5 w-5 text-gray-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {packages[subscription.plan as keyof typeof packages]?.phoneNumbers || '-'} numéro{(packages[subscription.plan as keyof typeof packages]?.phoneNumbers || 0) > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-gray-500">Numéro{(packages[subscription.plan as keyof typeof packages]?.phoneNumbers || 0) > 1 ? 's' : ''} dédié{(packages[subscription.plan as keyof typeof packages]?.phoneNumbers || 0) > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 px-4 border rounded-lg border-dashed border-gray-300">
              <p className="text-sm text-gray-500">
                Aucun abonnement actif
              </p>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <CreditCardIcon className="h-6 w-6 text-gray-600 mr-2" />
              <h2 className="text-lg font-medium">Mode de paiement de l'abonnement</h2>
            </div>
            <button
              onClick={handleManagePayments}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Chargement...
                </>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  {paymentMethods.length > 0 ? 'Gérer le moyen de paiement' : 'Ajouter un moyen de paiement'}
                </>
              )}
            </button>
          </div>
          
          {isLoadingPaymentMethods ? (
            <div className="text-center py-6">
              <svg className="animate-spin h-8 w-8 mx-auto text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : paymentMethods.length > 0 ? (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center">
                      <p className="font-medium">
                        {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}
                      </p>
                      {method.isDefault && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Par défaut
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Expire le {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                    </p>
                  </div>
                  <button 
                    onClick={handleManagePayments}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Modifier
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 px-4 border rounded-lg border-dashed border-gray-300">
              <p className="text-sm text-gray-500">
                Aucun moyen de paiement enregistré
              </p>
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="p-6">
          <div className="flex items-center mb-6">
            <ReceiptRefundIcon className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium">Historique des paiements d'abonnement</h2>
          </div>
          
          <div className="overflow-x-auto">
            {isLoadingPayments ? (
              <div className="text-center py-6">
                <svg className="animate-spin h-8 w-8 mx-auto text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : payments.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
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
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payment.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.amount.toFixed(2)}€
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusStyle(payment.status)}`}>
                          {getPaymentStatusLabel(payment.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {payment.receipt_url ? (
                          <a
                            href={payment.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Télécharger
                          </a>
                        ) : (
                          <span className="text-gray-400">Non disponible</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-6 px-4 border rounded-lg border-dashed border-gray-300">
                <p className="text-sm text-gray-500">
                  Aucun paiement d'abonnement
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}