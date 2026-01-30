export const runtime = "nodejs";

import ManualClient from "./ui/ManualClient";

export default function ManualPage() {
  const groups = [
    {
      title: "Task phrasebook (assignment text)",
      templates: [
        {
          title: "Confirm / deny",
          text: "Move to vantage. Confirm/deny contact. Report movement/count/direction.",
        },
        {
          title: "Observe & report",
          text: "Observe 3–5 minutes. Report movement/count/direction. Include exact location + time.",
        },
        {
          title: "Negative sweep (NOJOY)",
          text: "Conduct negative sweep. If NOJOY, report line-of-sight and coverage area.",
        },
        {
          title: "ID / checkpoint",
          text: "Verify IDs/checkpoint. Report any irregularities or deviations.",
        },
      ],
    },
    {
      title: "Report templates (freeform)",
      templates: [
        {
          title: "SALUTE (skeleton)",
          text: "SALUTE\nS: (size)\nA: (activity)\nL: (location)\nU: (unit/ID)\nT: (time)\nE: (equipment)",
        },
        {
          title: "Minimal report",
          text: "L=..., T=..., OBS=..., MOV=..., CNT=...",
        },
        {
          title: "Negative confirmation (NOJOY)",
          text: "NOJOY at L=... (T=...). Clear line of sight; no movement observed.",
        },
      ],
    },
    {
      title: "Terminal-ready (paste into outpost terminal)",
      templates: [
        {
          title: "/report (minimal)",
          text: "/report <taskId> L=..., T=..., OBS=..., MOV=..., CNT=...",
        },
        {
          title: "/report (NOJOY)",
          text: "/report <taskId> NOJOY at L=... (T=...). Clear line of sight; no movement observed.",
        },
        {
          title: "/report (SALUTE)",
          text: "/report <taskId> SALUTE S:(...) A:(...) L:(...) U:(...) T:(...) E:(...)",
        },
        {
          title: "/ack + /complete",
          text: "/ack <taskId>\n/complete <taskId>",
        },
      ],
    },
  ];

  return (
    <div className="page">
      <div className="panel">
        <div className="row" style={{ justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <div>
            <div className="h1">RCO Field Manual</div>
            <div className="muted small">SOGs, checklists, and decision rules</div>
          </div>
          <div className="chips">
            <span className="chip mono">DOC</span>
            <span className="chip mono">v0.5</span>
          </div>
        </div>

        <ManualClient groups={groups} />

        <div style={{ marginTop: 14 }}>
          <div className="panelTitle">Table of Contents</div>
          <div className="mono">
            - Quick Start
            <br />
            - Normal Ops Flow
            <br />
            - SOG-01 Initial Contact
            <br />
            - SOG-02 Tasking
            <br />
            - SOG-03 Outpost Responses
            <br />
            - SOG-04 Phantom / Uncertainty Handling
            <br />
            - SOG-05 Comms Posture
            <br />
            - Playbooks
            <br />
            - Report Templates
            <br />
            - Emergency Procedures
            <br />
            - If You See This → Do This
            <br />
            - Checklists
            <br />
            - Troubleshooting
            <br />
            - Reference (Hotkeys)
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="panelTitle">Quick Start (60 seconds)</div>
          <div className="mono">
            1) Select incident (J/K)
            <br />
            2) Enter = ACK (stops it being ignored)
            <br />
            3) Enter again = ASSIGN (creates a task)
            <br />
            4) Outpost: ACK, then REPORT, then COMPLETE
            <br />
            5) X = XCHECK when uncertainty matters
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="panelTitle">Normal Ops Flow (the loop)</div>
          <div className="mono">
            1) Detect: new incident appears
            <br />
            2) Acknowledge: ACK
            <br />
            3) Task: ASSIGN to an outpost (creates a task)
            <br />
            4) Verify: XCHECK if impact is high or details are unclear
            <br />
            5) Close: outpost REPORT + COMPLETE
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="panelTitle">SOG-01: Initial Contact (New Incident)</div>
          <div className="kv">
            <div className="k">Objective</div>
            <div className="v">Create discipline: acknowledge, task, verify. Do not freeze.</div>
            <div className="k">Trigger</div>
            <div className="v">A new incident appears in the log/map.</div>
          </div>
          <div className="mono" style={{ marginTop: 10 }}>
            A) ACK immediately if it’s not resolved.
            <br />
            B) Assign nearest staffed outpost with a short task.
            <br />
            C) If the incident is high-severity or ambiguous, request XCHECK.
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="panelTitle">SOG-02: Tasking (ASSIGN)</div>
          <div className="mono">
            Default task text:
            <br />
            - Move to vantage. Confirm/deny contact.
            <br />
            - Observe. Report movement.
            <br />
            - Verify IDs / checkpoint.
            <br />
            Notes:
            <br />
            - If you don’t assign, nothing closes the loop.
            <br />
            - Keep task text short and action-oriented.
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="panelTitle">SOG-03: Outpost Responses (Terminal)</div>
          <div className="mono">
            /ack &lt;taskId&gt;
            <br />
            /report &lt;taskId&gt; &lt;text&gt;
            <br />
            /complete &lt;taskId&gt;
            <br />
            Guidance:
            <br />
            - ACK confirms the outpost received the order.
            <br />
            - REPORT changes the incident verification (confidence/suspicion).
            <br />
            - COMPLETE closes the task loop.
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="panelTitle">SOG-04: Phantom / Uncertainty Handling</div>
          <div className="kv">
            <div className="k">Objective</div>
            <div className="v">Converge on CONFIRM or DENY. Avoid thrashing.</div>
            <div className="k">Trigger</div>
            <div className="v">Confidence is low, suspicion climbs, or reports conflict.</div>
          </div>
          <div className="mono" style={{ marginTop: 10 }}>
            A) XCHECK when uncertainty drives decisions.
            <br />
            B) Task for disproof: &quot;confirm/deny&quot;, &quot;no-joy&quot;, &quot;visual ID&quot;.
            <br />
            C) Prefer negative confirmation tasks over vague observation.
            <br />
            D) If confidence rises and suspicion drops, de-escalate posture and stop over-tasking.
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="panelTitle">SOG-05: Comms Posture</div>
          <div className="kv">
            <div className="k">Objective</div>
            <div className="v">Balance speed vs noise. Control the channel before it controls you.</div>
            <div className="k">Trigger</div>
            <div className="v">Comms volume spikes, spoofing feels likely, or coordination is breaking down.</div>
          </div>
          <div className="mono" style={{ marginTop: 10 }}>
            OPEN: maximum throughput; use when you need wide reporting.
            <br />
            GUIDED: reduce noise; push short tasks and require structured reports.
            <br />
            CONTROLLED: strict; use during high-severity or deception-heavy phases.
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="panelTitle">Playbooks (procedures by situation)</div>
          <div className="list">
            <div className="listItemStatic">
              <div className="row">
                <div className="sev sev-4">P1</div>
                <div className="mono">High Severity Unknown (S4/S3, low confidence)</div>
              </div>
              <div className="mono">
                1) ACK
                <br />
                2) ASSIGN: &quot;Move to vantage. Confirm/deny contact.&quot;
                <br />
                3) XCHECK
                <br />
                4) Posture: GUIDED if comms grows noisy
                <br />
                5) Demand REPORT in structured format (see templates)
              </div>
            </div>

            <div className="listItemStatic">
              <div className="row">
                <div className="sev sev-3">P2</div>
                <div className="mono">Suspected Phantom / Deception</div>
              </div>
              <div className="mono">
                1) XCHECK (early)
                <br />
                2) ASSIGN: &quot;No-joy / negative confirmation&quot; task
                <br />
                3) Avoid over-committing assets until CONFIRM
                <br />
                4) If XCHECK DENY and suspicion rises, treat as deception and tighten posture
              </div>
            </div>

            <div className="listItemStatic">
              <div className="row">
                <div className="sev sev-2">P3</div>
                <div className="mono">Routine Observe &amp; Report (S2/S1)</div>
              </div>
              <div className="mono">
                1) ACK
                <br />
                2) ASSIGN: &quot;Observe 3–5 minutes. Report movement/count/direction.&quot;
                <br />
                3) Skip XCHECK unless the report changes your decision
                <br />
                4) Close tasks quickly to maintain cadence
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="panelTitle">Report Templates (copy/paste)</div>
          <div className="mono">
            SALUTE:
            <br />
            S: (size)
            <br />
            A: (activity)
            <br />
            L: (location)
            <br />
            U: (unit/ID)
            <br />
            T: (time)
            <br />
            E: (equipment)
            <br />
            <br />
            Minimal report:
            <br />
            &quot;L=..., T=..., OBS=..., MOV=..., CNT=...&quot;
            <br />
            <br />
            Negative confirmation:
            <br />
            &quot;NOJOY at L=... (T=...). Clear line of sight; no movement observed.&quot;
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="panelTitle">Emergency Procedures</div>
          <div className="list">
            <div className="listItemStatic">
              <div className="row">
                <div className="sev">EP</div>
                <div className="mono">LOSS OF COMMS / WS OFFLINE</div>
              </div>
              <div className="mono">
                1) Verify OPS shows LAST advancing.
                <br />
                2) If WS OFFLINE: reload page.
                <br />
                3) If still offline: restart local dev server.
                <br />
                4) Continue decision-making from last known state; avoid spamming actions.
              </div>
            </div>

            <div className="listItemStatic">
              <div className="row">
                <div className="sev">EP</div>
                <div className="mono">MULTIPLE SIMULTANEOUS INCIDENTS</div>
              </div>
              <div className="mono">
                1) ACK all new incidents first (prevents drops).
                <br />
                2) Triage by severity + uncertainty (S4/S3 + low confidence first).
                <br />
                3) Assign one clear action per outpost; avoid stacking tasks on one outpost.
                <br />
                4) Use XCHECK only on the incidents that change your resource allocation.
              </div>
            </div>

            <div className="listItemStatic">
              <div className="row">
                <div className="sev">EP</div>
                <div className="mono">DECEPTION SURGE / SPOOFING FEELS HIGH</div>
              </div>
              <div className="mono">
                1) Posture: CONTROLLED.
                <br />
                2) Require structured reports (SALUTE / negative confirmation).
                <br />
                3) XCHECK early on high-impact incidents.
                <br />
                4) Prefer deny/nojoy tasks over broad observation.
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="panelTitle">If You See This → Do This</div>
          <div className="list">
            <div className="listItemStatic">
              <div className="row">
                <div className="sev sev-4">S4</div>
                <div className="mono">High severity + low confidence</div>
              </div>
              <div className="mono muted">Action</div>
              <div className="mono">
                ACK → ASSIGN (vantage/confirm) → XCHECK.
                <br />
                Keep comms posture OPEN unless comms noise is high.
              </div>
            </div>

            <div className="listItemStatic">
              <div className="row">
                <div className="sev sev-3">S3</div>
                <div className="mono">Suspicion climbing / “PHANTOM SUSPECT” band</div>
              </div>
              <div className="mono muted">Action</div>
              <div className="mono">
                Request XCHECK. Task for negative confirmation (&quot;confirm/deny&quot;).
                <br />
                Prefer REPORTs that include: location, time, movement, count.
              </div>
            </div>

            <div className="listItemStatic">
              <div className="row">
                <div className="sev sev-2">S2</div>
                <div className="mono">Low severity, stable confidence</div>
              </div>
              <div className="mono muted">Action</div>
              <div className="mono">
                ACK → ASSIGN (observe) → wait for report.
                <br />
                Don’t over-XCHECK everything.
              </div>
            </div>

            <div className="listItemStatic">
              <div className="row">
                <div className="sev">COMMS</div>
                <div className="mono">Comms suddenly noisy / spoof-y</div>
              </div>
              <div className="mono muted">Action</div>
              <div className="mono">
                Shift posture to GUIDED or CONTROLLED.
                <br />
                Task outposts with short, verifiable actions.
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="panelTitle">Checklists (Print Mental Version)</div>
          <div className="grid2">
            <div className="panel">
              <div className="panelTitle">ACK Checklist</div>
              <div className="mono">
                - Is it unresolved?
                <br />
                - ACK it.
                <br />
                - Decide: task vs watch.
              </div>
            </div>
            <div className="panel">
              <div className="panelTitle">ASSIGN Checklist</div>
              <div className="mono">
                - Pick staffed outpost.
                <br />
                - Give one action.
                <br />
                - Require report.
              </div>
            </div>
            <div className="panel">
              <div className="panelTitle">REPORT Checklist</div>
              <div className="mono">
                - Where exactly?
                <br />
                - What did you see?
                <br />
                - Movement / count / direction?
              </div>
            </div>
            <div className="panel">
              <div className="panelTitle">XCHECK Checklist</div>
              <div className="mono">
                - Use on high-impact uncertainty.
                <br />
                - Expect CONFIRM/DENY/NOJOY.
                <br />
                - Update decision: continue tasking or resolve.
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="panelTitle">Troubleshooting (If you see this → do this)</div>
          <div className="list">
            <div className="listItemStatic">
              <div className="row">
                <div className="sev">WS</div>
                <div className="mono">OPS header shows OFFLINE or RECONNECTING</div>
              </div>
              <div className="mono muted">Action</div>
              <div className="mono">
                Wait 5–10 seconds. If it persists, reload the page.
                <br />
                If local dev, confirm the Next dev server is running.
              </div>
            </div>

            <div className="listItemStatic">
              <div className="row">
                <div className="sev">TASK</div>
                <div className="mono">RCO assigned, but outpost shows no tasks</div>
              </div>
              <div className="mono muted">Action</div>
              <div className="mono">
                Confirm outpost code matches the task outpost.
                <br />
                Reload outpost view. Then re-ASSIGN with short task text.
              </div>
            </div>

            <div className="listItemStatic">
              <div className="row">
                <div className="sev">COMMS</div>
                <div className="mono">No comms coming back after tasking</div>
              </div>
              <div className="mono muted">Action</div>
              <div className="mono">
                Outpost must ACK the task, then REPORT.
                <br />
                Use outpost task buttons to prefill commands.
              </div>
            </div>

            <div className="listItemStatic">
              <div className="row">
                <div className="sev">SIM</div>
                <div className="mono">Everything feels static / dead</div>
              </div>
              <div className="mono muted">Action</div>
              <div className="mono">
                Use OPS &quot;LAST: Ns&quot; to confirm events are flowing.
                <br />
                If LAST keeps increasing, refresh the page or restart the dev server.
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="panelTitle">Reference: Hotkeys</div>
          <div className="mono">
            RCO: J/K select · Enter ACK/Assign · X XCHECK · 1–5 templates · Shift+1–3 posture
            <br />
            Outpost: use task buttons or /ack /report /complete
          </div>
        </div>
      </div>
    </div>
  );
}
