const crypto = require('crypto');
const mongoose = require('mongoose');

const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');

mongoose.connect('mongodb://127.0.0.1:27017/smart-campus').then(async () => {
    const db = mongoose.connection.db;
    await db.collection('users').updateOne({email: 'super@admin.com'}, {$set: {password: hashPassword('admin123')}});
    await db.collection('users').updateOne({email: 'technician@campus.edu'}, {$set: {password: hashPassword('tech123')}});
    console.log('Passwords updated to hashed format!');
    process.exit(0);
});
