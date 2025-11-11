const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'KairosPulse-Tracking';

// Path to your existing statusOverrides.json
const STATUS_OVERRIDES_PATH = path.join(__dirname, '..', 'data', 'statusOverrides.json');

async function migrateStatusOverrides() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const statusOverridesCollection = db.collection('status_overrides');
    const tasksCollection = db.collection('tasks');
    
    // Read existing statusOverrides.json
    if (!fs.existsSync(STATUS_OVERRIDES_PATH)) {
      console.log('statusOverrides.json not found, skipping migration');
      return;
    }
    
    const statusOverridesData = JSON.parse(fs.readFileSync(STATUS_OVERRIDES_PATH, 'utf8'));
    console.log(`Found ${Object.keys(statusOverridesData).length} status overrides to migrate`);
    
    // Convert the JSON structure to MongoDB documents
    const overrideDocuments = [];
    const taskUpdates = [];
    
    for (const [taskId, override] of Object.entries(statusOverridesData)) {
      // Create status override document
      const overrideDoc = {
        taskId: taskId,
        status: override.status,
        remarks: override.remarks || '',
        label: override.label,
        updatedAt: new Date(override.updatedAt)
      };
      overrideDocuments.push(overrideDoc);
      
      // Prepare task update with the override status
      const statusEntry = {
        label: override.label,
        status: override.status,
        remarks: override.remarks || '',
        timestamp: new Date(override.updatedAt)
      };
      
      taskUpdates.push({
        taskId: taskId,
        statusEntry: statusEntry
      });
    }
    
    // Insert status overrides
    if (overrideDocuments.length > 0) {
      await statusOverridesCollection.deleteMany({}); // Clear existing
      const overrideResult = await statusOverridesCollection.insertMany(overrideDocuments);
      console.log(`Migrated ${overrideResult.insertedCount} status overrides`);
    }
    
    // Update tasks with the override statuses
    let updatedTasks = 0;
    for (const update of taskUpdates) {
      const result = await tasksCollection.updateOne(
        { id: update.taskId },
        {
          $set: {
            latestStatus: update.statusEntry,
            todayStatus: update.statusEntry,
            updatedAt: new Date()
          },
          $push: {
            statuses: update.statusEntry
          }
        },
        { upsert: false }
      );
      
      if (result.matchedCount > 0) {
        updatedTasks++;
      } else {
        console.log(`Warning: Task ${update.taskId} not found in database`);
      }
    }
    
    console.log(`Updated ${updatedTasks} tasks with override statuses`);
    
    console.log('\n=== Migration Complete ===');
    console.log(`Status overrides migrated: ${overrideDocuments.length}`);
    console.log(`Tasks updated: ${updatedTasks}`);
    console.log('==========================\n');
    
  } catch (error) {
    console.error('Error migrating status overrides:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the migration
migrateStatusOverrides();
