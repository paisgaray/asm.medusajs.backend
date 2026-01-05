export function isSyncEnabled(): boolean {
  return process.env.DISABLE_ALGOLIA_SYNC !== 'true';
}

export function areSubscribersEnabled(): boolean {
  return process.env.DISABLE_ALGOLIA_SUBSCRIBERS !== 'true';
}

export function isClearIndexEnabled(): boolean {
  return process.env.DISABLE_ALGOLIA_CLEAR !== 'true';
}

export function getFeatureFlagsStatus(): {
  sync: boolean;
  subscribers: boolean;
  clearIndex: boolean;
} {
  return {
    sync: isSyncEnabled(),
    subscribers: areSubscribersEnabled(),
    clearIndex: isClearIndexEnabled(),
  };
}
