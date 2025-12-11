import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useFootballMatches } from '../useFootballMatches';

// Mock the sports_api_client
vi.mock('@sudobility/sports_api_client', () => ({
  useFootballFixtures: vi.fn(),
}));

// Mock the indexer_client
vi.mock('@heavymath/indexer_client', () => ({
  useFavorites: vi.fn(),
}));

import { useFootballFixtures } from '@sudobility/sports_api_client';
import { useFavorites } from '@heavymath/indexer_client';

const mockUseFootballFixtures = vi.mocked(useFootballFixtures);
const mockUseFavorites = vi.mocked(useFavorites);

// Mock data
const mockFixtures = [
  {
    fixture: {
      id: 1001,
      referee: 'John Smith',
      timezone: 'UTC',
      date: '2024-01-15T15:00:00+00:00',
      timestamp: 1705330800,
      periods: { first: 1705330800, second: 1705334400 },
      venue: { id: 556, name: 'Old Trafford', city: 'Manchester' },
      status: { long: 'Match Finished', short: 'FT', elapsed: 90 },
    },
    league: {
      id: 39,
      name: 'Premier League',
      country: 'England',
      logo: '',
      flag: '',
      season: 2023,
      round: 'Regular Season - 21',
    },
    teams: {
      home: { id: 33, name: 'Manchester United', logo: '', winner: true },
      away: { id: 34, name: 'Newcastle', logo: '', winner: false },
    },
    goals: { home: 2, away: 1 },
    score: {
      halftime: { home: 1, away: 0 },
      fulltime: { home: 2, away: 1 },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
  },
  {
    fixture: {
      id: 1002,
      referee: 'Jane Doe',
      timezone: 'UTC',
      date: '2024-01-15T17:30:00+00:00',
      timestamp: 1705339800,
      periods: { first: 1705339800, second: 1705343400 },
      venue: { id: 550, name: 'Anfield', city: 'Liverpool' },
      status: { long: 'Match Finished', short: 'FT', elapsed: 90 },
    },
    league: {
      id: 39,
      name: 'Premier League',
      country: 'England',
      logo: '',
      flag: '',
      season: 2023,
      round: 'Regular Season - 21',
    },
    teams: {
      home: { id: 40, name: 'Liverpool', logo: '', winner: true },
      away: { id: 50, name: 'Arsenal', logo: '', winner: false },
    },
    goals: { home: 3, away: 2 },
    score: {
      halftime: { home: 2, away: 1 },
      fulltime: { home: 3, away: 2 },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
  },
];

const mockFavorites = [
  {
    id: 1,
    itemId: '1001',
    category: 'sports',
    subcategory: 'football',
    type: 'match',
  },
];

const mockIndexerClient = {} as any;
const mockWalletAddress = '0x1234567890abcdef';

// Wrapper for QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useFootballMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseFootballFixtures.mockReturnValue({
      data: {
        response: mockFixtures,
        results: 2,
        paging: { current: 1, total: 1 },
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    mockUseFavorites.mockReturnValue({
      favorites: mockFavorites,
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: false },
      removeFavorite: { mutateAsync: vi.fn(), isPending: false },
      refresh: vi.fn(),
    } as any);
  });

  it('should return matches with favorited flag', () => {
    const { result } = renderHook(
      () => useFootballMatches(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    expect(result.current.matches).toHaveLength(2);
    expect(result.current.matches[0].favorited).toBe(true); // fixture id 1001 is in favorites
    expect(result.current.matches[1].favorited).toBe(false); // fixture id 1002 is not in favorites
  });

  it('should return isLoading true when fixtures are loading', () => {
    mockUseFootballFixtures.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    const { result } = renderHook(
      () => useFootballMatches(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('should return isLoading true when favorites are loading', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [],
      isLoading: true,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: false },
      removeFavorite: { mutateAsync: vi.fn(), isPending: false },
      refresh: vi.fn(),
    } as any);

    const { result } = renderHook(
      () => useFootballMatches(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('should return error when fixtures query fails', () => {
    const error = new Error('Failed to fetch fixtures');
    mockUseFootballFixtures.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error,
    } as any);

    const { result } = renderHook(
      () => useFootballMatches(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(error);
  });

  it('should call addFavorite when setFavorited is called with true', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({
      favorites: [],
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: mockMutateAsync, isPending: false },
      removeFavorite: { mutateAsync: vi.fn(), isPending: false },
      refresh: vi.fn(),
    } as any);

    const { result } = renderHook(
      () => useFootballMatches(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.setFavorited(1001, true);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      category: 'sports',
      subcategory: 'football',
      type: 'match',
      id: '1001',
    });
  });

  it('should call removeFavorite when setFavorited is called with false', async () => {
    const mockRemoveMutateAsync = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({
      favorites: mockFavorites,
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: false },
      removeFavorite: { mutateAsync: mockRemoveMutateAsync, isPending: false },
      refresh: vi.fn(),
    } as any);

    const { result } = renderHook(
      () => useFootballMatches(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.setFavorited(1001, false);
    });

    expect(mockRemoveMutateAsync).toHaveBeenCalledWith(1); // favorite id
  });

  it('should not call removeFavorite if match is not favorited', async () => {
    const mockRemoveMutateAsync = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({
      favorites: mockFavorites,
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: false },
      removeFavorite: { mutateAsync: mockRemoveMutateAsync, isPending: false },
      refresh: vi.fn(),
    } as any);

    const { result } = renderHook(
      () => useFootballMatches(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.setFavorited(1002, false); // 1002 is not in favorites
    });

    expect(mockRemoveMutateAsync).not.toHaveBeenCalled();
  });

  it('should pass options to useFootballFixtures', () => {
    const options = { params: { league: 39, date: '2024-01-15' } };

    renderHook(
      () => useFootballMatches(mockIndexerClient, mockWalletAddress, options),
      { wrapper: createWrapper() }
    );

    expect(mockUseFootballFixtures).toHaveBeenCalledWith(options);
  });

  it('should pass correct filters to useFavorites', () => {
    renderHook(() => useFootballMatches(mockIndexerClient, mockWalletAddress), {
      wrapper: createWrapper(),
    });

    expect(mockUseFavorites).toHaveBeenCalledWith(
      mockIndexerClient,
      mockWalletAddress,
      {
        category: 'sports',
        subcategory: 'football',
        type: 'match',
      }
    );
  });

  it('should return empty matches when data is undefined', () => {
    mockUseFootballFixtures.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    const { result } = renderHook(
      () => useFootballMatches(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    expect(result.current.matches).toHaveLength(0);
  });

  it('should expose pending states for favorite mutations', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [],
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: true },
      removeFavorite: { mutateAsync: vi.fn(), isPending: false },
      refresh: vi.fn(),
    } as any);

    const { result } = renderHook(
      () => useFootballMatches(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    expect(result.current.addFavoritePending).toBe(true);
    expect(result.current.removeFavoritePending).toBe(false);
  });

  it('should work with live matches parameter', () => {
    const options = { params: { live: 'all' as const } };

    renderHook(
      () => useFootballMatches(mockIndexerClient, mockWalletAddress, options),
      { wrapper: createWrapper() }
    );

    expect(mockUseFootballFixtures).toHaveBeenCalledWith(options);
  });
});
