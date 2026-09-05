# Interview Talking Points

Concepts from building this project that are common interview topics. Short explanation of each — expand in your own words before an interview, don't just memorize this.

## REST conventions & HTTP status codes
Mapped GET/POST/PUT/DELETE to CRUD operations on `/api/lists`. Status codes carry meaning so the client can branch without parsing the body: `200` OK, `201` Created, `204` No Content (used for DELETE — success, nothing to return), `400` Bad Request (client sent bad data), `500` Internal Server Error (server-side failure).

## Middleware & the Express request pipeline
`app.use()` registers functions that run, in registration order, for every incoming request before it reaches a route handler (e.g. `cors()`, `express.json()`). Good interview framing: "walk me through what happens when a request hits an Express server."

## Async/await + error handling in Node
Every Mongoose call (`find`, `create`, `findByIdAndUpdate`...) returns a Promise, so route handlers are `async` and use `await`, wrapped in `try/catch`. Without the catch, a rejected promise becomes an unhandled rejection — in older Node this could crash the process.

## MongoDB references vs. SQL foreign keys
No JOINs in MongoDB. Relationships are modeled by storing another document's `_id` (`listId: ObjectId`) with a `ref: 'List'` hint in the schema. Mongoose's `.populate()` (coming later) fetches the referenced document on demand — the closest analog to a JOIN. Good contrast question: "how does a document database handle relationships without foreign keys?"

**No referential integrity by default:** unlike a SQL foreign key, MongoDB does not verify that a referenced `_id` (e.g. `listId` on a Card) actually exists in the other collection — it'll happily save a `listId` pointing at nothing. Any "does this reference exist" check is the application's job (e.g. look up the List before creating the Card), not the database's. Good interview point on the tradeoffs of schema-less/flexible databases vs. relational ones.

## Idempotency
GET, PUT, and DELETE are idempotent — calling them twice with the same input produces the same end state. POST is not (calling it twice creates two resources). Matters for discussing retry-safety of API calls over unreliable networks.

## Config via environment variables
Secrets and environment-specific values (`MONGO_URI`, `PORT`) live in `.env`, loaded via `dotenv`, and `.env` is gitignored. Keeps secrets out of source control and lets the same code run against different environments (dev/staging/prod) via different `.env` files.

## Control flow: `return` vs. fall-through (and hanging Express requests)
Real bug hit while adding `listId` validation to the Card PUT route. Core fact: in JS, code inside an `if` block does **not** stop the enclosing function from continuing — only `return` (or `throw`) does. Calling `res.json(...)` sends a response but does not implicitly return.
Two failure modes this caused, in order:
1. **Hung request:** the update+response call was nested *inside* `if (listId)`. When `listId` was absent, that whole block was skipped — meaning no `res.` call happened on that path at all. Express has no fallback: if a handler never calls `res.send/json/end`, the request just hangs until the client times out. (Verified this directly: curl with `--max-time` returned exit code `28`, timeout.)
2. **Double response:** a partial fix left the update+response duplicated both inside and after the `if` block. When `listId` *was* valid, both copies ran — two DB writes, and a second `res.json()` call on an already-sent response (throws `ERR_HTTP_HEADERS_SENT` under the hood).
Fix: the `if` block should contain *only* the validation guard (with its own early `return` on failure); the actual update + single response goes after it, unconditionally, so every code path sends exactly one response.
Good interview framing: "describe a bug you diagnosed" — walk through reasoning about control flow line-by-line, and using curl's timeout/exit-code to empirically confirm a hang rather than guessing.

## React: `useState` + `useEffect`
`useState` gives a component a value that persists across re-renders and triggers a re-render when changed via its setter. `useEffect(fn, [])` runs `fn` once after the component's first render (mount) — used here to fetch Lists from the API as a side effect, since side effects shouldn't happen during rendering itself. Good interview framing: "why can't you just fetch data directly in the component body?" (rendering must stay pure/predictable; data fetching is a side effect that belongs in `useEffect`).

## React `<StrictMode>`
Wraps the app in development only; intentionally double-invokes certain functions (like component bodies and some effects) to help surface bugs where code isn't supposed to run twice (impure side effects). Has zero effect on production builds — purely a dev-time safety net.

## React `key` prop & reconciliation
Required whenever rendering a list of elements via `.map()`. React uses `key` to match elements across re-renders so it can update the DOM efficiently (move/update/remove) instead of tearing down and rebuilding everything. Using array index as key breaks down for reorderable lists (index changes when order changes) — directly relevant once drag-and-drop reordering is added later; will need to key on the stable `_id` from MongoDB instead.

## Client-side vs. server-side "joins"
The API exposes flat `/api/lists` and `/api/cards` collections with no nesting. To render a board, the frontend fetches both and filters `cards` by `listId === list._id` per list — a join done in the browser. Tradeoffs vs. doing it server-side (e.g. Mongoose `.populate()`, or a custom `/api/board` aggregate endpoint): client-side means more data sent over the wire (every card, even ones not currently needed) and filtering work shifted onto the client; server-side means fewer round trips and less over-fetching but more backend complexity. Good "how would you optimize this" interview question.

