import bwipjs from "bwip-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Barcode text is required" },
        { status: 400 }
      );
    }

    const pngBuffer: Buffer = await new Promise((resolve, reject) => {
      bwipjs.toBuffer(
        {
          bcid: "code128",
          text,
          scale: 3,
          height: 10,
          includetext: true,
          textxalign: "center",
        },
        (err: string | Error, png: Buffer) => {
          if (err) reject(err);
          else resolve(png);
        }
      );
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": pngBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate barcode" },
      { status: 500 }
    );
  }
}
