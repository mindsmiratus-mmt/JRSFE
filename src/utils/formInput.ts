// utils/formInput.ts
//
// Input-time filters for form fields (same `replace(/[^0-9]/g, "").slice(0, n)` approach
// StockEntryForm already uses) plus extraction of a readable message from the API's error
// bodies, which come in several shapes depending on where the error was produced.

/** Keeps digits only and caps the length — e.g. phone (10), PIN (6), Aadhaar (12). */
export const digitsOnly = (value: string, maxLength: number) =>
    value.replace(/[^0-9]/g, "").slice(0, maxLength);

/** Uppercases and strips anything but A-Z/0-9 — for PAN (10) and GSTIN (15). */
export const alphanumericUpper = (value: string, maxLength: number) =>
    value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, maxLength);

const toCamelCase = (key: string) => key.charAt(0).toLowerCase() + key.slice(1);

/**
 * Field errors from an ASP.NET ModelState 400 (`{ errors: { PinCode: ["..."] } }`), keyed by
 * the camelCase form field name so they can be passed straight to Formik's setErrors.
 */
export const getApiFieldErrors = (err: any): Record<string, string> => {
    const errors = err?.response?.data?.errors;
    if (!errors || typeof errors !== "object") return {};

    return Object.fromEntries(
        Object.entries(errors).map(([key, messages]) => [
            toCamelCase(key),
            Array.isArray(messages) ? messages.join(" ") : String(messages),
        ])
    );
};

/**
 * Best available message from an API error. Handles, in order: ModelState validation (400),
 * ExceptionHandlingMiddleware's `{ error }` (4xx) and `{ message, details }` (500), controller
 * `{ message }` bodies, and plain-string bodies such as `NotFound("Customer 3 not found.")`.
 * The 500 `details` (the server exception message) is only appended in development builds.
 */
export const getApiErrorMessage = (err: any, fallback: string): string => {
    const data = err?.response?.data;
    if (!data) return err?.message || fallback;
    if (typeof data === "string") return data || fallback;

    const fieldErrors = Object.values(getApiFieldErrors(err));
    if (fieldErrors.length > 0) return fieldErrors.join(" ");

    const message = data.message || data.error || data.title;
    if (data.details && import.meta.env.DEV) {
        return `${message || fallback}: ${data.details}`;
    }
    return message || fallback;
};
