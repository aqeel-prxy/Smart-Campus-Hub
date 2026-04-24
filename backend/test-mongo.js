const mongoose = require('mongoose');

async function testMongoConnection() {
    try {
        console.log('🔍 Testing MongoDB connection...');
        
        // Connect to MongoDB
        await mongoose.connect('mongodb://127.0.0.1:27017/smart-campus', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connected to MongoDB successfully');
        
        // Test database operations
        const db = mongoose.connection.db;
        console.log(`📊 Database: ${db.databaseName}`);
        
        // List collections
        const collections = await db.listCollections().toArray();
        console.log(`📁 Collections: ${collections.length}`);
        collections.forEach(col => console.log(`   - ${col.name}`));
        
        // Test creating a document
        const testSchema = new mongoose.Schema({
            name: String,
            createdAt: { type: Date, default: Date.now }
        });
        
        const TestModel = mongoose.model('Test', testSchema);
        await TestModel.create({ name: 'MongoDB Test' });
        console.log('✅ Test document created successfully');
        
        // Clean up
        await TestModel.deleteMany({});
        console.log('✅ Test document cleaned up');
        
        console.log('🎉 MongoDB is working perfectly!');
        
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

testMongoConnection();
