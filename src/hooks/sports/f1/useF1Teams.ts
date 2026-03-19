/**
 * Hook for F1 teams with favorites support
 * Combines proxy hook from indexer_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import type {
  F1Team,
  F1TeamsParams,
} from '@sudobility/heavymath_indexer_client';
import {
  type IndexerClient,
  useF1Teams as useF1TeamsProxy,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'f1';
const FAVORITES_TYPE = 'team';

/**
 * F1 team with favorite status
 */
export interface F1TeamWithFavorite extends F1Team {
  /** Whether the current user has favorited this team */
  favorited: boolean;
}

/**
 * Options for useF1Teams hook
 */
export interface UseF1TeamsOptions {
  /** Optional filter parameters for the F1 teams query */
  params?: F1TeamsParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useF1Teams hook
 */
export interface UseF1TeamsResult {
  /** Array of F1 teams with favorited flag */
  teams: F1TeamWithFavorite[];
  /** True if either the teams or favorites query is loading */
  isLoading: boolean;
  /** True if the teams query encountered an error */
  isError: boolean;
  /** Error from the teams query, or null */
  error: Error | null;
  /** Toggle favorite status for a team by its ID */
  setFavorited: (teamId: number, favorited: boolean) => Promise<void>;
  /** True if the favorites query specifically is loading */
  favoritesLoading: boolean;
  /** True if an addFavorite mutation is in progress */
  addFavoritePending: boolean;
  /** True if a removeFavorite mutation is in progress */
  removeFavoritePending: boolean;
}

/**
 * Hook to fetch F1 teams with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites (undefined = no favorites)
 * @param options - Query options including optional filter params
 * @returns Query result with team data including favorite status
 */
export function useF1Teams(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseF1TeamsOptions
): UseF1TeamsResult {
  const teamsQuery = useF1TeamsProxy(
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

  const teams = useMemo<F1TeamWithFavorite[]>(() => {
    const response = (teamsQuery.data?.response ?? []) as F1Team[];
    return response.map(team => ({
      ...team,
      favorited: favoritedIds.has(String(team.id)),
    }));
  }, [teamsQuery.data?.response, favoritedIds]);

  const setFavorited = useCallback(
    async (teamId: number, favorited: boolean) => {
      const itemId = String(teamId);
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
    teams,
    isLoading: teamsQuery.isLoading || favoritesLoading,
    isError: teamsQuery.isError,
    error: teamsQuery.error,
    setFavorited,
    favoritesLoading,
    addFavoritePending: addFavorite.isPending,
    removeFavoritePending: removeFavorite.isPending,
  };
}
