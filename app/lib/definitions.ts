import { DefaultSession } from "next-auth";

export type IncomingCallsTable = {
  id: string;
  caller_number: string;
  caller_name: string;
  callee_number: string,
  call_status: string;
  call_category: 'New booking' | 'Booking modification' | 'Booking cancellation' | 'Information';
  date: string;
  duration: number;
  hour: string;
  recording_url: string;
  ai_transcript: string;
  isPlaying?: boolean;
};

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  phone_number: string;
  created_at: Date;
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}