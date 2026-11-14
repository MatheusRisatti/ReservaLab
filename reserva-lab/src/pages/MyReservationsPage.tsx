import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import type { Reservation, ReservationStatus } from '../types';

type TabId = 'agendadas' | 'andamento' | 'historico';

const TABS: Array<{ id: TabId; label: string; statuses: ReservationStatus[]; empty: string }> = [
  { id: 'agendadas', label: 'Agendadas', statuses: ['SCHEDULED'], empty: 'Você não tem reservas agendadas.' },
  { id: 'andamento', label: 'Em Andamento', statuses: ['ACTIVE_LOAN'], empty: 'Você não tem equipamentos emprestados no momento.' },
  {
    id: 'historico',
    label: 'Concluídas / Canceladas',
    statuses: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
    empty: 'Nenhuma reserva concluída ou cancelada ainda.',
  },
];

const STATUS_LABEL: Record<ReservationStatus, { text: string; badge: string }> = {
  SCHEDULED: { text: 'Agendada', badge: 'badge' },
  ACTIVE_LOAN: { text: 'Em andamento', badge: 'badge badge-warning' },
  COMPLETED: { text: 'Concluída', badge: 'badge' },
  NO_SHOW: { text: 'Não compareceu', badge: 'badge badge-danger' },
  CANCELLED: { text: 'Cancelada', badge: 'badge badge-danger' },
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

interface ReservationsResult {
  reload: number;
  reservations: Reservation[];
  error: string;
}

export const MyReservationsPage: React.FC = () => {
  const { refreshUserStatus } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>('agendadas');
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<ReservationsResult | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loading = result?.reload !== reload;

  useEffect(() => {
    let active = true;
    api
      .get('/api/reservations/my-reservations')
      .then((response) => {
        if (active) setResult({ reload, reservations: response.data.reservations, error: '' });
      })
      .catch((err) => {
        if (active) {
          setResult({
            reload,
            reservations: [],
            error: getApiErrorMessage(err, 'Não foi possível carregar suas reservas.'),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [reload]);

  const reservations = result?.reservations ?? [];
  const currentTab = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];
  const visible = reservations.filter((reservation) => currentTab.statuses.includes(reservation.status));

  const handleCancel = async (reservation: Reservation) => {
    setFeedback(null);
    setCancelingId(reservation.id);
    try {
      await api.patch(`/api/reservations/${reservation.id}/cancel`);
      setFeedback({ type: 'success', message: 'Reserva cancelada com sucesso.' });
      setConfirmingId(null);
      void refreshUserStatus();
    } catch (err) {
      setFeedback({ type: 'error', message: getApiErrorMessage(err, 'Não foi possível cancelar a reserva.') });
    } finally {
      setCancelingId(null);
      setReload((count) => count + 1);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem' }}>
      <h1>Minhas Reservas</h1>

      <div role="tablist" aria-label="Filtrar reservas" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '1rem 0' }}>
        {TABS.map((tab) => {
          const count = reservations.filter((reservation) => tab.statuses.includes(reservation.status)).length;
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={selected ? 'btn' : 'btn btn-outline'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {!loading && <span style={{ marginLeft: '0.5rem', opacity: 0.85 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          className={feedback.type === 'error' ? 'alert alert-error' : 'alert'}
          role={feedback.type === 'error' ? 'alert' : 'status'}
          style={{ marginBottom: '1rem' }}
        >
          {feedback.message}
        </div>
      )}

      {loading ? (
        <p className="muted">Carregando suas reservas...</p>
      ) : result?.error ? (
        <div className="alert alert-error" role="alert">{result.error}</div>
      ) : visible.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p className="muted">{currentTab.empty}</p>
          {activeTab === 'agendadas' && (
            <p style={{ marginTop: '0.75rem' }}>
              <Link to="/" className="btn">Ver catálogo</Link>
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {visible.map((reservation) => {
            const status = STATUS_LABEL[reservation.status];
            const confirming = confirmingId === reservation.id;
            const canceling = cancelingId === reservation.id;
            return (
              <article key={reservation.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <span className={status.badge}>{status.text}</span>
                </div>
                <h3 style={{ margin: 0 }}>{reservation.item?.name ?? 'Equipamento'}</h3>
                <p className="muted" style={{ fontSize: '0.85rem' }}>
                  {reservation.item ? `Patrimônio ${reservation.item.patrimony_code}` : ''}
                  {reservation.item?.category ? ` · ${reservation.item.category.name}` : ''}
                </p>
                <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.2rem 0.75rem', fontSize: '0.9rem' }}>
                  <dt className="muted">Retirada prevista</dt>
                  <dd style={{ margin: 0 }}>{formatDateTime(reservation.expected_pickup_at)}</dd>
                  <dt className="muted">Devolução prevista</dt>
                  <dd style={{ margin: 0 }}>{formatDateTime(reservation.expected_return_at)}</dd>
                  {reservation.loan?.actual_pickup_at && (
                    <>
                      <dt className="muted">Retirado em</dt>
                      <dd style={{ margin: 0 }}>{formatDateTime(reservation.loan.actual_pickup_at)}</dd>
                    </>
                  )}
                  {reservation.loan?.actual_return_at && (
                    <>
                      <dt className="muted">Devolvido em</dt>
                      <dd style={{ margin: 0 }}>{formatDateTime(reservation.loan.actual_return_at)}</dd>
                    </>
                  )}
                </dl>
                {reservation.status === 'SCHEDULED' && (
                  <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                    {confirming ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.9rem' }}>Cancelar esta reserva?</span>
                        <button type="button" className="btn" disabled={canceling} onClick={() => handleCancel(reservation)}>
                          {canceling ? 'Cancelando...' : 'Sim, cancelar'}
                        </button>
                        <button type="button" className="btn btn-outline" disabled={canceling} onClick={() => setConfirmingId(null)}>
                          Voltar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline btn-block"
                        onClick={() => {
                          setFeedback(null);
                          setConfirmingId(reservation.id);
                        }}
                      >
                        Cancelar reserva
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
