const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, 'backend.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const FRONTEND_URL = process.env.FRONTEND_URL || CORS_ORIGIN;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI =
    process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/auth/google/callback`;
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day

// Middleware
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

const fs = require('fs');
const multer = require('multer');

// Setup upload directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files from uploads
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '-'));
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Connect to MongoDB
let dbConnected = false;
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-campus';

// Set mongoose options
mongoose.set('strictQuery', false);

// Connect to MongoDB with retry logic
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
        });
        
        dbConnected = true;
        console.log('✅ Connected to MongoDB successfully');
        console.log(`📊 Database: ${conn.connection.name}`);
        
        // Test the connection
        await mongoose.connection.db.admin().ping();
        console.log('✅ MongoDB connection verified');
        
    } catch (err) {
        console.error('❌ Failed to connect to MongoDB:', err.message);
        console.warn('⚠️ Running with in-memory fallback mode');
        dbConnected = false;
    }
};

// Wait for MongoDB connection before starting server
const startServer = async () => {
    await connectDB();
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Database connected: ${dbConnected ? 'Yes' : 'No (in-memory fallback)'}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });
};

startServer();

const UserSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true },
        password: { type: String, default: '' },
        name: { type: String, default: 'User' },
        roles: { type: [String], default: ['ROLE_USER'] },
    },
    { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const inMemoryUsers = new Map();
const oauthStates = new Map();
const inMemoryBookings = [];
const inMemoryTickets = [];
const inMemoryNotifications = [];

const hashPassword = (password) =>
    crypto.createHash('sha256').update(password).digest('hex');

const parseCookies = (cookieHeader = '') =>
    cookieHeader.split(';').reduce((acc, entry) => {
        const [rawKey, ...rest] = entry.trim().split('=');
        if (!rawKey) return acc;
        acc[rawKey] = decodeURIComponent(rest.join('='));
        return acc;
    }, {});

const setAuthCookie = (res, token) => {
    res.setHeader(
        'Set-Cookie',
        `token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
    );
};

const clearAuthCookie = (res) => {
    res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
};

const createAuthPayload = (user) => ({
    email: user.email,
    name: user.name || 'User',
    roles: Array.isArray(user.roles) && user.roles.length ? user.roles : ['ROLE_USER'],
});

const createNotification = async (userId, type, message) => {
    if (dbConnected) {
        await Notification.create({ userId, type, message, read: false, createdAt: new Date() });
        return;
    }
    inMemoryNotifications.unshift({
        id: crypto.randomUUID(),
        userId,
        type,
        message,
        read: false,
        createdAt: new Date(),
    });
};

const ResourceSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        status: { type: String, default: 'ACTIVE' },
        location: { type: String, default: '' },
    },
    { collection: 'resources' }
);
const Resource = mongoose.models.Resource || mongoose.model('Resource', ResourceSchema);

const BookingSchema = new mongoose.Schema(
    {
        resourceId: { type: String, required: true },
        resourceName: { type: String, required: true },
        requesterEmail: { type: String, required: true },
        bookingDate: { type: String, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        purpose: { type: String, required: true },
        expectedAttendees: { type: Number, default: 0 },
        status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
        decisionReason: { type: String, default: '' },
        decidedByEmail: { type: String, default: '' },
    },
    { timestamps: true, collection: 'bookings' }
);
const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

const NotificationSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        type: { type: String, default: 'GENERAL' },
        message: { type: String, required: true },
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
    },
    { collection: 'notifications' }
);
const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

const TicketCommentSchema = new mongoose.Schema(
    {
        id: { type: String, required: true },
        authorEmail: { type: String, required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const TicketSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        location: { type: String, required: true },
        resourceId: { type: String, default: '' },
        category: { type: String, default: 'GENERAL' },
        priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
        description: { type: String, required: true },
        preferredContact: { type: String, default: '' },
        imageAttachments: [{ type: String }],
        createdByEmail: { type: String, required: true },
        assignedToEmail: { type: String, default: '' },
        status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'], default: 'OPEN' },
        rejectionReason: { type: String, default: '' },
        resolutionNotes: { type: String, default: '' },
        comments: [TicketCommentSchema],
    },
    { timestamps: true, collection: 'tickets' }
);
const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);

