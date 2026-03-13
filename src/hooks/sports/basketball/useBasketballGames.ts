/**
 * Hook for basketball games with favorites support
 * Combines proxy hook from indexer_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import type {
  BasketballGame,
  BasketballGamesParams,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useBasketballGames as useBasketballGamesProxy,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'basketball';
const FAVORITES_TYPE = 'game';

/**
 * Basketball game with favorite status
 */
export interface BasketballGameWithFavorite extends BasketballGame {
  /** Whether the current user has favorited this game */
  favorited: boolean;
}

/**
 * Options for useBasketballGames hook
 */
export interface UseBasketballGamesOptions {
  /** Optional filter parameters for the basketball games query */
  params?: BasketballGamesParams;
  /** Whether the query should execute. Defaults to true */
  enabled?: boolean;
}

/**
 * Return type for useBasketballGames hook
 */
export interface UseBasketballGamesResult {
  /** Array of basketball games with favorited flag */
  games: BasketballGameWithFavorite[];
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
 * Hook to fetch basketball games with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites (undefined = no favorites)
 * @param options - Query options including optional filter params
 * @returns Query result with game data including favorite status
 *
 * @example
 * ```typescript
 * function GameList({ leagueId }: Props) {
 *   const { games, isLoading, setFavorited } = useBasketballGames(
 *     indexerClient,
 *     walletAddress,
 *     { params: { league: leagueId } }
 *   );
 *
 *   return games.map(game => (
 *     <GameCard
 *       key={game.id}
 *       game={game}
 *       onFavorite={() => setFavorited(game.id, !game.favorited)}
 *     />
 *   ));
 * }
 * ```
 */
export function useBasketballGames(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseBasketballGamesOptions
): UseBasketballGamesResult {
  const gamesQuery = useBasketballGamesProxy(
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

  const games = useMemo<BasketballGameWithFavorite[]>(() => {
    const response = (gamesQuery.data?.response ?? []) as BasketballGame[];
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
