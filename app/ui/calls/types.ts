export interface Call {
  id: string;
  call_sid: string;
  caller_number: string;
  callee_number: string;
  caller_name: string;
  call_category: 'New booking' | 'Booking modification' | 'Booking cancellation' | 'Information' | 'unknown';
  date: string;
  duration: number;
  hour: string;
  recording_url: string;
  user_id: string;
  ai_transcript: string;
  ai_summary: string;
  call_status: string;
  campaign_id: string;
  campaign_name?: string;
  direction: string;
  transcript: string;

} 