import axios from 'axios';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15_000,
});

export function getApiErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return 'Something went wrong while loading vehicles. Please try again.';
  }

  const payload = error.response?.data;
  if (typeof payload?.detail === 'string') {
    return payload.detail;
  }

  if (payload && typeof payload === 'object') {
    const firstMessage = Object.values(payload)
      .flat()
      .find((message) => typeof message === 'string');
    if (typeof firstMessage === 'string') {
      return firstMessage;
    }
  }

  if (!error.response) {
    return 'The Fleet API is unavailable. Check that the backend is running and try again.';
  }

  return 'The Fleet API could not process this request. Please review the filters and try again.';
}

function firstErrorMessage(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.find((message): message is string => typeof message === 'string');
  }
  return undefined;
}

export function getApiValidationErrors(error: unknown, fieldNames: string[]) {
  const fieldErrors: Record<string, string> = {};
  const generalErrors: string[] = [];

  if (
    !axios.isAxiosError(error) ||
    !error.response?.data ||
    typeof error.response.data !== 'object'
  ) {
    return { fieldErrors, generalError: getApiErrorMessage(error) };
  }

  Object.entries(error.response.data as Record<string, unknown>).forEach(([field, value]) => {
    const message = firstErrorMessage(value);
    if (!message) {
      return;
    }
    if (fieldNames.includes(field)) {
      fieldErrors[field] = message;
    } else {
      generalErrors.push(message);
    }
  });

  return {
    fieldErrors,
    generalError:
      generalErrors[0] ??
      (Object.keys(fieldErrors).length === 0 ? getApiErrorMessage(error) : undefined),
  };
}

export function getApiStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
