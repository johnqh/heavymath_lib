/**
 * Hook for F1 circuits with favorites support
 * Combines useF1Circuits from sports_api_client with useFavorites from indexer_client
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

/**
 * F1 circuit with favorite status
 */
export interface F1CircuitWithFavorite extends F1Circuit {
  /** Whether the current user has favorited this circuit */
  favorited: boolean;
}

/**
 * Options for useF1Circuits hook
 */
export interface UseF1CircuitsOptions {
  /** Optional filter parameters for the F1 circuits query */
  params?: F1CircuitsParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useF1Circuits hook
 */
export interface UseF1CircuitsResult {
  /** Array of F1 circuits with favorited flag */
  circuits: F1CircuitWithFavorite[];
  /** True if either the circuits or favorites query is loading */
  isLoading: boolean;
  /** True if the circuits query encountered an error */
  isError: boolean;
  /** Error from the circuits query, or null */
  error: Error | null;
  /** Toggle favorite status for a circuit by its ID */
  setFavorited: (circuitId: number, favorited: boolean) => Promise<void>;
  /** True if the favorites query specifically is loading */
  favoritesLoading: boolean;
  /** True if an addFavorite mutation is in progress */
  addFavoritePending: boolean;
  /** True if a removeFavorite mutation is in progress */
  removeFavoritePending: boolean;
}

/**
 * Hook to fetch F1 circuits with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites (undefined = no favorites)
 * @param options - Query options including optional filter params
 * @returns Query result with circuit data including favorite status
 */
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
