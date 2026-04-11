# Lead Matching Algorithm

## Overview

When a homeowner posts a job, the backend immediately runs the lead-matching algorithm (`matchTradespersons`) to find eligible tradespeople and create **Lead** records for each match. Each lead costs the tradesperson credits to unlock and is valid for **7 days**.

---

## Trigger

The algorithm runs synchronously at the end of `JobsService.createJob()`, immediately after the job row is inserted into the database.

---

## Step-by-Step Algorithm

### 1. Resolve job location
Before matching, the job's postcode is geocoded (via the postcodes.io API) to obtain a `latitude` and `longitude`. These coordinates are stored on the `Job` record and passed to the matching function.

### 2. Fetch candidates
The algorithm queries `TradespersonProfile` for all profiles that satisfy **all three** of the following conditions:

| Condition | Detail |
|---|---|
| `verificationStatus IN ('APPROVED', 'PENDING')` | The tradesperson has not been explicitly rejected. New registrations are `PENDING` by default. |
| `latitude IS NOT NULL` | The tradesperson has saved their work area at least once (sets lat/lng from their postcode). |
| `services` contains `serviceSlug` | The tradesperson offers the same service as the posted job. |

> **Important:** A tradesperson with no saved work area (`latitude = null`) will never match. They must visit their profile → Work Area tab and save a postcode.

### 3. Distance filter
For each candidate, the [Haversine formula](https://en.wikipedia.org/wiki/Haversine_formula) calculates the straight-line distance in miles between the job's coordinates and the tradesperson's coordinates.

A candidate **passes** only if:
```
distanceMiles <= tradesperson.workRadiusMiles
```

`workRadiusMiles` defaults to **10 miles** when a tradesperson saves their work area.

### 4. Create Lead rows
For every candidate that passes the distance check, a `Lead` record is created:

```
Lead {
  jobId          → the new job
  tradespersonId → matched tradesperson's userId
  creditCost     → calculated from the service (see Credit Cost below)
  distanceMiles  → exact distance to the job
  expiresAt      → now + 7 days
  status         → PENDING (tradesperson has not yet unlocked it)
}
```

Duplicate leads (same `jobId` + `tradespersonId`) are silently skipped.

### 5. Return match count
`createJob` returns `matchedCount` — the number of leads created — in its API response.

---

## Credit Cost

Credit costs are defined in [`credit-cost.helper.ts`](src/modules/jobs/credit-cost.helper.ts) via a service → credits map:

| Category | Examples | Credits |
|---|---|---|
| Handyman / small jobs | cleaning, handyman, pest control | 3–5 |
| Standard trades | plumbing, electrical, roofing, bathroom fitting | 8–12 |
| Large projects | loft conversion, extensions, garage conversion | 15–25 |
| Specialist | architectural, structural engineering, surveying | 20–30 |

Services not in the map default to **10 credits**.

A tradesperson pays the listed credit cost when they **unlock** a lead to see the homeowner's contact details.

---

## Lead Expiry

Leads expire **7 days** after the job is posted. Expired leads cannot be unlocked. The `expiresAt` timestamp is set at creation time.

---

## Requirements for a Tradesperson to Receive Leads

For a tradesperson to appear in lead matching, all of the following must be true:

1. **Account status**: `verificationStatus` is `APPROVED` or `PENDING` (not `REJECTED`).
2. **Work area saved**: The tradesperson has gone to their profile → Work Area tab and saved a postcode — this populates `latitude`, `longitude`, and `workRadiusMiles` on their profile.
3. **Service registered**: At least one of their listed services matches the job's `serviceSlug`.
4. **Within radius**: The job's location falls within their `workRadiusMiles`.

---

## Lead Lifecycle

```
Job posted
    │
    ▼
matchTradespersons() runs
    │
    ▼
Lead created (status = PENDING, expires in 7 days)
    │
    ├── Tradesperson views lead in their dashboard (truncated details)
    │
    └── Tradesperson pays credits to unlock
            │
            ▼
        Lead (status = UNLOCKED) → full homeowner contact shown
```
