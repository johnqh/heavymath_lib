/**
 * Hook for MMA fighters with favorites support
 * Combines proxy hook from indexer_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import type {
  MmaFighter,
  MmaFightersParams,
} from '@sudobility/heavymath_indexer_client';
import {
  type IndexerClient,
  useFavorites,
  useMmaFighters as useMmaFightersProxy,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'mma';
const FAVORITES_TYPE = 'fighter';

/**
 * MMA fighter with favorite status
 */
export interface MmaFighterWithFavorite extends MmaFighter {
  /** Whether the current user has favorited this fighter */
  favorited: boolean;
}

/**
 * Options for useMmaFighters hook
 */
export interface UseMmaFightersOptions {
  /** Optional filter parameters for the MMA fighters query */
  params?: MmaFightersParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useMmaFighters hook
 */
export interface UseMmaFightersResult {
  /** Array of MMA fighters with favorited flag */
  fighters: MmaFighterWithFavorite[];
  /** True if either the fighters or favorites query is loading */
  isLoading: boolean;
  /** True if the fighters query encountered an error */
  isError: boolean;
  /** Error from the fighters query, or null */
  error: Error | null;
  /** Toggle favorite status for a fighter by their ID */
  setFavorited: (fighterId: number, favorited: boolean) => Promise<void>;
  /** True if the favorites query specifically is loading */
  favoritesLoading: boolean;
  /** True if an addFavorite mutation is in progress */
  addFavoritePending: boolean;
  /** True if a removeFavorite mutation is in progress */
  removeFavoritePending: boolean;
}

/**
 * Hook to fetch MMA fighters with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites (undefined = no favorites)
 * @param options - Query options including optional filter params
 * @returns Query result with fighter data including favorite status
 */
export function useMmaFighters(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseMmaFightersOptions
): UseMmaFightersResult {
  const fightersQuery = useMmaFightersProxy(
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

  const fighters = useMemo<MmaFighterWithFavorite[]>(() => {
    const response = (fightersQuery.data?.response ?? []) as MmaFighter[];
    return response.map(fighter => ({
      ...fighter,
      favorited: favoritedIds.has(String(fighter.id)),
    }));
  }, [fightersQuery.data?.response, favoritedIds]);

  const setFavorited = useCallback(
    async (fighterId: number, favorited: boolean) => {
      const itemId = String(fighterId);
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
    fighters,
    isLoading: fightersQuery.isLoading || favoritesLoading,
    isError: fightersQuery.isError,
    error: fightersQuery.error,
    setFavorited,
    favoritesLoading,
    addFavoritePending: addFavorite.isPending,
    removeFavoritePending: removeFavorite.isPending,
  };
}
