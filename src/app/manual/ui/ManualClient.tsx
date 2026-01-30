"use client";

import { useCallback } from "react";
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
