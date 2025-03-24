'use client';

import { useEffect, useState } from 'react';
import { CreditCardIcon, ReceiptRefundIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

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
    // Check for successful payment
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      toast.success('Paiement réussi ! Vos crédits ont été ajoutés.');
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

      setPayments(data.payments);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Unable to load payment history');
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
      toast.error('Unable to load payment methods');
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
      toast.error('Unable to access payment settings. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentStatusStyle = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'requires_payment_method':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Payé';
      case 'processing':
        return 'En cours';
      case 'requires_payment_method':
        return 'Échoué';
      default:
        return status;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Facturation</h1>
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        {/* Payment Method */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <CreditCardIcon className="h-6 w-6 text-gray-600 mr-2" />
              <h2 className="text-lg font-medium">Mode de paiement</h2>
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
                  {paymentMethods.length > 0 ? 'Gérer les moyens de paiement' : 'Ajouter un moyen de paiement'}
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
            <h2 className="text-lg font-medium">Historique des paiements</h2>
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
                      Reçu
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
                            className="text-blue-600 hover:text-blue-800"
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
                  Aucun paiement disponible
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}