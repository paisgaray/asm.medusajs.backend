import * as dbGuards from './db-guards';

type Container = {
  resolve<T = unknown>(key: string): T;
};

export async function isOperationIdempotent(
  container: Container,
  productId: string,
  language: string,
  operation: 'index' | 'delete',
): Promise<boolean> {
  return await dbGuards.isOperationIdempotent(container, productId, language, operation);
}

export async function markOperationAsExecuted(
  container: Container,
  productId: string,
  language: string,
  operation: 'index' | 'delete',
): Promise<void> {
  return await dbGuards.markOperationAsExecuted(container, productId, language, operation);
}

export async function acquireLock(
  container: Container,
  lockKey: string,
  ownerId?: string,
): Promise<{ acquired: boolean; ownerId: string }> {
  const finalOwnerId = ownerId || dbGuards.generateOwnerId();
  return await dbGuards.acquireLock(container, lockKey, finalOwnerId);
}

export async function releaseLock(container: Container, lockKey: string, ownerId: string): Promise<void> {
  return await dbGuards.releaseLock(container, lockKey, ownerId);
}

export async function canExecuteSync(
  container: Container,
  language: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  return await dbGuards.canExecuteSync(container, language);
}

export async function recordAlgoliaRequest(container: Container, operation: string, count: number = 1): Promise<void> {
  return await dbGuards.recordAlgoliaRequest(container, operation, count);
}

export async function shouldFailFast(container: Container): Promise<boolean> {
  return await dbGuards.shouldFailFast(container);
}

export function generateOwnerId(): string {
  return dbGuards.generateOwnerId();
}

export async function getMetricsStatus(): Promise<{
  currentRequests: number;
  requestsPerMinute: number;
  alertThreshold: number;
  failFastThreshold: number;
  shouldAlert: boolean;
  shouldFailFast: boolean;
}> {
  const alertThreshold = process.env.ALGOLIA_ALERT_THRESHOLD ? Number(process.env.ALGOLIA_ALERT_THRESHOLD) : 50;
  const failFastThreshold = process.env.ALGOLIA_FAIL_FAST_THRESHOLD
    ? Number(process.env.ALGOLIA_FAIL_FAST_THRESHOLD)
    : 100;

  return {
    currentRequests: 0,
    requestsPerMinute: 0,
    alertThreshold,
    failFastThreshold,
    shouldAlert: false,
    shouldFailFast: false,
  };
}
