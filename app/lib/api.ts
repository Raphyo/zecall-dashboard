import { auth } from '@/auth';
import { headers } from 'next/headers';
import { Call } from '../ui/calls/types';
import { getUserIdFromEmail } from './user-mapping';

type CampaignStatus = 'en-cours' | 'planifiée' | 'terminée' | 'brouillon';

export interface AIAgent {
    id: string;
    name: string;
    voice: string;
    language: string;
    personality: string;
    speed: number;
    call_type: string;
    knowledge_base_path?: string;
    knowledge_base_type?: string;
    llm_prompt: string;
    created_at: string;
    user_id: string;
}

export interface Campaign {
    id: string;
    name: string;
    status: CampaignStatus;
    phone_number_id: string;
    phone_number?: string;
    agent_id: string;
    contacts_file_path?: string;
    contacts_count: number;
    scheduled_date?: string;
    created_at: string;
    user_id: string;
    retry_frequency?: number;
    max_retries?: number;
}

export interface PhoneNumber {
    id: string;
    number: string;
    type: 'local' | 'mobile' | 'tollfree';
    status: 'active' | 'inactive';
    agent_id?: string;
    user_id: string;
}

// Add more detailed logging
export const ANALYTICS_URL = process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL || 'http://localhost:5002';
export const ORCHESTRATOR_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_SERVICE_URL || 'http://localhost:5000';
console.log('Environment:', process.env.NODE_ENV); // This will show 'development' or 'production'
console.log('ANALYTICS_URL:', ANALYTICS_URL);
const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'An error occurred');
    }
    return response.json();
};

// Update the getCurrentUserId function to accept email
function getCurrentUserId(email: string | null | undefined): string {
  const userId = getUserIdFromEmail(email);
  
  if (!userId) {
    throw new Error('User not authenticated or email not found');
  }
  
  return userId;
}

export async function createAIAgent(formData: FormData, email: string | null | undefined): Promise<AIAgent> {
    try {
        const userId = getCurrentUserId(email);
        // Clone the FormData and append the user_id
        const formDataWithUser = new FormData();
        for (const [key, value] of formData.entries()) {
            formDataWithUser.append(key, value);
        }
        formDataWithUser.append('user_id', userId);

        const response = await fetch(`${ANALYTICS_URL}/api/ai-agents`, {
            method: 'POST',
            body: formDataWithUser,
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to create agent');
        }
        return response.json();
    } catch (error) {
        console.error('Error creating AI agent:', error);
        throw error;
    }
}

// Update the API functions to accept email
export async function getAIAgents(email: string | null | undefined) {
    try {
        const userId = getCurrentUserId(email);
        const response = await fetch(`${ANALYTICS_URL}/api/ai-agents?user_id=${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching AI agents:', error);
        throw error;
    }
}

export async function getAIAgent(agentId: string): Promise<AIAgent> {
    try {
        const response = await fetch(`${ANALYTICS_URL}/api/ai-agents/${agentId}`);
        return handleResponse(response);
    } catch (error) {
        console.error('Error fetching AI agent:', error);
        throw error;
    }
}

export async function updateAIAgent(agentId: string, formData: FormData) {
  try {
    // Log the form data being sent
    console.log('Updating AI Agent - Form Data:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value instanceof File ? `File: ${value.name}` : value);
    }

    // Add headers to specify content type
    const response = await fetch(`${ANALYTICS_URL}/api/ai-agents/${agentId}`, {
      method: 'PUT',
      body: formData,
      headers: {
        'Accept': 'application/json',
      }
    });

    // Log the response status and data
    console.log('Update AI Agent Response Status:', response.status);
    const data = await response.json();
    console.log('Update AI Agent Response Data:', data);

    if (!response.ok) {
      throw new Error(JSON.stringify(data.detail || data));
    }

    return data;
  } catch (error) {
    console.error('Error in updateAIAgent:', error);
    throw error;
  }
}

export async function deleteAIAgent(agentId: string, email: string | null | undefined) {
    try {
        const userId = getCurrentUserId(email);
        const response = await fetch(`${ANALYTICS_URL}/api/ai-agents/${agentId}?user_id=${userId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
            }
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.detail || 'Failed to delete agent');
        }
        return response.json();
    } catch (error) {
        console.error('Error deleting AI agent:', error);
        throw error;
    }
}

export async function deleteAIAgentFile(agentId: string, email: string | null | undefined): Promise<void> {
    const userId = getCurrentUserId(email);

    try {
        const response = await fetch(
            `${ANALYTICS_URL}/api/ai-agents/${agentId}/file?user_id=${userId}`,
            { method: 'DELETE' }
        );
        if (!response.ok) {
            throw new Error('Failed to delete agent file');
        }
    } catch (error) {
        console.error('Error deleting AI agent file:', error);
        throw error;
    }
}

export async function createCampaign(formData: FormData): Promise<Campaign> {
    try {
        const response = await fetch(`${ANALYTICS_URL}/api/campaigns`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.detail || 'Failed to create campaign');
        }
        return response.json();
    } catch (error) {
        console.error('Error creating campaign:', error);
        throw error;
    }
}

export async function getCampaigns(email: string | null | undefined): Promise<Campaign[]> {
    try {
        const userId = getCurrentUserId(email);
        const response = await fetch(`${ANALYTICS_URL}/api/campaigns?user_id=${userId}&include_status=true`, {
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch campaigns');
        }
        return response.json();
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        throw error;
    }
}

// Similarly update other functions that need user ID
export async function getPhoneNumbers(email: string | null | undefined): Promise<PhoneNumber[]> {
    try {
        const userId = getCurrentUserId(email);
        const response = await fetch(`${ANALYTICS_URL}/api/phone-numbers?user_id=${userId}`, {
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch phone numbers');
        }
        return response.json();
    } catch (error) {
        console.error('Error fetching phone numbers:', error);
        throw error;
    }
}

export async function deleteCampaign(id: string): Promise<void> {
    try {
        const response = await fetch(`${ANALYTICS_URL}/api/campaigns/${id}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to delete campaign');
        }
    } catch (error) {
        console.error('Error deleting campaign:', error);
        throw error;
    }
}

export async function duplicateCampaign(id: string): Promise<Campaign> {
    try {
        const response = await fetch(`${ANALYTICS_URL}/api/campaigns/${id}/duplicate`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to duplicate campaign');
        }
        return response.json();
    } catch (error) {
        console.error('Error duplicating campaign:', error);
        throw error;
    }
}

export async function getCalls(email: string | null | undefined, campaignId?: string | null): Promise<Call[]> {
    try {
        const userId = getCurrentUserId(email);
        const url = `${ANALYTICS_URL}/api/calls?${new URLSearchParams({
            user_id: userId,
            ...(campaignId ? { campaign_id: campaignId } : {})
        })}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch calls');
        }
        return response.json();
    } catch (error) {
        console.error('Error fetching calls:', error);
        throw error;
    }
}

export async function updateCampaignStatus(campaignId: string, status: string) {
    const response = await fetch(`${ANALYTICS_URL}/api/campaigns/${campaignId}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
    });

    if (!response.ok) {
        throw new Error('Failed to update campaign status');
    }

    return response.json();
}

export async function deleteCall(callIds: string[], email: string | null | undefined): Promise<void> {
    try {
        const userId = getCurrentUserId(email);
        const response = await fetch(`${ANALYTICS_URL}/api/calls/bulk-delete?user_id=${userId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ call_ids: callIds }),
        });

        if (!response.ok) {
            throw new Error('Failed to delete calls');
        }
    } catch (error) {
        console.error('Error deleting calls:', error);
        throw error;
    }
}