## Controlled vs. uncontrolled form inputs (React)
A controlled input's `value` is driven by React state (`useState`) and updated via `onChange`, making React the single source of truth for form data. An uncontrolled input lets the DOM hold the value itself, read out later via a `ref` or `FormData` on submit. Controlled is the more common/idiomatic React pattern (used for the List/Card creation forms here) because it makes the current input value available for validation, conditional rendering, etc. as the user types, not just on submit.

## State immutability in React
State must be updated by creating a new object/array, never by mutating the existing one in place (e.g. `setLists([...lists, newList])`, not `lists.push(newList); setLists(lists)`). React decides whether to re-render largely by comparing references; mutating in place can leave the reference unchanged and cause React to skip a re-render or otherwise behave unpredictably. One of the most frequently asked React interview questions — know a concrete example (array push vs. spread; object mutation vs. spread `{...obj, key: value}`).

## `e.preventDefault()` on form submit — default browser behavior vs. SPA
An HTML `<form>` without `action`/`method` attributes still has a default native behavior on submit: navigate (GET) to the current URL, i.e. a full page reload. In a React SPA, this fights against everything client-side routing/state is for. Real gotcha hit here: omitting `e.preventDefault()` on submit still "looked like it worked" — the `fetch()` POST fires first and, if it happens to reach the server before the page-reload's navigation tears down the JS context, the subsequent full reload's fresh data fetch coincidentally includes the new item. That's a **race condition**, not correctness — on a slower network/server the navigation can cancel the in-flight request before it completes, silently losing the write, with no error visible (the reload wipes any error handling too). Good interview point: distinguishing "appears to work in a quick local test" from "is actually correct," and reasoning about race conditions between async work and navigation/unload.

## Stale closures in React
A function defined inside a component body "closes over" the state values from the render that created it. If that function fires again before a re-render happens (e.g. rapid clicks), it's still working with the old/stale values, not the current state. Real bug hit here: `handleAddList` computed `order: lists.length` from the closure's `lists` — clicking "Add List" faster than the request+re-render cycle produced multiple lists with the *same* `order` value, since they all read the same stale `lists.length`. Fix pattern for the state update itself: functional updates (`setLists(prev => [...prev, newList])`) always operate on the latest state regardless of closure staleness. But note that alone doesn't fix values read *before* the state setter (like the `order` sent in the POST body) — those need either a ref, or (more robust) computing the value server-side instead of trusting a client-computed value. Good interview question: "what's a stale closure and how do you avoid it in React?"

## Cascading deletes (manual, in MongoDB)
Deleting a List doesn't automatically delete its Cards — MongoDB has no `ON DELETE CASCADE` like SQL foreign keys do. Without handling it, deleted-list's cards become orphaned: `listId` points at nothing, and since the UI only renders cards nested inside a matching list, they'd silently vanish from view while still existing forever in the database. Fix: explicitly delete dependent documents in the route handler before deleting the parent (`Card.deleteMany({ listId })` before `List.findByIdAndDelete(id)`). Good interview point on a concrete tradeoff of schema-less/NoSQL databases — flexibility comes at the cost of the database no longer enforcing relationships for you.

## Props, lifting state up, and unidirectional data flow
Props are how a parent passes data (including functions) down to a child component (`function Card({ card, onDelete })`). When multiple components need to coordinate over the same data, that state is "lifted" to their closest common ancestor and passed down as props — the child never mutates it directly, it calls a callback prop (e.g. `onDelete(card._id)`) and the actual state update happens in the parent. Data flows down (props), events flow up (callbacks) — this is React's unidirectional data flow, a core design principle. Extracting `List`/`Card` out of `App.jsx` here is a direct example: `App` still owns `lists`/`cards` state and all the fetch logic; `List`/`Card` are simpler and only receive what they need to render plus callbacks to invoke.

## Optimistic UI updates
Updating local/client state immediately on a user action (e.g. after a drag-and-drop reorder) rather than waiting for the server's response, so the UI feels instant. The persistence request (`fetch`/PUT) fires afterward, "trusting" it'll succeed. Tradeoff: if the request fails, the UI is now out of sync with the server and needs rollback logic to revert — not yet implemented here (known gap), but the concept — and knowing when it's an acceptable tradeoff vs. when you need pessimistic (wait-for-confirmation) updates — is a common interview topic.

## Rendering order vs. data order (array position ≠ source of truth)
Real bug from building drag-and-drop: after dropping a card in a new position, it visually snapped back to its old spot — but the reorder *had* actually persisted correctly (visible after a refresh). Root cause: the drag handler updated each card's `order` field correctly, but did so via `.map()`, which replaces objects **in place** at their existing array index rather than physically moving array elements. Meanwhile the component rendering the cards filtered them by list but never sorted by `order` — it just rendered whatever sequence the array happened to be in. Since the array's *position* never changed (only the `order` *field* did), the next render drew the cards in the old sequence. Fix: sort by `order` at the point of rendering, every time — never assume an array's incidental position matches a data field meant to represent sequence. Good interview framing: "describe a bug where the data was correct but the UI was wrong" — a state/rendering desync, not a data bug.

