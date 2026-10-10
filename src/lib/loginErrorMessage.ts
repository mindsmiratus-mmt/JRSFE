import { isAxiosError } from 'axios';

export const INVALID_CREDENTIALS_MESSAGE =
  'Invalid user ID or password. Please check your credentials and try again.';

/**
 * A user-facing message for a failed POST /auth/login. Never returns the raw Axios message, a stack trace or
 * server exception details. JRS answers wrong credentials with 400 { message: "Invalid username or password" };
 * any 400 on this request is shown as the same generic text, so it never reveals whether the user ID exists.
 */
export const getLoginErrorMessage = (error: unknown): string => {
  if (!isAxiosError(error)) {
    return 'Unable to sign in right now. Please try again.';
  }

  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? 'The server took too long to respond. Please try again.'
      : 'Unable to reach the server. Please check your internet connection and try again.';
  }

  const status = error.response.status;
  if (status === 400) return INVALID_CREDENTIALS_MESSAGE;
  if (status === 429) return 'Too many sign-in attempts. Please wait a moment and try again.';
  if (status >= 500) return 'The server is temporarily unavailable. Please try again in a few minutes.';
  return 'Unable to sign in right now. Please try again or contact your administrator.';
};

/** A user-facing message for a failed shop switch: the server's own 4xx message, otherwise a generic one. */
export const getShopSwitchErrorMessage = (error: unknown): string => {
  if (isAxiosError(error) && error.response && error.response.status < 500) {
    const message = (error.response.data as { message?: unknown } | undefined)?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Failed to switch shop. Please try again.';
};