const upsertGoogleUser = async ({ email, name }) => {
    const normalizedEmail = String(email).trim().toLowerCase();

    if (dbConnected) {
        const user = await User.findOneAndUpdate(
            { email: normalizedEmail },
            {
                $set: { name: name || normalizedEmail.split('@')[0] },
                $setOnInsert: { password: '', roles: ['ROLE_USER'] },
            },
            { new: true, upsert: true }
        ).lean();
        return user;
    }

    const existing = inMemoryUsers.get(normalizedEmail);
    if (existing) {
        existing.name = name || existing.name || normalizedEmail.split('@')[0];
        return existing;
    }

    const created = {
        email: normalizedEmail,
        password: '',
        name: name || normalizedEmail.split('@')[0],
        roles: ['ROLE_USER'],
    };
    inMemoryUsers.set(normalizedEmail, created);
    return created;
};

const authRouter = express.Router();

authRouter.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const passwordHash = hashPassword(password);

        // Determine roles - add admin role for specific emails
        let roles = ['ROLE_USER'];
        if (normalizedEmail.includes('@admin') || normalizedEmail === 'admin@campus.edu') {
            roles.push('ROLE_ADMIN');
        }

        if (dbConnected) {
            const existing = await User.findOne({ email: normalizedEmail });
            if (existing) {
                return res.status(409).json({ message: 'User already exists.' });
            }
            await User.create({ email: normalizedEmail, password: passwordHash, name: normalizedEmail.split('@')[0], roles });
        } else {
            if (inMemoryUsers.has(normalizedEmail)) {
                return res.status(409).json({ message: 'User already exists.' });
            }
            inMemoryUsers.set(normalizedEmail, {
                email: normalizedEmail,
                password: passwordHash,
                name: normalizedEmail.split('@')[0],
                roles,
            });
        }

        return res.status(201).json({ message: 'Registration successful.' });
    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

authRouter.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const passwordHash = hashPassword(password);

        let user = null;
        if (dbConnected) {
            user = await User.findOne({ email: normalizedEmail }).lean();
        } else {
            user = inMemoryUsers.get(normalizedEmail) || null;
        }

        if (!user || user.password !== passwordHash) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const payload = createAuthPayload(user);
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
        setAuthCookie(res, token);

        return res.json({ message: 'Login successful.', authenticated: true, ...payload });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

authRouter.get('/user', (req, res) => {
    try {
        const cookies = parseCookies(req.headers.cookie || '');
        const token = cookies.token;

        if (!token) {
            return res.status(401).json({ authenticated: false, message: 'Not authenticated.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        return res.json({ authenticated: true, ...decoded });
    } catch (error) {
        return res.status(401).json({ authenticated: false, message: 'Invalid session.' });
    }
});

authRouter.post('/logout', (req, res) => {
    clearAuthCookie(res);
    return res.json({ message: 'Logged out.' });
});

app.use('/auth', authRouter);
app.use('/api/auth', authRouter);

const getAuthUser = (req) => {
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies.token;
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
};

const requireAuth = (req, res, next) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Authentication required.' });
    req.user = user;
    next();
};

app.post('/api/upload', requireAuth, upload.array('images', 3), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded.' });
        }
        const fileNames = req.files.map(file => file.filename);
        return res.status(200).json({ fileNames });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ message: 'Error uploading files.' });
    }
});

const requireAdmin = (req, res, next) => {
    if (!req.user?.roles?.includes('ROLE_ADMIN')) {
        return res.status(403).json({ message: 'Admin role required.' });
    }
    next();
};

const hasOverlap = (existing, input) =>
    existing.resourceId === input.resourceId &&
    existing.bookingDate === input.bookingDate &&
    ['PENDING', 'APPROVED'].includes(existing.status) &&
    existing.startTime < input.endTime &&
    existing.endTime > input.startTime;

const listBookings = async () => {
    if (dbConnected) {
        return Booking.find().sort({ bookingDate: -1, startTime: -1 }).lean();
    }
    return inMemoryBookings.slice().sort((a, b) => {
        if (a.bookingDate === b.bookingDate) return b.startTime.localeCompare(a.startTime);
        return b.bookingDate.localeCompare(a.bookingDate);
    });
};

