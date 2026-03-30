/**
 * Hook for rugby games with favorites support
 * Combines proxy hook from indexer_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import type {
  RugbyGame,
  RugbyGamesParams,
} from '@sudobility/heavymath_indexer_client';
import {
  type IndexerClient,
  useFavoriteCounts,
  useFavorites,
  useRugbyGames as useRugbyGamesProxy,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'rugby';
const FAVORITES_TYPE = 'game';

/**
 * Rugby game with favorite status
 */
export interface RugbyGameWithFavorite extends RugbyGame {
  /** Whether the current user has favorited this game */
  favorited: boolean;
  /** Number of users who have favorited this game */
  favoriteCount: number;
}

/**
 * Options for useRugbyGames hook
 */
export interface UseRugbyGamesOptions {
  /** Optional filter parameters for the rugby games query */
  params?: RugbyGamesParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useRugbyGames hook
 */
export interface UseRugbyGamesResult {
  /** Array of rugby games with favorited flag */
  games: RugbyGameWithFavorite[];
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
 * Hook to fetch rugby games with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites (undefined = no favorites)
 * @param options - Query options including optional filter params
 * @returns Query result with game data including favorite status
 */
export function useRugbyGames(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseRugbyGamesOptions
): UseRugbyGamesResult {
  const gamesQuery = useRugbyGamesProxy(
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

  const gameIds = useMemo(() => {
    const response = (gamesQuery.data?.response ?? []) as RugbyGame[];
    return response.map(game => String(game.id));
  }, [gamesQuery.data?.response]);

  const { counts } = useFavoriteCounts(
    indexerClient,
    FAVORITES_CATEGORY,
    FAVORITES_SUBCATEGORY,
    FAVORITES_TYPE,
    gameIds
  );

  const games = useMemo<RugbyGameWithFavorite[]>(() => {
    const response = (gamesQuery.data?.response ?? []) as RugbyGame[];
    return response.map(game => ({
      ...game,
      favorited: favoritedIds.has(String(game.id)),
      favoriteCount: counts[String(game.id)] ?? 0,
    }));
  }, [gamesQuery.data?.response, favoritedIds, counts]);

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
