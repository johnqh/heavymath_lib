/**
 * Hook for basketball games with favorites support
 */

import { useCallback, useMemo } from 'react';
import {
  type BasketballGame,
  type BasketballGamesParams,
  useBasketballGames as useBasketballGamesApi,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'basketball';
const FAVORITES_TYPE = 'game';

export interface BasketballGameWithFavorite extends BasketballGame {
  favorited: boolean;
}

export interface UseBasketballGamesOptions {
  params?: BasketballGamesParams;
  enabled?: boolean;
}

export interface UseBasketballGamesResult {
  games: BasketballGameWithFavorite[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  setFavorited: (gameId: number, favorited: boolean) => Promise<void>;
  favoritesLoading: boolean;
  addFavoritePending: boolean;
  removeFavoritePending: boolean;
}

export function useBasketballGames(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseBasketballGamesOptions
): UseBasketballGamesResult {
  const gamesQuery = useBasketballGamesApi(options);

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
    const response = gamesQuery.data?.response ?? [];
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
