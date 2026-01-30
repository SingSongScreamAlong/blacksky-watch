"use client";

import { useEffect, useMemo, useState } from "react";
import RcoClient from "@/app/rco/ui/RcoClient";
import OutpostClient from "@/app/outpost/ui/OutpostClient";

type OpsTab = "RCO" | "OUTPOST_A" | "OUTPOST_B";

const OPS_PREFS_KEY = "blacksky_ops_prefs_v1";

function readPrefs(): { tab?: OpsTab; outpostA?: string; outpostB?: string } {
  try {
    const raw = window.localStorage.getItem(OPS_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const obj = parsed as Record<string, unknown>;
    const tab = typeof obj.tab === "string" ? obj.tab : undefined;
    const outpostA = typeof obj.outpostA === "string" ? obj.outpostA : undefined;
    const outpostB = typeof obj.outpostB === "string" ? obj.outpostB : undefined;
    if (tab !== "RCO" && tab !== "OUTPOST_A" && tab !== "OUTPOST_B") return { outpostA, outpostB };
    return { tab, outpostA, outpostB };
  } catch {
    return {};
  }
}

export default function OpsClient({ regionId }: { regionId: string }) {
  const [tab, setTab] = useState<OpsTab>(() => {
    if (typeof window === "undefined") return "RCO";
    return readPrefs().tab ?? "RCO";
  });
  const [outpostA, setOutpostA] = useState<string>(() => {
    if (typeof window === "undefined") return "860";
    return readPrefs().outpostA ?? "860";
  });
  const [outpostB, setOutpostB] = useState<string>(() => {
    if (typeof window === "undefined") return "401";
    return readPrefs().outpostB ?? "401";
  });

  const outpostOptions = useMemo(() => ["401", "860"], []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        OPS_PREFS_KEY,
        JSON.stringify({ tab, outpostA, outpostB })
      );
    } catch {
      // ignore
    }
  }, [outpostA, outpostB, tab]);

  if (!regionId) {
    return (
      <div className="page">
        <div className="panel">
          <div className="h1">OPS</div>
          <div className="muted">Missing regionId. Try: /ops?regionId=glasslands-01</div>
        </div>
      </div>
    );
  }

  const popRco = `/rco?regionId=${encodeURIComponent(regionId)}`;
  const popA = `/outpost?regionId=${encodeURIComponent(regionId)}&outpostCode=${encodeURIComponent(outpostA)}`;
  const popB = `/outpost?regionId=${encodeURIComponent(regionId)}&outpostCode=${encodeURIComponent(outpostB)}`;

  const activeTitle = tab === "RCO" ? "RCO" : tab === "OUTPOST_A" ? `OUTPOST A · ${outpostA}` : `OUTPOST B · ${outpostB}`;

  return (
    <div className="page">
      <div className="topbar">
        <div className="h1">OPS · {regionId}</div>
        <div className="chips">
          <span className="chip mono">OUTPOST A</span>
          <select className="select" value={outpostA} onChange={(e) => setOutpostA(e.target.value)}>
            {outpostOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>

          <span className="chip mono">OUTPOST B</span>
          <select className="select" value={outpostB} onChange={(e) => setOutpostB(e.target.value)}>
            {outpostOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div className="spacer" />

        <a className="btn btnSmall" href={popRco} target="_blank" rel="noreferrer">
          Pop RCO
        </a>
        <a className="btn btnSmall" href={popA} target="_blank" rel="noreferrer">
          Pop A
        </a>
        <a className="btn btnSmall" href={popB} target="_blank" rel="noreferrer">
          Pop B
        </a>
      </div>

      <div className="opsTabs">
        <button className={`opsTab ${tab === "RCO" ? "active" : ""}`} onClick={() => setTab("RCO")}>
          RCO
        </button>
        <button className={`opsTab ${tab === "OUTPOST_A" ? "active" : ""}`} onClick={() => setTab("OUTPOST_A")}>
          Outpost A · {outpostA}
        </button>
        <button className={`opsTab ${tab === "OUTPOST_B" ? "active" : ""}`} onClick={() => setTab("OUTPOST_B")}>
          Outpost B · {outpostB}
        </button>
        <div className="spacer" />
        <div className="muted mono small">{activeTitle}</div>
      </div>

      <div className="opsTabBody">
        <div className="opsPane">
          {tab === "RCO" ? (
            <RcoClient regionId={regionId} />
          ) : tab === "OUTPOST_A" ? (
            <OutpostClient regionId={regionId} outpostCode={outpostA} />
          ) : (
            <OutpostClient regionId={regionId} outpostCode={outpostB} />
          )}
        </div>
      </div>
    </div>
  );
}
