# Story Diary - Project Overview & Instructions

Welcome to the **Story Diary** project. This is a full-stack Thai-language web application designed for habit tracking, health-related storytelling, and educational minigames. The UI is built around an "open book" metaphor, providing an immersive experience for users to document their health journey.

## 🏗️ Architecture

The project is divided into two main parts: `frontend/` and `backend/`.

### Frontend
- **Framework:** Next.js 16.2.4 (App Router)
- **Library:** React 19.2.4
- **State Management:** Redux Toolkit (@reduxjs/toolkit)
- **Styling:** Tailwind CSS v4 (using `@import "tailwindcss"` and `@theme` in `globals.css`)
- **Fonts:** Geist Sans, Geist Mono, Baloo 2 (headings), and Noto Sans Thai (body)
- **Design Truth:** The source of truth for UI/UX is located in `docz/wireframes/` as static HTML prototypes.

### Backend
- **Framework:** Express 5.2.1
- **Database:** MongoDB Atlas (using the official `mongodb` driver v7). In-memory store is used automatically when `NODE_ENV=test`.
- **Authentication:** Session-based (using `express-session`), cookie-based (no JWT).
- **Validation:** Zod 4.4.1
- **Development Tool:** `tsx` for running TypeScript directly.

## 🚀 Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- `pnpm` (Preferred package manager)

### Installation
Run the following in both the `frontend/` and `backend/` directories:
```bash
pnpm install
```

### Running the Project

#### Backend
```bash
cd backend
pnpm dev
```
The API server will run at `http://localhost:3001`.

#### Frontend
```bash
cd frontend
pnpm dev
```
The development server will run at `http://localhost:3000`.

## 🧪 Testing

### Backend
- **Framework:** Jest
- **Commands:** `pnpm test`
- **Location:** `backend/tests/`

### Frontend
- **Framework:** Jest + React Testing Library
- **Commands:** `pnpm test` (Note: ensure script is defined in `package.json`)
- **Location:** `frontend/tests/`

## 📖 Development Conventions

- **Next.js 16:** Be aware of breaking changes in Next.js 16. Refer to `node_modules/next/dist/docs/` for actual API guidance.
- **Path Aliases:** Use `@/` to refer to the `frontend/` directory (configured in `frontend/tsconfig.json`).
- **Styles:** Adhere to the design tokens defined in `frontend/app/globals.css` and the wireframes in `docz/wireframes/`.
- **Language:** The primary language for the UI is Thai (`lang="th"`). Ensure all user-facing strings are in Thai.
- **State:** Local component state (`useState`) is preferred for UI-only state (e.g., form inputs). Use Redux for global application state (e.g., auth, shared data).
- **Authentication:** Always use the `AuthProbe` and `AuthGate` components to manage session state on the frontend.

## 📂 Directory Structure Highlights

- `docs/specs/`: Detailed functional and technical specifications for features.
- `docz/wireframes/`: HTML/CSS design prototypes (Reference this before implementation).
- `backend/src/db.ts`: Database schema and seed data.
- `frontend/store/`: Redux slices and store configuration.
- `frontend/types/` & `src/types/`: Shared TypeScript type definitions.

## 📝 Important Notes

- **Backend Status:** The backend is active and contains full REST API logic for auth, users, chapters, habits, and minigames.
- **Database:** MongoDB Atlas. Connection is configured via environment variables in `backend/.env` (see `backend/.env.example`). Reference data (chapters, scenes, quiz questions) is seeded via upsert on every startup. No local database file is used.
