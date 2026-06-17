import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const modelsApiUrl = process.env.MODELS_API_URL;

    if (!modelsApiUrl) {
      return NextResponse.json(
        { error: "MODELS_API_URL is not configured" },
        { status: 503 },
      );
    }

    const response = await fetch(modelsApiUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch models" },
      { status: 500 },
    );
  }
}
