/**
 * Hook for MMA fights with favorites support
 * Combines proxy hook from indexer_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import type {
  MmaFight,
  MmaFightsParams,
} from '@sudobility/heavymath_indexer_client';
import {
  type IndexerClient,
  useFavorites,
  useMmaFights as useMmaFightsProxy,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'mma';
const FAVORITES_TYPE = 'fight';

/**
 * MMA fight with favorite status
 */
export interface MmaFightWithFavorite extends MmaFight {
  /** Whether the current user has favorited this fight */
  favorited: boolean;
}

/**
 * Options for useMmaFights hook
 */
export interface UseMmaFightsOptions {
  /** Optional filter parameters for the MMA fights query */
  params?: MmaFightsParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useMmaFights hook
 */
export interface UseMmaFightsResult {
  /** Array of MMA fights with favorited flag */
  fights: MmaFightWithFavorite[];
  /** True if either the fights or favorites query is loading */
  isLoading: boolean;
  /** True if the fights query encountered an error */
  isError: boolean;
  /** Error from the fights query, or null */
  error: Error | null;
  /** Toggle favorite status for a fight by its ID */
  setFavorited: (fightId: number, favorited: boolean) => Promise<void>;
  /** True if the favorites query specifically is loading */
  favoritesLoading: boolean;
  /** True if an addFavorite mutation is in progress */
  addFavoritePending: boolean;
  /** True if a removeFavorite mutation is in progress */
  removeFavoritePending: boolean;
}

/**
 * Hook to fetch MMA fights with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites (undefined = no favorites)
 * @param options - Query options including optional filter params
 * @returns Query result with fight data including favorite status
 */
export function useMmaFights(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseMmaFightsOptions
): UseMmaFightsResult {
  const fightsQuery = useMmaFightsProxy(
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

  const fights = useMemo<MmaFightWithFavorite[]>(() => {
    const response = (fightsQuery.data?.response ?? []) as MmaFight[];
    return response.map(fight => ({
      ...fight,
      favorited: favoritedIds.has(String(fight.id)),
    }));
  }, [fightsQuery.data?.response, favoritedIds]);

  const setFavorited = useCallback(
    async (fightId: number, favorited: boolean) => {
      const itemId = String(fightId);
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
    fights,
    isLoading: fightsQuery.isLoading || favoritesLoading,
    isError: fightsQuery.isError,
    error: fightsQuery.error,
    setFavorited,
    favoritesLoading,
    addFavoritePending: addFavorite.isPending,
    removeFavoritePending: removeFavorite.isPending,
  };
}
