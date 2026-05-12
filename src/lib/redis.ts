import IORedis, { type Redis as IORedisType, type ChainableCommander } from "ioredis";

let cachedRaw: IORedisType | null = null;
const globalForRedis = globalThis as unknown as { __ioredisClient?: IORedisType };

function getRaw(): IORedisType {
  if (cachedRaw) return cachedRaw;
  if (globalForRedis.__ioredisClient) {
    cachedRaw = globalForRedis.__ioredisClient;
    return cachedRaw;
  }
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL requis");
  const client = new IORedis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  client.on("error", (err) => {
    console.warn("[redis] error:", err.message);
  });
  cachedRaw = client;
  if (process.env.NODE_ENV !== "production") globalForRedis.__ioredisClient = client;
  return cachedRaw;
}

/**
 * Pipeline wrapper API-compatible @upstash/redis (subset utilise) :
 * .hset, .expire, .incr, .set, .del puis .exec().
 */
class PipelineShim {
  private chain: ChainableCommander;
  constructor(client: IORedisType) {
    this.chain = client.multi();
  }
  hset(key: string, fields: Record<string, unknown>): this {
    const flat: (string | number)[] = [];
    for (const [k, v] of Object.entries(fields)) {
      flat.push(k);
      flat.push(typeof v === "string" || typeof v === "number" ? v : JSON.stringify(v));
    }
    this.chain.hset(key, ...flat);
    return this;
  }
  expire(key: string, seconds: number): this {
    this.chain.expire(key, seconds);
    return this;
  }
  incr(key: string): this {
    this.chain.incr(key);
    return this;
  }
  set(
    key: string,
    value: unknown,
    opts?: { ex?: number; nx?: boolean; px?: number },
  ): this {
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    if (opts?.nx && opts?.ex !== undefined) {
      this.chain.set(key, payload, "EX", opts.ex, "NX");
    } else if (opts?.ex !== undefined) {
      this.chain.set(key, payload, "EX", opts.ex);
    } else if (opts?.nx) {
      this.chain.set(key, payload, "NX");
    } else {
      this.chain.set(key, payload);
    }
    return this;
  }
  del(...keys: string[]): this {
    if (keys.length > 0) this.chain.del(...keys);
    return this;
  }
  zadd(key: string, scoreMember: { score: number; member: string }): this {
    this.chain.zadd(key, scoreMember.score, scoreMember.member);
    return this;
  }
  zincrby(key: string, increment: number, member: string): this {
    this.chain.zincrby(key, increment, member);
    return this;
  }
  async exec(): Promise<unknown[]> {
    const res = await this.chain.exec();
    return res ?? [];
  }
}

/**
 * Shim API-compatible @upstash/redis (subset utilise par ce repo) :
 * .get, .set, .setnx, .del, .incr, .expire, .exists, .hget, .hgetall,
 * .hset, .pipeline(). Backend ioredis self-hosted via REDIS_URL.
 */
class RedisShim {
  async get<T = unknown>(key: string): Promise<T | null> {
    const v = await getRaw().get(key);
    if (v === null) return null;
    try {
      return JSON.parse(v) as T;
    } catch {
      return v as unknown as T;
    }
  }
  async set(
    key: string,
    value: unknown,
    opts?: { ex?: number; nx?: boolean; px?: number },
  ): Promise<"OK" | null> {
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    const io = getRaw();
    if (opts?.nx && opts?.ex !== undefined) {
      return io.set(key, payload, "EX", opts.ex, "NX") as Promise<"OK" | null>;
    }
    if (opts?.ex !== undefined) {
      return io.set(key, payload, "EX", opts.ex);
    }
    if (opts?.nx) {
      return io.set(key, payload, "NX") as Promise<"OK" | null>;
    }
    if (opts?.px !== undefined) {
      return io.set(key, payload, "PX", opts.px);
    }
    return io.set(key, payload);
  }
  async setnx(key: string, value: unknown): Promise<number> {
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    return getRaw().setnx(key, payload);
  }
  async del(...keys: string[]): Promise<number> {
    if (!keys.length) return 0;
    return getRaw().del(...keys);
  }
  async incr(key: string): Promise<number> {
    return getRaw().incr(key);
  }
  async expire(key: string, seconds: number): Promise<number> {
    return getRaw().expire(key, seconds);
  }
  async exists(...keys: string[]): Promise<number> {
    if (!keys.length) return 0;
    return getRaw().exists(...keys);
  }
  async hget(key: string, field: string): Promise<string | null> {
    return getRaw().hget(key, field);
  }
  async hgetall(key: string): Promise<Record<string, string>> {
    return getRaw().hgetall(key);
  }
  async hset(key: string, fields: Record<string, unknown>): Promise<number> {
    const flat: (string | number)[] = [];
    for (const [k, v] of Object.entries(fields)) {
      flat.push(k);
      flat.push(typeof v === "string" || typeof v === "number" ? v : JSON.stringify(v));
    }
    return getRaw().hset(key, ...flat);
  }
  async hsetnx(key: string, field: string, value: unknown): Promise<number> {
    const payload =
      typeof value === "string" || typeof value === "number"
        ? String(value)
        : JSON.stringify(value);
    return getRaw().hsetnx(key, field, payload);
  }
  /**
   * Upstash zrange options : { rev?, withScores? }.
   * Si withScores=true, retourne [member, score, member, score, ...] (Upstash style).
   * Sans, retourne juste les members.
   */
  async zrange(
    key: string,
    start: number,
    stop: number,
    opts?: { rev?: boolean; withScores?: boolean },
  ): Promise<string[]> {
    const io = getRaw();
    if (opts?.rev) {
      if (opts?.withScores) {
        return io.zrevrange(key, start, stop, "WITHSCORES");
      }
      return io.zrevrange(key, start, stop);
    }
    if (opts?.withScores) {
      return io.zrange(key, start, stop, "WITHSCORES");
    }
    return io.zrange(key, start, stop);
  }
  pipeline(): PipelineShim {
    return new PipelineShim(getRaw());
  }
}

export const redis = new RedisShim();
