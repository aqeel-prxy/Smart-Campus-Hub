# Smart Campus Operations Hub - API Documentation

## Overview

The Smart Campus Operations Hub provides a comprehensive REST API for managing university facilities, bookings, and maintenance tickets. This API follows RESTful principles and implements proper security measures including OAuth 2.0 authentication and role-based access control.

## Base URL
```
http://localhost:5000/api
```

## Authentication

### OAuth 2.0 / Google Sign-In
- **Endpoint**: `/oauth2/authorization/google`
- **Method**: GET
- **Description**: Redirects to Google OAuth 2.0 consent screen
- **Success Redirect**: `http://localhost:5173/dashboard`

### Standard Authentication
- **Endpoint**: `/api/auth/login`
- **Method**: POST
- **Description**: Login with email and password
- **Rate Limiting**: 5 requests per minute per IP
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Login successful"
}
```

### User Registration
- **Endpoint**: `/api/auth/register`
- **Method**: POST
- **Rate Limiting**: 5 requests per minute per IP
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "User registered successfully!"
}
```

### Get Current User
- **Endpoint**: `/api/auth/user`
- **Method**: GET
- **Description**: Get current authenticated user information
- **Response**:
```json
{
  "authenticated": true,
  "name": "John Doe",
  "email": "john@example.com",
  "roles": ["ROLE_USER"]
}
```

## Resources Management

### Get All Resources
- **Endpoint**: `/api/resources`
- **Method**: GET
- **Description**: Retrieve all available resources
- **Access**: Public (no authentication required)
- **Response**:
```json
[
  {
    "id": "resource123",
    "name": "Lecture Hall A",
    "type": "LECTURE_HALL",
    "capacity": 100,
    "location": "Building 1, Floor 1",
    "description": "Large lecture hall with projector",
    "status": "ACTIVE",
    "availableFrom": "08:00",
    "availableTo": "22:00"
  }
]
```

### Create Resource
- **Endpoint**: `/api/resources`
- **Method**: POST
- **Access**: ADMIN only
- **Request Body**:
```json
{
  "name": "Meeting Room B",
  "type": "MEETING_ROOM",
  "capacity": 10,
  "location": "Building 1, Floor 2",
  "description": "Small meeting room",
  "status": "ACTIVE",
  "availableFrom": "08:00",
  "availableTo": "18:00"
}
```

### Update Resource
- **Endpoint**: `/api/resources/{id}`
- **Method**: PUT
- **Access**: ADMIN only
- **Request Body**: Same as create resource

### Delete Resource
- **Endpoint**: `/api/resources/{id}`
- **Method**: DELETE
- **Access**: ADMIN only

## Booking Management

### Create Booking
- **Endpoint**: `/api/bookings`
- **Method**: POST
- **Access**: USER and above
- **Request Body**:
```json
{
  "resourceId": "resource123",
  "bookingDate": "2024-02-15",
  "startTime": "10:00",
  "endTime": "11:00",
  "purpose": "Team meeting",
  "expectedAttendees": 5
}
```
- **Validation Rules**:
  - Booking date must be today or future
  - End time must be after start time
  - Purpose: max 200 characters, sanitized for XSS
  - No overlapping bookings for same resource

### Get My Bookings
- **Endpoint**: `/api/bookings/my`
- **Method**: GET
- **Access**: USER and above
- **Description**: Get bookings for current authenticated user
- **Response**:
```json
[
  {
    "id": "booking123",
    "resourceId": "resource123",
    "requesterEmail": "user@example.com",
    "bookingDate": "2024-02-15",
    "startTime": "10:00",
    "endTime": "11:00",
    "purpose": "Team meeting",
    "expectedAttendees": 5,
    "status": "PENDING",
    "createdAt": "2024-02-01T09:00:00Z"
  }
]
```

### Get All Bookings (Admin)
- **Endpoint**: `/api/bookings`
- **Method**: GET
- **Access**: ADMIN only
- **Query Parameters**:
  - `fromDate` (optional): Filter bookings from date (ISO format)
  - `toDate` (optional): Filter bookings to date (ISO format)
  - `status` (optional): Filter by status (PENDING, APPROVED, REJECTED, CANCELLED)

### Approve/Reject Booking
- **Endpoint**: `/api/bookings/{id}/decision`
- **Method**: PATCH
- **Access**: ADMIN only
- **Request Body**:
```json
{
  "decision": "APPROVED",
  "reason": "Approved for team meeting"
}
```

### Cancel Booking
- **Endpoint**: `/api/bookings/{id}/cancel`
- **Method**: PATCH
- **Access**: USER (own bookings) and ADMIN
- **Description**: Cancel a pending or approved booking

### Delete Booking
- **Endpoint**: `/api/bookings/{id}`
- **Method**: DELETE
- **Access**: ADMIN only
- **Description**: Soft delete - retains for audit trail

## Ticket Management

### Create Ticket
- **Endpoint**: `/api/tickets`
- **Method**: POST
- **Access**: USER and above
- **Request Body**:
```json
{
  "title": "Broken Projector",
  "location": "Room 101",
  "resourceId": "resource123",
  "category": "EQUIPMENT",
  "priority": "HIGH",
  "description": "Projector not working properly",
  "preferredContact": "user@example.com",
  "imageAttachments": ["image1.jpg", "image2.jpg"]
}
```
- **Validation Rules**:
  - Title: max 100 characters, sanitized
  - Location: max 100 characters, sanitized
  - Description: max 1000 characters, sanitized
  - Max 3 image attachments

