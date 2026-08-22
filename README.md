# Kanban Board

A single-board Kanban app (Lists + Cards), built as a MERN learning project.

## Tech stack

**Frontend** (planned)
- React (via Vite)

**Backend**
- Node.js
- Express — HTTP server & routing
- Mongoose — MongoDB object modeling (schemas, validation, queries)

**Database**
- MongoDB — local Community Server instance (`mongodb://localhost:27017/kanban`)
- MongoDB Compass — GUI for browsing data locally

**Backend supporting libraries**
- `cors` — allow cross-origin requests from the frontend dev server
- `dotenv` — load config/secrets from `.env`
- `nodemon` (dev) — auto-restart server on file changes

**Tooling**
- VS Code
- Git — version control
- curl / Thunder Client — manual API testing

## Project structure
```
server/   Express API (routes, Mongoose models)
client/   React frontend (not yet scaffolded)
```

## Related docs
- [PROGRESS.md](PROGRESS.md) — step-by-step build log
- [INTERVIEW_NOTES.md](INTERVIEW_NOTES.md) — interview-relevant concepts encountered along the way
