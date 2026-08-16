import { useEffect } from 'react';

function ConfirmDialog({ message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="ns-confirm-backdrop" onClick={onCancel}>
      <div className="ns-confirm-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="ns-confirm-message">{message}</div>
        <div className="ns-confirm-actions">
          <button type="button" className="ns-confirm-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="ns-clear-btn" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
