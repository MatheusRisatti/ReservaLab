const MS_PER_HOUR = 60 * 60 * 1000;

export function formatDurationSummary(pickupIso: string, returnIso: string): string {
  const diffMs = new Date(returnIso).getTime() - new Date(pickupIso).getTime();
  if (diffMs <= 0 || Number.isNaN(diffMs)) return '0h';
  const totalHours = Math.round(diffMs / MS_PER_HOUR);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days === 0) return `${hours} hora${hours === 1 ? '' : 's'}`;
  if (hours === 0) return `${days} dia${days === 1 ? '' : 's'}`;
  return `${days} dia${days === 1 ? '' : 's'} e ${hours}h`;
}
