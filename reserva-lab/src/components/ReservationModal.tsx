import React, { useState } from 'react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import type { Item } from '../types';

interface ReservationModalProps {
  item: Item;
  pickupAt: string;
  returnAt: string;
  onClose: () => void;
  onConfirmed: () => void;
  onConflict: () => void;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  item,
  pickupAt,
  returnAt,
  onClose,
  onConfirmed,
  onConflict,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setError('');
    setSubmitting(true);
    try {
      await api.post('/api/reservations', {
        item_id: item.id,
        expected_pickup_at: new Date(pickupAt).toISOString(),
        expected_return_at: new Date(returnAt).toISOString(),
      });
      onConfirmed();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível concluir a reserva. Tente novamente.'));
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { status?: number } }).response?.status === 409
      ) {
        onConflict();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reservation-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={onClose}
    >
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
        <h2 id="reservation-modal-title">Confirmar reserva</h2>
        <p style={{ marginBottom: '1rem' }}>
          <strong>{item.name}</strong>
          <span className="muted"> · Patrimônio {item.patrimony_code}</span>
        </p>
        <dl style={{ margin: '0 0 1rem', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 1rem' }}>
          <dt className="muted">Retirada</dt>
          <dd style={{ margin: 0 }}>{formatDateTime(pickupAt)}</dd>
          <dt className="muted">Devolução</dt>
          <dd style={{ margin: 0 }}>{formatDateTime(returnAt)}</dd>
        </dl>
        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="button" className="btn" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Reservando...' : 'Confirmar reserva'}
          </button>
        </div>
      </div>
    </div>
  );
};
