import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useBaseballLeagues } from '../useBaseballLeagues';

vi.mock('@sudobility/heavymath_indexer_client', () => ({
  useFavorites: vi.fn(),
  useFavoriteCounts: vi.fn().mockReturnValue({ counts: {}, isLoading: false }),
  useBaseballLeagues: vi.fn(),
}));

import {
  useFavorites,
  useBaseballLeagues as useBaseballLeaguesApi,
} from '@sudobility/heavymath_indexer_client';

const mockUseApi = vi.mocked(useBaseballLeaguesApi);
const mockUseFavorites = vi.mocked(useFavorites);

const mockLeagues = [
  { id: 1, name: 'MLB', logo: 'https://example.com/mlb.png' },
  { id: 2, name: 'NPB', logo: 'https://example.com/npb.png' },
];

const mockFavorites = [
  {
    id: 1,
    itemId: '1',
    category: 'sports',
    subcategory: 'baseball',
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

describe('useBaseballLeagues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApi.mockReturnValue({
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
      () => useBaseballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.leagues).toHaveLength(2);
    expect(result.current.leagues[0].favorited).toBe(true);
    expect(result.current.leagues[1].favorited).toBe(false);
  });

  it('should return isLoading true when data is loading', () => {
    mockUseApi.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);
    const { result } = renderHook(
      () => useBaseballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.isLoading).toBe(true);
  });

  it('should return error when query fails', () => {
    const error = new Error('Failed');
    mockUseApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error,
    } as any);
    const { result } = renderHook(
      () => useBaseballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(error);
  });

  it('should call addFavorite when setFavorited with true', async () => {
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
      () => useBaseballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    await act(async () => {
      await result.current.setFavorited(1, true);
    });
    expect(mockMutateAsync).toHaveBeenCalledWith({
      category: 'sports',
      subcategory: 'baseball',
      type: 'league',
      id: '1',
    });
  });

  it('should call removeFavorite when setFavorited with false', async () => {
    const mockRemove = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({
      favorites: mockFavorites,
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: false },
      removeFavorite: { mutateAsync: mockRemove, isPending: false },
      refresh: vi.fn(),
    } as any);
    const { result } = renderHook(
      () => useBaseballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    await act(async () => {
      await result.current.setFavorited(1, false);
    });
    expect(mockRemove).toHaveBeenCalledWith(1);
  });

  it('should not call removeFavorite if not favorited', async () => {
    const mockRemove = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({
      favorites: mockFavorites,
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: false },
      removeFavorite: { mutateAsync: mockRemove, isPending: false },
      refresh: vi.fn(),
    } as any);
    const { result } = renderHook(
      () => useBaseballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    await act(async () => {
      await result.current.setFavorited(2, false);
    });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('should pass correct filters to useFavorites', () => {
    renderHook(() => useBaseballLeagues(mockIndexerClient, mockWalletAddress), {
      wrapper: createWrapper(),
    });
    expect(mockUseFavorites).toHaveBeenCalledWith(
      mockIndexerClient,
      mockWalletAddress,
      {
        category: 'sports',
        subcategory: 'baseball',
        type: 'league',
      }
    );
  });

  it('should return empty array when data is undefined', () => {
    mockUseApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    const { result } = renderHook(
      () => useBaseballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.leagues).toHaveLength(0);
  });

  it('should expose pending states', () => {
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
      () => useBaseballLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.addFavoritePending).toBe(true);
    expect(result.current.removeFavoritePending).toBe(false);
  });
});
