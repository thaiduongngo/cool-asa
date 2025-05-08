import Redis from 'ioredis';

const DEFAULT_REDIS_URL = "redis://localhost:6379";
const redisUrl = process.env.REDIS_URL ?? DEFAULT_REDIS_URL;

if (!redisUrl) {
  console.warn("REDIS_URL is not defined. Chat history persistence will be disabled or fail.");
  // You could return a mock client or throw an error depending on desired behavior
  // For this example, we'll let it attempt to connect and potentially fail if not set.
}

// Configure Redis client
// For Upstash, you might need specific TLS settings if not included in the URL.
// Generally, ioredis handles standard redis:// and rediss:// URLs well.
const redis = new Redis(redisUrl || '', {
  // Optional: Add more ioredis options here if needed
  // For example, for Upstash or other cloud providers, you might need:
  // tls: {}, // if rediss:// is used, this might be automatically handled
  // connectTimeout: 10000,
  maxRetriesPerRequest: 3, // Retry commands on transient errors
  lazyConnect: true, // Connect on first command, not on instantiation
});

redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
  // Potentially implement a circuit breaker or fallback mechanism here
});

redis.on('connect', () => {
  console.log('Connected to Redis successfully!');
});

// Key prefix for all chat history data to avoid collisions if Redis is shared
const CHAT_HISTORY_PREFIX = "chat_history:";
const CHAT_INDEX_KEY = `${CHAT_HISTORY_PREFIX}index`; // Sorted set for chat IDs by lastUpdated
const MAX_CHAT_HISTORY = 5; // Same as client-side, but now enforced on server

export { redis, CHAT_HISTORY_PREFIX, CHAT_INDEX_KEY, MAX_CHAT_HISTORY };