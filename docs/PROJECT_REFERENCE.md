# NetSim — Technical Reference

This document is a grounded technical reference for the NetSim SIEM/SOC
simulator project. Every claim below is traceable to a specific file in the
repository as it exists at the time of writing; nothing here is inferred or
extrapolated from earlier design intentions. It is intended as source material
for formal academic/project documentation.

---

## 1. Project Overview

NetSim (the SIEM/SOC simulator portion of this repository) is an interactive,
browser-based network topology simulator that lets a user build an arbitrary
network out of routers, switches, PCs, servers, firewalls, and a dedicated
"attacker" device type, then run live network-security attack simulations
against that topology — multi-hop ping routing, ARP spoofing (one-way and
bidirectional/full MITM), and DNS cache poisoning — while a connected backend
observes the resulting security events, correlates repeated attack activity
into alerts, and automatically opens incident tickets. The application is
built around three main areas, all reachable from the same top navigation bar
(`frontend/src/App.jsx`):

- **Network Editor** — the drag-and-drop topology canvas and the "Attacks &
  Tools" panel used to add devices, wire them together, and launch Ping/ARP/DNS
  actions.
- **SIEM Dashboard** — a real-time aggregated view of raw security events and
  the alerts the backend has correlated from them.
- **SOC Tickets** — the incident-ticket queue, including auto-generated
  tickets from the correlation engine and a manual ticket-creation/status
  workflow.

This SIEM/SOC application is itself further embedded as one interactive
"level" inside a separate, pre-existing open-source project also called
"netsim" (a plain PHP/jQuery/Phaser 2 teaching game, hosted publicly at
netsim.erinn.io, created by Erinn Atwater and Cecylia Bocovich) that lives at
the root of this same repository — see §2 and §4 for how that embedding works.

---

## 2. Technology Stack

### Frontend (`frontend/`)

| Concern | Technology | Exact version (from `frontend/package.json`) |
|---|---|---|
| UI framework | React | `^19.2.7` (with `react-dom ^19.2.7`) |
| State management | Zustand | `^5.0.14` |
| Canvas/rendering | Konva + react-konva | `konva ^10.3.0`, `react-konva ^19.2.5` |
| Build tool | Vite | `^8.1.1` (`@vitejs/plugin-react ^6.0.3`) |
| Testing framework | Vitest | `^4.1.10` |
| Linter | oxlint | `^1.71.0` |
| Language | JavaScript + JSX | no TypeScript in use — 0 `.ts`/`.tsx` files exist despite `@types/react`/`@types/react-dom` devDependencies (present for editor tooling only) |

No component/DOM testing library (e.g. `@testing-library/react`) is present in
`devDependencies` — see §7.

### Backend (`backend/`)

| Concern | Technology | Exact version (from `backend/composer.json`) |
|---|---|---|
| Framework | Laravel | `^13.8` |
| Language | PHP | composer constraint `^8.3`; the Docker runtime image is `php:8.4-cli` |
| Database | MongoDB | via `mongodb/laravel-mongodb ^5.8` — the connection driver used by every domain model |
| Auth package | Laravel Sanctum | `^4.0` (installed, models wired, but **not currently reachable** — see §6) |
| Test framework | PHPUnit | `^12.5.12` |

All app-specific models (`NetworkTopology`, `User`, `PersonalAccessToken`,
`SecurityEvent`, `Alert`, `IncidentTicket`) explicitly set
`protected $connection = 'mongodb'`. Laravel's default `sqlite`-oriented
migrations exist only as unrelated framework scaffolding (users/cache/jobs/
personal_access_tokens tables) — MongoDB's schemaless collections need no
migration files, and none exist for the app's real domain models.

### Infrastructure

`docker-compose.yml` (project root) defines exactly two services:

