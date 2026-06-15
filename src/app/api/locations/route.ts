import { NextResponse } from "next/server";
import { LOCATIONS } from "@/data/seed";

export async function GET() {
  return NextResponse.json(LOCATIONS);
}
