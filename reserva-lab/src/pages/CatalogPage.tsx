import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DateTimePicker } from '../components/DateTimePicker';
import { ItemCard } from '../components/ItemCard';
import { ReservationModal } from '../components/ReservationModal';
import { useAuth } from '../contexts/useAuth';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import type { Category, Item, Reservation } from '../types';

interface CatalogResult {
  key: string;
  items: Item[];
  error: string;
}

export const CatalogPage: React.FC = () => {
  const { userStatus, refreshUserStatus } = useAuth();

  const [pickupAt, setPickupAt] = useState('');
  const [returnAt, setReturnAt] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [maxRentDays, setMaxRentDays] = useState<number>(14);
  const [result, setResult] = useState<CatalogResult | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [extensionNotifications, setExtensionNotifications] = useState<Reservation[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const hasPeriod = pickupAt !== '' && returnAt !== '';
  let periodError = '';
  if (hasPeriod) {
    if (new Date(pickupAt).getTime() <= Date.now()) {
      periodError = 'A data de retirada deve ser futura.';
    } else if (new Date(returnAt) <= new Date(pickupAt)) {
      periodError = 'A devolução deve ser depois da retirada.';
    }
  } else if (pickupAt !== '' || returnAt !== '') {
    periodError = 'Informe a retirada e a devolução juntas.';
  }
  const validPeriod = hasPeriod && !periodError;

  const requestKey = JSON.stringify([categoryId, validPeriod ? [pickupAt, returnAt] : null, reloadCount]);
  const loading = result?.key !== requestKey;

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get('/api/categories'),
      api.get('/api/settings'),
      api.get('/api/reservations/my-reservations'),
    ]).then(([catRes, setRes, myRes]) => {
      if (!active) return;
      if (catRes.status === 'fulfilled') {
        setCategories(catRes.value.data.categories ?? []);
      }
      if (setRes.status === 'fulfilled' && setRes.value.data.settings?.max_rent_days) {
        setMaxRentDays(setRes.value.data.settings.max_rent_days);
      }
      if (myRes.status === 'fulfilled') {
        const allReservations: Reservation[] = myRes.value.data.reservations ?? [];
        const relevant = allReservations.filter(
          (r) =>
            r.approval_status === 'APPROVED' ||
            r.approval_status === 'REJECTED' ||
            (r.approval_status === 'PENDING' && r.status === 'SCHEDULED')
        );
        setExtensionNotifications(relevant.slice(0, 3));
      }
    });
    return () => {
      active = false;
    };
  }, [reloadCount]);

  useEffect(() => {
    if (periodError) return;
    let active = true;
    const params: Record<string, string> = {};
    if (categoryId) params.category_id = categoryId;
    if (validPeriod) {
      params.pickup_date = new Date(pickupAt).toISOString();
      params.return_date = new Date(returnAt).toISOString();
    }
    api
      .get('/api/items', { params })
      .then((response) => {
        if (active) setResult({ key: requestKey, items: response.data.items, error: '' });
      })
      .catch((err) => {
        if (active) {
          setResult({
            key: requestKey,
            items: [],
            error: getApiErrorMessage(err, 'Não foi possível carregar os equipamentos.'),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [categoryId, pickupAt, returnAt, validPeriod, periodError, requestKey]);

  const term = search.trim().toLowerCase();
  const visibleItems = (result?.items ?? []).filter(
    (item) =>
      term === '' ||
      item.name.toLowerCase().includes(term) ||
      item.patrimony_code.toLowerCase().includes(term)
  );

  let statusHint: string | undefined;
  if (userStatus === 'BLOQUEADO') statusHint = 'Sua conta está bloqueada para novas reservas.';
  else if (userStatus === 'LIMITE_ATINGIDO') statusHint = 'Você atingiu o limite de reservas simultâneas.';
  const reserveHint = statusHint;
  const canReserve = reserveHint === undefined;

  const reload = () => setReloadCount((count) => count + 1);

  const handleConfirmed = (wasExtendedRequest?: boolean) => {
    setSelectedItem(null);
    setSuccessMessage(
      wasExtendedRequest
        ? 'Solicitação de prazo maior enviada para análise do Administrador! O equipamento já está reservado preventivamente para você.'
        : 'Reserva realizada com sucesso!'
    );
    reload();
    void refreshUserStatus();
  };

  const visibleNotifications = extensionNotifications.filter((n) => !dismissedIds.includes(n.id));

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Catálogo de Equipamentos</h1>
        <span className="badge" style={{ fontSize: '0.84rem', padding: '0.25rem 0.75rem' }}>
          ⏱️ Prazo máximo de reserva: até <strong>{maxRentDays} {maxRentDays === 1 ? 'dia' : 'dias'}</strong>
        </span>
      </div>

      {/* Avisos de Solicitações de Prazo Maior (Aprovadas, Reprovadas ou Em Análise) */}
      {visibleNotifications.length > 0 && (
        <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '1.25rem' }}>
          {visibleNotifications.map((notif) => {
            const isRejected = notif.approval_status === 'REJECTED';
            const isApproved = notif.approval_status === 'APPROVED';
            return (
              <div
                key={notif.id}
                className={isRejected ? 'alert alert-error' : 'alert'}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  borderLeftWidth: '4px',
                  borderLeftColor: isRejected
                    ? 'var(--danger)'
                    : isApproved
                    ? 'var(--primary)'
                    : 'var(--warning)',
                }}
              >
                <div style={{ fontSize: '0.88rem', lineHeight: 1.45 }}>
                  {isApproved && (
                    <>
                      <strong>✅ Solicitação de Prazo Maior APROVADA:</strong> Seu pedido para{' '}
                      <strong>{notif.item?.name ?? 'Equipamento'}</strong> (
                      {new Date(notif.expected_pickup_at).toLocaleDateString('pt-BR')} até{' '}
                      {new Date(notif.expected_return_at).toLocaleDateString('pt-BR')}) foi aprovado pelo Administrador!
                      {notif.admin_decision_reason && (
                        <div style={{ marginTop: '0.25rem', color: 'var(--muted)' }}>
                          Observação do Admin: <em>"{notif.admin_decision_reason}"</em>
                        </div>
                      )}
                    </>
                  )}
                  {isRejected && (
                    <>
                      <strong>❌ Solicitação de Prazo Maior REPROVADA:</strong> Seu pedido para{' '}
                      <strong>{notif.item?.name ?? 'Equipamento'}</strong> (
                      {new Date(notif.expected_pickup_at).toLocaleDateString('pt-BR')} até{' '}
                      {new Date(notif.expected_return_at).toLocaleDateString('pt-BR')}) foi reprovado pelo Administrador.
                      {notif.admin_decision_reason && (
                        <div style={{ marginTop: '0.25rem', fontWeight: 600 }}>
                          Motivo informado pelo Admin: "{notif.admin_decision_reason}"
                        </div>
                      )}
                    </>
                  )}
                  {!isApproved && !isRejected && (
                    <>
                      <strong>⏳ Solicitação em Análise:</strong> Seu pedido de prazo maior para{' '}
                      <strong>{notif.item?.name ?? 'Equipamento'}</strong> aguarda avaliação do Administrador.
                    </>
                  )}
                  <div style={{ marginTop: '0.3rem' }}>
                    <Link to="/minhas-reservas" style={{ fontWeight: 650 }}>
                      Ver detalhes em Minhas Reservas →
                    </Link>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDismissedIds((prev) => [...prev, notif.id])}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    opacity: 0.75,
                    padding: '0.15rem 0.4rem',
                  }}
                  title="Ocultar aviso"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {successMessage && (
        <div className="alert" style={{ marginBottom: '1rem' }}>
          {successMessage} <Link to="/minhas-reservas">Ver minhas reservas</Link>
        </div>
      )}

      <div
        className="card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
          alignItems: 'end',
        }}
      >
        <DateTimePicker
          label="Retirada"
          value={pickupAt}
          minDate={new Date()}
          defaultHour={9}
          placeholder="Qualquer data/hora"
          onChange={(val) => setPickupAt(val)}
        />

        <DateTimePicker
          label="Devolução"
          value={returnAt}
          minDate={pickupAt ? new Date(pickupAt) : new Date()}
          rangeStart={pickupAt ? new Date(pickupAt) : undefined}
          defaultHour={18}
          placeholder="Qualquer data/hora"
          onChange={(val) => setReturnAt(val)}
        />

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem' }}>
          Categoria
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem' }}>
          Buscar
          <input className="input" type="search" placeholder="Nome ou patrimônio" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>

        {(pickupAt || returnAt) && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={() => { setPickupAt(''); setReturnAt(''); }}>
              Limpar período
            </button>
          </div>
        )}
      </div>

      {periodError && <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>{periodError}</div>}
      {!periodError && result?.error && !loading && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>{result.error}</div>
      )}

      {statusHint && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>{statusHint}</div>
      )}

      {!hasPeriod && !periodError && (
        <p className="muted" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
          Escolha o período no filtro ou clique diretamente em <strong>Reservar</strong> para definir a data e o horário no modal. Sem período filtrado, a disponibilidade mostrada é a de agora.
        </p>
      )}

      {!periodError && loading ? (
        <p className="muted">Carregando equipamentos...</p>
      ) : (
        !periodError && !result?.error && (
          visibleItems.length === 0 ? (
            <p className="muted">Nenhum equipamento encontrado.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {visibleItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  canReserve={canReserve}
                  reserveHint={reserveHint}
                  onReserve={(selected) => { setSuccessMessage(''); setSelectedItem(selected); }}
                />
              ))}
            </div>
          )
        )
      )}

      {selectedItem && (
        <ReservationModal
          item={selectedItem}
          pickupAt={validPeriod ? pickupAt : ''}
          returnAt={validPeriod ? returnAt : ''}
          maxRentDays={maxRentDays}
          onClose={() => setSelectedItem(null)}
          onConfirmed={handleConfirmed}
          onConflict={reload}
        />
      )}
    </div>
  );
};