app.post('/api/bookings', requireAuth, async (req, res) => {
    try {
        const { resourceId, bookingDate, startTime, endTime, purpose, expectedAttendees } = req.body || {};
        if (!resourceId || !bookingDate || !startTime || !endTime || !purpose) {
            return res.status(400).json({ message: 'Missing required booking fields.' });
        }
        if (startTime >= endTime) {
            return res.status(400).json({ message: 'Start time must be before end time.' });
        }

        let resourceName = 'Resource';
        if (dbConnected) {
            const resource = await Resource.findById(resourceId).lean();
            if (!resource) return res.status(404).json({ message: 'Resource not found.' });
            if (['OUT_OF_SERVICE', 'ARCHIVED'].includes(resource.status)) {
                return res.status(400).json({ message: 'Resource is not available for booking.' });
            }
            resourceName = resource.name || 'Resource';
        }

        const input = { resourceId, bookingDate, startTime, endTime };
        const existingBookings = await listBookings();
        const conflict = existingBookings.some((b) => hasOverlap(b, input));
        if (conflict) {
            return res.status(409).json({ message: 'Booking conflict detected for this resource and time window.' });
        }

        const bookingPayload = {
            resourceId,
            resourceName,
            requesterEmail: req.user.email,
            bookingDate,
            startTime,
            endTime,
            purpose,
            expectedAttendees: Number(expectedAttendees || 0),
            status: 'PENDING',
            decisionReason: '',
            decidedByEmail: '',
        };

        if (dbConnected) {
            const saved = await Booking.create(bookingPayload);
            await createNotification(req.user.email, 'BOOKING_SUBMITTED', `Booking request submitted for ${resourceName} on ${bookingDate}.`);
            return res.status(201).json(saved);
        }

        const saved = { id: crypto.randomUUID(), ...bookingPayload, createdAt: new Date().toISOString() };
        inMemoryBookings.push(saved);
        await createNotification(req.user.email, 'BOOKING_SUBMITTED', `Booking request submitted for ${resourceName} on ${bookingDate}.`);
        return res.status(201).json(saved);
    } catch (error) {
        console.error('Create booking error:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

app.get('/api/bookings/my', requireAuth, async (req, res) => {
    const bookings = await listBookings();
    return res.json(bookings.filter((b) => (b.requesterEmail || '').toLowerCase() === req.user.email.toLowerCase()));
});

app.get('/api/bookings', requireAuth, requireAdmin, async (req, res) => {
    const { status, fromDate, toDate } = req.query;
    let bookings = await listBookings();
    if (status) bookings = bookings.filter((b) => b.status === status);
    if (fromDate) bookings = bookings.filter((b) => b.bookingDate >= fromDate);
    if (toDate) bookings = bookings.filter((b) => b.bookingDate <= toDate);
    return res.json(bookings);
});

app.patch('/api/bookings/:id/decision', requireAuth, requireAdmin, async (req, res) => {
    const { decision, reason } = req.body || {};
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
        return res.status(400).json({ message: 'Decision must be APPROVED or REJECTED.' });
    }
    if (!reason) return res.status(400).json({ message: 'Decision reason is required.' });

    if (dbConnected) {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found.' });
        if (booking.status !== 'PENDING') return res.status(400).json({ message: 'Only PENDING bookings can be decided.' });
        booking.status = decision;
        booking.decisionReason = reason;
        booking.decidedByEmail = req.user.email;
        await booking.save();
        await createNotification(booking.requesterEmail, `BOOKING_${decision}`, `Your booking for ${booking.resourceName} was ${decision.toLowerCase()}.`);
        return res.json(booking);
    }

    const idx = inMemoryBookings.findIndex((b) => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Booking not found.' });
    if (inMemoryBookings[idx].status !== 'PENDING') return res.status(400).json({ message: 'Only PENDING bookings can be decided.' });
    inMemoryBookings[idx] = {
        ...inMemoryBookings[idx],
        status: decision,
        decisionReason: reason,
        decidedByEmail: req.user.email,
    };
    await createNotification(inMemoryBookings[idx].requesterEmail, `BOOKING_${decision}`, `Your booking for ${inMemoryBookings[idx].resourceName} was ${decision.toLowerCase()}.`);
    return res.json(inMemoryBookings[idx]);
});

app.patch('/api/bookings/:id/cancel', requireAuth, async (req, res) => {
    const isAdmin = req.user.roles?.includes('ROLE_ADMIN');
    if (dbConnected) {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found.' });
        if (!isAdmin && booking.requesterEmail.toLowerCase() !== req.user.email.toLowerCase()) {
            return res.status(403).json({ message: 'You are not allowed to cancel this booking.' });
        }
        if (!['PENDING', 'APPROVED'].includes(booking.status)) {
            return res.status(400).json({ message: 'Only PENDING or APPROVED bookings can be cancelled.' });
        }
        booking.status = 'CANCELLED';
        booking.decisionReason = `Cancelled by ${req.user.email}`;
        booking.decidedByEmail = req.user.email;
        await booking.save();
        await createNotification(booking.requesterEmail, 'BOOKING_CANCELLED', `Booking for ${booking.resourceName} on ${booking.bookingDate} was cancelled.`);
        return res.json(booking);
    }

    const idx = inMemoryBookings.findIndex((b) => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Booking not found.' });
    if (!isAdmin && inMemoryBookings[idx].requesterEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: 'You are not allowed to cancel this booking.' });
    }
    if (!['PENDING', 'APPROVED'].includes(inMemoryBookings[idx].status)) {
        return res.status(400).json({ message: 'Only PENDING or APPROVED bookings can be cancelled.' });
    }
    inMemoryBookings[idx] = {
        ...inMemoryBookings[idx],
        status: 'CANCELLED',
        decisionReason: `Cancelled by ${req.user.email}`,
        decidedByEmail: req.user.email,
    };
    await createNotification(inMemoryBookings[idx].requesterEmail, 'BOOKING_CANCELLED', `Booking for ${inMemoryBookings[idx].resourceName} on ${inMemoryBookings[idx].bookingDate} was cancelled.`);
    return res.json(inMemoryBookings[idx]);
});

app.get('/api/notifications', requireAuth, async (req, res) => {
    const userId = req.query.userId || req.user.email;
    if (!req.user.roles?.includes('ROLE_ADMIN') && userId.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: 'Not allowed to view other user notifications.' });
    }
    if (dbConnected) {
        const notes = await Notification.find({ userId }).sort({ createdAt: -1 }).lean();
        return res.json(notes);
    }
    return res.json(inMemoryNotifications.filter((n) => n.userId === userId));
});

app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    if (dbConnected) {
        const note = await Notification.findById(req.params.id);
        if (!note) return res.status(404).json({ message: 'Notification not found.' });
        if (!req.user.roles?.includes('ROLE_ADMIN') && note.userId.toLowerCase() !== req.user.email.toLowerCase()) {
            return res.status(403).json({ message: 'Not allowed.' });
        }
        note.read = true;
        await note.save();
        return res.json(note);
    }
    const idx = inMemoryNotifications.findIndex((n) => n.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Notification not found.' });
    inMemoryNotifications[idx] = { ...inMemoryNotifications[idx], read: true };
    return res.json(inMemoryNotifications[idx]);
});

