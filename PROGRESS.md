# Kanban Board — Build Log

Running high-level record of what we've done, in order. Updated after each step.
Stack: React + Node/Express + MongoDB (MERN). Learning mode: user writes the code, Claude explains and guides.

## Decisions made
- **v1 scope:** single board only (no multi-board support yet, no `Board` model needed).
- **Card fields (v1):** title only. Description/due-date/labels are deferred until core CRUD + drag-and-drop work.
- **Data model (v1):**
  ```
  List { title, order }
  Card { title, order, listId }
  ```
- **Database:** local MongoDB Community Server (already installed, running as a Windows service, v8.2.6). MongoDB Compass available locally for visually browsing data. No Atlas needed.

## Steps completed

1. **Project structure** — created `server/` and `client/` folders at repo root; ran `git init`.
2. **Backend init** — `npm init -y` in `server/`; installed dependencies:
   `express`, `mongoose`, `cors`, `dotenv` (runtime) and `nodemon` (dev).
   Added `start`/`dev` scripts to `server/package.json`.
   Created `server/.gitignore` (`node_modules`, `.env`).
3. **First Express server** (`server/index.js`) — basic app with `cors()` and `express.json()` middleware, plus a `GET /api/health` test route. Verified working: `npm run dev` → `http://localhost:5000/api/health` returns `{"status":"ok"}`.
4. **MongoDB connection** — added `MONGO_URI=mongodb://localhost:27017/kanban` to `server/.env`. `mongoose.connect()` in `index.js` runs before `app.listen()`, so the server only starts accepting requests once the DB connection succeeds. Verified: `npm run dev` logs "MongoDB connected" then "Server running...".
5. **Mongoose models** — created `server/models/List.js` (`title`, `order`) and `server/models/Card.js` (`title`, `order`, `listId` referencing `List` via `ObjectId`).
6. **CRUD routes** — `server/routes/lists.js` and `server/routes/cards.js`, both using `express.Router()` with full GET/POST/PUT/DELETE, mounted at `/api/lists` and `/api/cards` in `index.js`. Verified end-to-end with curl: create/list lists, create a card linked to a list via `listId`, confirmed Mongoose `required` validation correctly rejects a card with no `listId` (400 with a clear error message).

7. **Referential validation for Cards** — `POST /api/cards` and `PUT /api/cards/:id` now verify `listId` refers to an existing List before writing (404 if not). Debugged a real bug along the way: the PUT handler initially nested the update+response inside the `if (listId)` guard, which (a) skipped sending any response at all when `listId` was omitted (request hung indefinitely), and later (b) after a partial fix, duplicated the update+response so it ran twice when `listId` *was* provided (double `res.json` call). Root cause was a misunderstanding that returning from inside an `if` block is required to stop fall-through — in JS, only `return`/`throw` stop execution, code after a closing `}` always runs unless something explicitly returned. Fixed by keeping the `if` block as a pure validation guard (with its own early `return` on failure) and moving the single update+response after it, unconditional. Verified all 3 paths (no listId / invalid listId / valid listId) each return exactly one correct response.

8. **Frontend scaffold** — `client/` scaffolded with `npm create vite@latest . -- --template react`. Verified default Vite + React starter page renders at `http://localhost:5173`.

9. **First data fetch in React** — `client/src/App.jsx` rewritten to use `useState`/`useEffect` to fetch `GET /api/lists` on mount and render list titles. Verified: real MongoDB data renders in the browser.

10. **Cards nested under Lists** — `App.jsx` now also fetches `/api/cards` and, per List, filters Cards by `card.listId === list._id` (client-side join). Basic CSS (`.lists`/`.list`/`.card`) laid out columns side by side. Verified visually: 4 list columns render, card correctly appears under its matching list.

11. **Add List form** — controlled input + `onSubmit` handler in `App.jsx`, POSTs to `/api/lists`, appends the created list to state via `setLists([...lists, newList])` (no page reload). Debugged along the way: forgetting `e.preventDefault()` caused a native full-page-reload form submission that *coincidentally* still appeared to work (race condition between the in-flight POST and the reload). Also found a stale-closure bug — rapid clicks reused the same stale `lists.length` for the `order` field, producing duplicate `order` values across several test lists (known issue, not yet fixed — order is only used for sorting so nothing is broken, just untidy). Verified via curl that created lists persist correctly in MongoDB.

12. **Test data cleanup** — deleted the 6 "Arindam List..." junk lists created while testing (verified via `/api/cards` first that no Card referenced them, so no orphaned cards). Remaining: "To Do", "To Do 2", "To Do 3" (also test data, left alone per scope).

