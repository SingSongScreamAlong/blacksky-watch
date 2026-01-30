"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connectWs, type WsEnvelope } from "@/lib/wsClient";
import HelpOverlay, { useFirstRunHelp } from "@/lib/helpOverlay";

type IncidentArc = "EAST" | "WEST" | "NORTH" | "SOUTH" | "EXTERNAL";

type Incident = {
  id: string;
  regionId: string;
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
    confidence: number;
    suspicion: number;
    phantom?: boolean;
    collapsed?: boolean;
    xcheck: {
      requestedAt?: number;
      respondedAt?: number;
      response?: "CONFIRM" | "DENY" | "NOJOY";
    };
  };
  dot: { x: number; y: number };
};

type Region = {
  regionId: string;
  posture: "OPEN" | "GUIDED" | "CONTROLLED";
  arcMarks: Record<IncidentArc, "HOT" | "WATCH" | "CLEAR">;
  whoStaffed: Record<string, boolean>;
  session: { startedAt: number };
};

type Comms = {
  id: string;
  ts: number;
  from: string;
  text: string;
  arc?: IncidentArc;
  incidentId?: string;
  spoofed?: boolean;
  flagged?: boolean;
};

type Leaderboard = {
  discipline: number;
  xchecks: number;
  ackAvgMs: number;
};

type Bootstrap = {
  region: Region;
  incidents: Incident[];
  comms: Comms[];
  aar: { ts: number; type: string; summary: string; incidentId?: string }[];
  leaderboard: Leaderboard;
};

type PosturePayload = { posture: Region["posture"] };
type AarPayload = { ts: number; type: string; summary: string; incidentId?: string };

function confidenceBand(inc: Incident): string {
  if (inc.verification.confidence >= 0.72) return "CONFIRMED";
  if (inc.severity >= 3 && inc.verification.suspicion >= 0.65) return "PHANTOM SUSPECT";
  return "UNVERIFIED";
}

function sortKey(inc: Incident) {
  const unverifiedBoost = inc.verification.confidence < 0.72 ? 10 : 0;
  const activeBoost = inc.resolvedAt ? -100 : 0;
  return inc.severity * 100 + unverifiedBoost + activeBoost;
}

function nowMs() {
  return Date.now();
}

function msToClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = `${s % 60}`.padStart(2, "0");
  return `${m}:${ss}`;
}

