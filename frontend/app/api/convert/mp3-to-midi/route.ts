import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { detail: "Authentication not configured" },
        { status: 503 }
      );
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { detail: "Authentication required. Please log in." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const outgoingFormData = new FormData();
    const files = formData.getAll("files");
    for (const file of files) {
      if (file instanceof Blob) {
        const name = file instanceof File ? file.name : "audio";
        outgoingFormData.append("files", file, name);
      }
    }
    if (files.length === 0) {
      return NextResponse.json(
        { detail: "No files uploaded" },
        { status: 400 }
      );
    }
    const res = await fetch(`${API_BASE}/convert/mp3-to-midi`, {
      method: "POST",
      body: outgoingFormData,
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
