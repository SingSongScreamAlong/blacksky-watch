import { WsHub, type WsEnvelope } from "@/server/ws/WsHub";

export type RegionId = string;
export type IncidentId = string;

export type IncidentArc = "EAST" | "WEST" | "NORTH" | "SOUTH" | "EXTERNAL";
export type CommsPosture = "OPEN" | "GUIDED" | "CONTROLLED";
export type ArcMark = "HOT" | "WATCH" | "CLEAR";

export type ConfidenceBand = "CONFIRMED" | "UNVERIFIED" | "PHANTOM_SUSPECT";

export type CommsMessage = {
  id: string;
  ts: number;
  from: string;
  text: string;
  arc?: IncidentArc;
  incidentId?: IncidentId;
  spoofed?: boolean;
  flagged?: boolean;
};

export type XCheckState = {
  requestedAt?: number;
  respondedAt?: number;
  response?: "CONFIRM" | "DENY" | "NOJOY";
};

export type Incident = {
  id: IncidentId;
  regionId: RegionId;
  arc: IncidentArc;
  severity: 1 | 2 | 3 | 4;

  createdAt: number;
  lastUpdateAt: number;
  resolvedAt?: number;

  who: string;
  what: string;
  where: string;
  why: string;

  acknowledgedAt?: number;
  assignedTo?: string;

  verification: {
    confidence: number; // 0..1
    suspicion: number; // 0..1
    xcheck: XCheckState;
    phantom?: boolean;
    collapsed?: boolean;
  };

  dot: {
    x: number; // 0..1
    y: number; // 0..1
  };
};

export type TaskId = string;

export type TaskStatus = "OPEN" | "ACKED" | "COMPLETED";

export type Task = {
  id: TaskId;
  regionId: RegionId;
  incidentId: IncidentId;
  outpostCode: string;
  createdAt: number;
  ackedAt?: number;
  completedAt?: number;
  status: TaskStatus;
  text: string;
  report?: {
    ts: number;
    text: string;
  };
};

export type AARLogEntry = {
  ts: number;
  type: string;
  summary: string;
  incidentId?: IncidentId;
};

export type Leaderboard = {
  discipline: number;
  xchecks: number;
  ackAvgMs: number;
};

