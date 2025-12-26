/**
 * Hook for MMA categories (weight classes) with favorites support
 * Note: MMA categories are returned as strings from the API
 */

import { useCallback, useMemo } from 'react';
import {
  type MmaCategoriesParams,
  useMmaCategories as useMmaCategoriesApi,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'mma';
const FAVORITES_TYPE = 'category';

export interface MmaCategoryWithFavorite {
  name: string;
  favorited: boolean;
}

export interface UseMmaCategoriesOptions {
  params?: MmaCategoriesParams;
  enabled?: boolean;
}

export interface UseMmaCategoriesResult {
  categories: MmaCategoryWithFavorite[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  setFavorited: (categoryName: string, favorited: boolean) => Promise<void>;
  favoritesLoading: boolean;
  addFavoritePending: boolean;
  removeFavoritePending: boolean;
}

export function useMmaCategories(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseMmaCategoriesOptions
): UseMmaCategoriesResult {
  const categoriesQuery = useMmaCategoriesApi(options);

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

  const categories = useMemo<MmaCategoryWithFavorite[]>(() => {
    const response = categoriesQuery.data?.response ?? [];
    return response.map(categoryName => ({
      name: categoryName,
      favorited: favoritedIds.has(categoryName),
    }));
  }, [categoriesQuery.data?.response, favoritedIds]);

  const setFavorited = useCallback(
    async (categoryName: string, favorited: boolean) => {
      if (favorited) {
        await addFavorite.mutateAsync({
          category: FAVORITES_CATEGORY,
          subcategory: FAVORITES_SUBCATEGORY,
          type: FAVORITES_TYPE,
          id: categoryName,
        });
      } else {
        const favorite = favorites.find(f => f.itemId === categoryName);
        if (favorite) {
          await removeFavorite.mutateAsync(favorite.id);
        }
      }
    },
    [addFavorite, removeFavorite, favorites]
  );

  return {
    categories,
    isLoading: categoriesQuery.isLoading || favoritesLoading,
    isError: categoriesQuery.isError,
    error: categoriesQuery.error,
    setFavorited,
    favoritesLoading,
    addFavoritePending: addFavorite.isPending,
    removeFavoritePending: removeFavorite.isPending,
  };
}
