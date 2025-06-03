'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { EnvelopeIcon, EnvelopeOpenIcon, ExclamationTriangleIcon, CheckCircleIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

type Email = {
  id: string;
  subject: string;
  sender: string;
  snippet: string;
  date: string;
  unread: boolean;
};

interface EmailListProps {
  initialCompose?: boolean;
}

export default function EmailList({ initialCompose = false }: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [totalEmails, setTotalEmails] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Check URL parameters for auth feedback
    const success = searchParams.get('success');
    const errorParam = searchParams.get('error');
    
    if (success === 'true') {
      setAuthSuccess(true);
      // Hide success message after 5 seconds
      const timer = setTimeout(() => setAuthSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
    
    if (errorParam) {
      let errorMessage = 'Failed to authenticate with Gmail';
      
      switch (errorParam) {
        case 'auth_denied':
          errorMessage = 'Authorization was denied for Gmail access';
          break;
        case 'invalid_request':
          errorMessage = 'Invalid request during Gmail authorization';
          break;
        case 'token_exchange':
          errorMessage = 'Failed to exchange authorization code for tokens';
          break;
        case 'server_error':
          errorMessage = 'Server error during Gmail authorization';
          break;
      }
      
      setError(errorMessage);
      return;
    }
  }, [searchParams]);

  const fetchEmails = useCallback(async (pageToken?: string, query?: string) => {
    try {
      if (pageToken) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setNeedsAuth(false);
      setError(null);
      
      // Apply search query if provided, otherwise use the active search term
      const searchTerm = query !== undefined ? query : activeSearchTerm;
      
      // Construct URL with pagination parameters and search query
      let url = `/api/gmail?maxResults=25`;
      
      if (pageToken) {
        url += `&pageToken=${pageToken}`;
      }
      
      if (searchTerm) {
        url += `&q=${encodeURIComponent(searchTerm)}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        if (data.needsAuth) {
          setNeedsAuth(true);
          throw new Error('Gmail authorization required');
        }
        throw new Error(data.error || 'Failed to fetch emails');
      }
      
      if (pageToken) {
        // Append new emails to existing list
        setEmails(prev => [...prev, ...data.emails]);
      } else {
        // Replace emails with fresh data
        setEmails(data.emails);
      }
      
      // Store pagination info
      setNextPageToken(data.nextPageToken);
      setTotalEmails(data.resultSizeEstimate || 0);
      setIsSearching(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching emails:', err);
      setIsSearching(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeSearchTerm]);

  useEffect(() => {
    // Only fetch if we don't have an error from URL params
    if (!error) {
      fetchEmails();
    }
  }, [error, authSuccess, fetchEmails]);

  // Simple input change handler - just updates the state without triggering search
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle search submission - this is the only place that triggers a search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Set the active search term and trigger search
    setActiveSearchTerm(searchQuery.trim());
    setIsSearching(true);
    setNextPageToken(null);
    
    // Explicitly fetch with the current search query
    fetchEmails(undefined, searchQuery.trim());
  };

  // Clear search - sets active search term to empty and fetches all emails
  const handleClearSearch = () => {
    setSearchQuery('');
    
    // Only perform a search reset if we have an active search term
    if (activeSearchTerm) {
      setActiveSearchTerm('');
      setIsSearching(true);
      setNextPageToken(null);
      fetchEmails(undefined, '');
    }
  };

  const handleLoadMore = () => {
    if (nextPageToken) {
      fetchEmails(nextPageToken);
    }
  };

  const handleAuthorizeGmail = async () => {
    try {
      setLoading(true);
      // Call our own API endpoint to get the authorization URL
      const response = await fetch('/api/gmail/auth');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate Gmail authorization');
      }
      
      // Redirect to the Google authorization URL
      if (data.authUrl) {
        // Note: for OAuth flows, we need to use window.location.href
        // as router.push won't work for external redirects
        window.location.href = data.authUrl;
      } else {
        throw new Error('No authorization URL returned');
      }
    } catch (error) {
      console.error('Failed to initiate Gmail authorization:', error);
      setError(error instanceof Error ? error.message : 'Authorization failed');
      setLoading(false);
    }
  };

  // Check for compose action and redirect to a new blank email
  useEffect(() => {
    if (initialCompose) {
      router.push('/dashboard/emails/new');
    }
  }, [initialCompose, router]);

  if (authSuccess) {
    return (
      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center">
          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
          <p className="text-green-700 text-sm">Gmail successfully connected! Loading your emails...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-pulse flex space-x-4 w-full">
          <div className="flex-1 space-y-4 py-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm">
        <div className="text-center mb-6">
          <ExclamationTriangleIcon className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Accès Gmail requis</h3>
          <p className="mt-2 text-sm text-gray-600">
            Vous devez autoriser l'application à accéder à vos emails Gmail.
          </p>
        </div>
        <button
          onClick={handleAuthorizeGmail}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Autoriser l'accès à Gmail
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center bg-white rounded-xl shadow-sm">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-500 mb-4">Impossible de charger les emails: {error}</p>
        <button
          onClick={() => fetchEmails()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500 bg-white rounded-xl shadow-sm">
        <EnvelopeIcon className="h-12 w-12 mb-2" />
        <p>Aucun email trouvé</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise show full date
    return date.toLocaleDateString();
  };

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-4">
        <form onSubmit={handleSearch} className="relative">
          <div className="flex flex-col">
            <div className="flex rounded-md border border-gray-300 overflow-hidden focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInputChange}
                placeholder="Rechercher dans vos emails..."
                className="flex-1 px-4 py-2 border-none focus:outline-none"
                disabled={loading || isSearching}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-2 text-gray-400 hover:text-gray-600"
                  disabled={loading || isSearching}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                disabled={loading || isSearching}
              >
                {isSearching ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <MagnifyingGlassIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            {searchQuery && searchQuery.length > 0 && !isSearching && (
              <p className="text-xs text-gray-500 mt-1 ml-1">
                Appuyez sur Entrée pour rechercher
              </p>
            )}
          </div>
        </form>
      </div>
      
      {/* Email List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {emails.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500 bg-white rounded-xl shadow-sm">
            <EnvelopeIcon className="h-12 w-12 mb-2" />
            <p>{searchQuery ? `Aucun email trouvé pour "${searchQuery}"` : 'Aucun email trouvé'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {emails.map((email) => (
              <Link href={`/dashboard/emails/${email.id}`} key={email.id}>
                <div className="flex items-start p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex-shrink-0 mr-3 mt-1">
                    {email.unread ? (
                      <EnvelopeIcon className="h-5 w-5 text-blue-600" />
                    ) : (
                      <EnvelopeOpenIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <p className={`text-sm font-medium truncate ${email.unread ? 'text-gray-900' : 'text-gray-600'}`}>
                        {email.subject}
                      </p>
                      <p className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                        {formatDate(email.date)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 truncate mt-1">{email.sender}</p>
                    <p className={`text-xs mt-1 line-clamp-2 ${email.unread ? 'text-gray-800' : 'text-gray-500'}`}>
                      {email.snippet}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        
        {nextPageToken && (
          <div className="p-4 text-center border-t border-gray-200">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className={`px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors ${
                loadingMore ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loadingMore ? 'Chargement...' : 'Charger plus d\'emails'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 