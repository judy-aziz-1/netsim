import { useEffect } from 'react';
import { useTopologyStore } from '../store/topologyStore';

const TOAST_DURATION_MS = 4500;

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timeout = setTimeout(() => onDismiss(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [toast.id, onDismiss]);

  return (
    <div className={`ns-toast ${toast.type === 'error' ? 'ns-toast-error' : 'ns-toast-success'}`}>
      <span className="ns-toast-icon">{toast.type === 'error' ? '⚠' : '✓'}</span>
      <span className="ns-toast-message">{toast.message}</span>
    </div>
  );
}

function ToastContainer() {
  const toasts = useTopologyStore((state) => state.toasts);
  const dismissToast = useTopologyStore((state) => state.dismissToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="ns-toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

export default ToastContainer;
