import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useFootballTeams } from '../useFootballTeams';

// Mock the sports_api_client
vi.mock('@sudobility/sports_api_client', () => ({
  useFootballTeams: vi.fn(),
}));

// Mock the indexer_client
vi.mock('@sudobility/heavymath_indexer_client', () => ({
  useFavorites: vi.fn(),
}));

import { useFootballTeams as useFootballTeamsApi } from '@sudobility/sports_api_client';
import { useFavorites } from '@sudobility/heavymath_indexer_client';

const mockUseFootballTeamsApi = vi.mocked(useFootballTeamsApi);
const mockUseFavorites = vi.mocked(useFavorites);

// Mock data
const mockTeams = [
  {
    team: {
      id: 33,
      name: 'Manchester United',
      code: 'MUN',
      country: 'England',
      founded: 1878,
      national: false,
      logo: 'https://example.com/mun.png',
    },
    venue: {
      id: 556,
      name: 'Old Trafford',
      address: null,
      city: 'Manchester',
      capacity: 76212,
      surface: 'grass',
      image: null,
    },
  },
  {
    team: {
      id: 34,
      name: 'Newcastle',
      code: 'NEW',
      country: 'England',
      founded: 1892,
      national: false,
      logo: 'https://example.com/new.png',
    },
    venue: {
      id: 562,
      name: "St. James' Park",
      address: null,
      city: 'Newcastle',
      capacity: 52305,
      surface: 'grass',
      image: null,
    },
  },
];

const mockFavorites = [
  {
    id: 1,
    itemId: '33',
    category: 'sports',
    subcategory: 'football',
    type: 'team',
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

describe('useFootballTeams', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseFootballTeamsApi.mockReturnValue({
      data: {
        response: mockTeams,
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

  it('should return teams with favorited flag', () => {
    const { result } = renderHook(
      () =>
        useFootballTeams(mockIndexerClient, mockWalletAddress, {
          params: { league: 39 },
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.teams).toHaveLength(2);
    expect(result.current.teams[0].favorited).toBe(true); // id 33 is in favorites
    expect(result.current.teams[1].favorited).toBe(false); // id 34 is not in favorites
  });

  it('should return isLoading true when teams are loading', () => {
    mockUseFootballTeamsApi.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    const { result } = renderHook(
      () =>
        useFootballTeams(mockIndexerClient, mockWalletAddress, {
          params: { league: 39 },
        }),
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
      () =>
        useFootballTeams(mockIndexerClient, mockWalletAddress, {
          params: { league: 39 },
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('should return error when teams query fails', () => {
    const error = new Error('Failed to fetch teams');
    mockUseFootballTeamsApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error,
    } as any);

    const { result } = renderHook(
      () =>
        useFootballTeams(mockIndexerClient, mockWalletAddress, {
          params: { league: 39 },
        }),
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
      () =>
        useFootballTeams(mockIndexerClient, mockWalletAddress, {
          params: { league: 39 },
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.setFavorited(33, true);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      category: 'sports',
      subcategory: 'football',
      type: 'team',
      id: '33',
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
      () =>
        useFootballTeams(mockIndexerClient, mockWalletAddress, {
          params: { league: 39 },
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.setFavorited(33, false);
    });

    expect(mockRemoveMutateAsync).toHaveBeenCalledWith(1); // favorite id
  });

  it('should not call removeFavorite if team is not favorited', async () => {
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
      () =>
        useFootballTeams(mockIndexerClient, mockWalletAddress, {
          params: { league: 39 },
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.setFavorited(34, false); // 34 is not in favorites
    });

    expect(mockRemoveMutateAsync).not.toHaveBeenCalled();
  });

  it('should pass options to useFootballTeamsApi', () => {
    const options = { params: { league: 39, season: 2023 } };

    renderHook(
      () => useFootballTeams(mockIndexerClient, mockWalletAddress, options),
      { wrapper: createWrapper() }
    );

    expect(mockUseFootballTeamsApi).toHaveBeenCalledWith(options);
  });

  it('should pass correct filters to useFavorites', () => {
    renderHook(
      () =>
        useFootballTeams(mockIndexerClient, mockWalletAddress, {
          params: { league: 39 },
        }),
      { wrapper: createWrapper() }
    );

    expect(mockUseFavorites).toHaveBeenCalledWith(
      mockIndexerClient,
      mockWalletAddress,
      {
        category: 'sports',
        subcategory: 'football',
        type: 'team',
      }
    );
  });

  it('should return empty teams when data is undefined', () => {
    mockUseFootballTeamsApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    const { result } = renderHook(
      () =>
        useFootballTeams(mockIndexerClient, mockWalletAddress, {
          params: { league: 39 },
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.teams).toHaveLength(0);
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
      () =>
        useFootballTeams(mockIndexerClient, mockWalletAddress, {
          params: { league: 39 },
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.addFavoritePending).toBe(true);
    expect(result.current.removeFavoritePending).toBe(false);
  });
});
