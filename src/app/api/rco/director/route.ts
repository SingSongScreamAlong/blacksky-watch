import { SimService } from "@/server/sim/SimService";

export const runtime = "nodejs";

type DirectorBody = {
  regionId: string;
  kind: "phantom" | "spoof";
};

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not available" }, { status: 404 });
  }

  let body: DirectorBody;
  try {
    body = (await req.json()) as DirectorBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.regionId) return Response.json({ error: "regionId is required" }, { status: 400 });
  if (!body.kind) return Response.json({ error: "kind is required" }, { status: 400 });

  try {
    SimService.directorTrigger(body.regionId, body.kind);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
