# Smart Campus Operations Hub - System Architecture

## Overall System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        React[React Application]
        Auth[OAuth2 & Auth]
        Router[React Router]
        Components[UI Components]
    end
    
    subgraph "API Gateway Layer"
        CORS[CORS Configuration]
        RateLimit[Rate Limiting]
        Security[Security Filter Chain]
    end
    
    subgraph "Application Layer"
        Controllers[REST Controllers]
        Services[Business Services]
        Validation[Input Validation]
        Notifications[Notification Service]
    end
    
    subgraph "Data Layer"
        MongoDB[(MongoDB Database)]
        Repositories[Spring Data Repositories]
    end
    
    subgraph "External Services"
        GoogleOAuth[Google OAuth 2.0]
        EmailService[Email Service]
        FileStorage[File Storage]
    end
    
    React --> CORS
    Auth --> Security
    Router --> Controllers
    Components --> Controllers
    
    CORS --> RateLimit
    RateLimit --> Security
    Security --> Controllers
    
    Controllers --> Services
    Controllers --> Validation
    Services --> Repositories
    Services --> Notifications
    
    Repositories --> MongoDB
    Security --> GoogleOAuth
    Notifications --> EmailService
    Services --> FileStorage
```

## Backend Architecture

```mermaid
graph TB
    subgraph "Spring Boot Application"
        subgraph "Web Layer"
            AuthController[Auth Controller]
            BookingController[Booking Controller]
            ResourceController[Resource Controller]
            TicketController[Ticket Controller]
            NotificationController[Notification Controller]
        end
        
        subgraph "Service Layer"
            AuthService[Auth Service]
            BookingService[Booking Service]
            ResourceService[Resource Service]
            TicketService[Ticket Service]
            NotificationService[Notification Service]
            QRCodeService[QR Code Service]
            AnalyticsService[Analytics Service]
        end
        
        subgraph "Repository Layer"
            UserRepo[User Repository]
            BookingRepo[Booking Repository]
            ResourceRepo[Resource Repository]
            TicketRepo[Ticket Repository]
            NotificationRepo[Notification Repository]
        end
        
        subgraph "Security Layer"
            SecurityConfig[Security Configuration]
            RateLimitConfig[Rate Limiting]
            ValidationUtils[Validation Utils]
        end
        
        subgraph "Configuration"
            CorsConfig[CORS Configuration]
            MongoConfig[MongoDB Configuration]
            OAuthConfig[OAuth Configuration]
        end
    end
    
    AuthController --> AuthService
    BookingController --> BookingService
    ResourceController --> ResourceService
    TicketController --> TicketService
    NotificationController --> NotificationService
    
    AuthService --> UserRepo
    BookingService --> BookingRepo
    ResourceService --> ResourceRepo
    TicketService --> TicketRepo
    NotificationService --> NotificationRepo
    
    BookingService --> ResourceRepo
    TicketService --> ResourceRepo
    
    AuthService --> SecurityConfig
    BookingService --> ValidationUtils
    TicketService --> ValidationUtils
```

## Frontend Architecture

```mermaid
graph TB
    subgraph "React Application"
        subgraph "Routing"
            App[App.jsx]
            Router[React Router]
            ProtectedRoute[Protected Routes]
        end
        
        subgraph "Pages"
            Dashboard[Dashboard Page]
            Bookings[Bookings Page]
            Facilities[Facilities Page]
            Tickets[Tickets Page]
            Login[Login Page]
        end
        
        subgraph "Components"
            Header[Header Component]
            Sidebar[Sidebar Component]
            Notifications[Notifications Panel]
            ThemeToggle[Theme Toggle]
        end
        
        subgraph "Services"
            ApiService[API Service]
            AuthService[Auth Service]
            StorageService[Local Storage]
        end
        
        subgraph "State Management"
            Context[React Context]
            Hooks[Custom Hooks]
        end
    end
    
    App --> Router
    Router --> ProtectedRoute
    ProtectedRoute --> Dashboard
    ProtectedRoute --> Bookings
    ProtectedRoute --> Facilities
    ProtectedRoute --> Tickets
    Router --> Login
    
    Dashboard --> Header
    Bookings --> Header
    Facilities --> Header
    Tickets --> Header
    Header --> Notifications
    Header --> ThemeToggle
    
    Dashboard --> ApiService
    Bookings --> ApiService
    Facilities --> ApiService
    Tickets --> ApiService
    Login --> AuthService
    
    ApiService --> Context
    AuthService --> Context
    Context --> Hooks
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant React
    participant API
    participant Service
    participant DB
    participant OAuth
    
    User->>React: Login Request
    React->>API: POST /api/auth/login
    API->>Service: Authenticate User
    Service->>DB: Find User
    DB-->>Service: User Data
    Service-->>API: Authentication Result
    API-->>React: JWT/Session
    React-->>User: Login Success
    
    User->>React: Create Booking
    React->>API: POST /api/bookings
    API->>Service: Create Booking
    Service->>DB: Check Conflicts
    DB-->>Service: Conflict Result
    Service->>DB: Save Booking
    DB-->>Service: Booking Data
    Service-->>API: Booking Result
    API-->>React: Booking Response
    React-->>User: Booking Confirmation
    
    User->>React: Google Login
    React->>OAuth: OAuth2 Flow
    OAuth-->>React: Google Token
    React->>API: Google Token
    API->>Service: Validate Token
    Service-->>API: User Info
    API-->>React: Session
    React-->>User: Login Success
