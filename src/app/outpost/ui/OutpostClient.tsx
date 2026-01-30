"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connectWs, type WsEnvelope } from "@/lib/wsClient";
import HelpOverlay, { useFirstRunHelp } from "@/lib/helpOverlay";
import { useToast } from "@/lib/useToast";

type IncidentArc = "EAST" | "WEST" | "NORTH" | "SOUTH" | "EXTERNAL";

type Incident = {
  id: string;
  arc: IncidentArc;
  severity: 1 | 2 | 3 | 4;
  createdAt: number;
  resolvedAt?: number;
  what: string;
  where: string;
  assignedTo?: string;
};

type Region = {
  regionId: string;
  posture: "OPEN" | "GUIDED" | "CONTROLLED";
  arcMarks: Record<IncidentArc, "HOT" | "WATCH" | "CLEAR">;
  whoStaffed: Record<string, boolean>;
};

type Comms = {
  id: string;
  ts: number;
  from: string;
  text: string;
  spoofed?: boolean;
  flagged?: boolean;
};

type Bootstrap = {
  region: Region;
  incidents: Incident[];
  tasks: Task[];
  comms: Comms[];
};

type PosturePayload = { posture: Region["posture"] };

type Task = {
  id: string;
  incidentId: string;
  outpostCode: string;
  createdAt: number;
  ackedAt?: number;
  completedAt?: number;
  status: "OPEN" | "ACKED" | "COMPLETED";
  text: string;
  report?: { ts: number; text: string };
};