export type RegionState = {
  regionId: RegionId;
  posture: CommsPosture;
  arcMarks: Record<IncidentArc, ArcMark>;
  whoStaffed: Record<string, boolean>; // outpostCode -> staffed
  incidents: Incident[];
  tasks: Task[];
  comms: CommsMessage[];
  aar: AARLogEntry[];
  leaderboard: Leaderboard;
  session: {
    startedAt: number;
  };
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function stableHash(str: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function seededUnitFloat(seed: number) {
  // xorshift32 -> [0,1)
  let x = seed || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

function incidentDot(incidentId: string) {
  const h = stableHash(incidentId);
  const x = seededUnitFloat(h ^ 0xa53a9d1f);
  const y = seededUnitFloat(h ^ 0x7f4a7c15);
  return { x, y };
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

class SimServiceImpl {
  private regions = new Map<RegionId, RegionState>();
  private tickHandle: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureSeeded();
    this.ensureTicking();
  }

  ensureSeeded() {
    if (this.regions.has("glasslands-01")) return;

    const startedAt = Date.now();

    const region: RegionState = {
      regionId: "glasslands-01",
      posture: "OPEN",
      arcMarks: {
        EAST: "CLEAR",
        WEST: "CLEAR",
        NORTH: "CLEAR",
        SOUTH: "CLEAR",
        EXTERNAL: "WATCH",
      },
      whoStaffed: {
        "401": true,
        "860": true,
      },
      incidents: [],
      tasks: [],
      comms: [],
      aar: [],
      leaderboard: {
        discipline: 0,
        xchecks: 0,
        ackAvgMs: 0,
      },
      session: {
        startedAt,
      },
    };

    this.regions.set(region.regionId, region);

    // Seed one mild, unverified contact so UI isn't empty.
    this.openIncident(region.regionId, {
      arc: "EXTERNAL",
      severity: 2,
      who: "CIV-REPORT",
      what: "Unconfirmed radio traffic",
      where: "Glasslands perimeter",
      why: "Possible movement near transit line",
      phantom: false,
      initialConfidence: 0.45,
    });
  }

  getRegion(regionId: RegionId): RegionState {
    this.ensureSeeded();
    const region = this.regions.get(regionId);
    if (!region) throw new Error(`Unknown regionId: ${regionId}`);
    return region;
  }

  getBootstrap(regionId: RegionId) {
    const region = this.getRegion(regionId);
    return {
      region: {
        regionId: region.regionId,
        posture: region.posture,
        arcMarks: region.arcMarks,
        whoStaffed: region.whoStaffed,
        session: region.session,
      },
      incidents: region.incidents,
      tasks: region.tasks,
      comms: region.comms.slice(-50),
      aar: region.aar.slice(-50),
      leaderboard: region.leaderboard,
    };
  }

  createTask(
    regionId: RegionId,
    incidentId: IncidentId,
    outpostCode: string,
    text: string
  ) {
    const region = this.getRegion(regionId);
    const incident = region.incidents.find((i) => i.id === incidentId);
    if (!incident) throw new Error(`Unknown incident: ${incidentId}`);

    const now = Date.now();
    const task: Task = {
      id: id("task"),
      regionId,
      incidentId,
      outpostCode,
      createdAt: now,
      status: "OPEN",
      text,
    };

    region.tasks.unshift(task);
    if (region.tasks.length > 500) region.tasks.splice(0, region.tasks.length - 500);

    this.pushAar(region, {
      ts: now,
      type: "TASK_OPEN",
      summary: `Tasking ${outpostCode} on ${incident.arc} ${incident.what}`,
      incidentId,
    });

    this.broadcast(regionId, {
      type: "task/open",
      ts: now,
      payload: task,
    });

    return task;
  }

  ackTask(regionId: RegionId, outpostCode: string, taskId: TaskId) {
    const region = this.getRegion(regionId);
    const task = region.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error(`Unknown task: ${taskId}`);
    if (task.outpostCode !== outpostCode) throw new Error("Task outpost mismatch");

    if (task.ackedAt) return task;

    const now = Date.now();
    task.ackedAt = now;
    task.status = "ACKED";

    const ackMs = now - task.createdAt;
    const oldAvg = region.leaderboard.ackAvgMs || 0;
    const samples = Math.max(1, region.leaderboard.xchecks + 1);
    region.leaderboard.ackAvgMs = Math.round(oldAvg * (1 - 1 / samples) + ackMs * (1 / samples));
    region.leaderboard.discipline += 1;

    this.pushAar(region, {
      ts: now,
      type: "TASK_ACK",
      summary: `${outpostCode} ACK task ${taskId.slice(0, 6)}`,
      incidentId: task.incidentId,
    });

    this.broadcast(regionId, {
      type: "task/update",
      ts: now,
      payload: task,
    });

    return task;
  }

  reportTask(regionId: RegionId, outpostCode: string, taskId: TaskId, text: string) {
    const region = this.getRegion(regionId);
    const task = region.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error(`Unknown task: ${taskId}`);
    if (task.outpostCode !== outpostCode) throw new Error("Task outpost mismatch");

    const now = Date.now();
    task.report = { ts: now, text };

    const incident = region.incidents.find((i) => i.id === task.incidentId);
    if (incident && !incident.resolvedAt) {
      // If a report arrives, slightly boost confidence (unless it's a phantom).
      const boost = incident.verification.phantom ? -0.04 : 0.08;
      incident.verification.confidence = clamp01(incident.verification.confidence + boost);
      incident.verification.suspicion = clamp01(incident.verification.suspicion + (incident.verification.phantom ? 0.06 : -0.03));
      incident.lastUpdateAt = now;

      this.broadcast(regionId, {
        type: "incident/update",
        ts: now,
        payload: incident,
      });
    }

    this.pushComms(regionId, {
      from: outpostCode,
      incidentId: task.incidentId,
      text: `REPORT ${taskId.slice(0, 6)}: ${text}`,
    });

    this.pushAar(region, {
      ts: now,
      type: "TASK_REPORT",
      summary: `${outpostCode} report on ${taskId.slice(0, 6)}`,
      incidentId: task.incidentId,
    });

    this.broadcast(regionId, {
      type: "task/update",
      ts: now,
      payload: task,
    });

    return task;
  }

  completeTask(regionId: RegionId, outpostCode: string, taskId: TaskId) {
    const region = this.getRegion(regionId);
    const task = region.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error(`Unknown task: ${taskId}`);
    if (task.outpostCode !== outpostCode) throw new Error("Task outpost mismatch");

    if (task.completedAt) return task;

    const now = Date.now();
    task.completedAt = now;
    task.status = "COMPLETED";

    const incident = region.incidents.find((i) => i.id === task.incidentId);
    if (incident && !incident.resolvedAt) {
      incident.verification.confidence = clamp01(incident.verification.confidence + 0.06);
      incident.verification.suspicion = clamp01(incident.verification.suspicion - 0.03);
      incident.lastUpdateAt = now;

      this.broadcast(regionId, {
        type: "incident/update",
        ts: now,
        payload: incident,
      });
    }

    region.leaderboard.discipline += 2;

    this.pushAar(region, {
      ts: now,
      type: "TASK_COMPLETE",
      summary: `${outpostCode} completed task ${taskId.slice(0, 6)}`,
      incidentId: task.incidentId,
    });

    this.broadcast(regionId, {
      type: "task/update",
      ts: now,
      payload: task,
    });

    return task;
  }

  openIncident(
    regionId: RegionId,
    opts: {
      arc: IncidentArc;
      severity: 1 | 2 | 3 | 4;
      who: string;
      what: string;
      where: string;
      why: string;
      phantom: boolean;
      initialConfidence: number;
    }
  ) {
    const region = this.getRegion(regionId);
    const now = Date.now();

    const incident: Incident = {
      id: id("inc"),
      regionId,
      arc: opts.arc,
      severity: opts.severity,
      createdAt: now,
      lastUpdateAt: now,
      who: opts.who,
      what: opts.what,
      where: opts.where,
      why: opts.why,
      verification: {
        confidence: clamp01(opts.initialConfidence),
        suspicion: opts.phantom ? 0.6 : 0.15,
        phantom: opts.phantom,
        collapsed: false,
        xcheck: {},
      },
      dot: incidentDot(`${regionId}:${now}:${opts.arc}:${opts.what}`),
    };

    region.incidents.unshift(incident);

    this.pushAar(region, {
      ts: now,
      type: "INCIDENT_OPEN",
      summary: `${incident.arc} S${incident.severity}: ${incident.what}`,
      incidentId: incident.id,
    });

    this.broadcast(regionId, {
      type: "incident/open",
      ts: now,
      payload: incident,
    });

    return incident;
  }

  updateIncident(regionId: RegionId, incidentId: IncidentId, patch: Partial<Incident>) {
    const region = this.getRegion(regionId);
    const incident = region.incidents.find((i) => i.id === incidentId);
    if (!incident) throw new Error(`Unknown incident: ${incidentId}`);

    const now = Date.now();

    Object.assign(incident, patch);
    incident.lastUpdateAt = now;

    this.broadcast(regionId, {
      type: "incident/update",
      ts: now,
      payload: incident,
    });
  }

  resolveIncident(regionId: RegionId, incidentId: IncidentId) {
    const region = this.getRegion(regionId);
    const incident = region.incidents.find((i) => i.id === incidentId);
    if (!incident) throw new Error(`Unknown incident: ${incidentId}`);

    const now = Date.now();
    incident.resolvedAt = now;
    incident.lastUpdateAt = now;

    this.pushAar(region, {
      ts: now,
      type: "INCIDENT_RESOLVE",
      summary: `Resolved: ${incident.arc} ${incident.what}`,
      incidentId,
    });

    this.broadcast(regionId, {
      type: "incident/resolve",
      ts: now,
      payload: incident,
    });
  }

  requestXCheck(regionId: RegionId, incidentId: IncidentId) {
    const region = this.getRegion(regionId);
    const incident = region.incidents.find((i) => i.id === incidentId);
    if (!incident) throw new Error(`Unknown incident: ${incidentId}`);

    const now = Date.now();

    incident.verification.xcheck.requestedAt = now;

    region.leaderboard.xchecks += 1;

    this.pushAar(region, {
      ts: now,
      type: "XCHECK_REQUEST",
      summary: `XCHECK requested on ${incident.arc} ${incident.what}`,
      incidentId,
    });

    this.broadcast(regionId, {
      type: "incident/xcheck/request",
      ts: now,
      payload: { incidentId, requestedAt: now },
    });

    // Simulate a response later.
    setTimeout(() => {
      const r = this.regions.get(regionId);
      if (!r) return;
      const inc = r.incidents.find((i) => i.id === incidentId);
      if (!inc) return;
      if (inc.resolvedAt) return;

      const respondedAt = Date.now();
      inc.verification.xcheck.respondedAt = respondedAt;

      let response: XCheckState["response"] = "CONFIRM";

      // Phantom incidents tend to get denied after a delay.
      const roll = Math.random();
      if (inc.verification.phantom) {
        response = roll < 0.7 ? "DENY" : "NOJOY";
      } else {
        response = roll < 0.75 ? "CONFIRM" : roll < 0.9 ? "NOJOY" : "DENY";
      }

      inc.verification.xcheck.response = response;

      if (response === "CONFIRM") {
        inc.verification.confidence = clamp01(inc.verification.confidence + 0.35);
        inc.verification.suspicion = clamp01(inc.verification.suspicion - 0.25);
      } else if (response === "DENY") {
        inc.verification.confidence = clamp01(inc.verification.confidence - 0.25);
        inc.verification.suspicion = clamp01(inc.verification.suspicion + 0.35);
        if (inc.verification.phantom) inc.verification.collapsed = true;
      } else {
        inc.verification.confidence = clamp01(inc.verification.confidence - 0.05);
        inc.verification.suspicion = clamp01(inc.verification.suspicion + 0.05);
      }

      inc.lastUpdateAt = respondedAt;

      this.pushAar(r, {
        ts: respondedAt,
        type: "XCHECK_RESPONSE",
        summary: `XCHECK ${response} on ${inc.arc} ${inc.what}`,
        incidentId,
      });

      this.broadcast(regionId, {
        type: "incident/xcheck/response",
        ts: respondedAt,
        payload: { incidentId, response, respondedAt },
      });

      this.broadcast(regionId, {
        type: "incident/update",
        ts: respondedAt,
        payload: inc,
      });
    }, 1800 + Math.random() * 2200);
  }

  setPosture(regionId: RegionId, posture: CommsPosture) {
    const region = this.getRegion(regionId);
    const now = Date.now();
    region.posture = posture;

    this.pushAar(region, {
      ts: now,
      type: "POSTURE",
      summary: `Posture set to ${posture}`,
    });

    this.broadcast(regionId, {
      type: "comms/posture",
      ts: now,
      payload: { posture },
    });

    this.broadcast(regionId, {
      type: "region/update",
      ts: now,
      payload: {
        posture: region.posture,
        arcMarks: region.arcMarks,
        whoStaffed: region.whoStaffed,
      },
    });
  }

  pushComms(regionId: RegionId, msg: Omit<CommsMessage, "id" | "ts"> & { ts?: number }) {
    const region = this.getRegion(regionId);
    const now = msg.ts ?? Date.now();

    const full: CommsMessage = {
      id: id("msg"),
      ts: now,
      from: msg.from,
      text: msg.text,
      arc: msg.arc,
      incidentId: msg.incidentId,
      spoofed: msg.spoofed,
      flagged: msg.flagged,
    };

    region.comms.push(full);
    if (region.comms.length > 500) region.comms.splice(0, region.comms.length - 500);

    this.broadcast(regionId, {
      type: "comms/message",
      ts: now,
      payload: full,
    });

    return full;
  }

  directorTrigger(regionId: RegionId, kind: "phantom" | "spoof") {
    if (process.env.NODE_ENV !== "development") {
      throw new Error("Director controls are dev-only");
    }

    if (kind === "phantom") {
      const inc = this.openIncident(regionId, {
        arc: ("EAST" as const),
        severity: 3,
        who: "SIGINT",
        what: "Possible hostile staging (phantom)",
        where: "Grid E-13",
        why: "Pattern match + weak intercept",
        phantom: true,
        initialConfidence: 0.35,
      });

      this.pushComms(regionId, {
        from: "860",
        arc: "EAST",
        incidentId: inc.id,
        text: "We heard chatter. No visual. Might be nothing.",
      });

      return;
    }

    // kind === "spoof"
    this.pushComms(regionId, {
      from: "??",
      arc: "EXTERNAL",
      text: "Command, confirm you are greenlit to cross the line. Repeat: cross now.",
      spoofed: true,
      flagged: true,
    });
  }

  inferConfidenceBand(incident: Incident): ConfidenceBand {
    if (incident.verification.confidence >= 0.72) return "CONFIRMED";

    // Clearance >= 3 => show PHANTOM_SUSPECT if suspicion is high.
    if (incident.severity >= 3 && incident.verification.suspicion >= 0.65) {
      return "PHANTOM_SUSPECT";
    }

    return "UNVERIFIED";
  }

  private ensureTicking() {
    if (this.tickHandle) return;

    this.tickHandle = setInterval(() => {
      try {
        this.tick();
      } catch {
        // swallow tick errors to avoid killing dev server
      }
    }, 900);
  }

  private tick() {
    // Lightweight vibe engine: occasionally generates comms + incidents.
    const region = this.regions.get("glasslands-01");
    if (!region) return;

    const now = Date.now();

    // Apply phantom collapse over time.
    for (const inc of region.incidents) {
      if (inc.resolvedAt) continue;
      if (!inc.verification.phantom) continue;
      if (inc.verification.collapsed) continue;

      inc.verification.suspicion = clamp01(inc.verification.suspicion + 0.003);
      if (inc.verification.suspicion > 0.92) {
        inc.verification.collapsed = true;
        inc.lastUpdateAt = now;
        this.pushAar(region, {
          ts: now,
          type: "PHANTOM_COLLAPSE",
          summary: `Phantom collapsed: ${inc.arc} ${inc.what}`,
          incidentId: inc.id,
        });

        this.broadcast(region.regionId, {
          type: "incident/update",
          ts: now,
          payload: inc,
        });
      }
    }

    // Ambient comms.
    if (Math.random() < 0.08) {
      const from = Math.random() < 0.5 ? "401" : "860";
      const arc: IncidentArc = Math.random() < 0.5 ? "NORTH" : "SOUTH";

      const texts = [
        "Standing by. No movement.",
        "We’re seeing intermittent lights. Unclear.",
        "Signal dropouts on our end.",
        "Copy last. Maintaining watch.",
      ];

      this.pushComms(region.regionId, {
        from,
        arc,
        text: texts[Math.floor(Math.random() * texts.length)],
      });
    }

    // Rare new incident.
    const openCount = region.incidents.filter((i) => !i.resolvedAt).length;
    if (openCount < 6 && Math.random() < 0.03) {
      const arcRoll = Math.random();
      const arc: IncidentArc =
        arcRoll < 0.2 ? "EAST" : arcRoll < 0.4 ? "WEST" : arcRoll < 0.65 ? "NORTH" : arcRoll < 0.9 ? "SOUTH" : "EXTERNAL";

      const severity = (Math.random() < 0.2 ? 4 : Math.random() < 0.45 ? 3 : 2) as 2 | 3 | 4;
      const phantom = Math.random() < 0.12;

      const inc = this.openIncident(region.regionId, {
        arc,
        severity,
        who: "SPOTTER",
        what: phantom ? "Possible contact (phantom)" : "Possible contact",
        where: `Arc ${arc} grid ${Math.floor(10 + Math.random() * 80)}-${Math.floor(10 + Math.random() * 80)}`,
        why: "Multiple weak indicators",
        phantom,
        initialConfidence: phantom ? 0.3 : 0.5,
      });

      if (severity >= 3) region.arcMarks[arc] = "HOT";
      else if (region.arcMarks[arc] === "CLEAR") region.arcMarks[arc] = "WATCH";

      this.broadcast(region.regionId, {
        type: "region/update",
        ts: now,
        payload: {
          posture: region.posture,
          arcMarks: region.arcMarks,
          whoStaffed: region.whoStaffed,
        },
      });

      this.pushComms(region.regionId, {
        from: "OPS",
        arc,
        incidentId: inc.id,
        text: `New report logged. Maintain spacing. Awaiting ACK.`,
      });
    }
  }

  private pushAar(region: RegionState, entry: AARLogEntry) {
    region.aar.push(entry);
    if (region.aar.length > 500) region.aar.splice(0, region.aar.length - 500);

    this.broadcast(region.regionId, {
      type: "session/aar",
      ts: entry.ts,
      payload: entry,
    });
  }

  private broadcast(regionId: RegionId, envelope: WsEnvelope) {
    WsHub.broadcast(`region:${regionId}`, envelope);

    if (envelope.type.startsWith("comms/") || envelope.type === "comms/message") {
      WsHub.broadcast(`comms:${regionId}`, envelope);
    }

    WsHub.broadcast(`session:${regionId}`, envelope);
  }
}

export type SimService = SimServiceImpl;

function getGlobalSim(): SimServiceImpl {
  const g = globalThis as unknown as { __blackskySim?: SimServiceImpl };
  if (!g.__blackskySim) g.__blackskySim = new SimServiceImpl();
  return g.__blackskySim;
}

export const SimService = getGlobalSim();
