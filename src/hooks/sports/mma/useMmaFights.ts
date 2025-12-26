/**
 * Hook for MMA fights with favorites support
 */

import { useCallback, useMemo } from 'react';
import {
  type MmaFight,
  type MmaFightsParams,
  useMmaFights as useMmaFightsApi,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'mma';
const FAVORITES_TYPE = 'fight';

export interface MmaFightWithFavorite extends MmaFight {
  favorited: boolean;
}

export interface UseMmaFightsOptions {
  params?: MmaFightsParams;
  enabled?: boolean;
}

export interface UseMmaFightsResult {
  fights: MmaFightWithFavorite[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  setFavorited: (fightId: number, favorited: boolean) => Promise<void>;
  favoritesLoading: boolean;
  addFavoritePending: boolean;
  removeFavoritePending: boolean;
}

export function useMmaFights(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseMmaFightsOptions
): UseMmaFightsResult {
  const fightsQuery = useMmaFightsApi(options);

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

  const fights = useMemo<MmaFightWithFavorite[]>(() => {
    const response = fightsQuery.data?.response ?? [];
    return response.map(fight => ({
      ...fight,
      favorited: favoritedIds.has(String(fight.id)),
    }));
  }, [fightsQuery.data?.response, favoritedIds]);

  const setFavorited = useCallback(
    async (fightId: number, favorited: boolean) => {
      const itemId = String(fightId);
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
    fights,
    isLoading: fightsQuery.isLoading || favoritesLoading,
    isError: fightsQuery.isError,
    error: fightsQuery.error,
    setFavorited,
    favoritesLoading,
    addFavoritePending: addFavorite.isPending,
    removeFavoritePending: removeFavorite.isPending,
  };
}
