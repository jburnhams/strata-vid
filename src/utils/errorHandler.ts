import { useProjectStore } from '../store/useProjectStore';

export const handleError = (error: unknown, fallbackMessage: string = 'An unexpected error occurred') => {
  console.error(error);
  const message = error instanceof Error ? error.message : fallbackMessage;
  useProjectStore.getState().addToast(message, 'error');
};

export const showSuccess = (message: string) => {
  useProjectStore.getState().addToast(message, 'success');
};

export const showInfo = (message: string) => {
  useProjectStore.getState().addToast(message, 'info');
};

export const showWarning = (message: string) => {
    useProjectStore.getState().addToast(message, 'warning');
};
