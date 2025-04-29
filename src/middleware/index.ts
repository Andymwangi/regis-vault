'use server';

import { rateLimitMiddleware } from './rate-limit';

// Single clean export
export { rateLimitMiddleware };

export * from './rate-limit'; 