import { auth } from '@/auth';
import { headers } from 'next/headers';
import { Call } from '../ui/calls/types';

type CampaignStatus = 'en-cours' | 'planifiée' | 'terminée' | 'brouillon';

export interface AIAgent {
    id: string;
    name: string;
    voice_name: string;
    background_audio: string;
    language: string;
    llm_prompt: string;
    allow_interruptions: boolean;
    ai_starts_conversation: boolean;
    silence_detection: boolean;
    silence_timeout: number;
    max_retries: number;
    knowledge_base_path?: string;
    knowledge_base_type?: string;
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

export const ANALYTICS_URL = process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL || 'http://localhost:5002';
export const ORCHESTRATOR_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_SERVICE_URL || 'http://localhost:5000';
const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'An error occurred');
    }
    return response.json();
};

// Simplified getCurrentUserId function without email parameter
async function getCurrentUserId(): Promise<string> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('User not authenticated or ID not found');
  }
  
  return session.user.id;
}

export async function createAIAgent(formData: FormData, userId: string): Promise<AIAgent> {
    try {
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
        throw error;
    }
}

export async function getAIAgents(userId: string) {
    try {
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
        const response = await fetch(`${ANALYTICS_URL}/api/ai-agents/${agentId}`, {
            method: 'PUT',
            body: formData,
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || 'Failed to update agent');
        }

        return response.json();
    } catch (error) {
        throw error;
    }
}

export async function deleteAIAgent(agentId: string, userId: string) {
    try {
        const response = await fetch(`${ANALYTICS_URL}/api/ai-agents/${agentId}?user_id=${userId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Failed to delete agent');
        }

        return data;
    } catch (error) {
        console.error('Error deleting AI agent:', error);
        throw error;
    }
}

export async function deleteAIAgentFile(agentId: string, userId: string): Promise<void> {
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

export async function getCampaigns(userId: string): Promise<Campaign[]> {
    try {
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

export async function getPhoneNumbers(userId: string): Promise<PhoneNumber[]> {
    try {
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

export async function getCalls(userId: string, campaignId?: string | null): Promise<Call[]> {
    try {
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

export async function deleteCall(callIds: string[], userId: string): Promise<void> {
    try {
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

// Agent Functions API
export async function getAgentFunctions(agentId: string, userId: string) {
  try {
    const url = `${ANALYTICS_URL}/api/agents/${agentId}/functions?user_id=${userId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Failed to fetch agent functions: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in getAgentFunctions:', error);
    throw error;
  }
}

export async function removeAgentFunction(agentId: string, functionId: number, userId: string) {
    try {
        const url = `${ANALYTICS_URL}/api/agents/${agentId}/functions/${functionId}?user_id=${userId}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.detail || `Error: ${response.status}`);
        }

        return response.json();
    } catch (error) {
        throw error;
    }
}

export async function createAgentFunction(agentId: string, functionData: any, userId: string) {
    try {
        const url = `${ANALYTICS_URL}/api/agents/${agentId}/functions?user_id=${userId}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(functionData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        return response.json();
    } catch (error) {
        throw error;
    }
}

export async function updateAgentFunction(agentId: string, functionId: number, isActive: boolean, userId: string) {
    try {
        const url = `${ANALYTICS_URL}/api/agents/${agentId}/functions/${functionId}?user_id=${userId}`;
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_active: isActive }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.detail || `Error: ${response.status}`);
        }

        return response.json();
    } catch (error) {
        throw error;
    }
}