| Service | Build context | Port | Notes |
|---|---|---|---|
| `backend` | `./backend` | `8000` | `env_file: ./backend/.env` (not committed; must be supplied locally with real MongoDB Atlas credentials — only `backend/.env.example` ships in the repo). Runs `php artisan serve --host=0.0.0.0 --port=8000` (Dockerfile `CMD`). |
| `frontend` | `./frontend` | `5173` | `depends_on: backend`. Runs `npm run dev -- --host 0.0.0.0` (Dockerfile `CMD`) — i.e. the Vite **dev server** runs inside the container; this is not a production build. |

Neither service declares a `volumes:` key in `docker-compose.yml`. Both
Dockerfiles use a `COPY . .` step, meaning **application source is baked into
the image at build time**, not live-mounted — any source change requires
`docker compose build <service> && docker compose up -d <service>` to take
effect, a browser refresh alone is not sufficient.

- `frontend/Dockerfile`: base image `node:22-slim`; installs deps from
  `package.json`/`package-lock.json`, then `COPY . .`, exposes 5173.
- `backend/Dockerfile`: base image `php:8.4-cli`; installs the `mongodb` PECL
  extension and `zip` extension, copies the official Composer binary from the
  `composer:2` image, runs `composer install --no-dev`, then `COPY . .`,
  `composer dump-autoload --optimize`, `php artisan package:discover`, exposes
  8000.

### Base-site integration

The repository root also contains a complete, separate PHP application — the
original open-source "netsim" teaching game (`index.php`, `login.inc.php`,
`listing.inc.php`, `phaser.inc.php`, `header.inc.php`, `footer.inc.php`,
`register.php`, `solns.ajax.php`, `config.inc.php`), unrelated in codebase
terms to `frontend/`/`backend/`. Its client-side stack, read directly from
`index.php`'s `<script>` tags and the actual asset files:

- **jQuery 3.2.1** (`js/jquery-3.2.1.min.js`, version in filename) + jQuery UI
  (`js/jquery-ui.min.js`, version not labeled in the file).
- **Phaser CE 2.7.5** (`js/phaser.min.js`) — confirmed directly from the
  library's own header comment inside the minified file:
  `/* Phaser v2.7.5 - http://phaser.io - @photonstorm - (c) 2016 Photon Storm Ltd. */`.
- Persistence via **SQLite3** (`config.inc.php` → `DB_FILE`), accessed with
  PHP's native `SQLite3` class (not PDO).
- Custom app logic in `js/ui.js`, `js/bindings.js`, `js/devicescripts.js`.

The React SIEM/SOC app is integrated into this base site as one additional
"level" entry (`levels/04 Attacks/netsim.html` + `levels/04 Attacks/netsim.json`,
category `Attacks`, DB row name "Live Attack Simulator"). `netsim.html`
contains a short description plus an inline `<script>` that programmatically
constructs and appends a full-viewport `<iframe>`:

```js
var iframe = document.createElement('iframe');
iframe.src = 'http://localhost:5173';
iframe.style.position = 'fixed';
iframe.style.inset = '0';
iframe.style.width = '100vw';
iframe.style.height = '100vh';
iframe.style.border = '0';
iframe.style.zIndex = '9999';
document.body.appendChild(iframe);
```

