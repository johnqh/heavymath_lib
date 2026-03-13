/**
 * Hook for basketball teams with favorites support
 * Combines proxy hook from indexer_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import type {
  BasketballTeamResponse,
  BasketballTeamsParams,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useBasketballTeams as useBasketballTeamsProxy,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'basketball';
const FAVORITES_TYPE = 'team';

/**
 * Basketball team with favorite status
 */
export interface BasketballTeamWithFavorite extends BasketballTeamResponse {
  /** Whether the current user has favorited this team */
  favorited: boolean;
}

/**
 * Options for useBasketballTeams hook
 */
export interface UseBasketballTeamsOptions {
  /** Optional filter parameters for the basketball teams query */
  params?: BasketballTeamsParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useBasketballTeams hook
 */
export interface UseBasketballTeamsResult {
  /** Array of basketball teams with favorited flag */
  teams: BasketballTeamWithFavorite[];
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
 * Hook to fetch basketball teams with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites (undefined = no favorites)
 * @param options - Query options including optional filter params
 * @returns Query result with team data including favorite status
 *
 * @example
 * ```typescript
 * function TeamList({ leagueId }: Props) {
 *   const { teams, isLoading, setFavorited } = useBasketballTeams(
 *     indexerClient,
 *     walletAddress,
 *     { params: { league: leagueId } }
 *   );
 *
 *   return teams.map(team => (
 *     <TeamCard
 *       key={team.id}
 *       team={team}
 *       onFavorite={() => setFavorited(team.id, !team.favorited)}
 *     />
 *   ));
 * }
 * ```
 */
export function useBasketballTeams(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseBasketballTeamsOptions
): UseBasketballTeamsResult {
  const teamsQuery = useBasketballTeamsProxy(
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

  const teams = useMemo<BasketballTeamWithFavorite[]>(() => {
    const response = (teamsQuery.data?.response ??
      []) as BasketballTeamResponse[];
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
