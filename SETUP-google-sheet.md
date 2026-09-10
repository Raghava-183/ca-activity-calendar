# Shared proof storage — setup

Right now the site keeps proof links in whoever's browser typed them. After this
setup, everything is stored in one Google Sheet: the organising team adds proof
links from the live site, and sir sees them immediately without signing in.

You need a Google account. Everything below is free. It takes about fifteen
minutes and you only do it once.

---

## 1. Make the Sheet

1. Go to <https://sheets.new>
2. Rename it **CA Activity Calendar — Proofs** (top-left).

Leave it empty. The script creates the tabs it needs the first time it runs.

## 2. Add the script

1. In the Sheet, click **Extensions → Apps Script**. A new tab opens.
2. Delete whatever is in the editor.
3. Open `Code.gs` from the files I sent, copy all of it, and paste it in.
4. Near the top you'll see:

   ```js
   const EDIT_CODE = 'change-this-code';
   ```

   Change `change-this-code` to a code only your organising team will know.
   Treat it like a password. Anyone with it can add and delete proof links.

5. Click the save icon.

## 3. Publish it

1. Click **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description** — `Activity calendar store`
   - **Execute as** — **Me**
   - **Who has access** — **Anyone**
4. Click **Deploy**.
5. Google asks for permission. Click **Authorise access**, choose your account,
   then **Advanced → Go to (project name) → Allow**. This warning is normal for
   your own scripts.
6. Copy the **Web app URL**. It looks like:

   ```
   https://script.google.com/macros/s/AKfycb.....................cQ/exec
   ```

**"Who has access: Anyone" is required** — visitors are not signed into your
Google account, so the page could not reach the Sheet otherwise. Adding proofs
still needs the edit code, and nobody can open the Sheet itself without your
permission.

## 4. Point the site at it

1. Open `index.html` in Notepad or VS Code.
2. Find this line near the top of the script (use Ctrl+F for `BACKEND_URL`):

   ```js
   const BACKEND_URL = "";
   ```

3. Paste your web app URL between the quotes:

   ```js
   const BACKEND_URL = "https://script.google.com/macros/s/AKfycb...cQ/exec";
   ```

4. Save.

## 5. Load the proofs you already have

The six proof links from the 2026-27 workbook need to go into the Sheet once.

1. Back in the Apps Script editor, pick **seedWorkbookProofs** from the function
   dropdown at the top.
2. Click **Run**.
3. It reports how many it added. Check the Sheet — you should see a **Proofs**
   tab with six rows and a **Status** tab.

Run this **once only**. Running it twice adds duplicates.

## 6. Push

```powershell
cd "C:\Users\ragha\Downloads\Activity Calendar files"
git add .
git commit -m "Store proofs in a shared Google Sheet"
git push
```

Open the live site. The six proofs should appear with green markers, and the
counter should read **6 of 17 activities have proof attached**.

---

## How the team uses it

**Sir and everyone else** — just open the link. Proofs, statuses and the report
are all visible. Nothing can be changed by accident.

**Organisers** — click **Sign in to edit** at the top right, enter your name and
the edit code. You can then attach proof links, mark activities completed and
write event notes. Your name is recorded in the Sheet against everything you add.

Signing in lasts for that visit only. Closing the tab signs you out, which is
deliberate — a shared department computer should not stay in edit mode.

## Things worth knowing

**The Sheet is readable.** Open it any time to see every proof link, who added
it and when. You can sort and filter it like any spreadsheet. Editing a cell by
hand works too — the site picks up the change on the next load.

**Deleting a row in the Sheet removes that proof from the site.** Useful for
cleaning up a mistake.

**Changing the edit code** — edit `EDIT_CODE` in the script, save, then
**Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy**.
Editing the code alone is not enough; you must redeploy.

**If you edit the script later**, always deploy a new version the same way, or
the live site keeps running the old one.

**Backups** — the Sheet is the record now. `File → Version history` in Google
Sheets restores any earlier state. The **Save backup** button on the site still
downloads a copy if you want one outside Google.

## If something goes wrong

**"Could not reach the shared sheet"** — the URL in `BACKEND_URL` is wrong, or
the deployment access is not set to "Anyone". Re-check step 3, redeploy, and
copy the URL again.

**"That edit code is not correct"** — the code in the script and the one being
typed do not match. Remember to redeploy after changing it.

**Proofs are not appearing for other people** — confirm `BACKEND_URL` is filled
in on the version you actually pushed. Open the live page, press F12, and check
the Console for errors.

**The proof links open but say "Request access"** — that is Google Drive, not
this site. Set each document to *Anyone with the link can view* in Drive.