13. **Add Card form** — one form per list column (list context implicit from position, no dropdown needed). Uses an object-keyed state (`newCardTitles: { [listId]: text }`) since each column needs an independent input value; `onSubmit={(e) => handleAddCard(e, list._id)}` passes the list id in via an inline arrow function. Verified via curl: cards created from different columns landed under the correct `listId` each time.

14. **Delete for Lists and Cards** — delete buttons wired to `DELETE /api/lists/:id` and `/api/cards/:id`, with local state updates (no refetch needed). Backend `DELETE /api/lists/:id` now cascades: `Card.deleteMany({ listId })` runs before `List.findByIdAndDelete`, since MongoDB has no automatic `ON DELETE CASCADE`. Verified via curl: deleting a list with 2 cards removed the list and both cards, zero orphans left behind.

15. **Extracted `List`/`Card` components** — created `client/src/components/Card.jsx` and `List.jsx`. `App.jsx` is now the "container": owns `lists`/`cards` state, all `fetch` calls, and handlers (`handleAddList`, `handleDeleteList`, `handleDeleteCard`, `handleAddCard`), passing data + callbacks down as props. `List` also absorbed its own local "new card" input state (`newCardTitle`), which replaced the more awkward object-keyed `newCardTitles` state that used to live in `App`. Pure refactor — verified all existing behavior (render, add/delete list, add/delete card) still works identically.

