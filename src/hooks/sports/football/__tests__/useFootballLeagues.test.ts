import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useFootballLeagues } from '../useFootballLeagues';

// Mock the sports_api_client
vi.mock('@sudobility/sports_api_client', () => ({
  useFootballLeagues: vi.fn(),
}));

// Mock the indexer_client
vi.mock('@sudobility/heavymath_indexer_client', () => ({
  useFavorites: vi.fn(),
}));

import { useFootballLeagues as useFootballLeaguesApi } from '@sudobility/sports_api_client';
import { useFavorites } from '@sudobility/heavymath_indexer_client';

const mockUseFootballLeaguesApi = vi.mocked(useFootballLeaguesApi);
const mockUseFavorites = vi.mocked(useFavorites);

// Mock data
const mockLeagues = [
  {
    league: {
      id: 39,
      name: 'Premier League',
      type: 'League' as const,
      logo: 'https://example.com/pl.png',
    },
    country: {
      name: 'England',
      code: 'GB',
      flag: 'https://example.com/gb.png',
    },
    seasons: [],
  },
  {
    league: {
      id: 140,
      name: 'La Liga',
      type: 'League' as const,
      logo: 'https://example.com/laliga.png',
    },
    country: { name: 'Spain', code: 'ES', flag: 'https://example.com/es.png' },
    seasons: [],
  },
];

const mockFavorites = [
  {
    id: 1,
    itemId: '39',
    category: 'sports',
    subcategory: 'football',
    type: 'league',
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

describe('useFootballLeagues', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseFootballLeaguesApi.mockReturnValue({
      data: {
        response: mockLeagues,
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

  it('should return leagues with favorited flag', () => {
    const { result } = renderHook(
      () => useFootballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    expect(result.current.leagues).toHaveLength(2);
    expect(result.current.leagues[0].favorited).toBe(true); // id 39 is in favorites
    expect(result.current.leagues[1].favorited).toBe(false); // id 140 is not in favorites
  });

  it('should return isLoading true when leagues are loading', () => {
    mockUseFootballLeaguesApi.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    const { result } = renderHook(
      () => useFootballLeagues(mockIndexerClient, mockWalletAddress),
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
      () => useFootballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('should return error when leagues query fails', () => {
    const error = new Error('Failed to fetch leagues');
    mockUseFootballLeaguesApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error,
    } as any);

    const { result } = renderHook(
      () => useFootballLeagues(mockIndexerClient, mockWalletAddress),
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
      () => useFootballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.setFavorited(39, true);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      category: 'sports',
      subcategory: 'football',
      type: 'league',
      id: '39',
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
      () => useFootballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.setFavorited(39, false);
    });

    expect(mockRemoveMutateAsync).toHaveBeenCalledWith(1); // favorite id
  });

  it('should not call removeFavorite if league is not favorited', async () => {
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
      () => useFootballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.setFavorited(140, false); // 140 is not in favorites
    });

    expect(mockRemoveMutateAsync).not.toHaveBeenCalled();
  });

  it('should pass options to useFootballLeaguesApi', () => {
    const options = { params: { country: 'England' } };

    renderHook(
      () => useFootballLeagues(mockIndexerClient, mockWalletAddress, options),
      { wrapper: createWrapper() }
    );

    expect(mockUseFootballLeaguesApi).toHaveBeenCalledWith(options);
  });

  it('should pass correct filters to useFavorites', () => {
    renderHook(() => useFootballLeagues(mockIndexerClient, mockWalletAddress), {
      wrapper: createWrapper(),
    });

    expect(mockUseFavorites).toHaveBeenCalledWith(
      mockIndexerClient,
      mockWalletAddress,
      {
        category: 'sports',
        subcategory: 'football',
        type: 'league',
      }
    );
  });

  it('should return empty leagues when data is undefined', () => {
    mockUseFootballLeaguesApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    const { result } = renderHook(
      () => useFootballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    expect(result.current.leagues).toHaveLength(0);
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
      () => useFootballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    expect(result.current.addFavoritePending).toBe(true);
    expect(result.current.removeFavoritePending).toBe(false);
  });
});
