import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;
function getAdmin(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || key.length < 16) return null;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return cached;
}

export function channelFor(roomCode: string): string {
  return `room:${roomCode}`;
}

/**
 * Broadcasts a lightweight "state changed" signal on the room channel.
 * Clients react by refetching /api/game/<code>/state (the source of truth in
 * Redis/Postgres). We don't ship the full state over Realtime because the GET
 * endpoint does per-phase enrichment; the broadcast only triggers a refetch.
 */
export async function broadcastRoom(
  roomCode: string,
  version?: number,
): Promise<void> {
  const admin = getAdmin();
  if (!admin) return;
  try {
    const ch = admin.channel(channelFor(roomCode));
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("subscribe timeout")),
        5000,
      );
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timer);
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timer);
          reject(new Error(`subscribe failed: ${status}`));
        }
      });
    });
    await ch.send({
      type: "broadcast",
      event: "state",
      payload: { roomCode, version: version ?? null, at: Date.now() },
    });
    await admin.removeChannel(ch);
  } catch (err) {
    console.error("[broadcast] failed", (err as Error).message);
  }
}
