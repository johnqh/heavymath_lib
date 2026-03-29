/**
 * Hook for favorites with resolved entity names.
 * Wraps useFavorites from indexer_client and resolves human-readable names
 * for each favorited entity via getSportsData.
 */

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  type CreateFavoriteRequest,
  type IndexerClient,
  type SportsApiResponse,
  useFavorites as useFavoritesRaw,
  type WalletFavoriteData,
  type WalletFavoritesFilters,
} from '@sudobility/heavymath_indexer_client';

/**
 * A favorite with its resolved display name
 */
export interface FavoriteWithName extends WalletFavoriteData {
  /** Resolved display name, or undefined if not yet loaded or unavailable */
  name: string | undefined;
  /** True while the name is being resolved */
  nameLoading: boolean;
}

/**
 * Return type for useFavorites hook
 */
export interface UseFavoritesResult {
  /** Array of favorites with resolved names */
  favorites: FavoriteWithName[];
  /** True if favorites are loading */
  isLoading: boolean;
  /** True if the favorites query encountered an error */
  isError: boolean;
  /** Error from the favorites query, or null */
  error: Error | null;
  /** Add a favorite */
  addFavorite: (request: CreateFavoriteRequest) => Promise<unknown>;
  /** Remove a favorite by its ID */
  removeFavorite: (favoriteId: number) => Promise<unknown>;
  /** True if an addFavorite mutation is in progress */
  addFavoritePending: boolean;
  /** True if a removeFavorite mutation is in progress */
  removeFavoritePending: boolean;
  /** Refresh favorites data */
  refresh: () => void;
  /** True if any name resolution queries are loading */
  namesLoading: boolean;
}

// Subcategory values that differ from the API sport name
const SUBCATEGORY_TO_SPORT: Record<string, string> = {
  f1: 'formula1',
};

// Favorite type → API endpoint
const TYPE_TO_ENDPOINT: Record<string, string> = {
  league: '/leagues',
  team: '/teams',
  match: '/fixtures',
  game: '/games',
  driver: '/drivers',
  race: '/races',
  circuit: '/circuits',
  fighter: '/fighters',
  fight: '/fights',
};

/**
 * Get the API sport string from a favorites subcategory
 */
function getSport(subcategory: string): string {
  return SUBCATEGORY_TO_SPORT[subcategory] ?? subcategory;
}

/**
 * Extract a display name from a sport API response item based on the entity type
 */

function extractName(
  type: string,
  subcategory: string,
  item: any
): string | undefined {
  switch (type) {
    case 'league':
      // Football and NFL nest under .league, others have flat .name
      if (subcategory === 'football' || subcategory === 'nfl') {
        return item.league?.name;
      }
      return item.name;

    case 'team':
      // Football nests under .team, others have flat .name
      if (subcategory === 'football') {
        return item.team?.name;
      }
      return item.name;

    case 'match':
    case 'game': {
      const home = item.teams?.home?.name;
      const away = item.teams?.away?.name;
      if (home && away) return `${home} vs ${away}`;
      return home || away;
    }

    case 'driver':
    case 'circuit':
    case 'fighter':
      return item.name;

    case 'race':
      return item.competition?.name;

    case 'fight': {
      const first = item.fighters?.first?.name;
      const second = item.fighters?.second?.name;
      if (first && second) return `${first} vs ${second}`;
      return first || second;
    }

    default:
      return undefined;
  }
}

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/**
 * Hook to fetch favorites with resolved entity names
 *
 * Wraps the raw useFavorites hook from indexer_client and resolves
 * display names by fetching sport entity data via IndexerClient.getSportsData().
 *
 * @param indexerClient - IndexerClient instance
 * @param walletAddress - User's wallet address
 * @param filters - Optional filters (category, subcategory, type, etc.)
 * @returns Favorites with resolved names plus all original mutation/query methods
 *
 * @example
 * ```typescript
 * const { favorites, isLoading } = useFavorites(indexerClient, address, { category: 'sports' });
 * // favorites[0].name === 'Premier League'
 * ```
 */
export function useFavorites(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  filters?: WalletFavoritesFilters
): UseFavoritesResult {
  const favoritesResult = useFavoritesRaw(
    indexerClient,
    walletAddress,
    filters
  );

  // Build query configs for favorites that need name resolution.
  // MMA categories use itemId as the name and don't need an API call.
  const queryConfigs = useMemo(() => {
    return favoritesResult.favorites
      .filter(fav => fav.type !== 'category' && TYPE_TO_ENDPOINT[fav.type])
      .map(fav => {
        const sport = getSport(fav.subcategory);
        const endpoint = TYPE_TO_ENDPOINT[fav.type];

        return {
          queryKey: ['sports', sport, endpoint, { id: fav.itemId }],
          queryFn: () =>
            indexerClient.getSportsData(sport, endpoint, { id: fav.itemId }),
          staleTime: TWENTY_FOUR_HOURS,
          gcTime: TWENTY_FOUR_HOURS,
          retry: 1,
        };
      });
  }, [favoritesResult.favorites, indexerClient]);

  const nameQueries = useQueries({ queries: queryConfigs });

  // Build enriched favorites with resolved names
  const favoritesWithNames = useMemo<FavoriteWithName[]>(() => {
    let queryIndex = 0;

    return favoritesResult.favorites.map(fav => {
      // MMA categories: itemId is the name
      if (fav.type === 'category') {
        return { ...fav, name: fav.itemId, nameLoading: false };
      }

      // Unknown type with no endpoint
      if (!TYPE_TO_ENDPOINT[fav.type]) {
        return { ...fav, name: undefined, nameLoading: false };
      }

      const query = nameQueries[queryIndex];
      queryIndex++;

      if (!query) {
        return { ...fav, name: undefined, nameLoading: false };
      }

      const response = query.data as SportsApiResponse<unknown> | undefined;
      const items = response?.response;
      const name =
        items && items.length > 0
          ? extractName(fav.type, fav.subcategory, items[0])
          : undefined;

      return { ...fav, name, nameLoading: query.isLoading };
    });
  }, [favoritesResult.favorites, nameQueries]);

  const namesLoading = nameQueries.some(q => q.isLoading);

  return {
    favorites: favoritesWithNames,
    isLoading: favoritesResult.isLoading,
    isError: favoritesResult.isError,
    error: favoritesResult.error,
    addFavorite: (request: CreateFavoriteRequest) =>
      favoritesResult.addFavorite.mutateAsync(request),
    removeFavorite: (favoriteId: number) =>
      favoritesResult.removeFavorite.mutateAsync(favoriteId),
    addFavoritePending: favoritesResult.addFavorite.isPending,
    removeFavoritePending: favoritesResult.removeFavorite.isPending,
    refresh: favoritesResult.refresh,
    namesLoading,
  };
}
