export interface Call {
  id: string;                    // VARCHAR(100) PRIMARY KEY
  user_id: string;              // UUID NOT NULL
  caller_number: string;        // VARCHAR(20) NOT NULL
  caller_name: string;          // VARCHAR(255) NOT NULL
  call_category: string;        // VARCHAR(100) NOT NULL
  date: string;                 // DATE NOT NULL
  duration: number;             // INTEGER NOT NULL
  hour: string;                 // TIME NOT NULL
  recording_url: string;        // TEXT NOT NULL
  ai_transcript: string | null; // TEXT
  ai_summary: string | null;    // TEXT
  callee_number: string | null; // VARCHAR(20)
  call_status: string | null;   // VARCHAR(20)
  campaign_id: string;          // UUID
  direction: string;            // VARCHAR(20) NOT NULL DEFAULT 'inconnu'
  caller_email: string | null;  // VARCHAR(255)
  campaign_name?: string;       // From campaigns table join
}