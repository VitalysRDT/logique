import { NextResponse } from "next/server";

const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY;
const VOICE_ID = "79f8b5fb-2cc8-479a-80df-29f7a7cf1a3e"; // Theo - Modern Narrator

export async function POST(request: Request) {
  try {
    if (!CARTESIA_API_KEY) {
      return NextResponse.json({ error: "TTS non configure" }, { status: 500 });
    }

    const { text, speed, emotion } = await request.json();

    if (!text || typeof text !== "string" || text.length > 1000) {
      return NextResponse.json({ error: "Texte invalide (max 1000 car)" }, { status: 400 });
    }

    const res = await fetch("https://api.cartesia.ai/tts/bytes", {
      method: "POST",
      headers: {
        "X-API-Key": CARTESIA_API_KEY,
        "Cartesia-Version": "2025-04-16",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: "sonic-2",
        transcript: text,
        voice: { mode: "id", id: VOICE_ID },
        output_format: {
          container: "mp3",
          bit_rate: 128000,
          sample_rate: 44100,
        },
        language: "fr",
        generation_config: {
          speed: speed || 1.0,
          emotion: emotion || undefined,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Cartesia error:", res.status, err);
      return NextResponse.json({ error: "TTS error" }, { status: 502 });
    }

    const audioBuffer = await res.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("TTS route error:", err);
    return NextResponse.json({ error: "Erreur TTS" }, { status: 500 });
  }
}