export default function RcoClient({ regionId }: { regionId: string }) {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [taskText, setTaskText] = useState<string>("");
  const [now, setNow] = useState<number>(() => nowMs());

  const help = useFirstRunHelp("blacksky_help_rco_v1");

  const wsRef = useRef<ReturnType<typeof connectWs> | null>(null);

  const sortedIncidents = useMemo(() => {
    const list = [...(boot?.incidents ?? [])];
    list.sort((a, b) => sortKey(b) - sortKey(a));
    return list;
  }, [boot?.incidents]);

  const selected = useMemo(() => {
    if (!selectedId) return sortedIncidents[0] ?? null;
    return sortedIncidents.find((i) => i.id === selectedId) ?? sortedIncidents[0] ?? null;
  }, [selectedId, sortedIncidents]);

  useEffect(() => {
    if (!regionId) return;

    const t = window.setInterval(() => setNow(nowMs()), 250);
    return () => window.clearInterval(t);
  }, [regionId]);

  useEffect(() => {
    if (!regionId) return;

    let cancelled = false;
    fetch(`/api/rco/bootstrap?regionId=${encodeURIComponent(regionId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setBoot(data);
        setSelectedId((prev) => prev ?? (data.incidents?.[0]?.id ?? null));
      })
      .catch(() => {
        if (cancelled) return;
        setBoot(null);
      });

    return () => {
      cancelled = true;
    };
  }, [regionId]);

  const applyEnvelope = useCallback((env: WsEnvelope) => {
    setBoot((prev) => {
      if (!prev) return prev;

      if (env.type === "incident/open") {
        return { ...prev, incidents: [env.payload as Incident, ...prev.incidents] };
      }

      if (env.type === "incident/update" || env.type === "incident/resolve") {
        const inc = env.payload as Incident;
        return {
          ...prev,
          incidents: prev.incidents.map((i) => (i.id === inc.id ? inc : i)),
        };
      }

      if (env.type === "comms/message") {
        const msg = env.payload as Comms;
        return { ...prev, comms: [...prev.comms.slice(-49), msg] };
      }

      if (env.type === "comms/posture") {
        const posture = (env.payload as PosturePayload).posture;
        return { ...prev, region: { ...prev.region, posture } };
      }

      if (env.type === "region/update") {
        const patch = env.payload as Partial<Region>;
        return { ...prev, region: { ...prev.region, ...patch } };
      }

      if (env.type === "session/aar") {
        return { ...prev, aar: [...prev.aar.slice(-49), env.payload as AarPayload] };
      }

      return prev;
    });
  }, []);

  useEffect(() => {
    if (!regionId) return;

    wsRef.current?.close();

    wsRef.current = connectWs({
      rooms: [`region:${regionId}`, `comms:${regionId}`, `session:${regionId}`],
      onEnvelope: applyEnvelope,
    });

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [applyEnvelope, regionId]);

  const postAction = useCallback(async (body: unknown) => {
    await fetch(`/api/rco/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }, []);

  const ackOrAssign = useCallback(async () => {
    if (!selected) return;

    if (!selected.acknowledgedAt) {
      await postAction({ regionId, type: "ACK", incidentId: selected.id });
      return;
    }

    const outpost = selected.assignedTo ?? "860";
    await postAction({
      regionId,
      type: "ASSIGN",
      incidentId: selected.id,
      outpostCode: outpost,
      taskText: taskText || undefined,
    });
  }, [postAction, regionId, selected, taskText]);

  const requestXcheck = useCallback(async () => {
    if (!selected) return;
    await postAction({ regionId, type: "XCHECK", incidentId: selected.id });
  }, [postAction, regionId, selected]);

  const setPosture = useCallback(
    async (posture: Region["posture"]) => {
      await postAction({ regionId, type: "POSTURE", posture });
    },
    [postAction, regionId]
  );

  const sendTemplate = useCallback(
    async (n: number) => {
      if (!selected) return;

      const templates: Record<number, string> = {
        1: "Hold position. Observe. Report all movement.",
        2: "Move to vantage. Confirm/deny contact.",
        3: "Establish checkpoint. Verify IDs.",
        4: "Sweep grid. Check for staging/supplies.",
        5: "Break contact. Fall back. Maintain comms.",
      };

      setTaskText(templates[n] ?? "");
      await postAction({
        regionId,
        type: "ASSIGN",
        incidentId: selected.id,
        outpostCode: selected.assignedTo ?? "860",
        taskText: templates[n],
      });
    },
    [postAction, regionId, selected]
  );

  async function director(kind: "phantom" | "spoof") {
    await fetch(`/api/rco/director`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ regionId, kind }),
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!sortedIncidents.length) return;

      if (e.key === "j" || e.key === "J") {
        const idx = selected ? sortedIncidents.findIndex((i) => i.id === selected.id) : -1;
        const next = sortedIncidents[Math.min(sortedIncidents.length - 1, idx + 1)] ?? sortedIncidents[0];
        setSelectedId(next.id);
        e.preventDefault();
      }

      if (e.key === "k" || e.key === "K") {
        const idx = selected ? sortedIncidents.findIndex((i) => i.id === selected.id) : 0;
        const prev = sortedIncidents[Math.max(0, idx - 1)] ?? sortedIncidents[0];
        setSelectedId(prev.id);
        e.preventDefault();
      }

      if (e.key === "Enter") {
        ackOrAssign();
        e.preventDefault();
      }

      if (e.key === "x" || e.key === "X") {
        requestXcheck();
        e.preventDefault();
      }

      if (!e.shiftKey && /^[1-5]$/.test(e.key)) {
        sendTemplate(parseInt(e.key, 10));
        e.preventDefault();
      }

      if (e.shiftKey && (e.key === "1" || e.key === "2" || e.key === "3")) {
        const preset = e.key === "1" ? "OPEN" : e.key === "2" ? "GUIDED" : "CONTROLLED";
        setPosture(preset);
        e.preventDefault();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ackOrAssign, requestXcheck, sendTemplate, setPosture, sortedIncidents, selected]);

  if (!regionId) {
    return (
      <div className="page">
        <div className="panel">
          <div className="h1">RCO</div>
          <div className="muted">Missing regionId. Try: /rco?regionId=glasslands-01</div>
        </div>
      </div>
    );
  }

  if (!boot) {
    return (
      <div className="page">
        <div className="panel">
          <div className="h1">RCO · {regionId}</div>
          <div className="muted">Loading bootstrap…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <HelpOverlay
        storageKey="blacksky_help_rco_v1"
        title="What is RCO?"
        isOpen={help.open}
        onClose={help.dismiss}
        body={
          <div className="overlayContent">
            <div className="panelTitle">Your role</div>
            <div>
              You’re the race-control / radio-control operator for a region. Incidents appear with uncertainty. Your job is
              to acknowledge them, verify them, and task outposts.
            </div>

            <div className="panelSubTitle">Basic loop</div>
            <div className="mono">
              1) Select incident (J/K)
              <br />
              2) Enter = ACK
              <br />
              3) Enter again = Assign (sends tasking)
              <br />
              4) X = XCHECK (pushes confidence up/down)
              <br />
              5) Watch comms + map to decide if it’s real or a phantom
            </div>

            <div className="panelSubTitle">Hotkeys</div>
            <div className="mono">
              J/K: next/previous incident
              <br />
              Enter: ACK / Assign
              <br />
              X: request XCHECK
              <br />
              1–5: send task templates
              <br />
              Shift+1–3: posture presets (OPEN/GUIDED/CONTROLLED)
            </div>
          </div>
        }
      />

      <div className="topbar">
        <div className="h1">RCO · {boot.region.regionId}</div>
        <div className="chips">
          <span className={`chip chip-${boot.region.posture.toLowerCase()}`}>POSTURE: {boot.region.posture}</span>
          <span className="chip">INC: {sortedIncidents.filter((i) => !i.resolvedAt).length}</span>
          <span className="chip">COMMS: {boot.comms.length}</span>
        </div>
        <div className="spacer" />
        <button className="btn" onClick={() => help.setOpen(true)}>
          HELP
        </button>
        {process.env.NODE_ENV === "development" ? (
          <div className="row gap">
            <button className="btn" onClick={() => director("phantom")}>DEV: phantom</button>
            <button className="btn" onClick={() => director("spoof")}>DEV: spoof</button>
          </div>
        ) : null}
      </div>

      <div className="grid3">
        <section className="panel">
          <div className="panelTitle">Live Incident Log</div>
          <div className="list">
            {sortedIncidents.map((inc) => {
              const band = confidenceBand(inc);
              const active = inc.id === selected?.id;
              return (
                <button
                  key={inc.id}
                  className={`listItem ${active ? "active" : ""}`}
                  onClick={() => setSelectedId(inc.id)}
                >
                  <div className="row">
                    <div className={`sev sev-${inc.severity}`}>S{inc.severity}</div>
                    <div className="mono">{inc.arc}</div>
                    <div className="spacer" />
                    <div className={`band band-${band.replaceAll(" ", "-").toLowerCase()}`}>{band}</div>
                  </div>
                  <div className="tight">{inc.what}</div>
                  <div className="muted tight">{inc.where}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panelTitle">Arc Map</div>
          <div className="map">
            {sortedIncidents
              .filter((i) => !i.resolvedAt)
              .slice(0, 40)
              .map((inc) => {
                const age = now - inc.createdAt;
                const fade = 240_000;
                let opacity = 1 - Math.min(1, age / fade);

                // Remain faint if OPEN and severity>=3
                if (boot.region.posture === "OPEN" && inc.severity >= 3) {
                  opacity = Math.max(opacity, 0.12);
                }

                const size = inc.severity >= 4 ? 12 : inc.severity >= 3 ? 10 : 8;
                const active = inc.id === selected?.id;

                return (
                  <button
                    key={inc.id}
                    className={`dot ${active ? "dotActive" : ""}`}
                    style={{
                      left: `${Math.floor(inc.dot.x * 1000) / 10}%`,
                      top: `${Math.floor(inc.dot.y * 1000) / 10}%`,
                      width: size,
                      height: size,
                      opacity,
                    }}
                    onClick={() => setSelectedId(inc.id)}
                    title={`${inc.arc} S${inc.severity} · ${inc.what}`}
                  />
                );
              })}

            <div className="mapLegend">
              <div className="row gap">
                <span className={`chip arc-${boot.region.arcMarks.NORTH.toLowerCase()}`}>N {boot.region.arcMarks.NORTH}</span>
                <span className={`chip arc-${boot.region.arcMarks.SOUTH.toLowerCase()}`}>S {boot.region.arcMarks.SOUTH}</span>
                <span className={`chip arc-${boot.region.arcMarks.EAST.toLowerCase()}`}>E {boot.region.arcMarks.EAST}</span>
                <span className={`chip arc-${boot.region.arcMarks.WEST.toLowerCase()}`}>W {boot.region.arcMarks.WEST}</span>
                <span className={`chip arc-${boot.region.arcMarks.EXTERNAL.toLowerCase()}`}>X {boot.region.arcMarks.EXTERNAL}</span>
              </div>
            </div>
          </div>

          <div className="muted small">Hotkeys: J/K select · Enter ACK/Assign · X XCHECK · 1–5 templates · Shift+1–3 posture</div>
        </section>

        <section className="panel">
          <div className="panelTitle">Incident Detail</div>

          {!selected ? (
            <div className="muted">No incident selected.</div>
          ) : (
            <>
              <div className="detailHeader">
                <div className={`sev sev-${selected.severity}`}>S{selected.severity}</div>
                <div className="mono">{selected.arc}</div>
                <div className="spacer" />
                <div className={`band band-${confidenceBand(selected).replaceAll(" ", "-").toLowerCase()}`}>{confidenceBand(selected)}</div>
              </div>

              <div className="kv">
                <div className="k">Who</div>
                <div className="v">{selected.who}</div>
                <div className="k">What</div>
                <div className="v">{selected.what}</div>
                <div className="k">Where</div>
                <div className="v">{selected.where}</div>
                <div className="k">Why</div>
                <div className="v">{selected.why}</div>
              </div>

              <div className="row gap">
                <button className="btn" onClick={ackOrAssign}>{selected.acknowledgedAt ? "Assign" : "ACK"}</button>
                <button className="btn" onClick={requestXcheck}>XCHECK</button>
                <button className="btn" onClick={() => postAction({ regionId, type: "RESOLVE", incidentId: selected.id })}>Resolve</button>
              </div>

              <div className="panelSubTitle">Task Composer</div>
              <textarea
                className="textarea"
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                placeholder="Tasking text… (1–5 hotkeys send templates)"
              />

              <div className="row gap">
                <button className="btn" onClick={() => setPosture("OPEN")}>OPEN</button>
                <button className="btn" onClick={() => setPosture("GUIDED")}>GUIDED</button>
                <button className="btn" onClick={() => setPosture("CONTROLLED")}>CONTROLLED</button>
              </div>

              <div className="panelSubTitle">Leaderboard (session)</div>
              <div className="kv">
                <div className="k">Discipline</div>
                <div className="v">{boot.leaderboard.discipline}</div>
                <div className="k">XCHECKs</div>
                <div className="v">{boot.leaderboard.xchecks}</div>
                <div className="k">ACK avg</div>
                <div className="v">{boot.leaderboard.ackAvgMs ? msToClock(boot.leaderboard.ackAvgMs) : "—"}</div>
              </div>

              <div className="panelSubTitle">Recent Comms</div>
              <div className="comms">
                {boot.comms.slice(-10).map((m) => (
                  <div key={m.id} className={`commsLine ${m.spoofed ? "spoof" : ""}`}>
                    <span className="mono muted">{new Date(m.ts).toLocaleTimeString()}</span>
                    <span className="mono from">[{m.from}]</span>
                    <span className="text">{m.text}</span>
                    {m.flagged ? <span className="flag">FLAG</span> : null}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