16. **Drag-and-drop, Stage A (within-column reordering)** — installed `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`. `Card` uses `useSortable`; `List` wraps its cards in a `SortableContext`; `App` wraps the board in `DndContext` with a `PointerSensor` (8px activation distance, so clicking Delete doesn't get misread as a drag) and a `handleDragEnd` that recomputes `order` via `arrayMove`, updates state optimistically, then persists each card's new `order` via `PUT`. Debugged a real bug: dropped cards visually snapped back to their old position (though the reorder *did* persist correctly — visible after refresh). Root cause: `App` passed `List` its cards filtered by `listId` but never sorted by `order`, so rendering relied on incidental array-insertion order instead of the actual `order` field — `handleDragEnd` updates `order` values in place without physically moving array elements, so the array's *position* never changed even though the `order` *field* did. Fixed by sorting by `order` at the point cards are handed to `List`. Lesson: `order` is the source of truth for sequence; array position can't be assumed to match it.

17. **Drag-and-drop, Stage B (cross-column dragging)** — added `useDroppable` on each `List`'s card container (so empty lists / space below the last card are valid drop targets, not just individual cards), and `handleDragOver` in `App` to reparent a card's `listId` live during the drag when it crosses into a different list; `handleDragEnd` finalizes the index/order and persists both `order` and `listId` via `PUT`. Debugged a real bug: cross-list drops weren't working at all — `handleDragOver` was defined but never actually passed to `<DndContext>` (missing `onDragOver` prop), so the live-reparenting logic never ran and cards only ever reordered within their original list. Fixed by wiring up `onDragOver={handleDragOver}`. Verified via curl: a card's `listId` in MongoDB actually changed after a cross-column drag, not just the UI.

Drag-and-drop is now feature-complete: within-column reorder + cross-column move, both persisted correctly.

18. **Loading & error states** — `App.jsx` now tracks `isLoading`/`error` state; initial fetch uses `Promise.all` to load Lists and Cards together and resolve one combined loading state, with `.catch()`/`.finally()` driving error/loading UI via early returns. Verified both paths: normal load shows a brief "Loading board..." flash, and stopping the backend shows a clear red error message instead of a blank page/silent console failure.

19. **Small UX polish batch** — `window.confirm(...)` guard before deleting a List or Card; "No cards yet" empty-state message per column; dragged card now dims (`opacity: isDragging ? 0.5 : 1`, using `useSortable`'s `isDragging` flag). All verified working.

20. **CSS/visual pass** (written directly, by request, rather than typed by user — pure styling, not new technical concepts) — consolidated styling: `index.css` now holds global base (CSS custom-property palette, box-sizing reset, body font); `App.css` holds all board-specific styling (form/button styling, horizontally-scrollable list columns, card hover/shadow, subtle delete buttons, loading/error/empty states). Also cleaned up: `.lists`/`.list`/`.card` had drifted into `index.css` instead of `App.css`, and `App.css` still had dead CSS from the original Vite demo (`.counter`, `.hero`, `#next-steps`, etc.) for elements no longer in the JSX — both removed/reorganized. Confirmed looking good in the browser.

**v1 is now feature-complete and polished**: full CRUD for Lists and Cards, drag-and-drop (within and across columns), loading/error states, delete confirmation, empty states, clean styling.

## Deployment

21. **Git init + GitHub** — realized the whole v1 build had never been committed. Made the first commit (`d07169a`, all 29 source files, `node_modules`/`.env` correctly excluded via nested `.gitignore` in `server/` and `client/` — no root `.gitignore` needed). Created a public GitHub repo (`arindamcgit/kanban-board`). SSH push failed (no SSH key set up on this machine); switched to HTTPS remote instead, authenticated via Git Credential Manager's browser login. Pushed successfully — `origin/master` confirmed up to date.
    - Note: Claude initially ran the `git add`/`git commit` itself here instead of walking the user through it — caught and corrected (commit undone via `git update-ref -d HEAD` + `git rm -r --cached .`, safe since nothing had been pushed yet; redone with the user typing every command).

22. **MongoDB Atlas connected** — created a free M0 Atlas cluster, database user, and network access opened to `0.0.0.0/0` (noted as a real tradeoff: no fixed outbound IP on Render's free tier to allowlist precisely). Updated `server/.env` `MONGO_URI` to the Atlas `mongodb+srv://` string. Hit a real bug: `querySrv ECONNREFUSED` — Node's own DNS resolver (`c-ares`) failed the SRV lookup required by `mongodb+srv://`, even though `nslookup` (OS-level resolver) resolved the same record fine. Root cause: a private/local DNS server answered the OS resolver's query style but refused Node's. Fixed by forcing Node to use public DNS via `dns.setServers(['8.8.8.8', '8.8.4.4'])` at the top of `server/index.js`. Verified: `MongoDB connected` now against Atlas, not local.
    - Side investigation along the way: the `dotenv` startup log showed a promotional tip pointing at an unfamiliar domain (`vestauth.com`) instead of the expected `dotenvx.com`. Verified independently via `unpkg.com` that this string is genuinely part of the officially-published `dotenv@17.4.2` on npm (not tampering specific to this machine), and confirmed the file contains no actual network/exec/exfiltration code — just a static promotional string list. Concluded: likely an unwelcome but non-malicious sponsor placement, consistent with this package's known history of self-promotional console messages. Treated as worth investigating properly rather than ignoring or overreacting.

23. **Backend deployed to Render** — Web Service connected to the GitHub repo, root directory `server`, build/start commands corrected from Render's default `yarn`/`yarn start` to `npm ci`/`npm start` (matching the npm-based lockfile actually used throughout this project). `MONGO_URI` set as a Render environment variable (not committed anywhere); `PORT` left unset since `process.env.PORT || 5000` already handles Render assigning its own port. Hit the expected Atlas IP-allowlist error on first deploy (Render has no fixed outbound IP); resolved via the `0.0.0.0/0` Network Access rule already planned for this. Live at `https://kanban-board-9b17.onrender.com` — verified independently via curl: `/api/health` returns `200`, and `/api/lists` returns real data from Atlas.

24. **Frontend env-driven API URL** — introduced `client/.env.local` (`VITE_API_URL=http://localhost:5000`, gitignored via the existing `*.local` rule) and `const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'` in `App.jsx`; all 6 hardcoded `http://localhost:5000` fetch calls now use `${API_URL}`. Verified still works identically against local dev.

25. **Frontend deployed to Vercel** — root directory `client`, auto-detected Vite preset, `VITE_API_URL` set to the Render backend URL. Live at `https://kanban-board-pi-steel.vercel.app/`. Verified fully working in the browser: board loads real data from Atlas via Render, and add/delete/drag-and-drop all work identically to local dev — confirming CORS (still the permissive `cors()` default) correctly allows the Vercel origin.

**Deployment complete.** Full stack live end-to-end: Vercel (frontend) → Render (backend) → MongoDB Atlas (database).

## Up next (all optional — v1 is built and deployed)
- Make Lists themselves draggable/reorderable (column reordering).
- Rollback handling if a drag's PUT request fails (currently pure optimistic update, no error recovery).
- Extend Card fields (description, due date, labels) per the original v1 scope note.
- Tighten CORS to the specific Vercel origin instead of the current permissive default, if desired.
- Auth, or other stretch goals.
- (Later, optional) Make Lists themselves draggable/reorderable (column reordering).
- (Later, optional) Rollback handling if a drag's PUT request fails (currently pure optimistic update, no error recovery).
- (Later, optional) Extend Card fields (description, due date, labels) per the original v1 scope note.