const listTickets = async () => {
    if (dbConnected) return Ticket.find().sort({ createdAt: -1 }).lean();
    return inMemoryTickets.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

app.post('/api/tickets', requireAuth, async (req, res) => {
    const { title, location, resourceId = '', category = 'GENERAL', priority = 'MEDIUM', description, preferredContact = '', imageAttachments = [] } = req.body || {};
    if (!title || !location || !description) {
        return res.status(400).json({ message: 'title, location, and description are required.' });
    }
    if (!Array.isArray(imageAttachments) || imageAttachments.length > 3) {
        return res.status(400).json({ message: 'Up to 3 image attachments are allowed.' });
    }
    const payload = {
        title,
        location,
        resourceId,
        category,
        priority,
        description,
        preferredContact,
        imageAttachments,
        createdByEmail: req.user.email,
        assignedToEmail: '',
        status: 'OPEN',
        rejectionReason: '',
        resolutionNotes: '',
        comments: [],
    };
    if (dbConnected) {
        const saved = await Ticket.create(payload);
        await createNotification(req.user.email, 'TICKET_OPENED', `Ticket "${title}" has been created.`);
        return res.status(201).json(saved);
    }
    const saved = { id: crypto.randomUUID(), ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    inMemoryTickets.unshift(saved);
    await createNotification(req.user.email, 'TICKET_OPENED', `Ticket "${title}" has been created.`);
    return res.status(201).json(saved);
});

app.get('/api/tickets/my', requireAuth, async (req, res) => {
    const tickets = await listTickets();
    return res.json(tickets.filter((t) => 
        t.createdByEmail.toLowerCase() === req.user.email.toLowerCase() || 
        (t.assignedToEmail || '').toLowerCase() === req.user.email.toLowerCase()
    ));
});

app.get('/api/tickets', requireAuth, async (req, res) => {
    const isAdmin = req.user.roles?.includes('ROLE_ADMIN');
    const tickets = await listTickets();
    if (isAdmin) return res.json(tickets);
    return res.json(tickets.filter((t) => t.createdByEmail.toLowerCase() === req.user.email.toLowerCase() || (t.assignedToEmail || '').toLowerCase() === req.user.email.toLowerCase()));
});

app.patch('/api/tickets/:id/status', requireAuth, async (req, res) => {
    const { status, assignedToEmail = '', resolutionNotes = '', rejectionReason = '' } = req.body || {};
    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status.' });
    }
    if (!req.user.roles?.includes('ROLE_ADMIN')) {
        // Check if user is the assigned technician
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket || ticket.assignedToEmail !== req.user.email) {
            return res.status(403).json({ message: 'Admin role or assigned technician required to change ticket status.' });
        }
    }

    if (dbConnected) {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
        ticket.status = status;
        ticket.assignedToEmail = assignedToEmail;
        ticket.resolutionNotes = resolutionNotes;
        ticket.rejectionReason = rejectionReason;
        await ticket.save();
        await createNotification(ticket.createdByEmail, 'TICKET_STATUS', `Ticket "${ticket.title}" status changed to ${status}.`);
        return res.json(ticket);
    }

    const idx = inMemoryTickets.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Ticket not found.' });
    
    // Check technician permissions for in-memory fallback
    if (!req.user.roles?.includes('ROLE_ADMIN')) {
        const ticket = inMemoryTickets[idx];
        if (ticket.assignedToEmail !== req.user.email) {
            return res.status(403).json({ message: 'Admin role or assigned technician required to change ticket status.' });
        }
    }
    
    inMemoryTickets[idx] = {
        ...inMemoryTickets[idx],
        status,
        assignedToEmail,
        resolutionNotes,
        rejectionReason,
        updatedAt: new Date().toISOString(),
    };
    await createNotification(inMemoryTickets[idx].createdByEmail, 'TICKET_STATUS', `Ticket "${inMemoryTickets[idx].title}" status changed to ${status}.`);
    return res.json(inMemoryTickets[idx]);
});

