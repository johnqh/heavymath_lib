import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQueries } from '@tanstack/react-query';
import { createElement } from 'react';
import { useFavorites } from '../useFavorites';

vi.mock('@sudobility/heavymath_indexer_client', () => ({
  useFavorites: vi.fn(),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueries: vi.fn(),
  };
});

import { useFavorites as useFavoritesRaw } from '@sudobility/heavymath_indexer_client';

const mockUseFavoritesRaw = vi.mocked(useFavoritesRaw);
const mockUseQueries = vi.mocked(useQueries);

const mockIndexerClient = {} as any;
const mockWalletAddress = '0x1234567890abcdef';

const baseFavoritesResult = {
  favorites: [],
  query: {} as any,
  isLoading: false,
  isError: false,
  error: null,
  addFavorite: { mutateAsync: vi.fn(), isPending: false } as any,
  removeFavorite: { mutateAsync: vi.fn(), isPending: false } as any,
  refresh: vi.fn(),
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useFavorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFavoritesRaw.mockReturnValue({ ...baseFavoritesResult });
    mockUseQueries.mockReturnValue([]);
  });

  it('should resolve football league name from nested league.name', () => {
    mockUseFavoritesRaw.mockReturnValue({
      ...baseFavoritesResult,
      favorites: [
        { id: 1, itemId: '39', category: 'sports', subcategory: 'football', type: 'league', walletAddress: mockWalletAddress, createdAt: BigInt(0) },
      ],
    });

    mockUseQueries.mockReturnValue([
      {
        data: { response: [{ league: { id: 39, name: 'Premier League', logo: '' }, country: { name: 'England' } }] },
        isLoading: false,
      },
    ] as any);

    const { result } = renderHook(
      () => useFavorites(mockIndexerClient, mockWalletAddress, { category: 'sports' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].name).toBe('Premier League');
    expect(result.current.favorites[0].nameLoading).toBe(false);
  });

  it('should resolve basketball team name from flat name', () => {
    mockUseFavoritesRaw.mockReturnValue({
      ...baseFavoritesResult,
      favorites: [
        { id: 2, itemId: '42', category: 'sports', subcategory: 'basketball', type: 'team', walletAddress: mockWalletAddress, createdAt: BigInt(0) },
      ],
    });

    mockUseQueries.mockReturnValue([
      {
        data: { response: [{ id: 42, name: 'LA Lakers', logo: '' }] },
        isLoading: false,
      },
    ] as any);

    const { result } = renderHook(
      () => useFavorites(mockIndexerClient, mockWalletAddress, { category: 'sports' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.favorites[0].name).toBe('LA Lakers');
  });

  it('should resolve game name as "Home vs Away"', () => {
    mockUseFavoritesRaw.mockReturnValue({
      ...baseFavoritesResult,
      favorites: [
        { id: 3, itemId: '100', category: 'sports', subcategory: 'basketball', type: 'game', walletAddress: mockWalletAddress, createdAt: BigInt(0) },
      ],
    });

    mockUseQueries.mockReturnValue([
      {
        data: { response: [{ teams: { home: { name: 'Celtics' }, away: { name: 'Heat' } } }] },
        isLoading: false,
      },
    ] as any);

    const { result } = renderHook(
      () => useFavorites(mockIndexerClient, mockWalletAddress, { category: 'sports' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.favorites[0].name).toBe('Celtics vs Heat');
  });

  it('should use itemId as name for MMA categories without API call', () => {
    mockUseFavoritesRaw.mockReturnValue({
      ...baseFavoritesResult,
      favorites: [
        { id: 4, itemId: 'Middleweight', category: 'sports', subcategory: 'mma', type: 'category', walletAddress: mockWalletAddress, createdAt: BigInt(0) },
      ],
    });

    mockUseQueries.mockReturnValue([] as any);

    const { result } = renderHook(
      () => useFavorites(mockIndexerClient, mockWalletAddress, { category: 'sports' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.favorites[0].name).toBe('Middleweight');
    expect(result.current.favorites[0].nameLoading).toBe(false);
  });

  it('should return undefined name when API returns empty response', () => {
    mockUseFavoritesRaw.mockReturnValue({
      ...baseFavoritesResult,
      favorites: [
        { id: 5, itemId: '999', category: 'sports', subcategory: 'football', type: 'league', walletAddress: mockWalletAddress, createdAt: BigInt(0) },
      ],
    });

    mockUseQueries.mockReturnValue([
      {
        data: { response: [] },
        isLoading: false,
      },
    ] as any);

    const { result } = renderHook(
      () => useFavorites(mockIndexerClient, mockWalletAddress, { category: 'sports' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.favorites[0].name).toBeUndefined();
  });

  it('should set nameLoading true while queries are loading', () => {
    mockUseFavoritesRaw.mockReturnValue({
      ...baseFavoritesResult,
      favorites: [
        { id: 6, itemId: '39', category: 'sports', subcategory: 'football', type: 'league', walletAddress: mockWalletAddress, createdAt: BigInt(0) },
      ],
    });

    mockUseQueries.mockReturnValue([
      {
        data: undefined,
        isLoading: true,
      },
    ] as any);

    const { result } = renderHook(
      () => useFavorites(mockIndexerClient, mockWalletAddress, { category: 'sports' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.favorites[0].nameLoading).toBe(true);
    expect(result.current.namesLoading).toBe(true);
  });

  it('should pass through addFavorite, removeFavorite, and refresh', () => {
    const mockRefresh = vi.fn();
    const mockAddMutateAsync = vi.fn();
    const mockRemoveMutateAsync = vi.fn();

    mockUseFavoritesRaw.mockReturnValue({
      ...baseFavoritesResult,
      addFavorite: { mutateAsync: mockAddMutateAsync, isPending: true } as any,
      removeFavorite: { mutateAsync: mockRemoveMutateAsync, isPending: false } as any,
      refresh: mockRefresh,
    });

    const { result } = renderHook(
      () => useFavorites(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() },
    );

    expect(result.current.refresh).toBe(mockRefresh);
    expect(result.current.addFavoritePending).toBe(true);
    expect(result.current.removeFavoritePending).toBe(false);

    // Verify addFavorite delegates to mutateAsync
    const request = { category: 'sports', subcategory: 'football', type: 'league', id: '39' };
    result.current.addFavorite(request);
    expect(mockAddMutateAsync).toHaveBeenCalledWith(request);

    // Verify removeFavorite delegates to mutateAsync
    result.current.removeFavorite(1);
    expect(mockRemoveMutateAsync).toHaveBeenCalledWith(1);
  });

  it('should use formula1 sport string for f1 subcategory', () => {
    mockUseFavoritesRaw.mockReturnValue({
      ...baseFavoritesResult,
      favorites: [
        { id: 7, itemId: '1', category: 'sports', subcategory: 'f1', type: 'driver', walletAddress: mockWalletAddress, createdAt: BigInt(0) },
      ],
    });

    mockUseQueries.mockReturnValue([
      {
        data: { response: [{ id: 1, name: 'Max Verstappen' }] },
        isLoading: false,
      },
    ] as any);

    const { result } = renderHook(
      () => useFavorites(mockIndexerClient, mockWalletAddress, { category: 'sports' }),
      { wrapper: createWrapper() },
    );

    // Verify the query config was built with 'formula1'
    const queriesCall = mockUseQueries.mock.calls[0][0] as any;
    expect(queriesCall.queries[0].queryKey).toEqual(['sports', 'formula1', '/drivers', { id: '1' }]);
    expect(result.current.favorites[0].name).toBe('Max Verstappen');
  });

  it('should resolve NFL league name from nested league.name', () => {
    mockUseFavoritesRaw.mockReturnValue({
      ...baseFavoritesResult,
      favorites: [
        { id: 8, itemId: '1', category: 'sports', subcategory: 'nfl', type: 'league', walletAddress: mockWalletAddress, createdAt: BigInt(0) },
      ],
    });

    mockUseQueries.mockReturnValue([
      {
        data: { response: [{ league: { id: 1, name: 'NFL', logo: '' }, country: { name: 'USA' } }] },
        isLoading: false,
      },
    ] as any);

    const { result } = renderHook(
      () => useFavorites(mockIndexerClient, mockWalletAddress, { category: 'sports' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.favorites[0].name).toBe('NFL');
  });

  it('should resolve football team name from nested team.name', () => {
    mockUseFavoritesRaw.mockReturnValue({
      ...baseFavoritesResult,
      favorites: [
        { id: 9, itemId: '33', category: 'sports', subcategory: 'football', type: 'team', walletAddress: mockWalletAddress, createdAt: BigInt(0) },
      ],
    });

    mockUseQueries.mockReturnValue([
      {
        data: { response: [{ team: { id: 33, name: 'Manchester United', logo: '' } }] },
        isLoading: false,
      },
    ] as any);

    const { result } = renderHook(
      () => useFavorites(mockIndexerClient, mockWalletAddress, { category: 'sports' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.favorites[0].name).toBe('Manchester United');
  });

  it('should resolve MMA fight as "Fighter1 vs Fighter2"', () => {
    mockUseFavoritesRaw.mockReturnValue({
      ...baseFavoritesResult,
      favorites: [
        { id: 10, itemId: '50', category: 'sports', subcategory: 'mma', type: 'fight', walletAddress: mockWalletAddress, createdAt: BigInt(0) },
      ],
    });

    mockUseQueries.mockReturnValue([
      {
        data: { response: [{ fighters: { first: { name: 'Jon Jones' }, second: { name: 'Stipe Miocic' } } }] },
        isLoading: false,
      },
    ] as any);

    const { result } = renderHook(
      () => useFavorites(mockIndexerClient, mockWalletAddress, { category: 'sports' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.favorites[0].name).toBe('Jon Jones vs Stipe Miocic');
  });

  it('should resolve F1 race from competition.name', () => {
    mockUseFavoritesRaw.mockReturnValue({
      ...baseFavoritesResult,
      favorites: [
        { id: 11, itemId: '10', category: 'sports', subcategory: 'f1', type: 'race', walletAddress: mockWalletAddress, createdAt: BigInt(0) },
      ],
    });

    mockUseQueries.mockReturnValue([
      {
        data: { response: [{ competition: { name: 'Monaco Grand Prix' }, circuit: { name: 'Circuit de Monaco' } }] },
        isLoading: false,
      },
    ] as any);

    const { result } = renderHook(
      () => useFavorites(mockIndexerClient, mockWalletAddress, { category: 'sports' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.favorites[0].name).toBe('Monaco Grand Prix');
  });
});
