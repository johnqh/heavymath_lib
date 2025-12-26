/**
 * Hook for volleyball teams with favorites support
 */

import { useCallback, useMemo } from 'react';
import {
  useVolleyballTeams as useVolleyballTeamsApi,
  type VolleyballTeamResponse,
  type VolleyballTeamsParams,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'volleyball';
const FAVORITES_TYPE = 'team';

export interface VolleyballTeamWithFavorite extends VolleyballTeamResponse {
  favorited: boolean;
}

export interface UseVolleyballTeamsOptions {
  params?: VolleyballTeamsParams;
  enabled?: boolean;
}

export interface UseVolleyballTeamsResult {
  teams: VolleyballTeamWithFavorite[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  setFavorited: (teamId: number, favorited: boolean) => Promise<void>;
  favoritesLoading: boolean;
  addFavoritePending: boolean;
  removeFavoritePending: boolean;
}

export function useVolleyballTeams(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseVolleyballTeamsOptions
): UseVolleyballTeamsResult {
  const teamsQuery = useVolleyballTeamsApi(options);

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

  const teams = useMemo<VolleyballTeamWithFavorite[]>(() => {
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
