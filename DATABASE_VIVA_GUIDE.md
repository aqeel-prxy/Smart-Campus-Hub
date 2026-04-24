# Database Structure & Tables - Viva Demonstration Guide

## 🗄️ **What to Show When Asked About Database**

### 1. **Database Connection & Setup**
```powershell
# Show MongoDB connection status
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -UseBasicParsing

# Expected Response:
{
  "status": "ok",
  "dbConnected": true,  # or false (in-memory fallback)
  "mode": "mongodb",     # or "in-memory-fallback"
  "server": "node-express",
  "timestamp": "2026-04-24T08:57:11.049Z"
}
```

### 2. **Module C Database Collections**

#### **Tickets Collection Structure**
```json
{
  "_id": "ObjectId('6263a7b9f8d2e4a5b6c7d8e9')",
  "title": "Broken Projector in Lab 301",
  "location": "Computer Lab 301",
  "resourceId": "room_301_projector",
  "category": "EQUIPMENT",
  "priority": "HIGH",
  "description": "The projector is not displaying anything. Power light is on but no image appears.",
  "preferredContact": "email",
  "imageAttachments": [
    "projector_error.jpg",
    "power_light.jpg", 
    "connection_cable.jpg"
  ],
  "createdByEmail": "student@campus.edu",
  "assignedToEmail": "technician@campus.edu",
  "status": "IN_PROGRESS",
  "rejectionReason": "",
  "resolutionNotes": "Technician assigned to investigate",
  "comments": [
    {
      "id": "uuid-1234-5678-9abc",
      "authorEmail": "student@campus.edu",
      "text": "The projector was working fine yesterday",
      "createdAt": "2026-04-24T08:30:00.000Z",
      "updatedAt": "2026-04-24T08:30:00.000Z"
    }
  ],
  "createdAt": "2026-04-24T08:00:00.000Z",
  "updatedAt": "2026-04-24T08:45:00.000Z"
}
```

#### **Users Collection Structure**
```json
{
  "_id": "ObjectId('6263a7b9f8d2e4a5b6c7d8f0')",
  "email": "super@admin.com",
  "password": "hashed_password_256",
  "name": "super",
  "roles": ["ROLE_USER", "ROLE_ADMIN"],
  "createdAt": "2026-04-24T07:00:00.000Z",
  "updatedAt": "2026-04-24T07:00:00.000Z"
}
```

### 3. **Live Database Demo Commands**

#### **Show All Tickets in Database**
```powershell
# Get all tickets (admin view)
$allTickets = Invoke-RestMethod -Uri "http://localhost:5000/api/tickets" -Method GET -Headers @{"Cookie"="token=your_admin_token"}
$allTickets | ConvertTo-Json -Depth 10
```

#### **Show Specific Ticket Details**
```powershell
# Get specific ticket
$ticket = Invoke-RestMethod -Uri "http://localhost:5000/api/tickets/ticket_id" -Method GET
$ticket | ConvertTo-Json -Depth 10
```

#### **Show Database Schema**
```javascript
// From your server.js - show these schemas:
const TicketSchema = new mongoose.Schema({
    title: { type: String, required: true },
    location: { type: String, required: true },
    resourceId: { type: String, default: '' },
    category: { type: String, default: 'GENERAL' },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    description: { type: String, required: true },
    preferredContact: { type: String, default: '' },
    imageAttachments: [{ type: String }], // Array of image URLs
    createdByEmail: { type: String, required: true },
    assignedToEmail: { type: String, default: '' },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'], default: 'OPEN' },
    rejectionReason: { type: String, default: '' },
    resolutionNotes: { type: String, default: '' },
    comments: [TicketCommentSchema],
}, { timestamps: true, collection: 'tickets' });
```

### 4. **Database Relationships & Design**

#### **NoSQL Design (MongoDB)**
- **Denormalized Approach**: Comments embedded in tickets
- **Single Collection**: Tickets collection with embedded comments
- **Indexing**: Email fields indexed for fast lookups
- **Validation**: Mongoose schema validation

#### **Why MongoDB for Module C?**
- **Flexible Schema**: Easy to add new ticket types
- **Embedded Comments**: Better performance for comment queries
- **Scalability**: Handles large ticket volumes
- **JSON Native**: Perfect for web applications

### 5. **Data Flow Demonstration**

