import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn("REDIS_URL is not defined. Persistence features will be disabled or fail.");
}

const redis = new Redis(redisUrl ?? '', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => console.error('Redis Client Error:', err));
redis.on('connect', () => console.log('Connected to Redis successfully!'));

const CHAT_HISTORY_PREFIX = "chat_history:";
const CHAT_INDEX_KEY = `${CHAT_HISTORY_PREFIX}index`;
const MAX_CHAT_HISTORY = process.env.MAX_CHAT_HISTORY ?? 5;

const RECENT_PROMPTS_KEY = "recent_prompts";
const MAX_RECENT_PROMPTS = process.env.MAX_RECENT_PROMPTS ?? 5;

export {
  redis,
  CHAT_HISTORY_PREFIX,
  CHAT_INDEX_KEY,
  MAX_CHAT_HISTORY,
  RECENT_PROMPTS_KEY,
  MAX_RECENT_PROMPTS
};