# Smart Campus Operations Hub

IT3030 PAF Assignment project using Spring Boot (REST API) and React (web client).

## Local Setup

### Backend
- Path: `backend`
- Prerequisites: Java 21, MongoDB Atlas/local URI in `backend/src/main/resources/secret.properties`
- Run:
  - Windows: `.\mvnw.cmd spring-boot:run`
  - Linux/macOS: `./mvnw spring-boot:run`

### Frontend
- Path: `frontend`
- Run:
  - `npm install`
  - `npm run dev`

Default URLs:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Module B Booking Endpoints

- `POST /api/bookings` - create booking request
- `GET /api/bookings/my` - view own bookings
- `GET /api/bookings` - admin booking list (supports `status`, `fromDate`, `toDate`)
- `PATCH /api/bookings/{id}/decision` - admin approve/reject with reason
- `PATCH /api/bookings/{id}/cancel` - cancel pending/approved booking

Sample API collection:
- `docs/postman/module-b-bookings.postman_collection.json`

## Workflow Rules

- Booking states: `PENDING -> APPROVED/REJECTED`, and `PENDING/APPROVED -> CANCELLED`
- Conflict prevention: same resource + same date + overlapping time is blocked
- Role access:
  - `USER`: create, view own, cancel own
  - `ADMIN`: view all, approve/reject, cancel
