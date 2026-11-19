import React from 'react';
import type { Item } from '../types';
import { ItemIllustration } from './ItemIllustration';
import { getItemPhoto } from '../utils/itemMedia';

interface ItemCardProps {
  item: Item;
  canReserve: boolean;
  reserveHint?: string;
  onReserve: (item: Item) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, canReserve, reserveHint, onReserve }) => {
  const available = item.is_available !== false;
  const totalQty = item.quantity ?? 1;
  const availableQty = item.available_quantity ?? (available ? totalQty : 0);

  return (
    <article className="card item-card">
      <div
        className={[
          'item-card-media',
          available ? '' : 'item-card-media-off',
          getItemPhoto(item) ? 'item-card-media-photo' : '',
        ].filter(Boolean).join(' ')}
      >
        <ItemIllustration item={item} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        <span className={available ? 'badge' : 'badge badge-danger'}>
          {available ? 'Disponível' : 'Indisponível'}
        </span>
        {totalQty > 1 && (
          <span
            className="badge"
            style={{
              backgroundColor: 'var(--page)',
              color: 'var(--muted)',
              fontWeight: 600,
            }}
            title={`${availableQty} de ${totalQty} unidades disponíveis neste período`}
          >
            {availableQty} de {totalQty} un.
          </span>
        )}
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
          {available ? 'Reservar' : 'Indisponível'}
        </button>
      </div>
    </article>
  );
};
