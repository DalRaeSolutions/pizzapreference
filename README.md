# Pizza Preference

A CAP + UI5 demo app for recording employee pizza preferences and building team orders from pasted meeting attendee lists.

## Project layout

| Folder / file | Purpose |
|---|---|
| `app/pizzapreference` | UI5 frontend |
| `db/` | Domain model (`schema.cds`) and CSV seed data |
| `srv/` | `PizzaService` definition and handlers |
| `xs-security.json` | xsuaa scopes, attributes, role templates |
| `package.json` | Node dependencies, CDS config, mocked auth users |
| `mta.yaml` | BTP deployment descriptor |

## Running locally

```bash
npm install
cds watch
```

Open <http://localhost:4004>. Mocked auth is active in dev — log in with any of the users listed below.

## Roles and mocked users

Two role collections:

- **pizzaeater** — records their own standing pizza preference (one row per employee)
- **pizzaorderer** — creates pizza orders from meeting attendee lists

Mocked users in [package.json](package.json) under `cds.requires.auth.users`. Every user has `attr.email`, `attr.displayName`, and `attr.department` populated — in production these come from IAS via xsuaa attribute mappings, locally they're hardcoded.

| User | Password | Roles | Seeded preference |
|---|---|---|---|
| `alice` | `alice` | pizzaeater | Vegetarian |
| `bob` | `bob` | pizzaeater | Vegetarian |
| `eater` | `eater` | pizzaeater | Ham and Cheese — *"extra pineapple, thin crust, no olives"* |
| `both` | `both` | pizzaeater + pizzaorderer | Meat Eaters |
| `carol` | `carol` | pizzaorderer | — |
| `dave` | `dave` | pizzaorderer | — |
| `orderer` | `orderer` | pizzaorderer | — |

Standing preferences are pre-seeded from [db/data/dalrae.pizzapreference-EmployeePizza.csv](db/data/dalrae.pizzapreference-EmployeePizza.csv) on each startup (in-memory SQLite resets every reload).

## Demo walkthrough

1. **Log in as an eater** (e.g. `alice` / `alice`) → *My Preference* tab shows her standing Vegetarian preference. Edit or delete it via the modal.
2. **Log in as an orderer** (e.g. `orderer` / `orderer`) → *Team Order* tab is empty. Click **New Order from Meeting**.
3. **Fill the dialog**:
   - **Title**: `Friday lunch — Engineering`
   - **When**: any date
   - **Attendees**: paste the block below
4. **Hit Create Order** → you land on the order details page.

### Demo paste list

Paste this into the **Attendees** textarea:

```
To: Alice Anderson <alice@acme.test>; Bob Barnes <bob@acme.test>; Demo Eater <eater@acme.test>; Brad Smith <both@acme.test>; Frank Foster <frank@acme.test>; Gina Green <gina@acme.test>; Henry Hall <henry@acme.test>
```

At the default `slicesPerPerson = 3` and 8 slices per pizza, the Summary tab should show:

- **Shared pizzas**
  - Vegetarian — 2 people × 3 slices = 6 slices → **1 pizza** (alice + bob)
  - Meat Eaters — 1 person × 3 slices = 3 slices → **1 pizza** (Brad)
- **Custom pizzas**
  - Demo Eater — Ham and Cheese, *"extra pineapple, thin crust, no olives"* → **1 pizza**
- **Capacity gap**
  - 3 attendees with no preference on file (Frank, Gina, Henry) × 3 slices = 9 slices → **2 pizzas** suggested
- **Total: 5 pizzas**

Flick the slice selector in the sub-header:

- **2 slices/person** → the gap collapses to 1 pizza → **Total 4**
- **4 slices/person** → Vegetarian jumps to 2 → **Total 6**

The selector PATCHes the order so your choice persists across reloads.

### What the demo proves

- **Standing preferences are a pool, not event-bound.** Employees set their preference once.
- **Customisations are personal.** A preference with notes becomes a whole pizza for that person — nobody else wants a slice of weird.
- **Capacity gap for unknowns.** Attendees without a preference on file are counted and sized via the slice formula.
- **Orders are immutable snapshots.** If `alice` changes her preference after an order is created, the existing order still shows what she had at the time. New orders pick up the new preference. Try it: edit alice's preference to Supreme, reload the order — she's still Vegetarian in that order; create a new order with the same paste — she's Supreme.
- **Role-gated UI.** Switch between `alice` / `orderer` / `both` to see tabs appear and disappear.
- **Attribute flow.** `createdByName` on an order comes from `req.user.attr.displayName` — the same mechanism that reads an IAS-delivered attribute in production.

## Architecture notes

- **CAP 9.8** backend on Node 20+, SQLite in-memory for dev, HANA for `[production]`
- **OData v2 adapter** via [`@cap-js-community/odata-v2-adapter`](https://github.com/cap-js-community/odata-v2-adapter) as a cds-plugin, so the UI5 app keeps talking v2 at `/v2/pizza/` while the service itself is v4
- **UI5 1.120** loaded from the SAPUI5 CDN; `@ui5/cli` v4 tooling; `@sap/ux-ui5-tooling` for the dev server
- **Mocked auth** in dev mirrors the xsuaa attribute shape — `req.user.attr.email` works identically in both environments, so no code forks between local and deployed
- **Order snapshotting** — `OrderParticipant` stores `pizza_ID`, `pizzaName`, `pizzaDescription`, `notes` directly (no live association to `EmployeePizza`), so historical orders don't rewrite themselves when standing preferences change

## Productive path (not implemented)

Tier A attendee paste is what's built. The "productive" upgrade path for a real SAP landscape:

- **Microsoft Graph integration** — OAuth into Graph from the BTP backend, read `GET /me/events/{id}/attendees` for a chosen meeting, skip the paste step entirely
- **IAS/IPS wiring** — SCIM provisioning from SuccessFactors or Entra ID into IAS, which then populates `attr.email` / `attr.displayName` / `attr.department` on every token
- **Department-scoped orderers** — use `attr.department` in the orderer's `@restrict` to limit which preferences and orders they can see

## Learn more

- CAP docs: <https://cap.cloud.sap/docs/get-started/>
- OData v2 adapter: <https://github.com/cap-js-community/odata-v2-adapter>
