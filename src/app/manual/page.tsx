export const runtime = "nodejs";

export default function ManualPage() {
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
            <span className="chip mono">v0.1</span>
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
                Request XCHECK. Task for negative confirmation ("confirm/deny").
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
