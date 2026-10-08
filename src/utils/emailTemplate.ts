// utils/emailTemplate.ts — small helpers for the Email Template editor

/** The `errors` / `message` of a JRS 400/409 response, for display. */
export const apiErrors = (error: unknown): string[] => {
    const data = (error as { response?: { data?: { errors?: unknown; message?: unknown } } })?.response?.data;
    if (Array.isArray(data?.errors) && data.errors.length > 0) return data.errors.map(String);
    if (typeof data?.message === 'string') return [data.message];
    return ['The request failed. Please try again.'];
};

export const apiStatus = (error: unknown): number | undefined =>
    (error as { response?: { status?: number } })?.response?.status;