### Get My Tickets
- **Endpoint**: `/api/tickets/my`
- **Method**: GET
- **Access**: USER and above
- **Description**: Get tickets created by current user

### Get All Tickets (Admin)
- **Endpoint**: `/api/tickets`
- **Method**: GET
- **Access**: ADMIN only
- **Query Parameters**:
  - `status` (optional): Filter by status
  - `priority` (optional): Filter by priority

### Update Ticket Status
- **Endpoint**: `/api/tickets/{id}/status`
- **Method**: PATCH
- **Access**: ADMIN and assigned technicians
- **Request Body**:
```json
{
  "status": "IN_PROGRESS",
  "resolutionNotes": "Technician assigned and investigating"
}
```

### Add Ticket Comment
- **Endpoint**: `/api/tickets/{id}/comments`
- **Method**: POST
- **Access**: USER (own tickets) and ADMIN
- **Request Body**:
```json
{
  "content": "Issue has been resolved"
}
```

### Get Ticket Comments
- **Endpoint**: `/api/tickets/{id}/comments`
- **Method**: GET
- **Access**: USER (own tickets) and ADMIN

## Notifications

### Get My Notifications
- **Endpoint**: `/api/notifications`
- **Method**: GET
- **Access**: USER and above
- **Response**:
```json
[
  {
    "id": "notif123",
    "userId": "user123",
    "type": "BOOKING_APPROVED",
    "title": "Booking Approved",
    "message": "Your booking for Lecture Hall A has been approved",
    "read": false,
    "createdAt": "2024-02-01T10:00:00Z"
  }
]
```

### Mark Notification as Read
- **Endpoint**: `/api/notifications/{id}/read`
- **Method**: PATCH
- **Access**: USER and above

### Mark All Notifications as Read
- **Endpoint**: `/api/notifications/read-all`
- **Method**: PATCH
- **Access**: USER and above

## QR Code Verification

### Generate QR Code for Booking
- **Endpoint**: `/api/bookings/{id}/qrcode`
- **Method**: GET
- **Access**: USER (own bookings) and ADMIN
- **Description**: Generate QR code for booking verification
- **Response**: PNG image data

### Verify QR Code
- **Endpoint**: `/api/verify/qrcode`
- **Method**: POST
- **Request Body**: QR code data
- **Response**:
```json
{
  "valid": true,
  "booking": {
    "id": "booking123",
    "resourceName": "Lecture Hall A",
    "bookingDate": "2024-02-15",
    "startTime": "10:00",
    "endTime": "11:00",
    "status": "APPROVED"
  }
}
```

## Analytics (Admin)

### Get Dashboard Analytics
- **Endpoint**: `/api/analytics/dashboard`
- **Method**: GET
- **Access**: ADMIN only
- **Response**:
```json
{
  "totalBookings": 150,
  "activeBookings": 25,
  "pendingBookings": 5,
  "totalTickets": 45,
  "openTickets": 8,
  "topResources": [
    {
      "resourceId": "resource123",
      "resourceName": "Lecture Hall A",
      "bookingCount": 35
    }
  ],
  "peakBookingHours": [
    {"hour": 10, "count": 25},
    {"hour": 14, "count": 20}
  ]
}
```

## Error Handling

### Standard Error Response Format
```json
{
  "timestamp": "2024-02-01T10:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "purpose",
      "message": "Purpose must not exceed 200 characters"
    }
  ]
}
```

### HTTP Status Codes
- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Validation error or malformed request
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., overlapping booking)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Security Features

### Rate Limiting
- Authentication endpoints: 5 requests per minute per IP
- General endpoints: 100 requests per minute per IP

### Input Validation
- All string inputs are sanitized for XSS attacks
- File uploads are validated for type and size
- Email and phone number validation

### CORS Configuration
- Allowed origins: `http://localhost:5173`
- Allowed methods: GET, POST, PUT, PATCH, DELETE
- Allowed headers: Authorization, Content-Type

### Role-Based Access Control
- `ROLE_USER`: Can create bookings, view own data
- `ROLE_ADMIN`: Full access to all resources and operations

## Data Models

### Resource Types
- `LECTURE_HALL`: Large teaching spaces
- `LAB`: Computer or science laboratories
- `MEETING_ROOM`: Small meeting spaces
- `EQUIPMENT`: Portable equipment items

### Booking Status Flow
```
PENDING → APPROVED/REJECTED
PENDING/APPROVED → CANCELLED
```

### Ticket Status Flow
```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
OPEN → REJECTED
```

### Ticket Priority Levels
- `HIGH`: Critical issues requiring immediate attention
- `MEDIUM`: Important issues affecting operations
- `LOW`: Minor issues or improvements

## Testing

### Test Endpoints
- Health check: `GET /api/health`
- Test authentication: `GET /api/auth/user`

### Test Data
The API includes comprehensive test coverage including:
- Unit tests for all repositories and services
- Integration tests for complete workflows
- Security tests for authentication and authorization
- Validation tests for input sanitization

## Deployment

### Environment Variables
```bash
MONGO_URI=mongodb://localhost:27017/smart_campus
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ADMIN_EMAIL=admin@campus.edu
```

### Docker Configuration
```dockerfile
FROM openjdk:21-jdk-slim
COPY target/backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 5000
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

## Support

For API support and questions:
- Email: support@campus.edu
- Documentation: Available at `/docs` endpoint
- Status: Available at `/api/health` endpoint
