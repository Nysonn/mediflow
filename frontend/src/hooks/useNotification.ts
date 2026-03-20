import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store';
import { addNotification, removeNotification } from '../store/slices/notificationSlice';
import type { NotificationType } from '../store/slices/notificationSlice';

export const useNotification = () => {
  const dispatch = useDispatch<AppDispatch>();

  const notify = (type: NotificationType, message: string, duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dispatch(addNotification({ id, type, message }));
    setTimeout(() => {
      dispatch(removeNotification(id));
    }, duration);
  };

  return {
    success: (message: string) => notify('success', message),
    error: (message: string) => notify('error', message),
    info: (message: string) => notify('info', message),
    warning: (message: string) => notify('warning', message),
  };
};
