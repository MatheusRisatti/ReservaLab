import axios from 'axios';

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error;
    if (typeof message === 'string' && message) return message;
    if (!error.response) return 'Não foi possível conectar ao servidor. Tente novamente.';
  }
  return fallback;
}
