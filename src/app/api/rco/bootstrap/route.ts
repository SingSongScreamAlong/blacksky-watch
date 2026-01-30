import { SimService } from "@/server/sim/SimService";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const regionId = searchParams.get("regionId") ?? "";

  if (!regionId) {
    return Response.json({ error: "regionId is required" }, { status: 400 });
  }

  try {
    const data = SimService.getBootstrap(regionId);
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 404 }
    );
  }
}
