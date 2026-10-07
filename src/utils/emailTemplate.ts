// utils/emailTemplate.ts — small helpers for the Email Template editor

/** {{Name}} — a parameter value (HTML-encoded by JRS when rendered). */
export const tokenFor = (name: string) => `{{${name}}}`;

/**
 * Replaces the selection [start, end) of `text` with `insert`.
 * Returns the new text and the caret position after the insertion.
 */
export const insertAtSelection = (text: string, start: number, end: number, insert: string) => {
    const from = Math.max(0, Math.min(start, text.length));
    const to = Math.max(from, Math.min(end, text.length));
    return { text: text.slice(0, from) + insert + text.slice(to), caret: from + insert.length };
};

/**
 * Wraps the selection in an optional block {{#Name}} … {{/Name}} — rendered only when the value is present.
 * An empty selection gets a placeholder that uses the value, so the block is immediately meaningful.
 */
export const wrapInBlock = (text: string, start: number, end: number, name: string, type: 'text' | 'url') => {
    const selected = text.slice(start, end);
    const inner = selected || (type === 'url' ? `<a href="${tokenFor(name)}" target="_blank">Link</a>` : tokenFor(name));
    return insertAtSelection(text, start, end, `{{#${name}}}${inner}{{/${name}}}`);
};

/**
 * Names among `available` whose tokens ({{Name}}, {{#Name}}, {{/Name}}) appear in `text` but are not `selected`.
 * Used to block Save before JRS rejects it — tokens are never removed automatically.
 */
export const unselectedTokens = (text: string, available: string[], selected: Set<string>) => {
    const found = new Set<string>();
    for (const match of text.matchAll(/\{\{[#/]?([A-Za-z][A-Za-z0-9]*)\}\}/g)) {
        if (available.includes(match[1]) && !selected.has(match[1])) found.add(match[1]);
    }
    return [...found];
};

/** The `errors` / `message` of a JRS 400/409 response, for display. */
export const apiErrors = (error: unknown): string[] => {
    const data = (error as { response?: { data?: { errors?: unknown; message?: unknown } } })?.response?.data;
    if (Array.isArray(data?.errors) && data.errors.length > 0) return data.errors.map(String);
    if (typeof data?.message === 'string') return [data.message];
    return ['The request failed. Please try again.'];
};

export const apiStatus = (error: unknown): number | undefined =>
    (error as { response?: { status?: number } })?.response?.status;
