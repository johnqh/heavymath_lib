/**
 * Hook for MMA categories (weight classes) with favorites support
 * Note: MMA categories are returned as strings from the API, not objects with numeric IDs
 */

import { useCallback, useMemo } from 'react';
import type { MmaCategoriesParams } from '@sudobility/heavymath_indexer_client';
import {
  type IndexerClient,
  useFavorites,
  useMmaCategories as useMmaCategoriesProxy,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'mma';
const FAVORITES_TYPE = 'category';

/**
 * MMA category (weight class) with favorite status
 */
export interface MmaCategoryWithFavorite {
  /** Name of the MMA weight class category */
  name: string;
  /** Whether the current user has favorited this category */
  favorited: boolean;
}

/**
 * Options for useMmaCategories hook
 */
export interface UseMmaCategoriesOptions {
  /** Optional filter parameters for the MMA categories query */
  params?: MmaCategoriesParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useMmaCategories hook
 */
export interface UseMmaCategoriesResult {
  /** Array of MMA categories with favorited flag */
  categories: MmaCategoryWithFavorite[];
  /** True if either the categories or favorites query is loading */
  isLoading: boolean;
  /** True if the categories query encountered an error */
  isError: boolean;
  /** Error from the categories query, or null */
  error: Error | null;
  /** Toggle favorite status for a category by its name (not numeric ID) */
  setFavorited: (categoryName: string, favorited: boolean) => Promise<void>;
  /** True if the favorites query specifically is loading */
  favoritesLoading: boolean;
  /** True if an addFavorite mutation is in progress */
  addFavoritePending: boolean;
  /** True if a removeFavorite mutation is in progress */
  removeFavoritePending: boolean;
}

/**
 * Hook to fetch MMA categories (weight classes) with favorite status.
 * Unlike other sports hooks, MMA categories use string names as identifiers
 * rather than numeric IDs.
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites (undefined = no favorites)
 * @param options - Query options including optional filter params
 * @returns Query result with category data including favorite status
 */
export function useMmaCategories(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseMmaCategoriesOptions
): UseMmaCategoriesResult {
  const categoriesQuery = useMmaCategoriesProxy(
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

  const categories = useMemo<MmaCategoryWithFavorite[]>(() => {
    const response = (categoriesQuery.data?.response ?? []) as string[];
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
