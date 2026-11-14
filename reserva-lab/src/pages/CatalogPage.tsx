import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ItemCard } from '../components/ItemCard';
import { ReservationModal } from '../components/ReservationModal';
import { useAuth } from '../contexts/useAuth';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import type { Category, Item } from '../types';

interface CatalogResult {
  key: string;
  items: Item[];
  error: string;
}

export const CatalogPage: React.FC = () => {
  const { userStatus, refreshUserStatus } = useAuth();

  const [now] = useState(() => Date.now());
  const [pickupAt, setPickupAt] = useState('');
  const [returnAt, setReturnAt] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [result, setResult] = useState<CatalogResult | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const hasPeriod = pickupAt !== '' && returnAt !== '';
  let periodError = '';
  if (hasPeriod) {
    if (new Date(pickupAt).getTime() <= now) {
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
    api
      .get('/api/categories')
      .then((response) => {
        if (active) setCategories(response.data.categories);
      })
      .catch(() => {
        // O filtro de categoria fica vazio; a listagem de equipamentos continua funcionando.
      });
    return () => {
      active = false;
    };
  }, []);

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
  const reserveHint = statusHint ?? (!validPeriod ? 'Escolha o período de retirada e devolução para reservar.' : undefined);
  const canReserve = reserveHint === undefined;

  const reload = () => setReloadCount((count) => count + 1);

  const handleConfirmed = () => {
    setSelectedItem(null);
    setSuccessMessage('Reserva realizada com sucesso!');
    reload();
    void refreshUserStatus();
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem' }}>
      <h1>Catálogo de Equipamentos</h1>

      {successMessage && (
        <div className="alert" style={{ marginBottom: '1rem' }}>
          {successMessage} <Link to="/minhas-reservas">Ver minhas reservas</Link>
        </div>
      )}

      <div
        className="card"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem' }}>
          Retirada
          <input className="input" type="datetime-local" value={pickupAt} onChange={(e) => setPickupAt(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem' }}>
          Devolução
          <input className="input" type="datetime-local" value={returnAt} onChange={(e) => setReturnAt(e.target.value)} />
        </label>
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
          Escolha o período de retirada e devolução para reservar. Sem período, a disponibilidade mostrada é a de agora.
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

      {selectedItem && validPeriod && (
        <ReservationModal
          item={selectedItem}
          pickupAt={pickupAt}
          returnAt={returnAt}
          onClose={() => setSelectedItem(null)}
          onConfirmed={handleConfirmed}
          onConflict={reload}
        />
      )}
    </div>
  );
};