#### **Ticket Lifecycle in Database**
```powershell
# 1. Create ticket (status: OPEN)
$ticket = Invoke-RestMethod -Uri "http://localhost:5000/api/tickets" -Method POST -Body $ticketData
Write-Host "Initial Status: $($ticket.status)"  # OPEN

# 2. Assign technician (status: IN_PROGRESS)
$update = @{ status = "IN_PROGRESS"; assignedToEmail = "tech@campus.edu" }
$updated = Invoke-RestMethod -Uri "http://localhost:5000/api/tickets/$($ticket.id)/status" -Method PATCH -Body $update
Write-Host "Updated Status: $($updated.status)"  # IN_PROGRESS

# 3. Resolve ticket (status: RESOLVED)
$resolve = @{ status = "RESOLVED"; resolutionNotes = "Projector replaced" }
$resolved = Invoke-RestMethod -Uri "http://localhost:5000/api/tickets/$($ticket.id)/status" -Method PATCH -Body $resolve
Write-Host "Final Status: $($resolved.status)"  # RESOLVED
```

### 6. **Database Validation Rules**

#### **Field Validation**
```javascript
// Show these validation rules from your schemas:
title: { type: String, required: true }           // Must have title
location: { type: String, required: true }        // Must have location  
description: { type: String, required: true }     // Must have description
priority: { enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] } // Only valid priorities
status: { enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'] } // Valid statuses
imageAttachments: [{ type: String }]              // Array of strings (max 3 in validation)
```

### 7. **Viva Speaking Points**

#### **When asked "Show me your database structure":**

1. **"I'm using MongoDB for Module C with a tickets collection"**
   - Show the TicketSchema from server.js
   - Explain field choices and validation

2. **"Here's how tickets are stored"**
   - Show a sample ticket JSON
   - Explain embedded comments design

3. **"Let me demonstrate the data flow"**
   - Create a ticket live
   - Show status changes in database
   - Show comment addition

4. **"Database relationships"**
   - Explain user-ticket relationship via email
   - Show embedded comments vs separate collection
   - Discuss indexing strategy

#### **When asked "Why MongoDB?":**

- **Flexible Schema**: Easy to evolve ticket types
- **Performance**: Embedded comments avoid joins
- **Scalability**: Handles growing ticket volumes
- **JSON Native**: Perfect fit for web APIs

### 8. **MongoDB vs SQL Comparison**

| Feature | MongoDB (NoSQL) | SQL (Traditional) |
|---------|------------------|-------------------|
| Schema | Flexible | Fixed |
| Comments | Embedded in tickets | Separate table |
| Queries | JSON-based | SQL joins |
| Scaling | Horizontal | Vertical |
| Development | Fast iteration | Slower schema changes |

### 9. **Live Demo Script**

```powershell
# 1. Show database connection
Write-Host "🔗 Database Connection:"
$health = Invoke-RestMethod -Uri "http://localhost:5000/api/health"
$health | Format-Table

# 2. Create sample ticket
Write-Host "📝 Creating Ticket:"
$ticket = Invoke-RestMethod -Uri "http://localhost:5000/api/tickets" -Method POST -Body $sampleTicket
$ticket | Format-List

# 3. Show ticket in database
Write-Host "🗄️ Ticket in Database:"
$allTickets = Invoke-RestMethod -Uri "http://localhost:5000/api/tickets" -Method GET
$allTickets | Where-Object { $_.id -eq $ticket.id } | Format-List

# 4. Add comment
Write-Host "💬 Adding Comment:"
$comment = Invoke-RestMethod -Uri "http://localhost:5000/api/tickets/$($ticket.id)/comments" -Method POST -Body $commentData
$comment.comments[-1] | Format-List
```

### 10. **Key Database Features to Highlight**

✅ **Data Integrity**: Mongoose validation  
✅ **Performance**: Embedded comments design  
✅ **Scalability**: MongoDB horizontal scaling  
✅ **Flexibility**: Easy to add new fields  
✅ **Audit Trail**: Timestamps on all records  
✅ **Security**: Role-based data access  

---

## 🎯 **Quick Viva Response**

**"For Module C, I implemented a MongoDB database with a tickets collection. Each ticket contains all required fields including title, location, category, priority, description, and an array of up to 3 image attachments. Comments are embedded directly in tickets for better performance. The database enforces validation through Mongoose schemas and maintains a complete audit trail with timestamps. Let me demonstrate by creating a ticket and showing how it's stored in the database..."**
