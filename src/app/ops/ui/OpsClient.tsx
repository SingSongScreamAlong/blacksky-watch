"use client";

import { useMemo, useState } from "react";
import RcoClient from "@/app/rco/ui/RcoClient";
import OutpostClient from "@/app/outpost/ui/OutpostClient";

type LayoutMode = "RCO_ONLY" | "RCO_PLUS_1" | "RCO_PLUS_2";

export default function OpsClient({ regionId }: { regionId: string }) {
  const [mode, setMode] = useState<LayoutMode>("RCO_PLUS_1");
  const [outpostA, setOutpostA] = useState<string>("860");
  const [outpostB, setOutpostB] = useState<string>("401");

  const outpostOptions = useMemo(() => ["401", "860"], []);

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

  return (
    <div className="page">
      <div className="topbar">
        <div className="h1">OPS · {regionId}</div>
        <div className="chips">
          <span className="chip mono">MODE</span>
          <button className={`btn btnSmall ${mode === "RCO_ONLY" ? "btnActive" : ""}`} onClick={() => setMode("RCO_ONLY")}>
            RCO
          </button>
          <button className={`btn btnSmall ${mode === "RCO_PLUS_1" ? "btnActive" : ""}`} onClick={() => setMode("RCO_PLUS_1")}>
            RCO + 1
          </button>
          <button className={`btn btnSmall ${mode === "RCO_PLUS_2" ? "btnActive" : ""}`} onClick={() => setMode("RCO_PLUS_2")}>
            RCO + 2
          </button>

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

      {mode === "RCO_ONLY" ? (
        <div className="opsGrid1">
          <div className="opsPane">
            <RcoClient regionId={regionId} />
          </div>
        </div>
      ) : mode === "RCO_PLUS_1" ? (
        <div className="opsGrid2">
          <div className="opsPane">
            <RcoClient regionId={regionId} />
          </div>
          <div className="opsPane">
            <OutpostClient regionId={regionId} outpostCode={outpostA} />
          </div>
        </div>
      ) : (
        <div className="opsGrid3">
          <div className="opsPane">
            <RcoClient regionId={regionId} />
          </div>
          <div className="opsPane">
            <OutpostClient regionId={regionId} outpostCode={outpostA} />
          </div>
          <div className="opsPane">
            <OutpostClient regionId={regionId} outpostCode={outpostB} />
          </div>
        </div>
      )}
    </div>
  );
}
