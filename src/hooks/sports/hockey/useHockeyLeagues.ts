/**
 * Hook for hockey leagues with favorites support
 * Combines proxy hook from indexer_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import type {
  HockeyLeagueResponse,
  HockeyLeaguesParams,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useFavorites,
  useHockeyLeagues as useHockeyLeaguesProxy,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'hockey';
const FAVORITES_TYPE = 'league';

/**
 * Hockey league with favorite status
 */
export interface HockeyLeagueWithFavorite extends HockeyLeagueResponse {
  /** Whether the current user has favorited this league */
  favorited: boolean;
}

/**
 * Options for useHockeyLeagues hook
 */
export interface UseHockeyLeaguesOptions {
  /** Optional filter parameters for the hockey leagues query */
  params?: HockeyLeaguesParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useHockeyLeagues hook
 */
export interface UseHockeyLeaguesResult {
  /** Array of hockey leagues with favorited flag */
  leagues: HockeyLeagueWithFavorite[];
  /** True if either the leagues or favorites query is loading */
  isLoading: boolean;
  /** True if the leagues query encountered an error */
  isError: boolean;
  /** Error from the leagues query, or null */
  error: Error | null;
  /** Toggle favorite status for a league by its ID */
  setFavorited: (leagueId: number, favorited: boolean) => Promise<void>;
  /** True if the favorites query specifically is loading */
  favoritesLoading: boolean;
  /** True if an addFavorite mutation is in progress */
  addFavoritePending: boolean;
  /** True if a removeFavorite mutation is in progress */
  removeFavoritePending: boolean;
}

/**
 * Hook to fetch hockey leagues with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites (undefined = no favorites)
 * @param options - Query options including optional filter params
 * @returns Query result with league data including favorite status
 */
export function useHockeyLeagues(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseHockeyLeaguesOptions
): UseHockeyLeaguesResult {
  const leaguesQuery = useHockeyLeaguesProxy(
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

  const leagues = useMemo<HockeyLeagueWithFavorite[]>(() => {
    const response = (leaguesQuery.data?.response ??
      []) as HockeyLeagueResponse[];
    return response.map(league => ({
      ...league,
      favorited: favoritedIds.has(String(league.id)),
    }));
  }, [leaguesQuery.data?.response, favoritedIds]);

  const setFavorited = useCallback(
    async (leagueId: number, favorited: boolean) => {
      const itemId = String(leagueId);
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
    leagues,
    isLoading: leaguesQuery.isLoading || favoritesLoading,
    isError: leaguesQuery.isError,
    error: leaguesQuery.error,
    setFavorited,
    favoritesLoading,
    addFavoritePending: addFavorite.isPending,
    removeFavoritePending: removeFavorite.isPending,
  };
}
