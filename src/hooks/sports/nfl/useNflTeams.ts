/**
 * Hook for NFL teams with favorites support
 * Combines useNflTeams from sports_api_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import {
  type NflTeamResponse,
  type NflTeamsParams,
  useNflTeams as useNflTeamsApi,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'nfl';
const FAVORITES_TYPE = 'team';

/**
 * NFL team with favorite status
 */
export interface NflTeamWithFavorite extends NflTeamResponse {
  /** Whether the current user has favorited this team */
  favorited: boolean;
}

/**
 * Options for useNflTeams hook
 */
export interface UseNflTeamsOptions {
  /** Optional filter parameters for the NFL teams query */
  params?: NflTeamsParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useNflTeams hook
 */
export interface UseNflTeamsResult {
  /** Array of NFL teams with favorited flag */
  teams: NflTeamWithFavorite[];
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
 * Hook to fetch NFL teams with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites (undefined = no favorites)
 * @param options - Query options including optional filter params
 * @returns Query result with team data including favorite status
 */
export function useNflTeams(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseNflTeamsOptions
): UseNflTeamsResult {
  const teamsQuery = useNflTeamsApi(options);

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

  const teams = useMemo<NflTeamWithFavorite[]>(() => {
    const response = teamsQuery.data?.response ?? [];
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
