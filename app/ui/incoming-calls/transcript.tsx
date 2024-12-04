'use client';

interface TranscriptProps {
  transcript: string | null;
}

export function Transcript({ transcript }: TranscriptProps) {
  if (!transcript) return null;

  return (
    <div className="mt-2 p-4 bg-gray-50 rounded-lg">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Transcript</h4>
      <p className="text-sm text-gray-600 whitespace-pre-wrap">{transcript}</p>
    </div>
  );
}