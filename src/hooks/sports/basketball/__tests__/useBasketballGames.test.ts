import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useBasketballGames } from '../useBasketballGames';

vi.mock('@sudobility/sports_api_client', () => ({
  useBasketballGames: vi.fn(),
}));

vi.mock('@sudobility/heavymath_indexer_client', () => ({
  useFavorites: vi.fn(),
}));

import { useBasketballGames as useBasketballGamesApi } from '@sudobility/sports_api_client';
import { useFavorites } from '@sudobility/heavymath_indexer_client';

const mockUseApi = vi.mocked(useBasketballGamesApi);
const mockUseFavorites = vi.mocked(useFavorites);

const mockGames = [
  { id: 101, date: '2024-01-15', status: { long: 'Finished' } },
  { id: 102, date: '2024-01-16', status: { long: 'Scheduled' } },
];

const mockFavorites = [
  { id: 1, itemId: '101', category: 'sports', subcategory: 'basketball', type: 'game' },
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

describe('useBasketballGames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApi.mockReturnValue({
      data: { response: mockGames, results: 2, paging: { current: 1, total: 1 } },
      isLoading: false, isError: false, error: null,
    } as any);
    mockUseFavorites.mockReturnValue({
      favorites: mockFavorites, isLoading: false, isError: false, error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: false },
      removeFavorite: { mutateAsync: vi.fn(), isPending: false },
      refresh: vi.fn(),
    } as any);
  });

  it('should return games with favorited flag', () => {
    const { result } = renderHook(
      () => useBasketballGames(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.games).toHaveLength(2);
    expect(result.current.games[0].favorited).toBe(true);
    expect(result.current.games[1].favorited).toBe(false);
  });

  it('should return isLoading true when data is loading', () => {
    mockUseApi.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null } as any);
    const { result } = renderHook(
      () => useBasketballGames(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.isLoading).toBe(true);
  });

  it('should return error when query fails', () => {
    const error = new Error('Failed');
    mockUseApi.mockReturnValue({ data: undefined, isLoading: false, isError: true, error } as any);
    const { result } = renderHook(
      () => useBasketballGames(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(error);
  });

  it('should call addFavorite when setFavorited is called with true', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({
      favorites: [], isLoading: false, isError: false, error: null,
      addFavorite: { mutateAsync: mockMutateAsync, isPending: false },
      removeFavorite: { mutateAsync: vi.fn(), isPending: false },
      refresh: vi.fn(),
    } as any);
    const { result } = renderHook(
      () => useBasketballGames(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    await act(async () => { await result.current.setFavorited(101, true); });
    expect(mockMutateAsync).toHaveBeenCalledWith({
      category: 'sports', subcategory: 'basketball', type: 'game', id: '101',
    });
  });

  it('should call removeFavorite when setFavorited is called with false', async () => {
    const mockRemove = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({
      favorites: mockFavorites, isLoading: false, isError: false, error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: false },
      removeFavorite: { mutateAsync: mockRemove, isPending: false },
      refresh: vi.fn(),
    } as any);
    const { result } = renderHook(
      () => useBasketballGames(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    await act(async () => { await result.current.setFavorited(101, false); });
    expect(mockRemove).toHaveBeenCalledWith(1);
  });

  it('should not call removeFavorite if item is not favorited', async () => {
    const mockRemove = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({
      favorites: mockFavorites, isLoading: false, isError: false, error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: false },
      removeFavorite: { mutateAsync: mockRemove, isPending: false },
      refresh: vi.fn(),
    } as any);
    const { result } = renderHook(
      () => useBasketballGames(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    await act(async () => { await result.current.setFavorited(102, false); });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('should pass correct filters to useFavorites', () => {
    renderHook(
      () => useBasketballGames(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(mockUseFavorites).toHaveBeenCalledWith(mockIndexerClient, mockWalletAddress, {
      category: 'sports', subcategory: 'basketball', type: 'game',
    });
  });

  it('should return empty array when data is undefined', () => {
    mockUseApi.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null } as any);
    const { result } = renderHook(
      () => useBasketballGames(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.games).toHaveLength(0);
  });

  it('should expose pending states for favorite mutations', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [], isLoading: false, isError: false, error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: true },
      removeFavorite: { mutateAsync: vi.fn(), isPending: false },
      refresh: vi.fn(),
    } as any);
    const { result } = renderHook(
      () => useBasketballGames(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.addFavoritePending).toBe(true);
    expect(result.current.removeFavoritePending).toBe(false);
  });
});
