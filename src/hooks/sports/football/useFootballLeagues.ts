/**
 * Hook for football leagues with favorites support
 * Combines proxy hook from indexer_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import type {
  FootballLeagueResponse,
  FootballLeaguesParams,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useFavorites,
  useFootballLeagues as useFootballLeaguesProxy,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'football';
const FAVORITES_TYPE = 'league';

/**
 * Football league with favorite status
 */
export interface FootballLeagueWithFavorite extends FootballLeagueResponse {
  /** Whether the current user has favorited this league */
  favorited: boolean;
}

/**
 * Options for useFootballLeagues hook
 */
export interface UseFootballLeaguesOptions {
  /** Optional filter parameters for the football leagues query */
  params?: FootballLeaguesParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useFootballLeagues hook
 */
export interface UseFootballLeaguesResult {
  /** Array of football leagues with favorited flag */
  leagues: FootballLeagueWithFavorite[];
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
 * Hook to fetch football leagues with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites
 * @param options - Query options including optional filter params
 * @returns Query result with league data including favorite status
 *
 * @example
 * ```typescript
 * function LeagueList() {
 *   const { leagues, isLoading, setFavorited } = useFootballLeagues(
 *     indexerClient,
 *     walletAddress,
 *     { params: { country: 'England' } }
 *   );
 *
 *   return leagues.map(league => (
 *     <LeagueCard
 *       key={league.league.id}
 *       league={league}
 *       onFavorite={() => setFavorited(league.league.id, !league.favorited)}
 *     />
 *   ));
 * }
 * ```
 */
export function useFootballLeagues(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseFootballLeaguesOptions
): UseFootballLeaguesResult {
  // Fetch leagues from sports API
  const leaguesQuery = useFootballLeaguesProxy(
    indexerClient,
    options?.params as Record<string, string | number | boolean | undefined>,
    {
      enabled: options?.enabled,
    }
  );

  // Fetch favorites for football leagues
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

  // Create a set of favorited league IDs for O(1) lookup
  const favoritedIds = useMemo(() => {
    return new Set(favorites.map((f: WalletFavoriteData) => f.itemId));
  }, [favorites]);

  // Combine leagues with favorite status
  const leagues = useMemo<FootballLeagueWithFavorite[]>(() => {
    const response = (leaguesQuery.data?.response ??
      []) as FootballLeagueResponse[];
    return response.map(league => ({
      ...league,
      favorited: favoritedIds.has(String(league.league.id)),
    }));
  }, [leaguesQuery.data?.response, favoritedIds]);

  // Set favorite status for a league
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
