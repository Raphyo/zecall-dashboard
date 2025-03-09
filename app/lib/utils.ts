import { Call } from '@/app/ui/calls/types';

export const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) {
    return '0:00';
  }  
  // Convert to integer to handle any decimal values
  const totalSeconds = Math.floor(seconds);
  
  // Calculate minutes and remaining seconds
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  
  // Pad seconds with leading zero if needed
  const paddedSeconds = remainingSeconds.toString().padStart(2, '0');
  
  return `${minutes}:${paddedSeconds}`;
};

export const formatDateToLocal = (
  dateStr: string,
  locale: string = 'en-US',
) => {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  const formatter = new Intl.DateTimeFormat(locale, options);
  return formatter.format(date);
};

export const generatePagination = (currentPage: number, totalPages: number) => {
  // If the total number of pages is 7 or less,
  // display all pages without any ellipsis.
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // If the current page is among the first 3 pages,
  // show the first 3, an ellipsis, and the last 2 pages.
  if (currentPage <= 3) {
    return [1, 2, 3, '...', totalPages - 1, totalPages];
  }

  // If the current page is among the last 3 pages,
  // show the first 2, an ellipsis, and the last 3 pages.
  if (currentPage >= totalPages - 2) {
    return [1, 2, '...', totalPages - 2, totalPages - 1, totalPages];
  }

  // If the current page is somewhere in the middle,
  // show the first page, an ellipsis, the current page and its neighbors,
  // another ellipsis, and the last page.
  return [
    1,
    '...',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    '...',
    totalPages,
  ];
};

export function exportCallsToCSV(calls: Call[]) {
  // Define CSV headers
  const headers = [
    'ID',
    'Appelant',
    'Destinataire',
    'Nom',
    'Direction',
    'Date',
    'Heure',
    'Durée',
    'Statut',
    'Campagne',
    'Catégorie'
  ];

  // Convert calls to CSV rows
  const rows = calls.map(call => [
    call.id,
    call.caller_number,
    call.callee_number,
    call.user_name,
    call.direction,
    new Date(call.date).toLocaleDateString(),
    call.hour,
    call.duration,
    call.call_status,
    call.campaign_name || '-',
    call.call_category || '-'  // Added this new field

  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Format the date for the filename
  const date = new Date();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();
  const filename = `appels_${month}_${day}_${year}.csv`;

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
