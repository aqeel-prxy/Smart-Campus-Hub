const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/smart-campus', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define User Schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  roles: [{ type: String, enum: ['ROLE_USER', 'ROLE_ADMIN'] }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Define Ticket Schema
const TicketSchema = new mongoose.Schema({
  title: { type: String, required: true },
  location: { type: String, required: true },
  resourceId: { type: String, default: '' },
  category: { type: String, enum: ['GENERAL', 'EQUIPMENT', 'FACILITY', 'NETWORK'], default: 'GENERAL' },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
  description: { type: String, required: true },
  preferredContact: { type: String, enum: ['email', 'phone', 'both'], default: 'email' },
  imageAttachments: [{ type: String }],
  createdByEmail: { type: String, required: true },
  assignedToEmail: { type: String, default: '' },
  status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'], default: 'OPEN' },
  rejectionReason: { type: String, default: '' },
  resolutionNotes: { type: String, default: '' },
  comments: [{
    id: { type: String, required: true },
    authorEmail: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Define Notification Schema
const NotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Define Booking Schema
const BookingSchema = new mongoose.Schema({
  resourceType: { type: String, required: true },
  resourceId: { type: String, required: true },
  userId: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  purpose: { type: String, required: true },
  expectedAttendees: { type: Number, default: 1 },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
  rejectionReason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Define Resource Schema
const ResourceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  capacity: { type: Number, default: 1 },
  location: { type: String, required: true },
  description: { type: String, default: '' },
  availabilityWindows: [{
    dayOfWeek: { type: Number, min: 0, max: 6 },
    openTime: { type: String },
    closeTime: { type: String }
  }],
  status: { type: String, enum: ['ACTIVE', 'OUT_OF_SERVICE', 'MAINTENANCE'], default: 'ACTIVE' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', UserSchema);
const Ticket = mongoose.model('Ticket', TicketSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const Booking = mongoose.model('Booking', BookingSchema);
const Resource = mongoose.model('Resource', ResourceSchema);

// Setup database
async function setupDatabase() {
  try {
    console.log('🚀 Setting up MongoDB database for Smart Campus Hub...');
    
    // Create indexes for better performance
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await Ticket.collection.createIndex({ createdByEmail: 1 });
    await Ticket.collection.createIndex({ assignedToEmail: 1 });
    await Ticket.collection.createIndex({ status: 1 });
    await Ticket.collection.createIndex({ createdAt: -1 });
    await Notification.collection.createIndex({ userId: 1 });
    await Booking.collection.createIndex({ resourceId: 1, startTime: 1, endTime: 1 });
    await Resource.collection.createIndex({ type: 1 });
    await Resource.collection.createIndex({ status: 1 });
    
    console.log('✅ Database indexes created successfully!');
    
    // Create default admin user if not exists
    const existingAdmin = await User.findOne({ email: 'super@admin.com' });
    if (!existingAdmin) {
      await User.create({
        email: 'super@admin.com',
        password: 'admin123', // This should be hashed in production
        name: 'Super Admin',
        roles: ['ROLE_USER', 'ROLE_ADMIN']
      });
      console.log('✅ Default admin user created: super@admin.com / admin123');
    }
    
    // Create technician user if not exists
    const existingTechnician = await User.findOne({ email: 'technician@campus.edu' });
    if (!existingTechnician) {
      await User.create({
        email: 'technician@campus.edu',
        password: 'tech123', // This should be hashed in production
        name: 'Technician',
        roles: ['ROLE_USER']
      });
      console.log('✅ Technician user created: technician@campus.edu / tech123');
    }
    
    // Create sample resources
    const resourceCount = await Resource.countDocuments();
    if (resourceCount === 0) {
      await Resource.create([
        {
          name: 'Computer Lab 301',
          type: 'LAB',
          capacity: 30,
          location: 'Building A, Floor 3',
          description: 'Computer lab with 30 workstations',
          availabilityWindows: [
            { dayOfWeek: 1, openTime: '08:00', closeTime: '22:00' },
            { dayOfWeek: 2, openTime: '08:00', closeTime: '22:00' },
            { dayOfWeek: 3, openTime: '08:00', closeTime: '22:00' },
            { dayOfWeek: 4, openTime: '08:00', closeTime: '22:00' },
            { dayOfWeek: 5, openTime: '08:00', closeTime: '22:00' }
          ]
        },
        {
          name: 'Projector 001',
          type: 'EQUIPMENT',
          capacity: 1,
          location: 'Lecture Hall 101',
          description: 'High-definition projector with HDMI connectivity',
          availabilityWindows: [
            { dayOfWeek: 1, openTime: '08:00', closeTime: '22:00' },
            { dayOfWeek: 2, openTime: '08:00', closeTime: '22:00' },
            { dayOfWeek: 3, openTime: '08:00', closeTime: '22:00' },
            { dayOfWeek: 4, openTime: '08:00', closeTime: '22:00' },
            { dayOfWeek: 5, openTime: '08:00', closeTime: '22:00' }
          ]
        },
        {
          name: 'Meeting Room 202',
          type: 'ROOM',
          capacity: 12,
          location: 'Building B, Floor 2',
          description: 'Meeting room with conference table and whiteboard',
          availabilityWindows: [
            { dayOfWeek: 1, openTime: '09:00', closeTime: '18:00' },
            { dayOfWeek: 2, openTime: '09:00', closeTime: '18:00' },
            { dayOfWeek: 3, openTime: '09:00', closeTime: '18:00' },
            { dayOfWeek: 4, openTime: '09:00', closeTime: '18:00' },
            { dayOfWeek: 5, openTime: '09:00', closeTime: '18:00' }
          ]
        }
      ]);
      console.log('✅ Sample resources created successfully!');
    }
    
    console.log('🎉 MongoDB database setup completed successfully!');
    console.log('📊 Database: smart-campus');
    console.log('👥 Users: 2 (admin + technician)');
    console.log('📋 Collections: users, tickets, notifications, bookings, resources');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run setup
setupDatabase();
