# Kanban Board

A single-board Kanban app (Lists + Cards) with drag-and-drop, built as a MERN learning project.

## Live

- **App:** https://kanban-board-pi-steel.vercel.app/
- **API:** https://kanban-board-9b17.onrender.com/api/health

Note: the backend is on Render's free tier, which spins down when idle — the first request after a period of inactivity can take a while to respond while it wakes back up.

## Tech stack

**Frontend**
- React (via Vite)
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — drag-and-drop reordering, within and across columns

**Backend**
- Node.js
- Express — HTTP server & routing
- Mongoose — MongoDB object modeling (schemas, validation, queries)

**Database**
- MongoDB — local Community Server instance for development (`mongodb://localhost:27017/kanban`), MongoDB Atlas (free M0 cluster) in production
- MongoDB Compass — GUI for browsing data locally

**Backend supporting libraries**
- `cors` — allow cross-origin requests from the frontend
- `dotenv` — load config/secrets from `.env`
- `nodemon` (dev) — auto-restart server on file changes

**Deployment**
- Vercel — frontend hosting
- Render — backend hosting
- MongoDB Atlas — production database

**Tooling**
- VS Code
- Git / GitHub — version control
- curl — manual API testing

## Project structure
```
server/   Express API
  models/     Mongoose schemas (List, Card)
  routes/     CRUD routes (lists, cards)
client/   React frontend (Vite)
  src/components/   List, Card
```

## Related docs
- [PROGRESS.md](PROGRESS.md) — step-by-step build log
- [INTERVIEW_NOTES.md](INTERVIEW_NOTES.md) — interview-relevant concepts encountered along the way
