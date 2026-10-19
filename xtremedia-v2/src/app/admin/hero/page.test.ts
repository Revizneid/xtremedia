import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveHeroAdminViewState, shouldShowHeroEmptyState } from './heroAdminState';

test('empty hero data does not remain stuck in loading', () => {
  assert.equal(
    resolveHeroAdminViewState({
      loading: false,
      error: null,
      records: [],
      config: null,
    }),
    'ready'
  );

  assert.equal(
    shouldShowHeroEmptyState({
      records: [],
      config: null,
    }),
    true
  );

  assert.equal(
    shouldShowHeroEmptyState({
      records: [],
      config: {
        enabled: true,
        songId: null,
        title: 'Legacy',
        subtitle: 'Legacy banner',
        ctaLabel: 'Phát',
        backgroundImage: null,
        updatedAt: new Date().toISOString(),
      },
    }),
    true
  );
});

test('loading and error states are distinct from ready state', () => {
  assert.equal(
    resolveHeroAdminViewState({
      loading: true,
      error: null,
      records: [],
      config: null,
    }),
    'loading'
  );

  assert.equal(
    resolveHeroAdminViewState({
      loading: false,
      error: 'Phiên đăng nhập đã hết hạn',
      records: [],
      config: null,
    }),
    'error'
  );

  assert.equal(
    resolveHeroAdminViewState({
      loading: false,
      error: null,
      records: [
        {
          id: 'b-1',
          title: 'Banner A',
          subtitle: 'Subtitle',
          imageUrl: null,
          linkUrl: null,
          songId: 's-1',
          sortOrder: 1,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          song: null,
        },
      ],
      config: null,
    }),
    'ready'
  );
});
