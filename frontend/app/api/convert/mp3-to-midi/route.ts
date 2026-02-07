import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const res = await fetch(`${API_BASE}/convert/mp3-to-midi`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      return NextResponse.json(
        { detail: err.detail ?? "Conversion failed" },
        { status: res.status }
      );
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="midi_conversions.zip"',
      },
    });
  } catch (err) {
    console.error("Convert proxy error:", err);
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to reach converter" },
      { status: 502 }
    );
  }
}
