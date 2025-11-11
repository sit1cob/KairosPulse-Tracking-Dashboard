const { MongoClient } = require('mongodb');

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'KairosPulse-Tracking';

async function testConnection() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('Testing MongoDB connection...');
    console.log(`URI: ${MONGODB_URI}`);
    console.log(`Database: ${DB_NAME}`);
    
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!');
    
    const db = client.db(DB_NAME);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`\nFound ${collections.length} collections:`);
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // Test basic operations
    const tasksCollection = db.collection('tasks');
    const taskCount = await tasksCollection.countDocuments();
    console.log(`\nTasks collection has ${taskCount} documents`);
    
    if (taskCount > 0) {
      const sampleTask = await tasksCollection.findOne();
      console.log('\nSample task:');
      console.log(`  ID: ${sampleTask.id}`);
      console.log(`  Notebook: ${sampleTask.notebook}`);
      console.log(`  Status: ${sampleTask.latestStatus?.status || 'No status'}`);
    }
    
    console.log('\n✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('  1. Make sure MongoDB is running');
      console.log('  2. Check if the connection URI is correct');
      console.log('  3. Verify network connectivity');
    }
  } finally {
    await client.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the test
testConnection();