This hardcodes the local dev URL (`http://localhost:5173`) and is not
environment-configurable. `netsim.json` is a structurally-valid but otherwise
inert copy of an existing level's device/link JSON — required only to satisfy
the base engine's unconditional `include` of a level JSON file; its content is
never actually used since the iframe visually covers the whole viewport. The
React app itself (`frontend/src/App.jsx`) includes a "← Level List" button in
its top nav that calls `window.top.location.href = 'http://localhost:8080'`
(the base site's own dev-server URL) to escape the iframe and return to the
base site's level grid, whether the app is running standalone or embedded.

---

## 3. Complete File Tree with Explanations

### `frontend/src/`

```
frontend/src/
├── App.jsx                          — root component: top nav (4 tabs + Level-List escape button), wires store state to AttackPanel/dashboards
├── main.jsx                         — React DOM entry point
├── index.css                        — entire app stylesheet (dark theme tokens, all component styling)
├── api/
│   └── client.js                    — fetch-based API client, all backend HTTP calls (see §4)
├── assets/icons/                    — SVG device icons: router, switch, pc, firewall, firewall_under_attack
├── components/
│   ├── AttackPanel.jsx              — right-hand tabbed panel: Ping / ARP Attack / DNS Attack forms + action buttons
│   ├── DeviceNode.jsx               — Konva device shape: drag, click-to-connect, delete, firewall-under-attack icon swap
│   ├── DeviceSettingsPanel.jsx      — edit device name/IP/MAC (regex-validated) + live ARP/DNS table view with poisoned-row highlighting
│   ├── DeviceSidebar.jsx            — left sidebar: add-device buttons per type + "Clear" topology button
│   ├── LinkLine.jsx                 — Konva line for a link: selection/active/disabled/backbone styling
│   ├── LinkSettingsPanel.jsx        — toggle a link Active/Disabled, change its speed
│   ├── Packet.jsx                   — animates one in-flight packet along its path via requestAnimationFrame
│   ├── SiemDashboard.jsx            — fetches events/alerts, renders stat cards, donut chart, timeline, leaderboards, event table
│   ├── SocDashboard.jsx             — fetches tickets, renders stats, new-ticket form, status filters, per-ticket status actions
│   ├── SwitchMacTablePanel.jsx      — lists a switch's connected-neighbor MAC addresses as numbered ports
│   └── ToastContainer.jsx           — renders auto-dismissing (4500ms) toast notifications from the store
├── engine/                          — pure, framework-free business-logic modules (all independently unit-tested, see §7)
│   ├── arpSpoofing.js               — ARP table construction (switch-aware BFS), poison simulate/clear/detect, toast message builder
│   ├── attackRoles.js               — canBeAttacker / canBeVictim / canBeImpersonated predicates per device type
│   ├── connectionCapabilities.js    — link-type validity rules, speed options/labels/multipliers per link type
│   ├── deviceCapabilities.js        — per-type forwarding ability, firewall immunity, DoS/port-scan target validity, max connections
│   ├── dnsPoisoning.js              — DNS table construction, poison simulate/clear/detect, toast message builder
│   ├── packetMovement.js            — packet creation, per-frame position advancement, arrival detection
│   ├── pingRouting.js               — BFS pathfinding, MITM-redirect detection via poisoned ARP/DNS, latency calc, path/link descriptions
│   ├── siemStats.js                 — SIEM dashboard aggregation: stat cards, donut breakdown, time-bucketed timeline, leaderboards
│   └── socStats.js                  — SOC ticket count aggregation + human-readable relative-time formatting
└── store/
    └── topologyStore.js             — the single Zustand store: all topology/attack/UI state and every mutating action (see §4)
```

### `backend/` (Laravel app-relevant paths only)

```
backend/
├── app/
│   ├── Http/Controllers/
│   │   ├── Controller.php                — empty abstract base class
│   │   ├── AlertController.php           — index() only: list alerts, newest first (alerts are otherwise only ever created internally)
│   │   ├── AuthController.php            — register/login/logout via Sanctum tokens — fully implemented, currently unrouted (§6)
│   │   ├── IncidentTicketController.php  — index/show/store/updateStatus, seeds and appends to a per-ticket auditLog
│   │   ├── NetworkTopologyController.php — index/store for saving/loading topology JSON blobs — implemented and routed (§6)
│   │   └── SecurityEventController.php   — index/store; store() creates the event then calls CorrelationEngine::correlate()
│   ├── Models/
│   │   ├── Alert.php                     — Mongo collection `alerts`
│   │   ├── IncidentTicket.php            — Mongo collection `incident_tickets`
│   │   ├── NetworkTopology.php           — Mongo collection `network_topologies`
│   │   ├── PersonalAccessToken.php       — Sanctum token model adapted for Mongo, collection `personal_access_tokens`
│   │   ├── SecurityEvent.php             — Mongo collection `security_events`
│   │   └── User.php                      — Mongo-backed Authenticatable user, collection `users`
│   ├── Providers/AppServiceProvider.php  — default Laravel service provider, no custom bindings of note
│   └── Services/
│       └── CorrelationEngine.php         — the alert/ticket auto-generation engine (see §4)
├── routes/
│   ├── api.php                           — all `/api/*` routes (see §4 table) — auth routes present but commented out
│   ├── console.php                       — default Artisan console routes
│   └── web.php                           — only the default Laravel welcome route
├── database/migrations/                  — 4 files, all default Laravel scaffolding (users/cache/jobs/personal_access_tokens for the unused sqlite connection) — no migrations exist for the app's actual Mongo models
├── bootstrap/app.php                     — framework bootstrap (Laravel 11+/13 style, no Kernel.php); only customization: unauthenticated requests return null instead of redirecting, and API routes render errors as JSON
└── composer.json / composer.lock         — dependency manifest (see §2)
```

`app/Http/Middleware/` contains no custom middleware files, and no route in
`api.php` currently applies any middleware (the only middleware reference in
the codebase is the commented-out `->middleware('auth:sanctum')` on the
disabled `/user` and `/logout` routes).

---

## 4. Core Architecture & Data Flow

### Frontend state management

All topology/attack/UI state lives in one Zustand store,
`frontend/src/store/topologyStore.js`. State fields: `devices`,
`deviceCounts`, `links`, `connectingFromDeviceId`, `pendingLinkType`,
`activePackets`, `arpTables`, `arpAttackLog`, `dnsTables`, `dnsAttackLog`,
`toasts`. Actions exposed: `pushToast`, `dismissToast`, `addDevice`,
`updateDevicePosition`, `updateDeviceProperties`, `removeDevice`, `addLink`,
`removeLink`, `setLinkEnabled`, `setLinkSpeed`, `clearTopology`,
`setConnectingFromDeviceId`, `setPendingLinkType`, `sendPacket`, `pingDevice`,
`removePacket`, `updatePacketState`, `triggerArpSpoof`, `stopArpSpoof`,
`triggerDnsPoison`, `stopDnsPoison`. `addLink` enforces per-device-type max
connection counts (`getMaxConnections`) and link-type validity
(`isValidConnectionType`) and rejects duplicate links.

### ARP/DNS attack simulation logic

- **`arpSpoofing.js`**: `buildArpTable` walks the link graph (BFS through
  switch chains, since switches are L2-transparent and never hold an IP) to
  build each device's baseline ARP table. `simulateArpSpoof` overwrites the
  victim's cached MAC for the impersonated device's IP with the attacker's
  MAC; `clearArpPoison` restores it. `findActivePoisonings` diffs the live
  table against a freshly-rebuilt baseline to detect poisoning for UI/canvas
  indicators.
- **`dnsPoisoning.js`**: `buildDnsTable` seeds each device with only its own
  `"<name>.local" → ip` entry (no baseline foreign entries — unlike ARP).
  `simulateDnsPoison` adds a poisoned domain→fakeIp entry to the victim's
  table; `clearDnsPoison` deletes that key entirely (there is no baseline
  value to restore it to).
- **`pingRouting.js`**: `findPath` does capability-aware BFS pathfinding
  (only forwarding-capable device types relay traffic); `findMitmRedirect`
  detects whether a ping would be silently rerouted through an attacker via a
  poisoned ARP or DNS entry; `buildPingRoute` assembles the final path
  (including any MITM detour) and reports `mitm` status back to the UI.
- **`attackRoles.js`**: three pure predicates — `canBeAttacker` (only type
  `attacker`), `canBeVictim` (anything except `attacker`/`switch`),
  `canBeImpersonated` (anything except `switch`/`attacker`) — enforced by the
  store before any attack action proceeds.
- Validation in the store (`topologyStore.js`): `triggerArpSpoof` requires
  attacker/victim (/impersonated, if bidirectional) to be distinct devices, to
  pass the three role predicates above, and requires the attacker to be on the
  same local (L2) segment as the victim — and as the impersonated device too,
  for the bidirectional/full-MITM case. `triggerDnsPoison` requires the
  supplied `fakeIp` to match a real device's actual IP in the topology and
  requires the victim to have a network path to that device.

### Frontend ↔ backend communication

All requests originate from `frontend/src/api/client.js`, targeting
`http://127.0.0.1:8000/api` (hardcoded base URL):

| Function | Method | Endpoint | Notes |
|---|---|---|---|
| `getTopologies()` | GET | `/network-topologies` | Defined but no caller found anywhere in the frontend codebase — see §6. |
| `postSecurityEvent(eventData)` | POST | `/security-events` | Body shape varies by attack: ARP includes `eventType, attackerDeviceId, victimDeviceId, impersonatedDeviceId` + name fields; DNS includes `eventType, attackerDeviceId, victimDeviceId` + name fields + `details: { targetDomain, fakeIp }`. |
| `getSecurityEvents()` | GET | `/security-events` | |
| `getAlerts()` | GET | `/alerts` | |
| `getIncidentTickets()` | GET | `/incident-tickets` | |
| `createIncidentTicket(title, description)` | POST | `/incident-tickets` | Body `{ title, description }`. |
| `getIncidentTicket(id)` | GET | `/incident-tickets/{id}` | |
| `updateTicketStatus(id, status, note)` | PATCH | `/incident-tickets/{id}/status` | Body `{ status, note }`. |

### SIEM correlation and SOC ticket auto-generation — end-to-end flow

1. A user triggers an attack in `AttackPanel.jsx` → `topologyStore.js`'s
   `triggerArpSpoof`/`triggerDnsPoison` runs its full validation chain, then
   calls `postSecurityEvent(...)` (fire-and-forget, errors only logged to the
   console — the simulation itself never blocks on the network call).
2. `SecurityEventController::store` (backend) validates the payload, creates a
   `SecurityEvent` document in MongoDB, then calls
   `CorrelationEngine::correlate($event)` inside a try/catch that swallows and
   reports any exception (so a correlation failure never breaks the API
   response).
3. `CorrelationEngine::correlate` looks up `$event->eventType` in a two-entry
   rule table (`arp_spoof` → `repeated_arp_spoof`, `dns_poison` →
   `repeated_dns_poison`); **any other event type returns immediately with no
   further action** — this includes the `firewall_blocked_arp_spoof`/
   `firewall_blocked_dns_spoof` event types the store posts for
   firewall-blocked attempts (see §6).
4. If the event type matches a rule, it queries all `SecurityEvent`s of the
   same type against the same `victimDeviceId` within a rolling 60-second
   window ending at the current event's timestamp. If fewer than 3 such events
   exist, nothing further happens.
5. On the 3rd+ matching event: if an **open** `Alert` already exists for that
   rule+victim, its `relatedEventIds`/`eventCount`/`description` are updated
   in place (no duplicate alert). Otherwise, a new `Alert` (`severity: high`,
   `status: open`) is created, and in the same call a new `IncidentTicket` is
   created (`status: open`, `origin: auto`, title `"{label} burst on
   {deviceName}"`, linked via `relatedAlertId`, with an `auditLog` seeded with
   a `created` entry noting `"Auto-generated by correlation engine"`).
6. The SIEM Dashboard (`SiemDashboard.jsx`) and SOC Tickets view
   (`SocDashboard.jsx`) poll/fetch these collections independently via
   `getAlerts()`/`getSecurityEvents()`/`getIncidentTickets()` to render the
   resulting state.

---

## 5. Key Features Implemented

| Feature | Implementing file(s) |
|---|---|
| Drag-and-drop topology editor, Konva-based canvas | `TopologyCanvas.jsx` (referenced from `App.jsx`), `DeviceNode.jsx`, `LinkLine.jsx` |
| Device management (add/move/edit/delete, per-type max connections) | `DeviceSidebar.jsx`, `DeviceSettingsPanel.jsx`, `topologyStore.js` (`addDevice`/`updateDeviceProperties`/`removeDevice`/`addLink`), `deviceCapabilities.js` (`getMaxConnections`) |
| Multi-hop ping routing with latency simulation | `pingRouting.js`, `topologyStore.js`'s `pingDevice`, `Packet.jsx`/`packetMovement.js` for the animation |
| ARP spoofing — one-way and bidirectional (full MITM) | `arpSpoofing.js`, `topologyStore.js`'s `triggerArpSpoof`/`stopArpSpoof`, UI toggle in `AttackPanel.jsx` |
| DNS cache poisoning | `dnsPoisoning.js`, `topologyStore.js`'s `triggerDnsPoison`/`stopDnsPoison`, UI in `AttackPanel.jsx` |
| Firewall immunity to attacks | `deviceCapabilities.js`'s `isImmuneToAttack` (only `firewall` type is immune), enforced in the store before poisoning is applied |
| SIEM dashboard with real-time aggregation | `siemStats.js` (`computeSiemOverview`, stat cards, donut chart, time-bucketed timeline, top attacker/victim leaderboards), `SiemDashboard.jsx` |
| SOC ticket workflow (create, filter, status transitions, audit log) | `socStats.js`, `SocDashboard.jsx`, `IncidentTicketController.php` (backend `auditLog` tracking) |
| Toast notification system | `ToastContainer.jsx`, `topologyStore.js`'s `pushToast`/`dismissToast`, message builders in `arpSpoofing.js`/`dnsPoisoning.js` |
| Visual poisoning indicators (pulsing/dashed feedback) | `DeviceNode.jsx` (firewall-under-attack icon swap driven by `arpAttackLog`/`dnsAttackLog`), `TopologyCanvas.jsx` (dashed lines for actively-poisoned links, derived from `findActivePoisonings`/`findActiveDnsPoisonings`) |

---

## 6. Known Limitations / Not Yet Implemented

| Gap | Current state (confirmed from code) |
|---|---|
| No reachable authentication | `AuthController.php`'s `register`/`login`/`logout` (Sanctum-token-based) are fully implemented, but every corresponding route in `routes/api.php` is commented out. The API currently accepts requests with no auth check anywhere. |
| Topology save/load has no frontend UI | `NetworkTopologyController.php` (`index`/`store`) **is** fully implemented and routed (`GET/POST /network-topologies`) — this is complete on the backend. However, `api/client.js`'s `getTopologies()` function has no caller anywhere in the frontend codebase, and no component provides a save/load UI. The gap is a missing frontend integration, not a missing/unwired backend. |
| DoS / port-scan attack types are frontend-defined only | `deviceCapabilities.js` defines `isValidDosTarget`/`isValidPortScanTarget`, but `AttackPanel.jsx` only offers Ping/ARP Attack/DNS Attack tabs (no DoS/port-scan UI), and `CorrelationEngine::RULES` only recognizes `arp_spoof`/`dns_poison` event types — no backend rule, event type, or UI exists for these attack types. |
| Alerts never auto-close | `CorrelationEngine.php` contains no code path that ever sets an alert's or a ticket's `status` to `closed` automatically. Resolution is only possible via the manual `PATCH /incident-tickets/{id}/status` endpoint, and even that only updates the ticket — it has no corresponding side effect on the linked `Alert`'s own status. |
| Blocked/firewall-immune attempts don't reach the correlation engine | When `isImmuneToAttack` blocks an ARP/DNS attack, the store still calls `postSecurityEvent`, but with `eventType: 'firewall_blocked_arp_spoof'` / `'firewall_blocked_dns_spoof'` instead of `'arp_spoof'`/`'dns_poison'`. `CorrelationEngine::RULES` only has entries for the two unblocked event types, so blocked attempts are recorded as `SecurityEvent`s (visible in the raw SIEM event table) but can never accumulate toward an alert/ticket — the engine returns immediately for any unrecognized event type. |
| No format validation on DNS attack fields | `AttackPanel.jsx`'s DNS tab and `triggerDnsPoison` validate role/topology constraints (attacker/victim distinctness, role predicates, that `fakeIp` matches a real device and is reachable) but apply no IPv4/domain regex format check on the `fakeIp`/`targetDomain` inputs — contrast with `DeviceSettingsPanel.jsx`, which does apply IPv4 and MAC regex validation when editing a device's own IP/MAC. |
| Root `README.md` is stale relative to the current app | It frames the whole repository primarily as the original PHP puzzle game ("place files on a webserver..."), with the Docker-based SIEM/SOC simulator described only in a short appended section — it does not mention the React/Konva/Zustand stack, the Laravel/MongoDB backend, the `docs/` folder, or the `levels/04 Attacks/netsim.html` iframe integration. |
| No custom middleware / auth enforcement on any route | `app/Http/Middleware/` contains no files; no route in `api.php` applies any middleware — every endpoint is currently open. |

---

## 7. Testing

- **Framework**: Vitest `^4.1.10`. No dedicated `vitest.config.js` exists —
  Vitest picks up `frontend/vite.config.js` (which only configures the React
  plugin and dev-server port, no `test` block), so it runs with its own
  defaults.
- **Exact run command**: from `frontend/`, run:
  ```
  npm test
  ```
  (this is `vitest run` per `package.json`'s `scripts.test`).
- **Current passing count** (verified by actually running the command during
  the writing of this document): **150 tests passing, across 9 test files, 0
  failures.**
- **Test files** (all under `frontend/src/`):
  `engine/arpSpoofing.test.js`, `engine/attackRoles.test.js`,
  `engine/connectionCapabilities.test.js`, `engine/dnsPoisoning.test.js`,
  `engine/packetMovement.test.js`, `engine/pingRouting.test.js`,
  `engine/siemStats.test.js`, `engine/socStats.test.js`,
  `store/topologyStore.test.js`.
- **Coverage characterization**: testing is concentrated entirely on the pure,
  framework-free `engine/` modules plus the Zustand store's logic — this is
  where routing, attack validation, poisoning simulation, and dashboard
  aggregation math live, and it is fully unit-testable without a DOM.
  `engine/deviceCapabilities.js` has no dedicated test file. **No
  component/DOM test infrastructure exists** — there is no
  `@testing-library/react` (or equivalent) dependency, and nothing under
  `frontend/src/components/` or `frontend/src/api/` has any test coverage.
  Visual and interaction testing for components (canvas rendering, click/drag
  behavior, dashboard rendering, cross-app iframe embedding) has been done
  manually via browser automation tools throughout this project's development,
  not via an automated component-test suite.

---

## 8. Languages Used

File-extension census across the whole repository (excluding
`node_modules/`, `vendor/`, `.git/`, and build/dist artifacts):

| Extension | Approx. count | Purpose |
|---|---|---|
| `.php` | 57 | Backend (Laravel: controllers, models, services, routes) **and** the separate base-site PHP application (`index.php`, `login.inc.php`, etc.) |
| `.js` | 29 | Frontend engine/store/API logic, config files (e.g. `vite.config.js`), base-site's own `js/` assets |
| `.json` | 21 | Package manifests, level-definition data (`levels/**/*.json`), misc config |
| `.html` | 18 | Base-site level description panels (`levels/**/*.html`), Arabic attack-guide documents in `docs/` |
| `.jsx` | 14 | All React components (`frontend/src/components/`, `App.jsx`) |
| `.md` | 13 | Project documentation under `docs/` (SRS, device/connection taxonomy, defense notes, this file) |
| `.css` | 5 | Styling — primarily `frontend/src/index.css`, plus the base-site's `css/` assets |
| `.yml` | 1 | `docker-compose.yml` |
| `.sql` / `.ts` / `.tsx` / `.scss` / `.yaml` | 0 | Not present anywhere in the codebase |

Note the 14 `.jsx` files with **zero** `.ts`/`.tsx` files confirms the
frontend is plain JavaScript + JSX, not TypeScript, despite `@types/react`/
`@types/react-dom` being present in `devDependencies` (editor/IDE tooling
only, no compile-time type checking is actually enforced).
