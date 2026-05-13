/**
 * Composition hook that combines discussion metadata with auth state.
 * Provides a unified interface for UI components to check discussion availability.
 */

import { useMemo } from 'react';
import type {
  DiscussionData,
  DiscussionQuery,
  IndexerClient,
} from '@sudobility/heavymath_indexer_client';
import {
  useAuthSession,
  useDiscussion,
} from '@sudobility/heavymath_indexer_client';

export interface UseDiscussionForEntityResult {
  discussion: DiscussionData | null;
  commentCount: number;
  canPost: boolean;
  isLocked: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useDiscussionForEntity(
  client: IndexerClient,
  query: DiscussionQuery
): UseDiscussionForEntityResult {
  const { discussion, isLoading } = useDiscussion(client, query);
  const { isAuthenticated } = useAuthSession();

  const isLocked = useMemo(() => {
    if (!discussion?.lockedAt) return false;
    return new Date(discussion.lockedAt).getTime() < Date.now();
  }, [discussion?.lockedAt]);

  const canPost = isAuthenticated && !isLocked;

  return {
    discussion,
    commentCount: discussion?.commentCount ?? 0,
    canPost,
    isLocked,
    isAuthenticated,
    isLoading,
  };
}
