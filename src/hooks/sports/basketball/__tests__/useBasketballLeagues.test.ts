import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useBasketballLeagues } from '../useBasketballLeagues';

vi.mock('@sudobility/heavymath_indexer_client', () => ({
  useFavorites: vi.fn(),
  useFavoriteCounts: vi.fn().mockReturnValue({ counts: {}, isLoading: false }),
  useBasketballLeagues: vi.fn(),
}));

import {
  useFavorites,
  useBasketballLeagues as useBasketballLeaguesApi,
} from '@sudobility/heavymath_indexer_client';

const mockUseBasketballLeaguesApi = vi.mocked(useBasketballLeaguesApi);
const mockUseFavorites = vi.mocked(useFavorites);

const mockLeagues = [
  { id: 1, name: 'NBA', type: 'League', logo: 'https://example.com/nba.png' },
  {
    id: 2,
    name: 'EuroLeague',
    type: 'League',
    logo: 'https://example.com/euro.png',
  },
];

const mockFavorites = [
  {
    id: 1,
    itemId: '1',
    category: 'sports',
    subcategory: 'basketball',
    type: 'league',
  },
];

const mockIndexerClient = {} as any;
const mockWalletAddress = '0x1234567890abcdef';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useBasketballLeagues', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseBasketballLeaguesApi.mockReturnValue({
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
      () => useBasketballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    expect(result.current.leagues).toHaveLength(2);
    expect(result.current.leagues[0].favorited).toBe(true);
    expect(result.current.leagues[1].favorited).toBe(false);
  });

  it('should return isLoading true when leagues are loading', () => {
    mockUseBasketballLeaguesApi.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    const { result } = renderHook(
      () => useBasketballLeagues(mockIndexerClient, mockWalletAddress),
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
      () => useBasketballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('should return error when leagues query fails', () => {
    const error = new Error('Failed to fetch leagues');
    mockUseBasketballLeaguesApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error,
    } as any);

    const { result } = renderHook(
      () => useBasketballLeagues(mockIndexerClient, mockWalletAddress),
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
      () => useBasketballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.setFavorited(1, true);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      category: 'sports',
      subcategory: 'basketball',
      type: 'league',
      id: '1',
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
      () => useBasketballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.setFavorited(1, false);
    });

    expect(mockRemoveMutateAsync).toHaveBeenCalledWith(1);
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
      () => useBasketballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.setFavorited(2, false);
    });

    expect(mockRemoveMutateAsync).not.toHaveBeenCalled();
  });

  it('should pass options to API hook', () => {
    const options = { params: { country: 'USA' } };
    renderHook(
      () => useBasketballLeagues(mockIndexerClient, mockWalletAddress, options),
      { wrapper: createWrapper() }
    );
    expect(mockUseBasketballLeaguesApi).toHaveBeenCalledWith(
      mockIndexerClient,
      options.params,
      { enabled: undefined }
    );
  });

  it('should pass correct filters to useFavorites', () => {
    renderHook(
      () => useBasketballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(mockUseFavorites).toHaveBeenCalledWith(
      mockIndexerClient,
      mockWalletAddress,
      {
        category: 'sports',
        subcategory: 'basketball',
        type: 'league',
      }
    );
  });

  it('should return empty leagues when data is undefined', () => {
    mockUseBasketballLeaguesApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    const { result } = renderHook(
      () => useBasketballLeagues(mockIndexerClient, mockWalletAddress),
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
      () => useBasketballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );

    expect(result.current.addFavoritePending).toBe(true);
    expect(result.current.removeFavoritePending).toBe(false);
  });
});
