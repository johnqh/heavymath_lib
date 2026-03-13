/**
 * Hook for F1 races with favorites support
 * Combines proxy hook from indexer_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import type { F1Race, F1RacesParams } from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useF1Races as useF1RacesProxy,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'f1';
const FAVORITES_TYPE = 'race';

/**
 * F1 race with favorite status
 */
export interface F1RaceWithFavorite extends F1Race {
  /** Whether the current user has favorited this race */
  favorited: boolean;
}

/**
 * Options for useF1Races hook
 */
export interface UseF1RacesOptions {
  /** Optional filter parameters for the F1 races query */
  params?: F1RacesParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useF1Races hook
 */
export interface UseF1RacesResult {
  /** Array of F1 races with favorited flag */
  races: F1RaceWithFavorite[];
  /** True if either the races or favorites query is loading */
  isLoading: boolean;
  /** True if the races query encountered an error */
  isError: boolean;
  /** Error from the races query, or null */
  error: Error | null;
  /** Toggle favorite status for a race by its ID */
  setFavorited: (raceId: number, favorited: boolean) => Promise<void>;
  /** True if the favorites query specifically is loading */
  favoritesLoading: boolean;
  /** True if an addFavorite mutation is in progress */
  addFavoritePending: boolean;
  /** True if a removeFavorite mutation is in progress */
  removeFavoritePending: boolean;
}

/**
 * Hook to fetch F1 races with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites (undefined = no favorites)
 * @param options - Query options including optional filter params
 * @returns Query result with race data including favorite status
 */
export function useF1Races(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseF1RacesOptions
): UseF1RacesResult {
  const racesQuery = useF1RacesProxy(
    indexerClient,
    options?.params as Record<string, string | number | boolean | undefined>,
    {
      enabled: options?.enabled,
    }
  );

  const {
    favorites,
    isLoading: favoritesLoading,
    addFavorite,
    removeFavorite,
  } = useFavorites(indexerClient, walletAddress, {
    category: FAVORITES_CATEGORY,
    subcategory: FAVORITES_SUBCATEGORY,
    type: FAVORITES_TYPE,
  });

  const favoritedIds = useMemo(() => {
    return new Set(favorites.map((f: WalletFavoriteData) => f.itemId));
  }, [favorites]);

  const races = useMemo<F1RaceWithFavorite[]>(() => {
    const response = (racesQuery.data?.response ?? []) as F1Race[];
    return response.map(race => ({
      ...race,
      favorited: favoritedIds.has(String(race.id)),
    }));
  }, [racesQuery.data?.response, favoritedIds]);

  const setFavorited = useCallback(
    async (raceId: number, favorited: boolean) => {
      const itemId = String(raceId);
      if (favorited) {
        await addFavorite.mutateAsync({
          category: FAVORITES_CATEGORY,
          subcategory: FAVORITES_SUBCATEGORY,
          type: FAVORITES_TYPE,
          id: itemId,
        });
      } else {
        const favorite = favorites.find(
          (f: WalletFavoriteData) => f.itemId === itemId
        );
        if (favorite) {
          await removeFavorite.mutateAsync(favorite.id);
        }
      }
    },
    [addFavorite, removeFavorite, favorites]
  );

  return {
    races,
    isLoading: racesQuery.isLoading || favoritesLoading,
    isError: racesQuery.isError,
    error: racesQuery.error,
    setFavorited,
    favoritesLoading,
    addFavoritePending: addFavorite.isPending,
    removeFavoritePending: removeFavorite.isPending,
  };
}
