import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useBaseballGames } from '../useBaseballGames';

vi.mock('@sudobility/heavymath_indexer_client', () => ({
  useFavorites: vi.fn(),
  useFavoriteCounts: vi.fn().mockReturnValue({ counts: {}, isLoading: false }),
  useBaseballGames: vi.fn(),
}));

import {
  useFavorites,
  useBaseballGames as useBaseballGamesApi,
} from '@sudobility/heavymath_indexer_client';

const mockUseApi = vi.mocked(useBaseballGamesApi);
const mockUseFavorites = vi.mocked(useFavorites);
const mockData = [
  { id: 101, date: '2024-01-15' },
  { id: 102, date: '2024-01-16' },
];
const mockFavorites = [
  {
    id: 1,
    itemId: '101',
    category: 'sports',
    subcategory: 'baseball',
    type: 'game',
  },
];
const mockIndexerClient = {} as any;
const mockWalletAddress = '0xabc';
const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
};

describe('useBaseballGames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApi.mockReturnValue({
      data: {
        response: mockData,
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

  it('should return items with favorited flag', () => {
    const { result } = renderHook(
      () => useBaseballGames(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.games).toHaveLength(2);
    expect(result.current.games[0].favorited).toBe(true);
    expect(result.current.games[1].favorited).toBe(false);
  });

  it('should return isLoading true when loading', () => {
    mockUseApi.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);
    const { result } = renderHook(
      () => useBaseballGames(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.isLoading).toBe(true);
  });

  it('should call addFavorite', async () => {
    const mock = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({
      favorites: [],
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: mock, isPending: false },
      removeFavorite: { mutateAsync: vi.fn(), isPending: false },
      refresh: vi.fn(),
    } as any);
    const { result } = renderHook(
      () => useBaseballGames(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    await act(async () => {
      await result.current.setFavorited(101, true);
    });
    expect(mock).toHaveBeenCalledWith({
      category: 'sports',
      subcategory: 'baseball',
      type: 'game',
      id: '101',
    });
  });

  it('should call removeFavorite', async () => {
    const mock = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({
      favorites: mockFavorites,
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: false },
      removeFavorite: { mutateAsync: mock, isPending: false },
      refresh: vi.fn(),
    } as any);
    const { result } = renderHook(
      () => useBaseballGames(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    await act(async () => {
      await result.current.setFavorited(101, false);
    });
    expect(mock).toHaveBeenCalledWith(1);
  });

  it('should pass correct filters to useFavorites', () => {
    renderHook(() => useBaseballGames(mockIndexerClient, mockWalletAddress), {
      wrapper: createWrapper(),
    });
    expect(mockUseFavorites).toHaveBeenCalledWith(
      mockIndexerClient,
      mockWalletAddress,
      { category: 'sports', subcategory: 'baseball', type: 'game' }
    );
  });

  it('should return empty when data undefined', () => {
    mockUseApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    const { result } = renderHook(
      () => useBaseballGames(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.games).toHaveLength(0);
  });
});
