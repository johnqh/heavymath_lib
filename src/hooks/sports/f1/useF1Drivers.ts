/**
 * Hook for F1 drivers with favorites support
 * Combines useF1Drivers from sports_api_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import {
  type F1Driver,
  type F1DriversParams,
  useF1Drivers as useF1DriversApi,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'f1';
const FAVORITES_TYPE = 'driver';

/**
 * F1 driver with favorite status
 */
export interface F1DriverWithFavorite extends F1Driver {
  /** Whether the current user has favorited this driver */
  favorited: boolean;
}

/**
 * Options for useF1Drivers hook
 */
export interface UseF1DriversOptions {
  /** Optional filter parameters for the F1 drivers query */
  params?: F1DriversParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useF1Drivers hook
 */
export interface UseF1DriversResult {
  /** Array of F1 drivers with favorited flag */
  drivers: F1DriverWithFavorite[];
  /** True if either the drivers or favorites query is loading */
  isLoading: boolean;
  /** True if the drivers query encountered an error */
  isError: boolean;
  /** Error from the drivers query, or null */
  error: Error | null;
  /** Toggle favorite status for a driver by their ID */
  setFavorited: (driverId: number, favorited: boolean) => Promise<void>;
  /** True if the favorites query specifically is loading */
  favoritesLoading: boolean;
  /** True if an addFavorite mutation is in progress */
  addFavoritePending: boolean;
  /** True if a removeFavorite mutation is in progress */
  removeFavoritePending: boolean;
}

/**
 * Hook to fetch F1 drivers with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites (undefined = no favorites)
 * @param options - Query options including optional filter params
 * @returns Query result with driver data including favorite status
 */
export function useF1Drivers(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseF1DriversOptions
): UseF1DriversResult {
  const driversQuery = useF1DriversApi(options);

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

  const drivers = useMemo<F1DriverWithFavorite[]>(() => {
    const response = driversQuery.data?.response ?? [];
    return response.map(driver => ({
      ...driver,
      favorited: favoritedIds.has(String(driver.id)),
    }));
  }, [driversQuery.data?.response, favoritedIds]);

  const setFavorited = useCallback(
    async (driverId: number, favorited: boolean) => {
      const itemId = String(driverId);
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
    drivers,
    isLoading: driversQuery.isLoading || favoritesLoading,
    isError: driversQuery.isError,
    error: driversQuery.error,
    setFavorited,
    favoritesLoading,
    addFavoritePending: addFavorite.isPending,
    removeFavoritePending: removeFavorite.isPending,
  };
}
