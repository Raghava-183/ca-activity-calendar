# Activity Calendar

Department of Computer Applications · School of Computing and Informatics · VFSTR

The department's activity calendar with a proof file against every activity.
Anyone with the link can read it. Organisers sign in with a shared code to
attach Google Drive links, mark activities completed and write event notes.
Everything saves to one department database, so whoever opens the link sees
the current state.

Same shape as the HoD Score Card project — Vercel in front, Neon Postgres behind.

---

## What you need

| Service | What it holds | Sign up |
|---|---|---|
| Vercel | The app itself | vercel.com |
| Neon Postgres | Proof links, statuses, event notes | added from inside Vercel |

No Cloudinary this time — proofs are Google Drive links, not uploaded files.

---

## Deploy — step by step

### 1. Put the code on GitHub

Create an empty repository, then from this folder:

```bash
git init
git add .
git commit -m "Activity calendar"
git branch -M main
git remote add origin https://github.com/Raghava-183/ca-activity-calendar.git
git push -u origin main
```

If you are reusing the existing `ca-activity-calendar` repo, delete the old
files first — the layout has changed. `index.html` now lives in `public/`.

### 2. Import it into Vercel

On vercel.com, **Add New → Project**, pick the repository, deploy.
Leave the framework as "Other" — nothing to configure.

It will build fine but show an error banner on opening. Expected, no database yet.

### 3. Add the database

Click your **account name** at the top left to leave the project, then
**Storage → Create Database → Neon** → free plan, Singapore or Mumbai region.

Once created, click **Connect Project**, choose `ca-activity-calendar`, and tick
**Production**. **Leave Custom Prefix completely empty** — Neon already supplies
`DATABASE_URL`, and typing a prefix produces `Database_DATABASE_URL`, which the
code will not find.

Tables are created automatically on the first request. The six proof links from
the 2026-27 workbook are loaded at the same time.

### 4. Set the edit code

In the project: **Settings → Environment Variables**. Add one:

| Name | Value |
|---|---|
| `EDIT_CODE` | The code organisers will type. Choose your own. |

`DATABASE_URL` is already there from step 3.

### 5. Redeploy

**Deployments → the newest one → ⋯ → Redeploy.** Environment variables only
reach the code at build time, so this step is required. Skipping it is the most
common reason the app still errors after setup.

Open the site. It should read **6 of 17 activities have proof attached** on the
2026-27 Sem-I tab.

---

## How the team uses it

**Sir and everyone else** — open the link. Proofs, statuses, the summary sheet
and the printable report are all visible. Nothing can be changed by accident.

**Organisers** — **Sign in to edit** at the top right, enter your name and the
edit code. Open any activity, paste the Drive link, click Attach link. Your name
is recorded against everything you add. Signing in lasts for that visit only.

Set each Drive document to *Anyone with the link can view*, or people hit a
"Request access" screen.

### Rescheduling and changing the calendar

Signed-in organisers can change the calendar itself, without any code change
or push:

- **Reschedule or rename** — open the activity, **Edit details**. Change the
  dates, the title, the type or the class, and Save. The card moves on the grid
  and a line appears saying it changed after the calendar was published.
- **Cancel** — open the activity, **Cancel this activity**. It disappears from
  the calendar, the summary sheet and the report. Its proof links stay on record
  and come back if it is ever restored.
- **Add one that was not planned** — **Add activity** in the toolbar.

Changes are stored separately from the published calendar, so replacing a
semester's Excel later does not wipe them. Proof links are never lost by an
edit — they are attached to the activity, not to its date.

---

## Changing the edit code

**Settings → Environment Variables → edit `EDIT_CODE` → Save**, then redeploy.
Nothing in the code changes.

## Looking at the data directly

In Vercel, open the Neon database and use the SQL editor:

```sql
SELECT term, event_id, title, label, url, added_by, added_at
FROM proofs ORDER BY added_at DESC;

SELECT term, event_id, title, status, notes, updated_by
FROM activity_status ORDER BY updated_at DESC;

SELECT term, event_id, title, start_date, end_date, cancelled, custom, updated_by
FROM event_edits ORDER BY updated_at DESC;
```

Deleting a row there removes that proof from the site.

## Adding the remaining semesters

The calendars live in `public/index.html` in the `TERMS` array near the top of
the script. 2026-27 Sem-I and 2025-26 Sem-II are loaded; 2025-26 Sem-I and
2026-27 Sem-II are empty and show an import prompt. Send the Excel files to have
them converted, then push — proofs already in the database are untouched.

## If something goes wrong

**Error banner on opening** — the database is not connected, or you did not
redeploy after connecting it. Check **Settings → Environment Variables** lists
`DATABASE_URL` on its own, not `Database_DATABASE_URL`.

**"That edit code is not correct"** — `EDIT_CODE` is not set, or you did not
redeploy after setting it.

**"Could not save"** — open **Logs** in the Vercel project, try the save again,
and read the red `/api/save` line. It names the cause.

---

## What is in here

```
api/_db.js        database connection, schema, seed data
api/records.js    GET  /api/records  — everything the page shows
api/save.js       POST /api/save     — proofs, status, notes, calendar edits
public/index.html the calendar
public/header.png the departmental banner
```

To change the banner, replace `public/header.png` and push.
