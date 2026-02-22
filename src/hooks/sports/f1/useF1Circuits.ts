/**
 * Hook for F1 circuits with favorites support
 */

import { useCallback, useMemo } from 'react';
import {
  type F1Circuit,
  type F1CircuitsParams,
  useF1Circuits as useF1CircuitsApi,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'f1';
const FAVORITES_TYPE = 'circuit';

export interface F1CircuitWithFavorite extends F1Circuit {
  favorited: boolean;
}

export interface UseF1CircuitsOptions {
  params?: F1CircuitsParams;
  enabled?: boolean;
}

export interface UseF1CircuitsResult {
  circuits: F1CircuitWithFavorite[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  setFavorited: (circuitId: number, favorited: boolean) => Promise<void>;
  favoritesLoading: boolean;
  addFavoritePending: boolean;
  removeFavoritePending: boolean;
}

export function useF1Circuits(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseF1CircuitsOptions
): UseF1CircuitsResult {
  const circuitsQuery = useF1CircuitsApi(options);

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

  const circuits = useMemo<F1CircuitWithFavorite[]>(() => {
    const response = circuitsQuery.data?.response ?? [];
    return response.map(circuit => ({
      ...circuit,
      favorited: favoritedIds.has(String(circuit.id)),
    }));
  }, [circuitsQuery.data?.response, favoritedIds]);

  const setFavorited = useCallback(
    async (circuitId: number, favorited: boolean) => {
      const itemId = String(circuitId);
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
    circuits,
    isLoading: circuitsQuery.isLoading || favoritesLoading,
    isError: circuitsQuery.isError,
    error: circuitsQuery.error,
    setFavorited,
    favoritesLoading,
    addFavoritePending: addFavorite.isPending,
    removeFavoritePending: removeFavorite.isPending,
  };
}