app.post('/api/tickets/:id/comments', requireAuth, async (req, res) => {
    const { text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text is required.' });
    const comment = {
        id: crypto.randomUUID(),
        authorEmail: req.user.email,
        text: text.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    if (dbConnected) {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
        ticket.comments.push(comment);
        await ticket.save();
        await createNotification(ticket.createdByEmail, 'TICKET_COMMENT', `New comment added on ticket "${ticket.title}".`);
        return res.json(ticket);
    }
    const idx = inMemoryTickets.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Ticket not found.' });
    inMemoryTickets[idx].comments.push(comment);
    inMemoryTickets[idx].updatedAt = new Date().toISOString();
    await createNotification(inMemoryTickets[idx].createdByEmail, 'TICKET_COMMENT', `New comment added on ticket "${inMemoryTickets[idx].title}".`);
    return res.json(inMemoryTickets[idx]);
});

app.patch('/api/tickets/:id/comments/:commentId', requireAuth, async (req, res) => {
    const { text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text is required.' });
    const isAdmin = req.user.roles?.includes('ROLE_ADMIN');

    const updateComment = (ticketObj) => {
        const cIdx = ticketObj.comments.findIndex((c) => c.id === req.params.commentId);
        if (cIdx === -1) return { error: 'Comment not found.', code: 404 };
        if (!isAdmin && ticketObj.comments[cIdx].authorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
            return { error: 'Not allowed to edit this comment.', code: 403 };
        }
        ticketObj.comments[cIdx].text = text.trim();
        ticketObj.comments[cIdx].updatedAt = new Date();
        return { ticket: ticketObj };
    };

    if (dbConnected) {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
        const result = updateComment(ticket);
        if (result.error) return res.status(result.code).json({ message: result.error });
        await ticket.save();
        return res.json(ticket);
    }
    const idx = inMemoryTickets.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Ticket not found.' });
    const result = updateComment(inMemoryTickets[idx]);
    if (result.error) return res.status(result.code).json({ message: result.error });
    inMemoryTickets[idx].updatedAt = new Date().toISOString();
    return res.json(inMemoryTickets[idx]);
});

app.delete('/api/tickets/:id/comments/:commentId', requireAuth, async (req, res) => {
    const isAdmin = req.user.roles?.includes('ROLE_ADMIN');
    const removeComment = (ticketObj) => {
        const cIdx = ticketObj.comments.findIndex((c) => c.id === req.params.commentId);
        if (cIdx === -1) return { error: 'Comment not found.', code: 404 };
        if (!isAdmin && ticketObj.comments[cIdx].authorEmail.toLowerCase() !== req.user.email.toLowerCase()) {
            return { error: 'Not allowed to delete this comment.', code: 403 };
        }
        ticketObj.comments.splice(cIdx, 1);
        return { ticket: ticketObj };
    };

    if (dbConnected) {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
        const result = removeComment(ticket);
        if (result.error) return res.status(result.code).json({ message: result.error });
        await ticket.save();
        return res.json(ticket);
    }
    const idx = inMemoryTickets.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Ticket not found.' });
    const result = removeComment(inMemoryTickets[idx]);
    if (result.error) return res.status(result.code).json({ message: result.error });
    inMemoryTickets[idx].updatedAt = new Date().toISOString();
    return res.json(inMemoryTickets[idx]);
});

app.get('/oauth2/authorization/google', (req, res) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.redirect(`${FRONTEND_URL}/?oauthError=google_not_configured`);
    }

    const state = crypto.randomBytes(16).toString('hex');
    oauthStates.set(state, Date.now());

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('access_type', 'online');
    authUrl.searchParams.set('prompt', 'select_account');
    authUrl.searchParams.set('state', state);

    return res.redirect(authUrl.toString());
});

app.get('/auth/google/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code || !state || !oauthStates.has(state)) {
            return res.redirect(`${FRONTEND_URL}/?oauthError=invalid_oauth_state`);
        }
        oauthStates.delete(state);

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: String(code),
                client_id: GOOGLE_CLIENT_ID || '',
                client_secret: GOOGLE_CLIENT_SECRET || '',
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenResponse.ok) {
            const tokenError = await tokenResponse.text();
            console.error('Google token exchange failed:', tokenError);
            return res.redirect(`${FRONTEND_URL}/?oauthError=token_exchange_failed`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) {
            return res.redirect(`${FRONTEND_URL}/?oauthError=missing_access_token`);
        }

        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!profileResponse.ok) {
            const profileError = await profileResponse.text();
            console.error('Google profile fetch failed:', profileError);
            return res.redirect(`${FRONTEND_URL}/?oauthError=profile_fetch_failed`);
        }

        const profile = await profileResponse.json();
        if (!profile.email) {
            return res.redirect(`${FRONTEND_URL}/?oauthError=missing_google_email`);
        }

        const user = await upsertGoogleUser({
            email: profile.email,
            name: profile.name || profile.given_name || profile.email.split('@')[0],
        });

        const payload = createAuthPayload(user);
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
        setAuthCookie(res, token);
        return res.redirect(`${FRONTEND_URL}/dashboard`);
    } catch (error) {
        console.error('Google OAuth callback error:', error);
        return res.redirect(`${FRONTEND_URL}/?oauthError=oauth_callback_failed`);
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        dbConnected,
        mode: dbConnected ? 'mongodb' : 'in-memory-fallback',
        server: 'node-express',
        timestamp: new Date().toISOString(),
    });
});

// Test route
app.get('/', (req, res) => {
    res.json({ status: 'ok', dbConnected });
});