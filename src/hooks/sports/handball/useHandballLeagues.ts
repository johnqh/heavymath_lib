/**
 * Hook for handball leagues with favorites support
 */

import { useCallback, useMemo } from 'react';
import {
  type HandballLeagueResponse,
  type HandballLeaguesParams,
  useHandballLeagues as useHandballLeaguesApi,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'handball';
const FAVORITES_TYPE = 'league';

export interface HandballLeagueWithFavorite extends HandballLeagueResponse {
  favorited: boolean;
}

export interface UseHandballLeaguesOptions {
  params?: HandballLeaguesParams;
  enabled?: boolean;
}

export interface UseHandballLeaguesResult {
  leagues: HandballLeagueWithFavorite[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  setFavorited: (leagueId: number, favorited: boolean) => Promise<void>;
  favoritesLoading: boolean;
  addFavoritePending: boolean;
  removeFavoritePending: boolean;
}

export function useHandballLeagues(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseHandballLeaguesOptions
): UseHandballLeaguesResult {
  const leaguesQuery = useHandballLeaguesApi(options);

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

  const leagues = useMemo<HandballLeagueWithFavorite[]>(() => {
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
