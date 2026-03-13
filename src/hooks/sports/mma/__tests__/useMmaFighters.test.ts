import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useMmaFighters } from '../useMmaFighters';
vi.mock('@sudobility/heavymath_indexer_client', () => ({
  useFavorites: vi.fn(),
  useMmaFighters: vi.fn(),
}));
import {
  useFavorites,
  useMmaFighters as useApi,
} from '@sudobility/heavymath_indexer_client';
const mockUseApi = vi.mocked(useApi);
const mockUseFavorites = vi.mocked(useFavorites);
const mockData = [
  { id: 10, name: 'Fighter A' },
  { id: 20, name: 'Fighter B' },
];
const mockFavs = [
  {
    id: 1,
    itemId: '10',
    category: 'sports',
    subcategory: 'mma',
    type: 'fighter',
  },
];
const ic = {} as any;
const wa = '0xabc';
const cw = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
};
describe('useMmaFighters', () => {
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
      favorites: mockFavs,
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: false },
      removeFavorite: { mutateAsync: vi.fn(), isPending: false },
      refresh: vi.fn(),
    } as any);
  });
  it('should return fighters with favorited flag', () => {
    const { result } = renderHook(() => useMmaFighters(ic, wa), {
      wrapper: cw(),
    });
    expect(result.current.fighters).toHaveLength(2);
    expect(result.current.fighters[0].favorited).toBe(true);
    expect(result.current.fighters[1].favorited).toBe(false);
  });
  it('should call addFavorite', async () => {
    const m = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({
      favorites: [],
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: m, isPending: false },
      removeFavorite: { mutateAsync: vi.fn(), isPending: false },
      refresh: vi.fn(),
    } as any);
    const { result } = renderHook(() => useMmaFighters(ic, wa), {
      wrapper: cw(),
    });
    await act(async () => {
      await result.current.setFavorited(10, true);
    });
    expect(m).toHaveBeenCalledWith({
      category: 'sports',
      subcategory: 'mma',
      type: 'fighter',
      id: '10',
    });
  });
  it('should pass correct filters', () => {
    renderHook(() => useMmaFighters(ic, wa), { wrapper: cw() });
    expect(mockUseFavorites).toHaveBeenCalledWith(ic, wa, {
      category: 'sports',
      subcategory: 'mma',
      type: 'fighter',
    });
  });
  it('should return empty when undefined', () => {
    mockUseApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    const { result } = renderHook(() => useMmaFighters(ic, wa), {
      wrapper: cw(),
    });
    expect(result.current.fighters).toHaveLength(0);
  });
});
