import React from 'react';
import type { Item } from '../types';

type Kind = 'laptop' | 'projector' | 'camera' | 'microphone' | 'tripod' | 'generic';

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function detectKind(item: Item): Kind {
  const name = normalize(item.name);
  const category = normalize(item.category?.name ?? '');

  if (/projetor|datashow|projector/.test(name)) return 'projector';
  if (/microfone|microphone/.test(name)) return 'microphone';
  if (/tripe|tripod/.test(name)) return 'tripod';
  if (/camera|gopro|lente/.test(name)) return 'camera';
  if (/notebook|macbook|thinkpad|laptop|chromebook/.test(name)) return 'laptop';

  if (/projetor/.test(category)) return 'projector';
  if (/notebook|computador/.test(category)) return 'laptop';
  if (/audio/.test(category)) return 'microphone';
  if (/camera/.test(category)) return 'camera';
  return 'generic';
}

const accent = { fill: 'var(--primary)', fillOpacity: 0.16 } as const;

const drawings: Record<Kind, React.ReactNode> = {
  laptop: (
    <>
      <rect x="38" y="12" width="84" height="56" rx="5" {...accent} />
      <rect x="44" y="18" width="72" height="44" rx="2" />
      <path d="M18 78H142L134 88H26Z" {...accent} />
    </>
  ),
  projector: (
    <>
      <rect x="22" y="32" width="116" height="40" rx="9" {...accent} />
      <circle cx="102" cy="52" r="14" />
      <circle cx="102" cy="52" r="6" />
      <path d="M36 44h24M36 52h24M36 60h24" />
      <path d="M40 72v8M120 72v8" />
    </>
  ),
  camera: (
    <>
      <path d="M54 32l6-10h40l6 10" />
      <rect x="24" y="32" width="112" height="52" rx="8" {...accent} />
      <circle cx="80" cy="58" r="20" />
      <circle cx="80" cy="58" r="10" />
      <rect x="112" y="40" width="14" height="7" rx="2" />
    </>
  ),
  microphone: (
    <>
      <rect x="64" y="8" width="32" height="54" rx="16" {...accent} />
      <path d="M64 28h32M64 40h32" />
      <path d="M46 48a34 34 0 0 0 68 0" />
      <path d="M80 82v10M60 94h40" />
    </>
  ),
  tripod: (
    <>
      <rect x="62" y="8" width="36" height="16" rx="4" {...accent} />
      <path d="M80 24v30" />
      <path d="M80 54L48 92M80 54L112 92M80 54v38" />
      <path d="M42 92h12M106 92h12M74 92h12" />
    </>
  ),
  generic: (
    <>
      <path d="M80 12l48 22v38L80 94 32 72V34z" {...accent} />
      <path d="M32 34l48 22 48-22M80 56v38" />
    </>
  ),
};

const ITEM_PHOTOS: Array<[RegExp, string]> = [
  [/alpha\s*a6400/i, '/items/camera-sony-a6400.png?v=3'],
  [/thinkpad\s*t14/i, '/items/lenovo-thinkpad-t14.png?v=2'],
  [/macbook\s*air\s*m2/i, '/items/macbook-air-m2.png?v=2'],
  [/shure\s*sm7b/i, '/items/shure-sm7b.png?v=2'],
  [/latitude\s*3420/i, '/items/dell-latitude-3420.png?v=2'],
  [/benq\s*mw560/i, '/items/benq-mw560.png?v=2'],
  [/epson\s*powerlite\s*e20/i, '/items/epson-powerlite-e20.png?v=2'],
  [/manfrotto\s*compact/i, '/items/manfrotto-compact-advanced.png?v=2'],
];

export const getItemPhoto = (item: Item): string | null =>
  ITEM_PHOTOS.find(([pattern]) => pattern.test(item.name))?.[1] ?? null;

export const ItemIllustration: React.FC<{ item: Item }> = ({ item }) => {
  const photo = getItemPhoto(item);
  if (photo) {
    const lightPhoto = photo.replace('.png', '-light.png');
    return (
      <>
        <img className="item-photo item-photo-light" src={lightPhoto} alt={item.name} />
        <img className="item-photo item-photo-dark" src={photo} alt="" aria-hidden="true" />
      </>
    );
  }
  return (
  <svg
    viewBox="0 0 160 100"
    width="100%"
    height="100%"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    role="img"
    aria-label={item.name}
  >
    {drawings[detectKind(item)]}
  </svg>
  );
};
