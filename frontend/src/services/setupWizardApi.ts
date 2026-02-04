import { api } from './api';
import { IndustryTemplate, WizardData } from '../types/setupWizard';

const BASE_URL = '/api/setup-wizard';

export const setupWizardApi = {
  async getTemplates(): Promise<IndustryTemplate[]> {
    const response = await api.get(`${BASE_URL}/templates`);
    return response.data;
  },

  async saveDraft(step: number, data: any, orgId?: number): Promise<{org_id: number; last_step: number}> {
    const params = orgId ? `?org_id=${orgId}` : '';
    const response = await api.post(`${BASE_URL}/draft${params}`, { step, data });
    return response.data;
  },

  async resumeWizard(orgId: number): Promise<{org_id: number; last_step: number; data: any}> {
    const response = await api.get(`${BASE_URL}/resume/${orgId}`);
    return response.data;
  },

  async completeSetup(data: WizardData, orgId?: number): Promise<{
    status: string;
    org_id: number;
    admin_user_id: number;
    access_token: string;
    message: string;
  }> {
    const params = orgId ? `?org_id=${orgId}` : '';
    const response = await api.post(`${BASE_URL}/complete${params}`, data);
    return response.data;
  },

  async validateOrgCode(orgCode: string): Promise<{available: boolean; org_code: string}> {
    const response = await api.get(`${BASE_URL}/validate/org-code/${orgCode}`);
    return response.data;
  }
};
