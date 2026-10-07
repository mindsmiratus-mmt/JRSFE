// hooks/useEmailTemplate.ts — Email Template Master (JRS api/admin/email-templates, Admin role only)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// ========================
// Types
// ========================
export type EmailParameterType = 'text' | 'url';

/** A parameter a template uses (ParameterJson entry). `required` is chosen per template. */
export interface EmailTemplateParameter {
    name: string;
    type: EmailParameterType;
    required: boolean;
}

export interface EmailTemplate {
    templateKey: string;
    templateName: string;
    useFor: string;
    mailSubject: string;
    htmlBody: string;
    parameters: EmailTemplateParameter[];
    isActive: boolean;
    version: number;
    createdAt: string;
    updatedAt: string;
    updatedBy?: string;
}

/** A parameter a business event can supply (from the application's UseFor registry). */
export interface EmailUseForParameter {
    name: string;
    type: EmailParameterType;
    description: string;
    sampleValue: string;
}

export interface EmailUseFor {
    key: string;
    displayName: string;
    parameters: EmailUseForParameter[];
}

export interface EmailTemplateInput {
    templateName: string;
    mailSubject: string;
    htmlBody: string;
    parameters: EmailTemplateParameter[];
    isActive: boolean;
}

export interface CreateEmailTemplateData extends EmailTemplateInput {
    templateKey: string;
    useFor: string;
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
    useFor: ['emailTemplateUseFor'] as const,
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

export const useEmailUseFor = () =>
    useQuery<EmailUseFor[]>({
        queryKey: KEYS.useFor,
        queryFn: async () => (await api.get<EmailUseFor[]>(`${BASE}/use-for`)).data,
        staleTime: Infinity, // application-owned registry; changes only with a JRS release
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
            // Activation may have deactivated another template of the same UseFor.
            queryClient.invalidateQueries({ queryKey: KEYS.all });
            queryClient.setQueryData(KEYS.single(saved.templateKey), saved);
        },
    });
};

/** Renders draft content with the registry's sample values. Never sends an email. */
export const usePreviewEmailTemplate = (key: string) =>
    useMutation({
        mutationFn: async (data: { mailSubject: string; htmlBody: string; parameters: EmailTemplateParameter[] }) =>
            (await api.post<EmailTemplatePreview>(`${BASE}/${encodeURIComponent(key)}/preview`, data)).data,
    });
