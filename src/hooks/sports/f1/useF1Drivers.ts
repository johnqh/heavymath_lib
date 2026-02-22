/**
 * Hook for F1 drivers with favorites support
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

export interface F1DriverWithFavorite extends F1Driver {
  favorited: boolean;
}

export interface UseF1DriversOptions {
  params?: F1DriversParams;
  enabled?: boolean;
}

export interface UseF1DriversResult {
  drivers: F1DriverWithFavorite[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  setFavorited: (driverId: number, favorited: boolean) => Promise<void>;
  favoritesLoading: boolean;
  addFavoritePending: boolean;
  removeFavoritePending: boolean;
}

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
