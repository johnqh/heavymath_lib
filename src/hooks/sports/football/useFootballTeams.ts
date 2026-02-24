/**
 * Hook for football teams with favorites support
 * Combines useFootballTeams from sports_api_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import {
  type FootballTeamResponse,
  type FootballTeamsParams,
  useFootballTeams as useFootballTeamsApi,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'football';
const FAVORITES_TYPE = 'team';

/**
 * Football team with favorite status
 */
export interface FootballTeamWithFavorite extends FootballTeamResponse {
  /** Whether the current user has favorited this team */
  favorited: boolean;
}

/**
 * Options for useFootballTeams hook
 */
export interface UseFootballTeamsOptions {
  /** Required filter parameters for the football teams query (at least one filter required) */
  params: FootballTeamsParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useFootballTeams hook
 */
export interface UseFootballTeamsResult {
  /** Array of football teams with favorited flag */
  teams: FootballTeamWithFavorite[];
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
 * Hook to fetch football teams with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites
 * @param options - Query options with required params (at least one filter required)
 * @returns Query result with team data including favorite status
 *
 * @example
 * ```typescript
 * function TeamList({ leagueId, season }: Props) {
 *   const { teams, isLoading, setFavorited } = useFootballTeams(
 *     indexerClient,
 *     walletAddress,
 *     { params: { league: leagueId, season } }
 *   );
 *
 *   return teams.map(team => (
 *     <TeamCard
 *       key={team.team.id}
 *       team={team}
 *       onFavorite={() => setFavorited(team.team.id, !team.favorited)}
 *     />
 *   ));
 * }
 * ```
 */
export function useFootballTeams(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options: UseFootballTeamsOptions
): UseFootballTeamsResult {
  // Fetch teams from sports API
  const teamsQuery = useFootballTeamsApi(options);

  // Fetch favorites for football teams
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

  // Create a set of favorited team IDs for O(1) lookup
  const favoritedIds = useMemo(() => {
    return new Set(favorites.map((f: WalletFavoriteData) => f.itemId));
  }, [favorites]);

  // Combine teams with favorite status
  const teams = useMemo<FootballTeamWithFavorite[]>(() => {
    const response = teamsQuery.data?.response ?? [];
    return response.map(team => ({
      ...team,
      favorited: favoritedIds.has(String(team.team.id)),
    }));
  }, [teamsQuery.data?.response, favoritedIds]);

  // Set favorite status for a team
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
