'use client';

import { useEffect, useState } from 'react';
import { CreditCardIcon, ReceiptRefundIcon, PlusIcon, ClockIcon, CheckBadgeIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useSubscription } from '@/app/contexts/SubscriptionContext';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import SubscriptionPackagesModal from '@/app/components/SubscriptionPackagesModal';

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

const formatDate = (isoDate: string) => {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export default function BillingPage() {
  const router = useRouter();
  const { subscription, isLoading: isLoadingSubscription, refetchSubscription, showUpgradeModal, setShowUpgradeModal } = useSubscription();
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
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

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

  const handleCancelSubscription = async () => {
    try {
      setIsCancelling(true);
      const response = await fetch('/api/stripe/subscription', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      toast.success('Votre abonnement a été annulé avec succès. Il restera actif jusqu\'à la fin de la période en cours.');
      await refetchSubscription();
      setShowCancelDialog(false);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Une erreur est survenue lors de l\'annulation de votre abonnement.');
    } finally {
      setIsCancelling(false);
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
    <>
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
            ) : subscription?.status === 'expired' ? (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun abonnement actif</h3>
                <p className="text-sm text-gray-500 mb-6">Choisissez un forfait pour commencer à utiliser ZeCall</p>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white
                  bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  transition-all duration-200 ease-in-out hover:shadow-md active:scale-[0.98] active:shadow-none"
                >
                  Voir les forfaits
                </button>
              </div>
            ) : subscription?.plan ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {packages[subscription.plan as keyof typeof packages]?.displayName || subscription.plan}
                    </h3>
                    <div className="mt-2 flex items-center gap-2">
                      {subscription.status === 'active' && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Actif
                        </span>
                      )}
                      {subscription.autoRenew ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          Renouvellement automatique
                        </span>
                      ) : subscription.status === 'active' && (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          Se termine le {subscription.endDate ? formatDate(subscription.endDate) : 'bientôt'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white
                    bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    transition-all duration-200 ease-in-out hover:shadow-md active:scale-[0.98] active:shadow-none"
                  >
                    Changer de forfait
                  </button>
                </div>

                {packages[subscription.plan as keyof typeof packages] && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center bg-gray-50 px-4 py-3 rounded-lg">
                      <ClockIcon className="h-5 w-5 text-gray-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {packages[subscription.plan as keyof typeof packages].minutes} minutes
                        </p>
                        <p className="text-xs text-gray-500">Minutes incluses par mois</p>
                      </div>
                    </div>
                    <div className="flex items-center bg-gray-50 px-4 py-3 rounded-lg">
                      <PhoneIcon className="h-5 w-5 text-gray-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {packages[subscription.plan as keyof typeof packages]?.phoneNumbers || '-'} numéro{(packages[subscription.plan as keyof typeof packages]?.phoneNumbers || 0) > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-gray-500">Numéro{(packages[subscription.plan as keyof typeof packages]?.phoneNumbers || 0) > 1 ? 's' : ''} dédié{(packages[subscription.plan as keyof typeof packages]?.phoneNumbers || 0) > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                )}

                {subscription.status === 'active' && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-sm text-gray-600">
                      {subscription.autoRenew ? (
                        <>Prochain renouvellement le {subscription.endDate ? formatDate(subscription.endDate) : 'bientôt'}</>
                      ) : (
                        <>Votre abonnement se termine le {subscription.endDate ? formatDate(subscription.endDate) : 'bientôt'}</>
                      )}
                    </div>
                    {subscription.autoRenew && (
                      <button
                        onClick={() => setShowCancelDialog(true)}
                        disabled={isCancelling}
                        className="group relative inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg transition-all duration-200 ease-in-out
                        bg-white text-gray-600 hover:text-red-600 border-gray-200 
                        hover:border-red-100 hover:bg-red-50
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="flex items-center gap-2">
                          {isCancelling ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Annulation en cours...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 transition-transform duration-200 ease-in-out group-hover:scale-110 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Annuler l'abonnement</span>
                            </>
                          )}
                        </span>
                      </button>
                    )}
                  </div>
                )}
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

      <SubscriptionPackagesModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />

      <Transition appear show={showCancelDialog} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !isCancelling && setShowCancelDialog(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-xl transition-all border border-gray-100">
                  <div className="flex items-center justify-center w-14 h-14 mx-auto mb-6 rounded-full bg-red-50/80 ring-8 ring-red-50">
                    <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-semibold text-center text-gray-900 mb-3"
                  >
                    Confirmer l'annulation
                  </Dialog.Title>
                  <div className="mt-3">
                    <p className="text-sm text-center leading-relaxed text-gray-500">
                      Êtes-vous sûr de vouloir annuler votre abonnement ? Votre abonnement restera actif jusqu'à la fin de la période en cours.
                    </p>
                  </div>

                  <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-center gap-3">
                    <button
                      type="button"
                      className="inline-flex justify-center items-center px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 
                      hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 
                      disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out active:scale-[0.98]"
                      onClick={() => setShowCancelDialog(false)}
                      disabled={isCancelling}
                    >
                      Retour
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center items-center px-5 py-2.5 rounded-lg border border-transparent 
                      bg-gradient-to-b from-red-500 to-red-600 text-sm font-medium text-white 
                      hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 
                      disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out
                      shadow-sm hover:shadow active:scale-[0.98] active:shadow-none"
                      onClick={handleCancelSubscription}
                      disabled={isCancelling}
                    >
                      {isCancelling ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Annulation en cours...</span>
                        </>
                      ) : (
                        'Confirmer l\'annulation'
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}