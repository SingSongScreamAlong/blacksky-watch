# blacksky-watch (vertical slice)

Runnable browser-game vertical slice for a real-time ops / race-control game inspired by *Radio Commander*.

## Requirements

- Node.js 20+
- npm

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

This starts a custom Next.js dev server (see `server.ts`) which also hosts a WebSocket endpoint at `ws://localhost:3000/ws`.

## Pages

- `http://localhost:3000/rco?regionId=glasslands-01`
- `http://localhost:3000/outpost?regionId=glasslands-01&outpostCode=860`

Seed data:

- Region: `glasslands-01`
- Outposts: `401`, `860`

## WebSockets

WebSocket endpoint:

- `GET ws://localhost:3000/ws`

Room subscriptions:

- `region:{regionId}`
- `comms:{regionId}`
- `session:{regionId}`

Client messages:

```json
{ "type": "sub", "room": "region:glasslands-01" }
```

Broadcast envelope format:

```json
{ "type": "incident/update", "ts": 1730000000000, "payload": { "...": "..." } }
```

## API routes

- `GET /api/rco/bootstrap?regionId=...`
- `POST /api/rco/action`
- `POST /api/terminal/line`

## How to test (two windows)

1. Open **RCO**:

   - `http://localhost:3000/rco?regionId=glasslands-01`

2. Open **Outpost** in another window:

   - `http://localhost:3000/outpost?regionId=glasslands-01&outpostCode=860`

3. Watch live updates:

- Incidents and comms should update in real time.
- Use RCO hotkeys:
  - `J` / `K`: next/previous incident
  - `Enter`: ACK / Assign
  - `X`: request XCHECK
  - `1`–`5`: send task templates
  - `Shift+1`–`3`: posture presets

4. Use Outpost terminal:

- Type a normal line to send comms.
- Commands:
  - `/xcheck <incidentId>`
  - `/resolve <incidentId>`
  - `/staff off` (or `/staff on`)

## Dev-only director controls

In development only (`NODE_ENV=development`), you can trigger special events:

- Endpoint:
  - `POST /api/rco/director` with body `{ "regionId": "glasslands-01", "kind": "phantom" | "spoof" }`

- UI:
  - Buttons on `/rco` labeled `DEV: phantom` and `DEV: spoof`

## Notes

- No database. The simulation is an in-memory singleton: `src/server/sim/SimService.ts`.
- WebSocket hub + rooms: `src/server/ws/WsHub.ts`.
