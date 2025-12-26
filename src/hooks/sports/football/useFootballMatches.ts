/**
 * Hook for football matches (fixtures) with favorites support
 * Combines useFootballFixtures from sports_api_client with useFavorites from indexer_client
 */

import { useCallback, useMemo } from 'react';
import {
  type FootballFixtureResponse,
  type FootballFixturesParams,
  useFootballFixtures,
} from '@sudobility/sports_api_client';
import {
  type IndexerClient,
  useFavorites,
  type WalletFavoriteData,
} from '@sudobility/heavymath_indexer_client';

const FAVORITES_CATEGORY = 'sports';
const FAVORITES_SUBCATEGORY = 'football';
const FAVORITES_TYPE = 'match';

/**
 * Football match (fixture) with favorite status
 */
export interface FootballMatchWithFavorite extends FootballFixtureResponse {
  favorited: boolean;
}

/**
 * Options for useFootballMatches hook
 */
export interface UseFootballMatchesOptions {
  params?: FootballFixturesParams;
  enabled?: boolean;
}

/**
 * Return type for useFootballMatches hook
 */
export interface UseFootballMatchesResult {
  matches: FootballMatchWithFavorite[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  setFavorited: (fixtureId: number, favorited: boolean) => Promise<void>;
  favoritesLoading: boolean;
  addFavoritePending: boolean;
  removeFavoritePending: boolean;
}

/**
 * Hook to fetch football matches (fixtures) with favorite status
 *
 * @param indexerClient - IndexerClient instance for favorites operations
 * @param walletAddress - User's wallet address for favorites
 * @param options - Query options including optional filter params
 * @returns Query result with match data including favorite status
 *
 * @example
 * ```typescript
 * // Get live matches
 * function LiveMatches() {
 *   const { matches, isLoading, setFavorited } = useFootballMatches(
 *     indexerClient,
 *     walletAddress,
 *     { params: { live: 'all' } }
 *   );
 *
 *   return matches.map(match => (
 *     <MatchCard
 *       key={match.fixture.id}
 *       match={match}
 *       onFavorite={() => setFavorited(match.fixture.id, !match.favorited)}
 *     />
 *   ));
 * }
 *
 * // Get today's matches
 * function TodayMatches() {
 *   const today = new Date().toISOString().split('T')[0];
 *   const { matches } = useFootballMatches(
 *     indexerClient,
 *     walletAddress,
 *     { params: { date: today } }
 *   );
 *   // ...
 * }
 * ```
 */
export function useFootballMatches(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: UseFootballMatchesOptions
): UseFootballMatchesResult {
  // Fetch fixtures from sports API
  const fixturesQuery = useFootballFixtures(options);

  // Fetch favorites for football matches
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

  // Create a set of favorited fixture IDs for O(1) lookup
  const favoritedIds = useMemo(() => {
    return new Set(favorites.map((f: WalletFavoriteData) => f.itemId));
  }, [favorites]);

  // Combine matches with favorite status
  const matches = useMemo<FootballMatchWithFavorite[]>(() => {
    const response = fixturesQuery.data?.response ?? [];
    return response.map(fixture => ({
      ...fixture,
      favorited: favoritedIds.has(String(fixture.fixture.id)),
    }));
  }, [fixturesQuery.data?.response, favoritedIds]);

  // Set favorite status for a match
  const setFavorited = useCallback(
    async (fixtureId: number, favorited: boolean) => {
      const itemId = String(fixtureId);

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
    matches,
    isLoading: fixturesQuery.isLoading || favoritesLoading,
    isError: fixturesQuery.isError,
    error: fixturesQuery.error,
    setFavorited,
    favoritesLoading,
    addFavoritePending: addFavorite.isPending,
    removeFavoritePending: removeFavorite.isPending,
  };
}
