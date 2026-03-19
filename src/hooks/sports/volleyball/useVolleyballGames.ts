/**
 * Hook for volleyball games with favorites support
 * Combines proxy hook from indexer_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import type {
  VolleyballGame,
  VolleyballGamesParams,
} from '@sudobility/heavymath_indexer_client';
import {
  type IndexerClient,
  useFavorites,
  useVolleyballGames as useVolleyballGamesProxy,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'volleyball';
const FAVORITES_TYPE = 'game';

/**
 * Volleyball game with favorite status
 */
export interface VolleyballGameWithFavorite extends VolleyballGame {
  /** Whether the current user has favorited this game */
  favorited: boolean;
}

/**
 * Options for useVolleyballGames hook
 */
export interface UseVolleyballGamesOptions {
  /** Optional filter parameters for the volleyball games query */
  params?: VolleyballGamesParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useVolleyballGames hook
 */
export interface UseVolleyballGamesResult {
  /** Array of volleyball games with favorited flag */
  games: VolleyballGameWithFavorite[];
  /** True if either the games or favorites query is loading */
  isLoading: boolean;
  /** True if the games query encountered an error */
  isError: boolean;
  /** Error from the games query, or null */
  error: Error | null;
  /** Toggle favorite status for a game by its ID */
  setFavorited: (gameId: number, favorited: boolean) => Promise<void>;
  /** True if the favorites query specifically is loading */
  favoritesLoading: boolean;
  /** True if an addFavorite mutation is in progress */
  addFavoritePending: boolean;
  /** True if a removeFavorite mutation is in progress */
  removeFavoritePending: boolean;
}

/**
 * Hook to fetch volleyball games with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites (undefined = no favorites)
 * @param options - Query options including optional filter params
 * @returns Query result with game data including favorite status
 */
export function useVolleyballGames(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseVolleyballGamesOptions
): UseVolleyballGamesResult {
  const gamesQuery = useVolleyballGamesProxy(
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

  const games = useMemo<VolleyballGameWithFavorite[]>(() => {
    const response = (gamesQuery.data?.response ?? []) as VolleyballGame[];
    return response.map(game => ({
      ...game,
      favorited: favoritedIds.has(String(game.id)),
    }));
  }, [gamesQuery.data?.response, favoritedIds]);

  const setFavorited = useCallback(
    async (gameId: number, favorited: boolean) => {
      const itemId = String(gameId);
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
    games,
    isLoading: gamesQuery.isLoading || favoritesLoading,
    isError: gamesQuery.isError,
    error: gamesQuery.error,
    setFavorited,
    favoritesLoading,
    addFavoritePending: addFavorite.isPending,
    removeFavoritePending: removeFavorite.isPending,
  };
}
