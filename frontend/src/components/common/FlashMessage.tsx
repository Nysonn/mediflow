import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { removeNotification } from '../../store/slices/notificationSlice';

export const FlashMessage = () => {
  const notifications = useSelector(
    (state: RootState) => state.notifications.notifications
  );
  const dispatch = useDispatch<AppDispatch>();

  const alertClass: Record<string, string> = {
    success: 'alert-success',
    error: 'alert-error',
    info: 'alert-info',
    warning: 'alert-warning',
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`alert ${alertClass[n.type]} shadow-lg`}
        >
          <span>{n.message}</span>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => dispatch(removeNotification(n.id))}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
