import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useMmaCategories } from '../useMmaCategories';
vi.mock('@sudobility/heavymath_indexer_client', () => ({
  useFavorites: vi.fn(),
  useFavoriteCounts: vi.fn().mockReturnValue({ counts: {}, isLoading: false }),
  useMmaCategories: vi.fn(),
}));
import {
  useFavorites,
  useMmaCategories as useApi,
} from '@sudobility/heavymath_indexer_client';
const mockUseApi = vi.mocked(useApi);
const mockUseFavorites = vi.mocked(useFavorites);
const mockData = ['Lightweight', 'Heavyweight'];
const mockFavs = [
  {
    id: 1,
    itemId: 'Lightweight',
    category: 'sports',
    subcategory: 'mma',
    type: 'category',
  },
];
const ic = {} as any;
const wa = '0xabc';
const cw = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
};
describe('useMmaCategories', () => {
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
  it('should return categories with favorited flag', () => {
    const { result } = renderHook(() => useMmaCategories(ic, wa), {
      wrapper: cw(),
    });
    expect(result.current.categories).toHaveLength(2);
    expect(result.current.categories[0].name).toBe('Lightweight');
    expect(result.current.categories[0].favorited).toBe(true);
    expect(result.current.categories[1].favorited).toBe(false);
  });
  it('should call addFavorite with category name', async () => {
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
    const { result } = renderHook(() => useMmaCategories(ic, wa), {
      wrapper: cw(),
    });
    await act(async () => {
      await result.current.setFavorited('Lightweight', true);
    });
    expect(m).toHaveBeenCalledWith({
      category: 'sports',
      subcategory: 'mma',
      type: 'category',
      id: 'Lightweight',
    });
  });
  it('should call removeFavorite', async () => {
    const m = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({
      favorites: mockFavs,
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: false },
      removeFavorite: { mutateAsync: m, isPending: false },
      refresh: vi.fn(),
    } as any);
    const { result } = renderHook(() => useMmaCategories(ic, wa), {
      wrapper: cw(),
    });
    await act(async () => {
      await result.current.setFavorited('Lightweight', false);
    });
    expect(m).toHaveBeenCalledWith(1);
  });
  it('should pass correct filters', () => {
    renderHook(() => useMmaCategories(ic, wa), { wrapper: cw() });
    expect(mockUseFavorites).toHaveBeenCalledWith(ic, wa, {
      category: 'sports',
      subcategory: 'mma',
      type: 'category',
    });
  });
  it('should return empty when undefined', () => {
    mockUseApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    const { result } = renderHook(() => useMmaCategories(ic, wa), {
      wrapper: cw(),
    });
    expect(result.current.categories).toHaveLength(0);
  });
});