export default function OutpostClient({ regionId, outpostCode }: { regionId: string; outpostCode: string }) {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [line, setLine] = useState<string>("");
  const [terminal, setTerminal] = useState<string[]>([]);

  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const help = useFirstRunHelp("blacksky_help_outpost_v1");

  const wsRef = useRef<ReturnType<typeof connectWs> | null>(null);

  useEffect(() => {
    if (!regionId) return;

    fetch(`/api/rco/bootstrap?regionId=${encodeURIComponent(regionId)}`)
      .then((r) => r.json())
      .then((data) => {
        setBoot({ region: data.region, incidents: data.incidents, tasks: data.tasks ?? [], comms: data.comms });
        setTerminal((prev) => [...prev, `CONNECTED region=${regionId} outpost=${outpostCode || "?"}`]);
      })
      .catch(() => setBoot(null));
  }, [regionId, outpostCode]);

  const applyEnvelope = useCallback((env: WsEnvelope) => {
    setBoot((prev) => {
      if (!prev) return prev;

      if (env.type === "incident/open") {
        return { ...prev, incidents: [env.payload as Incident, ...prev.incidents] };
      }

      if (env.type === "incident/update" || env.type === "incident/resolve") {
        const inc = env.payload as Incident;
        return { ...prev, incidents: prev.incidents.map((i) => (i.id === inc.id ? inc : i)) };
      }

      if (env.type === "comms/message") {
        const msg = env.payload as Comms;
        return { ...prev, comms: [...prev.comms.slice(-49), msg] };
      }

      if (env.type === "task/open") {
        const task = env.payload as Task;
        return { ...prev, tasks: [task, ...prev.tasks] };
      }

      if (env.type === "task/update") {
        const task = env.payload as Task;
        return { ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? task : t)) };
      }

      if (env.type === "region/update") {
        const patch = env.payload as Partial<Region>;
        return { ...prev, region: { ...prev.region, ...patch } };
      }

      if (env.type === "comms/posture") {
        const posture = (env.payload as PosturePayload).posture;
        return { ...prev, region: { ...prev.region, posture } };
      }

      return prev;
    });

    if (env.type === "comms/message") {
      const msg = env.payload as Comms;
      setTerminal((prev) => [...prev.slice(-200), `${new Date(msg.ts).toLocaleTimeString()} [${msg.from}] ${msg.text}${msg.flagged ? " (FLAG)" : ""}`]);
    }

    if (env.type === "task/open") {
      const task = env.payload as Task;
      if (task.outpostCode === outpostCode) {
        setTerminal((prev) => [...prev.slice(-200), `TASK ${task.id.slice(0, 8)} assigned: ${task.text}`]);
      }
    }
  }, [outpostCode]);

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

  const assigned = useMemo(() => {
    if (!boot) return [];
    return boot.incidents
      .filter((i) => !i.resolvedAt)
      .filter((i) => i.assignedTo === outpostCode)
      .slice(0, 10);
  }, [boot, outpostCode]);

  const myOpenTasks = useMemo(() => {
    if (!boot) return [];
    return boot.tasks
      .filter((t) => t.outpostCode === outpostCode)
      .filter((t) => t.status !== "COMPLETED")
      .slice(0, 10);
  }, [boot, outpostCode]);

  async function submit() {
    if (!line.trim()) return;

    const toSend = line;
    setLine("");
    setTerminal((prev) => [...prev, `> ${toSend}`]);

    const res = await fetch(`/api/terminal/line`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ regionId, outpostCode, line: toSend }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      toast.show("err", txt || `HTTP ${res.status}`);
    }
  }

  const runCmd = useCallback(
    async (cmd: string) => {
      setBusy(cmd.split(" ")[0] ?? "cmd");
      try {
        const res = await fetch(`/api/terminal/line`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ regionId, outpostCode, line: cmd }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `HTTP ${res.status}`);
        }
        toast.show("ok", cmd);
      } catch (err) {
        toast.show("err", err instanceof Error ? err.message : "Command failed");
      } finally {
        setBusy(null);
      }
    },
    [outpostCode, regionId, toast]
  );

  if (!regionId || !outpostCode) {
    return (
      <div className="page">
        <div className="panel">
          <div className="h1">OUTPOST</div>
          <div className="muted">Missing params. Try: /outpost?regionId=glasslands-01&outpostCode=860</div>
        </div>
      </div>
    );
  }

  if (!boot) {
    return (
      <div className="page">
        <div className="panel">
          <div className="h1">OUTPOST · {outpostCode}</div>
          <div className="muted">Loading bootstrap…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {toast.toast ? (
        <div className={`toast ${toast.toast.kind}`}>
          <span className="toastTag mono">{toast.toast.kind.toUpperCase()}</span>
          <span className="mono">{toast.toast.msg}</span>
        </div>
      ) : null}
      <HelpOverlay
        storageKey="blacksky_help_outpost_v1"
        title="What is an Outpost?"
        isOpen={help.open}
        onClose={help.dismiss}
        body={
          <div>
            <div className="panelTitle">Your role</div>
            <div>
              This is a single outpost’s console. You can send radio lines and execute simple commands. In the next phase,
              this page will receive assigned tasks from RCO.
            </div>

            <div className="panelSubTitle">Try this</div>
            <div className="mono">
              Type a line and hit Enter to transmit.
              <br />
              /xcheck &lt;incidentId&gt;
              <br />
              /resolve &lt;incidentId&gt;
              <br />
              /staff off
            </div>
          </div>
        }
      />

      <div className="topbar">
        <div className="h1">OUTPOST · {outpostCode}</div>
        <div className="chips">
          <span className={`chip chip-${boot.region.posture.toLowerCase()}`}>POSTURE: {boot.region.posture}</span>
          <span className="chip">STAFF: {boot.region.whoStaffed[outpostCode] ? "ON" : "OFF"}</span>
        </div>
        <div className="spacer" />
        <button className="btn" onClick={() => help.setOpen(true)}>
          HELP
        </button>
      </div>

      <div className="grid2">
        <section className="panel">
          <div className="panelTitle">Terminal</div>
          <div className="terminal">
            {terminal.slice(-200).map((l, idx) => (
              <div key={idx} className="terminalLine">
                {l}
              </div>
            ))}
          </div>

          <div className="row gap">
            <input
              className="input"
              ref={(el) => {
                inputRef.current = el;
              }}
              value={line}
              onChange={(e) => setLine(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Type… (/ack <taskId>, /report <taskId> <text>, /complete <taskId>, /staff off)"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <button className="btn" onClick={submit}>Send</button>
          </div>
        </section>

        <section className="panel">
          <div className="panelTitle">Status</div>
          <div className="kv">
            <div className="k">Region</div>
            <div className="v">{boot.region.regionId}</div>
            <div className="k">Arc</div>
            <div className="v">N {boot.region.arcMarks.NORTH} · S {boot.region.arcMarks.SOUTH} · E {boot.region.arcMarks.EAST} · W {boot.region.arcMarks.WEST} · X {boot.region.arcMarks.EXTERNAL}</div>
            <div className="k">Alerts</div>
            <div className="v">Assigned open: {assigned.length} · Tasks: {myOpenTasks.length}</div>
          </div>

          <div className="panelSubTitle">Task Inbox</div>
          <div className="list">
            {myOpenTasks.length ? (
              myOpenTasks.map((t) => (
                <div key={t.id} className="listItemStatic">
                  <div className="row">
                    <div className="sev">{t.status}</div>
                    <div className="spacer" />
                    <div className="muted mono">{t.id.slice(0, 8)}</div>
                  </div>
                  <div className="tight">{t.text}</div>
                  {t.report ? <div className="muted tight">Last report: {t.report.text}</div> : null}
                  <div className="row gap" style={{ marginTop: 8 }}>
                    <button
                      className="btn btnSmall"
                      disabled={!!busy}
                      onClick={() => runCmd(`/ack ${t.id}`)}
                    >
                      ACK
                    </button>
                    <button
                      className="btn btnSmall"
                      disabled={!!busy}
                      onClick={() => {
                        setLine(`/report ${t.id} `);
                        window.setTimeout(() => inputRef.current?.focus(), 0);
                      }}
                    >
                      REPORT
                    </button>
                    <button
                      className="btn btnSmall"
                      disabled={!!busy}
                      onClick={() => runCmd(`/complete ${t.id}`)}
                    >
                      COMPLETE
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="muted">No tasks.</div>
            )}
          </div>

          <div className="panelSubTitle">Assigned Incidents</div>
          <div className="list">
            {assigned.length ? (
              assigned.map((i) => (
                <div key={i.id} className="listItemStatic">
                  <div className="row">
                    <div className={`sev sev-${i.severity}`}>S{i.severity}</div>
                    <div className="mono">{i.arc}</div>
                    <div className="spacer" />
                    <div className="muted mono">{i.id.slice(0, 8)}</div>
                  </div>
                  <div className="tight">{i.what}</div>
                  <div className="muted tight">{i.where}</div>
                </div>
              ))
            ) : (
              <div className="muted">No assignments.</div>
            )}
          </div>

          <div className="panelSubTitle">Recent Comms</div>
          <div className="comms">
            {boot.comms.slice(-12).map((m) => (
              <div key={m.id} className={`commsLine ${m.spoofed ? "spoof" : ""}`}>
                <span className="mono muted">{new Date(m.ts).toLocaleTimeString()}</span>
                <span className="mono from">[{m.from}]</span>
                <span className="text">{m.text}</span>
                {m.flagged ? <span className="flag">FLAG</span> : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
