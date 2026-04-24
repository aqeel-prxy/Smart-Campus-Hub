# Postman Testing Guide - Module C APIs
## Complete Step-by-Step Instructions

---

## 🚀 **Step 1: Install & Open Postman**

1. **Download Postman**: https://www.postman.com/downloads/
2. **Install and Open** Postman
3. **Create Account** or sign in (optional)

---

## 🔧 **Step 2: Create New Collection**

1. Click **"Collections"** tab on left
2. Click **"+ New Collection"** button
3. Name it: **"Module C - Ticketing System"**
4. Click **"Create"**

---

## 📝 **Step 3: Test All Module C Endpoints**

### **API 1: Health Check (No Auth)**
```
Method: GET
URL: http://localhost:5000/api/health
Headers: (none)
Body: (none)
```

**Expected Response:**
```json
{
  "status": "ok",
  "dbConnected": false,
  "mode": "in-memory-fallback",
  "server": "node-express",
  "timestamp": "2026-04-24T09:04:40.827Z"
}
```

---

### **API 2: Admin Login**
```
Method: POST
URL: http://localhost:5000/api/auth/login
Headers: 
  Content-Type: application/json
Body (raw JSON):
{
  "email": "super@admin.com",
  "password": "admin123"
}
```

**Expected Response:**
```json
{
  "message": "Login successful.",
  "authenticated": true,
  "email": "super@admin.com",
  "name": "super",
  "roles": ["ROLE_USER", "ROLE_ADMIN"]
}
```

**🔑 IMPORTANT**: Copy the token from response! You'll need it for other APIs.

---

### **API 3: Create Ticket**
```
Method: POST
URL: http://localhost:5000/api/tickets
Headers:
  Content-Type: application/json
  Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Body (raw JSON):
{
  "title": "Broken Projector in Lab 301",
  "location": "Computer Lab 301",
  "category": "EQUIPMENT",
  "priority": "HIGH",
  "description": "The projector is not displaying anything during lectures",
  "preferredContact": "email",
  "imageAttachments": ["projector_error.jpg", "power_light.jpg"]
}
```

**Expected Response:**
```json
{
  "title": "Broken Projector in Lab 301",
  "location": "Computer Lab 301",
  "category": "EQUIPMENT",
  "priority": "HIGH",
  "description": "The projector is not displaying anything during lectures",
  "preferredContact": "email",
  "imageAttachments": ["projector_error.jpg", "power_light.jpg"],
  "createdByEmail": "super@admin.com",
  "assignedToEmail": "",
  "status": "OPEN",
  "rejectionReason": "",
  "resolutionNotes": "",
  "comments": [],
  "createdAt": "2026-04-24T09:10:00.000Z",
  "updatedAt": "2026-04-24T09:10:00.000Z",
  "id": "uuid-generated-id"
}
```

---

### **API 4: View All Tickets (Admin Only)**
```
Method: GET
URL: http://localhost:5000/api/tickets
Headers:
  Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Body: (none)
```

**Expected Response:** Array of all tickets in system

---

### **API 5: View My Tickets**
```
Method: GET
URL: http://localhost:5000/api/tickets/my
Headers:
  Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Body: (none)
```

**Expected Response:** Array of tickets created by current user

---

### **API 6: Update Ticket Status**
```
Method: PATCH
URL: http://localhost:5000/api/tickets/{ticket-id}/status
Headers:
  Content-Type: application/json
  Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Body (raw JSON):
{
  "status": "IN_PROGRESS",
  "assignedToEmail": "technician@campus.edu",
  "resolutionNotes": "Technician assigned to investigate"
}
```

**Expected Response:** Updated ticket with new status

---

### **API 7: Add Comment**
```
Method: POST
URL: http://localhost:5000/api/tickets/{ticket-id}/comments
Headers:
  Content-Type: application/json
  Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Body (raw JSON):
{
  "text": "The projector was working fine yesterday morning"
}
```

**Expected Response:** Ticket with new comment added

---

### **API 8: Update Comment**
```
Method: PATCH
URL: http://localhost:5000/api/tickets/{ticket-id}/comments/{comment-id}
Headers:
  Content-Type: application/json
  Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Body (raw JSON):
{
  "text": "Updated comment text with additional information"
}
```

**Expected Response:** Ticket with updated comment

---

### **API 9: Delete Comment**
```
Method: DELETE
URL: http://localhost:5000/api/tickets/{ticket-id}/comments/{comment-id}
Headers:
  Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Body: (none)
```

**Expected Response:** Ticket with comment removed

---

## 🎯 **Complete Test Workflow**

### **1. Setup Authentication**
1. Test Health Check (API 1)
2. Login as Admin (API 2)
3. Copy the token from response

### **2. Test Ticket Creation**
1. Create a ticket (API 3)
2. Copy the ticket ID from response
3. View all tickets (API 4)
4. View my tickets (API 5)

### **3. Test Ticket Workflow**
1. Update status to IN_PROGRESS (API 6)
2. Update status to RESOLVED (API 6)
3. Update status to CLOSED (API 6)

### **4. Test Comment System**
1. Add comment (API 7)
2. Update comment (API 8)
3. Delete comment (API 9)

---

## 🔍 **Troubleshooting**

### **"Authentication required" Error**
- Make sure you copied the token correctly
- Check Cookie header format: `Cookie: token=your-token-here`
- Make sure token has no extra spaces

### **"404 Not Found" Error**
- Check URL spelling
- Make sure backend is running (http://localhost:5000)
- Check endpoint path exactly

### **"400 Bad Request" Error**
- Check JSON body syntax
- Make sure Content-Type is `application/json`
- Verify all required fields are included

---

## 📱 **Postman Screenshots Guide**

### **Creating Request:**
1. Click **"+"** next to collection
2. Enter **Name** (e.g., "Create Ticket")
3. Select **Method** (POST/GET/PATCH/DELETE)
4. Enter **URL**
5. Click **Headers** tab and add headers
6. Click **Body** tab and select **raw → JSON**
7. Click **Send**

### **Saving Responses:**
1. After sending request, click **Save Response**
2. Add description for documentation
3. This creates evidence for your viva

---

## 🎉 **Success Indicators**

✅ **All 200-201 status codes**  
✅ **Ticket ID generated**  
✅ **Status updates work**  
✅ **Comments added/updated/deleted**  
✅ **Authentication works**  
✅ **Role-based access works**  

---

## 📋 **Viva Ready Checklist**

- [ ] All 9 APIs tested successfully
- [ ] Authentication flow working
- [ ] Complete ticket workflow demonstrated
- [ ] Comment system fully functional
- [ ] Error handling verified
- [ ] Screenshots saved as evidence

**You're ready for viva!** 🚀