## dnd-kit: `onDragOver` vs `onDragEnd`, `useDroppable` vs `useSortable`
`onDragOver` fires repeatedly during a drag, every time the pointer moves over a new potential target — used for live cross-container feedback (moving a card into a different list's state *while* still dragging, before drop). `onDragEnd` fires once, when the drag finishes — used to finalize the exact index within the (possibly new) list and persist to the backend. Separately: `useDroppable` registers any DOM node as a valid drop target (no ordering semantics); `useSortable` builds on top of that to add reordering within a list. Needed `useDroppable` on each list *container* (in addition to `useSortable` on each card) so an empty list, or the space below the last card, is still a valid drop target — otherwise there'd be nothing to detect a hover against.

Real bug hit: cross-list dragging silently didn't work at all — `handleDragOver` was fully written and correct, but never actually passed to `<DndContext onDragOver={...}>`. A defined-but-unwired handler is an easy thing to miss since there's no error, the feature just quietly doesn't do the new part. Worth a habit: after wiring up a new handler, double check it's actually connected to the component that's supposed to call it, not just defined.

## `Promise.all` and the loading/error/success UI pattern
`Promise.all([...])` runs multiple promises concurrently and resolves once *all* of them have settled (rejects immediately if any one rejects) — used here to fetch Lists and Cards together and track one combined "initial load" state, instead of two independent `.then()` chains with no shared notion of "are we done yet." Paired with explicit `isLoading`/`error` state and `.catch()`/`.finally()`, this is the standard loading → error → success UI pattern: render a loading indicator while `isLoading`, an error message if `error` is set, and the real content otherwise. Extremely common in real apps and a frequent explicit requirement in take-home interview tasks ("handle loading and error states").

## Git's three areas: working directory, staging area, repository
Working directory = actual files on disk as you edit them. Staging area (the "index") = a holding area where you explicitly choose which changes go into the *next* commit (`git add`) — this intentional staging step is a key difference from some other VCS tools. Repository = the permanent commit history; a commit is a snapshot of whatever was staged at that moment, with a message. Flow: edit → `git add` (stage) → `git commit` (permanently record). Common "explain how git works" interview question.

## OS-level DNS resolution vs. an application's own resolver (Node's `c-ares`)
Real bug hit connecting to MongoDB Atlas: `mongodb+srv://` connection strings require an `SRV` DNS record lookup. Node.js does this lookup itself via a bundled library (`c-ares`), which is a *separate code path* from the OS-level DNS resolution that tools like `nslookup` or a browser use. Symptom: `nslookup -type=SRV ...` resolved the record correctly, but the app still failed with `querySrv ECONNREFUSED` — same record, same network, different resolver, different result. Cause: a private/local DNS server (e.g., a router or ISP resolver) answered the OS's query style fine but refused Node's specific query. Fix: force Node to use a known-reliable public DNS server via `dns.setServers(['8.8.8.8', '8.8.4.4'])`, bypassing the problematic local resolver just for the app's own lookups. Good interview point: most people assume "DNS is DNS" — this is a concrete counterexample worth having in your back pocket.

## `git commit` vs. `git push`
`git commit` only records a snapshot in the *local* repository (the `.git` folder on your own machine) — it never contacts GitHub or any remote. `git push` is the separate, explicit step that uploads local commits to a remote. They're kept distinct on purpose: committing is cheap, local, and can happen offline or be cleaned up before anyone else sees it; pushing is the deliberate "share this now" action. A very common point of confusion for people new to git.

## `npm ci` vs `npm install`
`npm install` reads `package.json`, resolves dependencies, and will update `package-lock.json` if things have drifted — flexible, meant for active local development. `npm ci` ("clean install") installs exactly what's pinned in `package-lock.json` and deliberately fails if `package.json`/the lockfile are out of sync, rather than silently reconciling them; it also skips dependency resolution, so it's faster. `ci` is the standard choice for CI/CD and deployment build steps specifically because it's deterministic — the same lockfile always produces the same install, and any drift surfaces as a loud failure instead of a silent, possibly-different dependency tree.

## Frontend env vars are fundamentally different from backend ones (Vite's `VITE_` prefix)
Backend `.env` (via `dotenv`) holds real secrets, read at runtime, never shipped anywhere. Frontend "env vars" are different: Vite only exposes variables prefixed `VITE_` to client code (`import.meta.env.VITE_...`), and whatever value they hold gets baked directly into the built JS bundle at build time — which is public, downloadable, and inspectable by anyone visiting the site. The prefix requirement is a deliberate safety rail (won't accidentally expose an unprefixed backend-style secret sitting in the same `.env` file), but it doesn't make the *value* secret — never put a real secret in a `VITE_`-prefixed variable, only things safe to be public (like an API base URL).

---
*Updated as new topics come up — see `PROGRESS.md` for the build log.*
