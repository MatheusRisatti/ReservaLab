import React from 'react';
import type { Item } from '../types';
import { ItemIllustration, getItemPhoto } from './ItemIllustration';

interface ItemCardProps {
  item: Item;
  canReserve: boolean;
  reserveHint?: string;
  onReserve: (item: Item) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, canReserve, reserveHint, onReserve }) => {
  const available = item.is_available !== false;

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
          {available ? 'Reservar' : 'Indisponível'}
        </button>
      </div>
    </article>
  );
};
