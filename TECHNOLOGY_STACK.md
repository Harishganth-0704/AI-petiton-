# Civic Harmony - Technology Stack

This document outlines the core technologies, libraries, and frameworks used in the Civic Harmony project.

## Frontend (Client Side)

The frontend is a modern, responsive single-page application built with React and TypeScript.

- **Framework**: [React 18](https://reactjs.org/) with [Vite](https://vitejs.dev/) for fast development and optimized builds.
- **Language**: [TypeScript](https://www.typescriptlang.org/) for static type checking and better developer experience.
- **Routing**: [React Router DOM](https://reactrouter.com/) for navigating between pages.
- **State Management & Data Fetching**: [TanStack Query (React Query)](https://tanstack.com/query/latest) for efficient server state management and caching.
- **Styling & UI**:
  - [Tailwind CSS](https://tailwindcss.com/) for utility-first styling.
  - [shadcn/ui](https://ui.shadcn.com/) (built on Radix UI) for high-quality, accessible UI components.
  - [Framer Motion](https://www.framer.com/motion/) for smooth animations and transitions.
  - [Lucide React](https://lucide.dev/) for a consistent and scalable icon set.
- **Maps**: [Leaflet](https://leafletjs.com/) and [React Leaflet](https://react-leaflet.js.org/) for displaying interactive maps of petition locations.
- **Forms & Validation**:
  - [React Hook Form](https://react-hook-form.com/) for performant form handling.
  - [Zod](https://zod.dev/) for schema-based form validation.
- **Internationalization (i18n)**: [i18next](https://www.i18next.com/) and [react-i18next](https://react.i18next.com/) for multi-language support (English, Tamil, etc.).

## Backend (Server Side)

The backend is a robust RESTful API built with Node.js and Express.

- **Runtime**: [Node.js](https://nodejs.org/) for executing JavaScript on the server.
- **Framework**: [Express.js](https://expressjs.com/) for building the API routes and handling middleware.
- **Database**: [PostgreSQL](https://www.postgresql.org/) as the primary relational database.
- **Authentication & Security**:
  - [JSON Web Tokens (JWT)](https://jwt.io/) for secure user authentication and session management.
  - [bcrypt](https://github.com/kelektiv/node.bcrypt.js) for secure password hashing.
  - [CORS](https://github.com/expressjs/cors) for handling cross-origin requests.
- **Communications**: [Nodemailer](https://nodemailer.com/) for sending automated email notifications to citizens regarding petition updates.
- **File Handling**: [Multer](https://github.com/expressjs/multer) for managing multipart/form-data, typically used for file uploads.

## Database Layer

- **Driver**: `pg` (node-postgres) for interacting with the PostgreSQL database.
- **Schema Management**: Custom initialization and migration scripts (`init-db.js`, `migrate_schema.js`) to manage database tables and relationships.

## Development Tools

- **Linting & Formatting**: [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/) for maintaining code quality and consistency.
- **Process Management**: [Nodemon](https://nodemon.io/) for automatically restarting the server during development.
- **Environment Variables**: [dotenv](https://github.com/motdotla/dotenv) for managing configuration settings.
