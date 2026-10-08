// hooks/useEmailTemplate.ts — Email Template Master (JRS api/admin/email-templates, Admin role only)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Types
// ========================
/** A template is identified by its TemplateKey — the application asks for it by that key. */
export interface EmailTemplate {
    templateKey: string;
    templateName: string;
    mailSubject: string;
    htmlBody: string;
    isActive: boolean;
    version: number;
    createdAt: string;
    updatedAt: string;
    updatedBy?: string;
}

export interface EmailTemplateInput {
    templateName: string;
    mailSubject: string;
    htmlBody: string;
    isActive: boolean;
}

export interface CreateEmailTemplateData extends EmailTemplateInput {
    templateKey: string;
}

export interface UpdateEmailTemplateData extends EmailTemplateInput {
    version: number;
}

export interface EmailTemplatePreview {
    subject: string;
    html: string;
}

// ========================
// Query Keys
// ========================
const KEYS = {
    all: ['emailTemplates'] as const,
    single: (key: string) => ['emailTemplate', key] as const,
};

const BASE = '/admin/email-templates';

// ========================
// Hooks
// ========================
export const useEmailTemplates = () =>
    useQuery<EmailTemplate[]>({
        queryKey: KEYS.all,
        queryFn: async () => (await api.get<EmailTemplate[]>(BASE)).data,
    });

export const useEmailTemplate = (key: string | null) =>
    useQuery<EmailTemplate>({
        queryKey: KEYS.single(key!),
        queryFn: async () => (await api.get<EmailTemplate>(`${BASE}/${encodeURIComponent(key!)}`)).data,
        enabled: !!key,
    });

export const useCreateEmailTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateEmailTemplateData) => (await api.post<EmailTemplate>(BASE, data)).data,
        onSuccess: (saved) => {
            queryClient.invalidateQueries({ queryKey: KEYS.all });
            queryClient.setQueryData(KEYS.single(saved.templateKey), saved);
        },
    });
};

export const useUpdateEmailTemplate = (key: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: UpdateEmailTemplateData) =>
            (await api.put<EmailTemplate>(`${BASE}/${encodeURIComponent(key)}`, data)).data,
        onSuccess: (saved) => {
            queryClient.invalidateQueries({ queryKey: KEYS.all });
            queryClient.setQueryData(KEYS.single(saved.templateKey), saved);
        },
    });
};

export interface PreviewEmailTemplateData {
    mailSubject: string;
    htmlBody: string;
    /** Optional, by placeholder name. A placeholder without one shows as [name]. */
    sampleValues?: Record<string, string>;
}

/**
 * Renders the current form values (saved or not — a new template can be previewed before it exists). A placeholder
 * without a sample value shows as [name]. Same validation as Save; nothing is stored, queued or sent.
 */
export const usePreviewEmailTemplate = () =>
    useMutation({
        mutationFn: async (data: PreviewEmailTemplateData) =>
            (await api.post<EmailTemplatePreview>(`${BASE}/preview`, data)).data,
    });