```

## Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        subgraph "Network Security"
            HTTPS[HTTPS/TLS]
            CORS[CORS Policy]
            RateLimit[Rate Limiting]
        end
        
        subgraph "Authentication"
            OAuth2[OAuth 2.0]
            JWT[JWT Sessions]
            LocalAuth[Local Authentication]
        end
        
        subgraph "Authorization"
            RBAC[Role-Based Access Control]
            MethodSecurity[Method Security]
            URLSecurity[URL Security]
        end
        
        subgraph "Input Security"
            Validation[Input Validation]
            Sanitization[XSS Protection]
            FileValidation[File Upload Security]
        end
        
        subgraph "Data Security"
            Encryption[Password Encryption]
            DataSanitization[Data Sanitization]
            AuditLogging[Audit Logging]
        end
    end
    
    HTTPS --> CORS
    CORS --> RateLimit
    RateLimit --> OAuth2
    RateLimit --> LocalAuth
    
    OAuth2 --> JWT
    LocalAuth --> JWT
    JWT --> RBAC
    
    RBAC --> MethodSecurity
    RBAC --> URLSecurity
    
    MethodSecurity --> Validation
    URLSecurity --> Validation
    Validation --> Sanitization
    Validation --> FileValidation
    
    Sanitization --> Encryption
    FileValidation --> Encryption
    Encryption --> DataSanitization
    DataSanitization --> AuditLogging
```

