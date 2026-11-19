import type { Item } from '../types';

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

export function getItemPhoto(item: Item): string | null {
  return ITEM_PHOTOS.find(([pattern]) => pattern.test(item.name))?.[1] ?? null;
}
