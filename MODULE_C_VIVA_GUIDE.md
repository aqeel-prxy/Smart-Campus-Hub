# Module C - Maintenance & Incident Ticketing Viva Guide

## 🎯 Module C Overview
**Implemented by**: [Your Name]  
**Module**: Maintenance & Incident Ticketing  
**Database**: MongoDB (smart-campus)  
**Backend**: Node.js + Express  
**Frontend**: React

## 📊 Database Structure (Module C)

### Tickets Collection
```json
{
  "_id": "ObjectId",
  "title": "String (required)",
  "location": "String (required)", 
  "resourceId": "String (optional)",
  "category": "String (GENERAL/EQUIPMENT/FACILITY/NETWORK)",
  "priority": "String (LOW/MEDIUM/HIGH/CRITICAL)",
  "description": "String (required)",
  "preferredContact": "String (email/phone)",
  "imageAttachments": "Array<String> (max 3)",
  "createdByEmail": "String (required)",
  "assignedToEmail": "String",
  "status": "String (OPEN/IN_PROGRESS/RESOLVED/CLOSED/REJECTED)",
  "rejectionReason": "String",
  "resolutionNotes": "String",
  "comments": "Array<Comment>",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Comments Schema
```json
{
  "id": "String (UUID)",
  "authorEmail": "String (required)",
  "text": "String (required)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## 🔗 Module C API Endpoints

### 1. Create Ticket - POST /api/tickets
**Purpose**: Users can create incident tickets  
**Authentication**: Required  
**Request Body**:
```json
{
  "title": "Broken Projector in Lab 301",
  "location": "Computer Lab 301", 
  "category": "EQUIPMENT",
  "priority": "HIGH",
  "description": "The projector is not displaying anything",
  "preferredContact": "email",
  "imageAttachments": []
}
```
**Response**: 201 Created with ticket object

### 2. Get My Tickets - GET /api/tickets/my
**Purpose**: Users can view their own tickets  
**Authentication**: Required  
**Response**: Array of user's tickets

### 3. Get All Tickets - GET /api/tickets
**Purpose**: Admin can view all tickets  
**Authentication**: Required (Admin role)  
**Response**: Array of all tickets

### 4. Update Ticket Status - PATCH /api/tickets/:id/status
**Purpose**: Admin can update ticket status and assign technician  
**Authentication**: Required (Admin role)  
**Request Body**:
```json
{
  "status": "IN_PROGRESS",
  "assignedToEmail": "technician@campus.edu",
  "resolutionNotes": "Technician assigned to investigate"
}
```

### 5. Add Comment - POST /api/tickets/:id/comments
**Purpose**: Users can add comments to tickets  
**Authentication**: Required  
**Request Body**:
```json
{
  "text": "The projector was working fine yesterday"
}
```

### 6. Update Comment - PATCH /api/tickets/:id/comments/:commentId
**Purpose**: Edit existing comment (owner or admin only)  
**Authentication**: Required  
**Request Body**:
```json
{
  "text": "Updated comment text"
}
```

### 7. Delete Comment - DELETE /api/tickets/:id/comments/:commentId
**Purpose**: Delete comment (owner or admin only)  
**Authentication**: Required  

## 🧪 Viva Testing Script

### Step 1: Login as Admin
```powershell
$adminLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email": "super@admin.com", "password": "admin123"}'
```

### Step 2: Create Test Ticket
```powershell
$ticketData = @{
    title = "Broken Projector in Lab 301"
    location = "Computer Lab 301"
    category = "EQUIPMENT"
    priority = "HIGH"
    description = "The projector is not displaying anything. Power light is on but no image appears."
    preferredContact = "email"
    imageAttachments = @()
}
$ticket = Invoke-RestMethod -Uri "http://localhost:5000/api/tickets" -Method POST -ContentType "application/json" -Body ($ticketData | ConvertTo-Json)
```

### Step 3: View All Tickets (Admin)
```powershell
$allTickets = Invoke-RestMethod -Uri "http://localhost:5000/api/tickets" -Method GET
```

### Step 4: Update Ticket Status
```powershell
$updateData = @{
    status = "IN_PROGRESS"
    assignedToEmail = "technician@campus.edu"
    resolutionNotes = "Technician assigned to investigate the projector issue"
}
Invoke-RestMethod -Uri "http://localhost:5000/api/tickets/$($ticket.id)/status" -Method PATCH -ContentType "application/json" -Body ($updateData | ConvertTo-Json)
```

### Step 5: Add Comment
```powershell
$commentData = @{
    text = "The projector was working fine yesterday during the morning session"
}
Invoke-RestMethod -Uri "http://localhost:5000/api/tickets/$($ticket.id)/comments" -Method POST -ContentType "application/json" -Body ($commentData | ConvertTo-Json)
```

### Step 6: Test Complete Workflow
```powershell
# OPEN → IN_PROGRESS → RESOLVED → CLOSED
$statuses = @("IN_PROGRESS", "RESOLVED", "CLOSED")
foreach ($status in $statuses) {
    $updateData = @{ status = $status }
    Invoke-RestMethod -Uri "http://localhost:5000/api/tickets/$($ticket.id)/status" -Method PATCH -ContentType "application/json" -Body ($updateData | ConvertTo-Json)
    Write-Host "Ticket status updated to: $status"
}
```

## ✅ Key Features Implemented

### ✅ Core Requirements Met
1. **Ticket Creation**: Users can create incident tickets with all required fields
2. **Image Attachments**: Support for up to 3 image attachments (evidence)
3. **Ticket Workflow**: Complete workflow (OPEN → IN_PROGRESS → RESOLVED → CLOSED)
4. **Status Management**: Admin can update status with reasons and technician assignment
5. **Comment System**: Users can add comments with ownership rules
6. **Role-Based Access**: Proper authentication and authorization

### ✅ Advanced Features
1. **Comment Ownership**: Users can only edit/delete their own comments
2. **Admin Override**: Admin can edit/delete any comment
3. **Technician Assignment**: Admin can assign technicians to tickets
4. **Priority Levels**: LOW, MEDIUM, HIGH, CRITICAL
5. **Categories**: GENERAL, EQUIPMENT, FACILITY, NETWORK
6. **Audit Trail**: Full timestamps for creation and updates

### ✅ Error Handling & Validation
1. **Required Fields**: All required fields validated
2. **Status Validation**: Only valid status transitions allowed
3. **Authentication**: All endpoints protected
4. **Authorization**: Role-based access control
5. **Input Validation**: Proper input sanitization

## 🎯 Viva Demonstration Points

### 1. Database Design
- Show MongoDB collections structure
- Explain ticket schema design
- Demonstrate relationship between tickets and comments

### 2. API Implementation
- Show all 7 endpoints implemented
- Demonstrate different HTTP methods (GET, POST, PATCH, DELETE)
- Explain RESTful design principles

### 3. Business Logic
- Show ticket workflow implementation
- Demonstrate comment ownership rules
- Explain role-based access control

### 4. Testing Evidence
- Show complete ticket lifecycle
- Demonstrate error handling
- Show validation in action

## 📱 Frontend Integration
The React frontend consumes these endpoints through:
- Ticket creation form
- Ticket listing (user vs admin views)
- Status update interface (admin only)
- Comment system with edit/delete functionality

## 🔍 Viva Questions & Answers

### Q: How did you implement the ticket workflow?
A: I implemented a state machine pattern with valid status transitions. Each status change is logged with timestamps and the user who made the change.

### Q: How do you handle comment ownership?
A: Each comment stores the author's email. When updating/deleting, I check if the current user is the comment author or has admin role.

### Q: How do you handle image attachments?
A: The system accepts an array of up to 3 image URLs. These are stored as strings in the database and can be displayed in the frontend.

### Q: What security measures did you implement?
A: JWT authentication, role-based authorization, input validation, and proper error handling to prevent information leakage.

## 🚀 Ready for Viva!

This implementation demonstrates:
- ✅ Complete Module C functionality
- ✅ Proper database design
- ✅ RESTful API implementation
- ✅ Security best practices
- ✅ Error handling and validation
- ✅ Role-based access control
- ✅ Complete testing evidence