## Database Schema

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string password
        string[] roles
        datetime createdAt
        datetime updatedAt
    }
    
    Resource {
        string id PK
        string name
        string type
        integer capacity
        string location
        string description
        string status
        string availableFrom
        string availableTo
        datetime createdAt
        datetime updatedAt
    }
    
    Booking {
        string id PK
        string resourceId FK
        string requesterEmail FK
        date bookingDate
        time startTime
        time endTime
        string purpose
        integer expectedAttendees
        string status
        string adminReason
        datetime createdAt
        datetime updatedAt
    }
    
    Ticket {
        string id PK
        string title
        string location
        string resourceId FK
        string category
        string priority
        string description
        string preferredContact
        string createdByEmail FK
        string assignedToEmail FK
        string status
        string resolutionNotes
        string[] imageAttachments
        datetime createdAt
        datetime updatedAt
    }
    
    TicketComment {
        string id PK
        string ticketId FK
        string authorEmail FK
        string content
        datetime createdAt
        datetime updatedAt
    }
    
    Notification {
        string id PK
        string userId FK
        string type
        string title
        string message
        boolean read
        datetime createdAt
    }
    
    User ||--o{ Booking : creates
    User ||--o{ Ticket : creates
    User ||--o{ TicketComment : writes
    User ||--o{ Notification : receives
    Resource ||--o{ Booking : booked_as
    Resource ||--o{ Ticket : reported_for
    Ticket ||--o{ TicketComment : has
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Load Balancer"
            LB[Nginx/AWS ALB]
        end
        
        subgraph "Application Servers"
            App1[Spring Boot App 1]
            App2[Spring Boot App 2]
            App3[Spring Boot App 3]
        end
        
        subgraph "Database"
            MongoDB[MongoDB Cluster]
            Replica1[Primary Replica]
            Replica2[Secondary Replica]
            Replica3[Secondary Replica]
        end
        
        subgraph "File Storage"
            S3[AWS S3 Bucket]
            CDN[CloudFront CDN]
        end
        
        subgraph "Monitoring"
            Logs[ELK Stack]
            Metrics[Prometheus/Grafana]
            Alerts[AlertManager]
        end
    end
    
    subgraph "Development Environment"
        DevApp[Local Spring Boot]
        DevMongo[Local MongoDB]
        DevReact[Local React Dev]
    end
    
    LB --> App1
    LB --> App2
    LB --> App3
    
    App1 --> MongoDB
    App2 --> MongoDB
    App3 --> MongoDB
    
    MongoDB --> Replica1
    MongoDB --> Replica2
    MongoDB --> Replica3
    
    App1 --> S3
    App2 --> S3
    App3 --> S3
    
    S3 --> CDN
    
    App1 --> Logs
    App2 --> Logs
    App3 --> Logs
    
    App1 --> Metrics
    App2 --> Metrics
    App3 --> Metrics
    
    Metrics --> Alerts
```

## Technology Stack

### Backend Technologies
- **Framework**: Spring Boot 3.3.5
- **Language**: Java 21
- **Database**: MongoDB with Spring Data MongoDB
- **Security**: Spring Security with OAuth 2.0
- **Validation**: Jakarta Bean Validation
- **Rate Limiting**: Resilience4j
- **QR Code**: Google ZXing
- **Testing**: JUnit 5, Mockito, Spring Boot Test
- **Build Tool**: Maven

### Frontend Technologies
- **Framework**: React 19.2.4
- **Routing**: React Router 7.13.2
- **Styling**: TailwindCSS 3.4.19
- **Build Tool**: Vite 8.0.1
- **Testing**: Playwright 1.59.1
- **Package Manager**: npm

### DevOps & Infrastructure
- **Version Control**: Git with GitHub
- **CI/CD**: GitHub Actions
- **Containerization**: Docker
- **Cloud Provider**: AWS (for production)
- **Monitoring**: ELK Stack, Prometheus
- **Load Balancer**: Nginx/AWS ALB

## API Design Patterns

### RESTful Design Principles
- **Resource-based URLs**: `/api/resources`, `/api/bookings`, `/api/tickets`
- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE
- **Status Codes**: Proper HTTP status codes
- **Content Negotiation**: JSON responses
- **Stateless**: JWT-based authentication

### Error Handling Patterns
- **Global Exception Handler**: Centralized error handling
- **Validation Errors**: Structured error responses
- **Custom Exceptions**: Business-specific exceptions
- **Logging**: Comprehensive error logging

### Security Patterns
- **Defense in Depth**: Multiple security layers
- **Principle of Least Privilege**: Minimal required permissions
- **Input Validation**: All inputs validated and sanitized
- **Secure Headers**: Security headers configured

## Performance Considerations

### Database Optimization
- **Indexing**: Proper MongoDB indexes
- **Query Optimization**: Efficient database queries
- **Connection Pooling**: Database connection management
- **Caching**: Redis for frequently accessed data

### Application Performance
- **Async Processing**: Non-blocking operations
- **Rate Limiting**: Prevent abuse
- **Lazy Loading**: Efficient data loading
- **Pagination**: Large result sets

### Frontend Performance
- **Code Splitting**: React lazy loading
- **Asset Optimization**: Minified CSS/JS
- **Caching**: Browser caching strategies
- **CDN**: Static asset delivery

## Scalability Architecture

### Horizontal Scaling
- **Stateless Design**: Easy horizontal scaling
- **Load Balancing**: Distribute traffic
- **Database Sharding**: MongoDB sharding
- **Microservices Ready**: Modular architecture

### Vertical Scaling
- **Resource Monitoring**: Performance metrics
- **Auto-scaling**: Dynamic resource allocation
- **Database Optimization**: Query performance
- **Caching Layers**: Multiple cache levels

This architecture provides a solid foundation for the Smart Campus Operations Hub with security, scalability, and maintainability as key design principles.
