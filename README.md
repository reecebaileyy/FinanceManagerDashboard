# Finance Manager Dashboard

A web-based platform to help users track expenses, manage budgets, and analyze financial trends. This repository contains both the frontend and backend code for the CPSC 490 capstone project.

## Project Structure

- `backend/` – Express server that exposes REST APIs and connects to PostgreSQL.
- `frontend/` – React application built with Vite.
- `docs/` – Project proposal, MVP plan, and task list.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://www.postgresql.org/)

### Installation

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and update the values for your database configuration.

### Running the Project

```bash
# Start backend
cd backend
npm start

# In a separate terminal, start frontend
cd ../frontend
npm run dev
```

The frontend runs on [http://localhost:5173](http://localhost:5173) by default and communicates with the backend API.

### Testing

Both packages include placeholder tests:

```bash
cd backend && npm test
cd ../frontend && npm test
```

## Documentation

Additional planning and task documentation can be found in the [`docs/`](docs/) directory.


