# Verbena Tech CRM + Operations Platform

Multi-role CRM and operations system built with Node.js, Express, MySQL, React, Tailwind CSS, JWT auth, and Socket.io.

## Monorepo Structure

```text
verbena3/
  backend/
    src/
      config/
      controllers/
      database/
        migrations/
        seeds/
      middleware/
      repositories/
      routes/
      services/
      sockets/
      utils/
      validations/
      app.js
      server.js
  frontend/
    src/
      components/
      context/
      layouts/
      pages/
      router/
      services/
      styles/
      App.jsx
      main.jsx
```

## Roles

- admin
- sales
- customer
- vendor
- electrician
- field_work

## Implemented Features

- JWT login/signup with RBAC-protected APIs
- Role dashboards and role-based navigation
- Realtime chat with Socket.io
- Chat scopes:
  - sales <-> customer
  - admin <-> sales
  - admin <-> vendor
  - admin <-> electrician
  - admin <-> field_work
- Chat image upload persistence (DB + file storage)
- Profile page for all roles (view/update name, phone, password)
- Leads, tasks, projects/orders, notifications
- Mobile responsive UI across dashboards and chat

## Backend API Map

Base path: /api

### Auth

- POST /auth/signup
- POST /auth/login
- GET /auth/profile
- PATCH /auth/profile

### Admin

- GET /admin/users
- PATCH /admin/users/:id/role

### Analytics

- GET /analytics/admin/overview
- GET /analytics/sales/overview

### Leads

- GET /leads
- GET /leads/:id
- POST /leads
- PATCH /leads/:id
- PATCH /leads/:id/assign
- POST /leads/:id/notes
- DELETE /leads/:id

### Tasks

- GET /tasks
- POST /tasks
- PATCH /tasks/:id/status
- POST /tasks/:id/proof

### Projects/Orders

- GET /projects
- POST /projects
- PATCH /projects/:id

### Chat

- GET /chat/contacts
- GET /chat/conversations
- POST /chat/conversations
- GET /chat/conversations/:id/messages
- POST /chat/messages

### Notifications

- GET /notifications
- PATCH /notifications/:id/read

## Realtime Events

Socket auth uses JWT token in handshake auth.token.

- Room: user:{userId}
- chat:message
- chat:typing
- notification:new

## Database

Main schema and seed files:

- backend/src/database/migrations/001_init.sql
- backend/src/database/seeds/001_seed_users.sql

Automated setup script:

- npm run --workspace backend db:setup

This script creates/updates schema and applies seeds idempotently.

## Setup

## 1) Prerequisites

- Node.js 18+
- npm 9+
- MySQL 8+

## 2) Install dependencies

From repository root:

```bash
npm install
```

## 3) Configure environment

- Copy backend/.env.example to backend/.env
- Copy frontend/.env.example to frontend/.env

## 4) Initialize database

From repository root:

```bash
npm run --workspace backend db:setup
```

## 5) Run applications

From repository root:

```bash
npm run dev
```

Or run separately:

```bash
npm run dev:backend
npm run dev:frontend
```

Default URLs:

- Backend: [http://localhost:5000](http://localhost:5000)
- Frontend: [http://localhost:5173](http://localhost:5173)

## Seed Accounts

Password for seed users: ChangeMe@123

- [admin@verbenatech.com](mailto:admin@verbenatech.com)
- [sales1@verbenatech.com](mailto:sales1@verbenatech.com)
- [customer1@verbenatech.com](mailto:customer1@verbenatech.com)
- [vendor1@verbenatech.com](mailto:vendor1@verbenatech.com)
- [electrician1@verbenatech.com](mailto:electrician1@verbenatech.com)
- [fieldwork1@verbenatech.com](mailto:fieldwork1@verbenatech.com)

## Security Notes

- Input validation via express-validator
- Parameterized MySQL queries
- bcrypt password hashing
- Helmet, CORS, compression, and rate limiting
- Upload restrictions by MIME type and file size

## Next Step

Project is ready for cloud-hosting preparation (containerization, CI/CD, managed DB/storage, and environment hardening).
