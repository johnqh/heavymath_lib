/**
 * Hook for MMA fighters with favorites support
 */

import { useCallback, useMemo } from 'react';
import {
  type MmaFighter,
  type MmaFightersParams,
  useMmaFighters as useMmaFightersApi,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'mma';
const FAVORITES_TYPE = 'fighter';

export interface MmaFighterWithFavorite extends MmaFighter {
  favorited: boolean;
}

export interface UseMmaFightersOptions {
  params?: MmaFightersParams;
  enabled?: boolean;
}

export interface UseMmaFightersResult {
  fighters: MmaFighterWithFavorite[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  setFavorited: (fighterId: number, favorited: boolean) => Promise<void>;
  favoritesLoading: boolean;
  addFavoritePending: boolean;
  removeFavoritePending: boolean;
}

export function useMmaFighters(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseMmaFightersOptions
): UseMmaFightersResult {
  const fightersQuery = useMmaFightersApi(options);

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

  const fighters = useMemo<MmaFighterWithFavorite[]>(() => {
    const response = fightersQuery.data?.response ?? [];
    return response.map(fighter => ({
      ...fighter,
      favorited: favoritedIds.has(String(fighter.id)),
    }));
  }, [fightersQuery.data?.response, favoritedIds]);

  const setFavorited = useCallback(
    async (fighterId: number, favorited: boolean) => {
      const itemId = String(fighterId);
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
    fighters,
    isLoading: fightersQuery.isLoading || favoritesLoading,
    isError: fightersQuery.isError,
    error: fightersQuery.error,
    setFavorited,
    favoritesLoading,
    addFavoritePending: addFavorite.isPending,
    removeFavoritePending: removeFavorite.isPending,
  };
}
