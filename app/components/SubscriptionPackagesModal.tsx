'use client';

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { useSubscription } from '@/app/contexts/SubscriptionContext'

interface SubscriptionPackage {
  name: string;
  displayName: string;
  price: number | string;
  minutes: number | string;
  phoneNumbers: number | string;
  buttonText: string;
  description: string;
  features: string[];
  isCustom?: boolean;
}

interface UserSubscription {
  plan: string;
  status: string;
  autoRenew: boolean;
}

const packages: SubscriptionPackage[] = [
  {
    name: 'essential',
    displayName: 'Essentiel',
    price: 50,
    minutes: 200,
    phoneNumbers: 1,
    buttonText: 'Démarrer',
    description: 'Support IA de base avec minutes incluses, numéro de téléphone dédié et analyses essentielles. Parfait pour les entrepreneurs individuels et micro-entreprises.',
    features: [
      '200 minutes incluses',
      '1 numéro de téléphone dédié',
      'Agents IA vocaux personnalisables',
      'Tableau de bord analytique',
      'Minute supplémentaire à 0,35€'
    ]
  },
  {
    name: 'professional',
    displayName: 'Professionel',
    price: 200,
    minutes: 800,
    phoneNumbers: 2,
    buttonText: 'Démarrer',
    description: 'Solution professionnelle complète avec minutes étendues, multi-numéros, intégration CRM et analyses détaillées. Idéal pour les entreprises en croissance.',
    features: [
      '800 minutes incluses',
      '2 numéros de téléphone dédiés',
      'Agents IA vocaux personnalisables',
      'Tableau de bord analytique avancé',
      'Intégration CRM native',
      'Minute supplémentaire à 0,30€'
    ]
  },
  {
    name: 'premium',
    displayName: 'Premium',
    price: 800,
    minutes: 3200,
    phoneNumbers: 3,
    buttonText: 'Démarrer',
    description: 'Solution entreprise haut de gamme avec volume important de minutes, multi-numéros, support prioritaire et analyses approfondies. Conçu pour les entreprises qui montent en puissance.',
    features: [
      '3200 minutes incluses',
      '3 numéros de téléphone dédiés',
      'Agents IA vocaux personnalisables',
      'Tableau de bord analytique premium',
      'Support client prioritaire',
      'Rapports détaillés personnalisés',
      'Minute supplémentaire à 0,25€'
    ]
  },
  {
    name: 'custom',
    displayName: 'Sur-Mesure',
    price: 'Sur devis',
    minutes: 'Volume important',
    phoneNumbers: 'X',
    buttonText: 'Prendre contact',
    description: 'Solution personnalisée pour les grandes organisations avec des besoins spécifiques en termes de volume d\'appels et d\'intégrations sur mesure.',
    features: [
      'Volume de minutes personnalisé',
      'Nombre de numéros illimité',
      'Agents IA vocaux sur mesure',
      'Tableau de bord personnalisé',
      'Support dédié premium',
      'Intégrations spécifiques',
      'Tarification au volume jusqu\'à 0,12€/min'
    ],
    isCustom: true
  }
]

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscriptionPackagesModal({ isOpen, onClose }: Props) {
  const [isAnnual, setIsAnnual] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { subscription, refetchSubscription } = useSubscription()
  const annualDiscount = 0.10 // 10% discount

  const handleSubscribe = async (pkg: SubscriptionPackage) => {
    if (pkg.isCustom) {
      window.location.href = 'mailto:contact@zecall.fr'
      return
    }

    if (subscription?.plan === pkg.name && subscription?.status === 'active') {
      toast.error('Vous êtes déjà abonné à ce forfait.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          package: pkg.name,
          billingPeriod: isAnnual ? 'yearly' : 'monthly'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      window.location.href = data.url
    } catch (error) {
      console.error('Error creating subscription:', error)
      toast.error('Une erreur est survenue. Veuillez réessayer plus tard.')
    } finally {
      setIsLoading(false)
    }
  }

  const calculatePrice = (basePrice: number | string) => {
    if (typeof basePrice === 'number') {
      const monthlyPrice = isAnnual ? basePrice * (1 - annualDiscount) : basePrice
      return monthlyPrice.toFixed(2)
    }
    return basePrice
  }

  const calculateAdditionalMinutePrice = (pkg: SubscriptionPackage) => {
    if (typeof pkg.price === 'number' && typeof pkg.minutes === 'number') {
      const basePrice = pkg.price * (isAnnual ? (1 - annualDiscount) : 1)
      return (basePrice / pkg.minutes * 0.5).toFixed(2)
    }
    return null
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-6xl sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Fermer</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div>
                  <div className="text-center">
                    <Dialog.Title as="h3" className="text-2xl font-semibold leading-6 text-gray-900 mb-8">
                      Choisissez votre forfait
                    </Dialog.Title>
                    <div className="flex justify-center items-center space-x-4 mb-8">
                      <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setIsAnnual(true)}
                          className={`px-4 py-2 text-sm font-medium rounded-md ${
                            isAnnual
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-700 hover:text-gray-900'
                          }`}
                        >
                          Annuel (-10%)
                        </button>
                        <button
                          onClick={() => setIsAnnual(false)}
                          className={`px-4 py-2 text-sm font-medium rounded-md ${
                            !isAnnual
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-700 hover:text-gray-900'
                          }`}
                        >
                          Mensuel
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {packages.map((pkg) => {
                      const isCurrentPlan = subscription?.plan === pkg.name && subscription?.status === 'active'
                      return (
                        <div
                          key={pkg.name}
                          className={`rounded-lg p-6 flex flex-col h-full ${
                            pkg.name === 'professional' 
                              ? 'bg-pink-50 ring-2 ring-pink-500'
                              : 'bg-white ring-1 ring-gray-200'
                          } ${isCurrentPlan ? 'opacity-50' : ''}`}
                        >
                          <div className="flex-grow">
                            <div className="flex justify-between items-start">
                              <h3 className="text-lg font-semibold text-gray-900">{pkg.displayName}</h3>
                              {isCurrentPlan && (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                  Actif
                                </span>
                              )}
                            </div>
                            <p className="mt-4 flex items-baseline">
                              <span className="text-4xl font-bold tracking-tight text-gray-900">
                                {typeof pkg.price === 'number' ? `${calculatePrice(pkg.price)}€` : pkg.price}
                              </span>
                              {typeof pkg.price === 'number' && (
                                <span className="ml-1 text-sm font-semibold text-gray-600">/mois</span>
                              )}
                            </p>
                            {typeof pkg.price === 'number' && isAnnual && (
                              <p className="mt-1 text-sm text-gray-500">
                                {`Facturé ${(Number(calculatePrice(pkg.price)) * 12).toFixed(2)}€ par an`}
                              </p>
                            )}
                            <p className="mt-3 text-sm text-gray-500">{pkg.description}</p>
                            <ul className="mt-6 space-y-3">
                              {pkg.features.map((feature, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-orange-400"></span>
                                  <span className="ml-3 text-sm text-gray-700">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <button
                            onClick={() => handleSubscribe(pkg)}
                            disabled={isCurrentPlan || isLoading}
                            className={`mt-8 w-full rounded-md px-3.5 py-2.5 text-center text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                              isCurrentPlan
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-600'
                            }`}
                          >
                            {isCurrentPlan ? 'Forfait actuel' : pkg.buttonText}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
} 