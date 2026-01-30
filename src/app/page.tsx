import Link from "next/link";

export default function Home() {
  return (
    <div className="page">
      <div className="panel">
        <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="h1">blacksky-watch</div>
            <div className="muted small">Real-time ops/radio-control prototype</div>
          </div>
          <div className="chips">
            <span className="chip mono">REGION</span>
            <span className="chip mono">glasslands-01</span>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="panelTitle">Start here</div>
          <div className="muted">
            Open the OPS dashboard (single-window) or the dedicated RCO/Outpost pages.
          </div>
        </div>

        <div className="row gap" style={{ marginTop: 12, flexWrap: "wrap" }}>
          <Link className="btn" href="/ops?regionId=glasslands-01">
            OPS (recommended)
          </Link>
          <Link className="btn" href="/manual">
            RCO Manual
          </Link>
          <Link className="btn" href="/rco?regionId=glasslands-01">
            RCO
          </Link>
          <Link className="btn" href="/outpost?regionId=glasslands-01&outpostCode=860">
            Outpost 860
          </Link>
          <Link className="btn" href="/outpost?regionId=glasslands-01&outpostCode=401">
            Outpost 401
          </Link>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="panelSubTitle">What to do</div>
          <div className="mono">
            1) In RCO: select an incident (J/K)
            <br />
            2) Enter = ACK, then Enter again = Assign
            <br />
            3) In Outpost: ACK/REPORT/COMPLETE the task
            <br />
            4) Watch confidence + comms evolve
          </div>
        </div>
      </div>
    </div>
  );
}
