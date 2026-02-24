/**
 * Hook for rugby leagues with favorites support
 * Combines useRugbyLeagues from sports_api_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import {
  type RugbyLeagueResponse,
  type RugbyLeaguesParams,
  useRugbyLeagues as useRugbyLeaguesApi,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'rugby';
const FAVORITES_TYPE = 'league';

/**
 * Rugby league with favorite status
 */
export interface RugbyLeagueWithFavorite extends RugbyLeagueResponse {
  /** Whether the current user has favorited this league */
  favorited: boolean;
}

/**
 * Options for useRugbyLeagues hook
 */
export interface UseRugbyLeaguesOptions {
  /** Optional filter parameters for the rugby leagues query */
  params?: RugbyLeaguesParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useRugbyLeagues hook
 */
export interface UseRugbyLeaguesResult {
  /** Array of rugby leagues with favorited flag */
  leagues: RugbyLeagueWithFavorite[];
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
 * Hook to fetch rugby leagues with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites (undefined = no favorites)
 * @param options - Query options including optional filter params
 * @returns Query result with league data including favorite status
 */
export function useRugbyLeagues(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseRugbyLeaguesOptions
): UseRugbyLeaguesResult {
  const leaguesQuery = useRugbyLeaguesApi(options);

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

  const leagues = useMemo<RugbyLeagueWithFavorite[]>(() => {
    const response = leaguesQuery.data?.response ?? [];
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
