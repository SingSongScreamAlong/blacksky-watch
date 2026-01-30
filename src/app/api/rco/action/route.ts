import { SimService, type CommsPosture } from "@/server/sim/SimService";

export const runtime = "nodejs";

type ActionBody =
  | {
      regionId: string;
      type: "ACK";
      incidentId: string;
      outpostCode?: string;
    }
  | {
      regionId: string;
      type: "ASSIGN";
      incidentId: string;
      outpostCode: string;
      taskText?: string;
    }
  | {
      regionId: string;
      type: "XCHECK";
      incidentId: string;
    }
  | {
      regionId: string;
      type: "POSTURE";
      posture: CommsPosture;
    }
  | {
      regionId: string;
      type: "RESOLVE";
      incidentId: string;
    };

export async function POST(req: Request) {
  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.regionId) return Response.json({ error: "regionId is required" }, { status: 400 });

  try {
    if (body.type === "ACK") {
      const region = SimService.getRegion(body.regionId);
      const inc = region.incidents.find((i) => i.id === body.incidentId);
      if (!inc) return Response.json({ error: "incident not found" }, { status: 404 });

      if (!inc.acknowledgedAt) {
        const now = Date.now();
        inc.acknowledgedAt = now;
        inc.lastUpdateAt = now;
        SimService.updateIncident(body.regionId, body.incidentId, {
          acknowledgedAt: inc.acknowledgedAt,
        });
      }

      return Response.json({ ok: true });
    }

    if (body.type === "ASSIGN") {
      SimService.updateIncident(body.regionId, body.incidentId, {
        assignedTo: body.outpostCode,
      });

      const taskText = body.taskText ?? "Investigate + report";
      SimService.createTask(body.regionId, body.incidentId, body.outpostCode, taskText);

      SimService.pushComms(body.regionId, {
        from: "OPS",
        incidentId: body.incidentId,
        text: `Tasking ${body.outpostCode}: ${taskText}`,
      });

      return Response.json({ ok: true });
    }

    if (body.type === "XCHECK") {
      SimService.requestXCheck(body.regionId, body.incidentId);
      return Response.json({ ok: true });
    }

    if (body.type === "POSTURE") {
      SimService.setPosture(body.regionId, body.posture);
      return Response.json({ ok: true });
    }

    if (body.type === "RESOLVE") {
      SimService.resolveIncident(body.regionId, body.incidentId);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
