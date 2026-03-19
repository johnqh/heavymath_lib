/**
 * Hook for basketball leagues with favorites support
 * Combines proxy hook from indexer_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import type {
  BasketballLeagueResponse,
  BasketballLeaguesParams,
} from '@sudobility/heavymath_indexer_client';
import {
  type IndexerClient,
  useBasketballLeagues as useBasketballLeaguesProxy,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'basketball';
const FAVORITES_TYPE = 'league';

/**
 * Basketball league with favorite status
 */
export interface BasketballLeagueWithFavorite extends BasketballLeagueResponse {
  /** Whether the current user has favorited this league */
  favorited: boolean;
}

/**
 * Options for useBasketballLeagues hook
 */
export interface UseBasketballLeaguesOptions {
  /** Optional filter parameters for the basketball leagues query */
  params?: BasketballLeaguesParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useBasketballLeagues hook
 */
export interface UseBasketballLeaguesResult {
  /** Array of basketball leagues with favorited flag */
  leagues: BasketballLeagueWithFavorite[];
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
 * Hook to fetch basketball leagues with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites (undefined = no favorites)
 * @param options - Query options including optional filter params
 * @returns Query result with league data including favorite status
 *
 * @example
 * ```typescript
 * function LeagueList() {
 *   const { leagues, isLoading, setFavorited } = useBasketballLeagues(
 *     indexerClient,
 *     walletAddress
 *   );
 *
 *   return leagues.map(league => (
 *     <LeagueCard
 *       key={league.id}
 *       league={league}
 *       onFavorite={() => setFavorited(league.id, !league.favorited)}
 *     />
 *   ));
 * }
 * ```
 */
export function useBasketballLeagues(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseBasketballLeaguesOptions
): UseBasketballLeaguesResult {
  const leaguesQuery = useBasketballLeaguesProxy(
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

  const leagues = useMemo<BasketballLeagueWithFavorite[]>(() => {
    const response = (leaguesQuery.data?.response ??
      []) as BasketballLeagueResponse[];
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
