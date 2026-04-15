/**
 * Hook for rugby leagues with favorites support
 * Combines proxy hook from indexer_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import type {
  RugbyLeagueResponse,
  RugbyLeaguesParams,
  RugbySeason,
} from '@sudobility/heavymath_indexer_client';
import {
  type IndexerClient,
  useFavoriteCounts,
  useFavorites,
  useRugbyLeagues as useRugbyLeaguesProxy,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';
import { getLatestSeason, getSeasonData } from '../utils/seasons';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'rugby';
const FAVORITES_TYPE = 'league';

/**
 * Rugby league with favorite status
 */
export interface RugbyLeagueWithFavorite extends RugbyLeagueResponse {
  /** Whether the current user has favorited this league */
  favorited: boolean;
  /** Number of users who have favorited this league */
  favoriteCount: number;
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
  /** First matching competition when querying a specific league */
  competition: RugbyLeagueWithFavorite | null;
  /** Available seasons for the first matching competition */
  seasons: RugbySeason[];
  /** Latest available season for the first matching competition */
  latestSeason: RugbySeason | null;
  /** Look up season metadata for the first matching competition */
  getSeasonData: (season: number | string) => RugbySeason | undefined;
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
  const leaguesQuery = useRugbyLeaguesProxy(
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

  const leagueIds = useMemo(() => {
    const response = (leaguesQuery.data?.response ??
      []) as RugbyLeagueResponse[];
    return response.map(league => String(league.id));
  }, [leaguesQuery.data?.response]);

  const { counts } = useFavoriteCounts(
    indexerClient,
    FAVORITES_CATEGORY,
    FAVORITES_SUBCATEGORY,
    FAVORITES_TYPE,
    leagueIds
  );

  const leagues = useMemo<RugbyLeagueWithFavorite[]>(() => {
    const response = (leaguesQuery.data?.response ??
      []) as RugbyLeagueResponse[];
    return response.map(league => ({
      ...league,
      favorited: favoritedIds.has(String(league.id)),
      favoriteCount: counts[String(league.id)] ?? 0,
    }));
  }, [leaguesQuery.data?.response, favoritedIds, counts]);

  const competition = useMemo(() => leagues[0] ?? null, [leagues]);
  const seasons = useMemo(() => competition?.seasons ?? [], [competition]);
  const latestSeason = useMemo(
    () => getLatestSeason(seasons, season => season.season),
    [seasons]
  );

  const lookupSeasonData = useCallback(
    (season: number | string) =>
      getSeasonData(seasons, season, item => item.season),
    [seasons]
  );

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
    competition,
    seasons,
    latestSeason,
    getSeasonData: lookupSeasonData,
    isLoading: leaguesQuery.isLoading || favoritesLoading,
    isError: leaguesQuery.isError,
    error: leaguesQuery.error,
    setFavorited,
    favoritesLoading,
    addFavoritePending: addFavorite.isPending,
    removeFavoritePending: removeFavorite.isPending,
  };
}
