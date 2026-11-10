import React from 'react';
import type { Item } from '../types';

interface ItemCardProps {
  item: Item;
  canReserve: boolean;
  reserveHint?: string;
  onReserve: (item: Item) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, canReserve, reserveHint, onReserve }) => {
  const available = item.is_available !== false;

  return (
    <article className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div>
        <span className={available ? 'badge' : 'badge badge-danger'}>
          {available ? 'Disponível' : 'Indisponível'}
        </span>
      </div>
      <h3 style={{ margin: 0 }}>{item.name}</h3>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Patrimônio {item.patrimony_code}
        {item.category ? ` · ${item.category.name}` : ''}
      </p>
      <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
        <button
          type="button"
          className="btn btn-block"
          disabled={!available || !canReserve}
          title={!available ? 'Equipamento indisponível neste período' : reserveHint}
          onClick={() => onReserve(item)}
        >
          Reservar
        </button>
        {available && !canReserve && reserveHint && (
          <p className="muted" style={{ fontSize: '0.78rem', marginTop: '0.35rem' }}>{reserveHint}</p>
        )}
      </div>
    </article>
  );
};
