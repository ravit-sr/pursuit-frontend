# Pursuit — Frontend

Vanilla HTML/CSS/JS frontend for **Pursuit**, a job application tracker. No framework — built this way deliberately to focus on fundamentals (DOM, `fetch`, async patterns) before adding React.

Backend repo: [pursuit-backend](../../pursuit-backend) <!-- update this link once both repos exist -->

## Pages

- `signin.html` / `signup.html` — auth, incl. Google Sign-In and GitHub OAuth
- `dashboard.html` — overview, goal progress, AI-generated insights
- `applications.html` / `add_application.html` — job application tracker (CRUD)
- `analytics.html` — application funnel/analytics
- `resume.html` / `resume-coach.html` — resume upload, AI analysis, AI chat coach
- `settings.html` — profile, integrations, theme, goals
- `forgot-password.html` / `reset-password.html` — password reset flow

## Local setup

Point `API_BASE` in `js/common.js` at your running backend, then serve this folder with any static server (developed against VS Code Live Server on `http://127.0.0.1:5500`).

```js
// js/common.js
const API_BASE = "http://127.0.0.1:8000"; // local backend
```

## Deployment

Deployed on Vercel as a static site. `API_BASE` in `js/common.js` is updated to point at the deployed backend URL before each deploy.
