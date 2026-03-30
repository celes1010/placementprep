# PlacementPrep AI 🎯

An adaptive AI-powered placement interview preparation platform built with React + Flask + SQLite + Claude AI.

## Features
- 🤖 **Endless AI-generated questions** via Claude API — never repeat
- 📈 **Adaptive difficulty** — promotes on 3-correct streak, demotes on 2-wrong streak
- 📊 **Progress dashboard** with charts, per-topic accuracy, session history
- ⏱️ **45-second timer** per question
- 🔐 **JWT Authentication** — register/login/persist sessions
- 4 topics: DSA, CS Fundamentals, Aptitude, Core CS (OOP)

## Project Structure
```
placementprep/
├── backend/
│   ├── app.py              # Flask app entry
│   ├── database.py         # SQLite schema + init
│   ├── requirements.txt
│   ├── .env                # You create this!
│   └── routes/
│       ├── auth.py         # Register, Login
│       ├── quiz.py         # Question gen + adaptive difficulty
│       └── dashboard.py    # Progress + stats
└── frontend/
    ├── vite.config.js
    ├── src/
    │   ├── App.jsx
    │   ├── context/AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx / Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── TopicSelect.jsx
    │   │   ├── Quiz.jsx       ← core adaptive engine
    │   │   └── Results.jsx
    │   └── components/
    │       └── Navbar.jsx
```

## Setup Instructions

### 1. Backend Setup
```bash
cd backend

# Create .env file
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Install dependencies
pip install -r requirements.txt

# Run backend
python app.py
# Runs on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run frontend
npm run dev
# Runs on http://localhost:5173
```

### 3. Get Anthropic API Key
- Go to https://console.anthropic.com
- Create an API key
- Paste it in `backend/.env` as `ANTHROPIC_API_KEY=sk-ant-...`

## Adaptive Difficulty Algorithm

| Condition | Action |
|-----------|--------|
| 3 correct in a row | Promote: Easy → Medium → Hard |
| 2 wrong in a row | Demote: Hard → Medium → Easy |
| Difficulty change | Banner shown in UI, DB updated, next question at new level |

The difficulty per topic is stored in `user_topic_stats` and persists across sessions.

## API Endpoints
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Get JWT token
- `POST /api/quiz/start` — Start quiz session
- `POST /api/quiz/question` — Generate next question
- `POST /api/quiz/answer` — Submit answer + get adaptive result
- `POST /api/quiz/end` — End session
- `GET /api/dashboard/overview` — Full dashboard data
