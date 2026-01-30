"use client";

import { useCallback, useMemo, useState } from "react";
import { useToast } from "@/lib/useToast";

type Template = {
  title: string;
  text: string;
};

type TemplateGroup = {
  title: string;
  templates: Template[];
};

export default function ManualClient({ groups }: { groups: TemplateGroup[] }) {
  const toastApi = useToast(1800);
  const showToast = toastApi.show;

  const [intent, setIntent] = useState<"confirm" | "observe" | "nojoy" | "id">("confirm");
  const [reportStyle, setReportStyle] = useState<"minimal" | "salute" | "nojoy">("minimal");
  const [taskId, setTaskId] = useState<string>("");

  const copy = useCallback(
    async (t: string) => {
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(t);
        } else {
          const ta = document.createElement("textarea");
          ta.value = t;
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          ta.style.top = "-9999px";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        showToast("ok", "Copied");
      } catch {
        showToast("err", "Copy failed");
      }
    },
    [showToast]
  );

  const generated = useMemo(() => {
    let taskText = "";
    if (intent === "confirm") {
      taskText = "Move to vantage. Confirm/deny contact. Report movement/count/direction.";
    } else if (intent === "observe") {
      taskText = "Observe 3–5 minutes. Report movement/count/direction. Include exact location + time.";
    } else if (intent === "nojoy") {
      taskText = "Conduct negative sweep. If NOJOY, report line-of-sight and coverage area.";
    } else {
      taskText = "Verify IDs/checkpoint. Report any irregularities or deviations.";
    }

    let reportText = "";
    if (reportStyle === "salute") {
      reportText = "SALUTE\nS: (size)\nA: (activity)\nL: (location)\nU: (unit/ID)\nT: (time)\nE: (equipment)";
    } else if (reportStyle === "nojoy") {
      reportText = "NOJOY at L=... (T=...). Clear line of sight; no movement observed.";
    } else {
      reportText = "L=..., T=..., OBS=..., MOV=..., CNT=...";
    }

    const id = taskId.trim() || "<taskId>";

    const reportCmd = `/report ${id} ${reportText.replace(/\n/g, " ")}`;
    const ackCmd = `/ack ${id}`;
    const completeCmd = `/complete ${id}`;

    return { taskText, reportText, reportCmd, ackCmd, completeCmd };
  }, [intent, reportStyle, taskId]);

  return (
    <div style={{ marginTop: 16 }}>
      <div className="panelTitle">Quick Reference Card</div>
      <div className="grid2">
        <div className="panel">
          <div className="panelTitle">Triage</div>
          <div className="mono">
            - S4/S3 + low confidence: ACK → ASSIGN → XCHECK
            <br />
            - Suspicion rising: XCHECK + negative confirmation task
            <br />
            - Stable S2/S1: observe &amp; report, close tasks fast
          </div>
        </div>
        <div className="panel">
          <div className="panelTitle">Posture</div>
          <div className="mono">
            OPEN: speed
            <br />
            GUIDED: reduce noise
            <br />
            CONTROLLED: deception / high severity
          </div>
        </div>
      </div>

      <div id="task-generator" style={{ marginTop: 16 }}>
        <div className="panelTitle">Task Generator</div>
        <div className="row gap" style={{ flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
          <div className="mono muted">Intent</div>
          <select className="select" value={intent} onChange={(e) => setIntent(e.target.value as typeof intent)}>
            <option value="confirm">Confirm / deny</option>
            <option value="observe">Observe &amp; report</option>
            <option value="nojoy">Negative sweep (NOJOY)</option>
            <option value="id">ID / checkpoint</option>
          </select>

          <div className="mono muted" style={{ marginLeft: 8 }}>
            Report
          </div>
          <select
            className="select"
            value={reportStyle}
            onChange={(e) => setReportStyle(e.target.value as typeof reportStyle)}
          >
            <option value="minimal">Minimal</option>
            <option value="salute">SALUTE</option>
            <option value="nojoy">NOJOY</option>
          </select>

          <div className="mono muted" style={{ marginLeft: 8 }}>
            Task ID
          </div>
          <input
            className="input"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            placeholder="task_..."
            style={{ width: 180 }}
          />
        </div>

        <div className="grid2" style={{ marginTop: 10 }}>
          <div className="panel">
            <div className="panelTitle">Recommended task text</div>
            <div className="mono muted" style={{ whiteSpace: "pre-wrap" }}>
              {generated.taskText}
            </div>
            <div className="row gap" style={{ marginTop: 10 }}>
              <button className="btn btnSmall" onClick={() => copy(generated.taskText)}>
                Copy task text
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="panelTitle">Matching report template</div>
            <div className="mono muted" style={{ whiteSpace: "pre-wrap" }}>
              {generated.reportText}
            </div>
            <div className="row gap" style={{ marginTop: 10, flexWrap: "wrap" }}>
              <button className="btn btnSmall" onClick={() => copy(generated.reportText)}>
                Copy report text
              </button>
              <button className="btn btnSmall" onClick={() => copy(generated.reportCmd)}>
                Copy /report
              </button>
              <button className="btn btnSmall" onClick={() => copy(generated.ackCmd)}>
                Copy /ack
              </button>
              <button className="btn btnSmall" onClick={() => copy(generated.completeCmd)}>
                Copy /complete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="panelTitle">Templates (click to copy)</div>
        {groups.map((g) => (
          <div key={g.title} style={{ marginTop: 10 }}>
            <div className="mono muted">{g.title}</div>
            <div className="list" style={{ marginTop: 8 }}>
              {g.templates.map((t) => (
                <div key={`${g.title}:${t.title}`} className="listItemStatic">
                  <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
                    <div className="mono">{t.title}</div>
                    <button className="btn btnSmall" onClick={() => copy(t.text)}>
                      Copy
                    </button>
                  </div>
                  <div className="mono muted" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                    {t.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {toastApi.toast && (
        <div className={`toast ${toastApi.toast.kind}`}>
          <div className="mono">{toastApi.toast.msg}</div>
        </div>
      )}
    </div>
  );
}
