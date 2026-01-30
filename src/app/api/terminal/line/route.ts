import { SimService } from "@/server/sim/SimService";

export const runtime = "nodejs";

type TerminalLineBody = {
  regionId: string;
  outpostCode: string;
  line: string;
};

export async function POST(req: Request) {
  let body: TerminalLineBody;
  try {
    body = (await req.json()) as TerminalLineBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.regionId) return Response.json({ error: "regionId is required" }, { status: 400 });
  if (!body.outpostCode) return Response.json({ error: "outpostCode is required" }, { status: 400 });
  if (!body.line) return Response.json({ error: "line is required" }, { status: 400 });

  // Minimal parser: lines starting with / are commands, otherwise treated as comms text.
  const trimmed = body.line.trim();

  try {
    if (trimmed.startsWith("/")) {
      const [cmd, ...rest] = trimmed.slice(1).split(" ");
      const arg = rest.join(" ").trim();

      if (cmd === "staff") {
        const region = SimService.getRegion(body.regionId);
        region.whoStaffed[body.outpostCode] = arg !== "off";
        SimService.pushComms(body.regionId, {
          from: body.outpostCode,
          text: `Staffing set: ${arg !== "off" ? "ON" : "OFF"}`,
        });
        return Response.json({ ok: true, handled: "staff" });
      }

      if (cmd === "xcheck" && arg) {
        SimService.requestXCheck(body.regionId, arg);
        return Response.json({ ok: true, handled: "xcheck" });
      }

      if (cmd === "resolve" && arg) {
        SimService.resolveIncident(body.regionId, arg);
        return Response.json({ ok: true, handled: "resolve" });
      }

      return Response.json({ ok: true, handled: "unknown_command" });
    }

    SimService.pushComms(body.regionId, {
      from: body.outpostCode,
      text: trimmed,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
