export function normalizeSeasonValue(value: string | number): number {
  if (typeof value === 'number') return value;

  const parsed = Number(value);
  if (!Number.isNaN(parsed)) return parsed;

  const match = value.match(/\d{4}/);
  return match ? Number(match[0]) : Number.NEGATIVE_INFINITY;
}

export function getLatestSeason<T>(
  seasons: T[],
  getValue: (season: T) => string | number
): T | null {
  if (seasons.length === 0) return null;

  return seasons
    .slice(1)
    .reduce<T>(
      (latest, current) =>
        normalizeSeasonValue(getValue(current)) >=
        normalizeSeasonValue(getValue(latest))
          ? current
          : latest,
      seasons[0]
    );
}

export function getSeasonData<T>(
  seasons: T[],
  season: string | number,
  getValue: (item: T) => string | number
): T | undefined {
  return seasons.find(item => String(getValue(item)) === String(season));
}
