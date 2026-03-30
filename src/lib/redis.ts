import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error("UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN requis");
    }
    _redis = new Redis({ url, token });
  }
  return _redis;
}

export const redis = new Proxy({} as Redis, {
  get(_, prop) {
    const instance = getRedis();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (instance as any)[prop];
  },
});
