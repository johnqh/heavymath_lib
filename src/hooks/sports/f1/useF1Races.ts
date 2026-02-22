/**
 * Hook for F1 races with favorites support
 */

import { useCallback, useMemo } from 'react';
import {
  type F1Race,
  type F1RacesParams,
  useF1Races as useF1RacesApi,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'f1';
const FAVORITES_TYPE = 'race';

export interface F1RaceWithFavorite extends F1Race {
  favorited: boolean;
}

export interface UseF1RacesOptions {
  params?: F1RacesParams;
  enabled?: boolean;
}

export interface UseF1RacesResult {
  races: F1RaceWithFavorite[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  setFavorited: (raceId: number, favorited: boolean) => Promise<void>;
  favoritesLoading: boolean;
  addFavoritePending: boolean;
  removeFavoritePending: boolean;
}

export function useF1Races(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseF1RacesOptions
): UseF1RacesResult {
  const racesQuery = useF1RacesApi(options);

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

  const races = useMemo<F1RaceWithFavorite[]>(() => {
    const response = racesQuery.data?.response ?? [];
    return response.map(race => ({
      ...race,
      favorited: favoritedIds.has(String(race.id)),
    }));
  }, [racesQuery.data?.response, favoritedIds]);

  const setFavorited = useCallback(
    async (raceId: number, favorited: boolean) => {
      const itemId = String(raceId);
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
    races,
    isLoading: racesQuery.isLoading || favoritesLoading,
    isError: racesQuery.isError,
    error: racesQuery.error,
    setFavorited,
    favoritesLoading,
    addFavoritePending: addFavorite.isPending,
    removeFavoritePending: removeFavorite.isPending,
  };
}
