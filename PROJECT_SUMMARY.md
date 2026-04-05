# Civic Harmony - Project Summary

Civic Harmony is a comprehensive web application designed to bridge the gap between citizens and local government by offering a streamlined platform for submitting, tracking, and managing civic petitions (issues, complaints, or requests). 

## Technology Stack

### Frontend
- **Framework**: React 18 with Vite + TypeScript
- **Routing**: React Router DOM (`react-router-dom`)
- **State Management / Data Fetching**: React Query (`@tanstack/react-query`)
- **Styling**: Tailwind CSS, Shadcn UI (Radix UI primitives), framer-motion (animations)
- **Maps**: Leaflet & React Leaflet (for mapping petition locations)
- **Forms**: React Hook Form with Zod validation
- **Internationalization**: `i18next` and `react-i18next`

### Backend
- **Environment**: Node.js with Express
- **Database**: PostgreSQL (`pg` library)
- **Authentication**: JWT (JSON Web Tokens) & `bcrypt` for password hashing
- **Notifications**: Nodemailer for sending automated petition confirmation and status update emails
- **File Uploads**: Multer (configured but primarily dealing with JSON sizes right now up to `10mb`)

## Architecture & Features

### Role-Based Access Control (RBAC)
The application defines three primary user roles:
1. **Citizen**: Can register, log in, submit new petitions, view their own petitions, track status by ID, and view a map of their petitions. 
2. **Officer**: Belongs to a specific government department. Can log in to an Officer Dashboard to view, filter, and update the status of petitions that are assigned to their specific department. They must provide remarks when updating a status.
3. **Admin**: Has overarching access. Can view all petitions across all departments, delete petitions, and manage officer accounts via an Admin Dashboard.

### Core Modules

#### 1. Petition Management
- **Submission**: Citizens can submit petitions with a title, description, category (which maps to a department), and location (latitude/longitude and address). They also have an option to submit anonymously.
- **Tracking**: Petitions have statuses such as `submitted`, `pending`, `in_progress`, `verification`, `resolved`, `rejected`, and `escalated`. Citizens can track their petitions via a dedicated Track Page.
- **Dashboard**: Different dashboards are rendered based on the user's role (Citizen Dashboard vs Officer Dashboard vs Admin Dashboard).

#### 2. Interactive Map (`MapPage`)
- A visual representation utilizing Leaflet.js to plot petitions based on their geographical coordinates (`location_lat`, `location_lng`).
- Citizens see their own plotted petitions, while officers see petitions reported within their jurisdiction.

#### 3. Notifications (`emailService`)
- When a citizen submits a petition, an asynchronous email confirmation is triggered via Nodemailer.
- When an officer or admin updates the status of a petition (e.g., from `submitted` to `in_progress`), an email is sent to the citizen with the updated status and the officer's remarks.

#### 4. Automated Analytics / Stats
- The backend aggregates petition data through a `/api/petitions/stats` endpoint, calculating total, pending, resolved, and escalated petitions. It also breaks down petition counts by department for dashboards.

## Current Project State
- The frontend pages are well-scaffolded, containing full implementation for login, registration, dashboard variations, and map views.
- The backend API is functional, with completely defined routes for `auth`, `petitions`, and `officers`.
- Database schema and relationship checks (like departments mapping) have been integrated and are being validated by utility scripts (`init-db.js`, `check-schema.js`). 
- Recent updates include finalizing the automated email notification workflows via Nodemailer for better user engagement.
