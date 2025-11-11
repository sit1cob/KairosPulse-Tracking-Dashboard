const { MongoClient } = require('mongodb');

// MongoDB connection URI - update this if needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'KairosPulse-Tracking';

async function setupMongoDB() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Create collections
    const tasksCollection = db.collection('tasks');
    const collectionsCollection = db.collection('dashboard_collections');
    const statusOverridesCollection = db.collection('status_overrides');
    
    console.log('Setting up collections...');
    
    // Insert sample tasks
    const sampleTasks = [
      {
        id: 'foundational-0-data-pipeline',
        notebook: 'Daily Data Pipeline',
        bucket: 'ETL',
        automationStatus: 'Automated',
        schedule: 'Daily at 6 AM',
        estimatedRunTime: '30 minutes',
        days: 'Monday to Friday',
        poc: 'Data Team',
        statuses: [
          {
            label: 'Nov 10',
            status: 'Pass',
            remarks: 'Pipeline executed successfully',
            timestamp: new Date('2025-11-10T06:00:00Z')
          }
        ],
        latestStatus: {
          label: 'Nov 10',
          status: 'Pass',
          remarks: 'Pipeline executed successfully',
          timestamp: new Date('2025-11-10T06:00:00Z')
        },
        todayStatus: null,
        sheetKey: 'foundational',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'foundational-1-financial-validation',
        notebook: 'Financial Data Validation',
        bucket: 'Validation',
        automationStatus: 'Automated',
        schedule: 'Daily at 7 AM',
        estimatedRunTime: '20 minutes',
        days: 'Monday to Friday',
        poc: 'Finance Team',
        statuses: [
          {
            label: 'Nov 10',
            status: 'Fail',
            remarks: 'Data quality issues detected',
            timestamp: new Date('2025-11-10T07:00:00Z')
          },
          {
            label: 'Nov 11',
            status: 'Pass',
            remarks: 'All validations passed after fix',
            timestamp: new Date('2025-11-11T07:00:00Z')
          }
        ],
        latestStatus: {
          label: 'Nov 11',
          status: 'Pass',
          remarks: 'All validations passed after fix',
          timestamp: new Date('2025-11-11T07:00:00Z')
        },
        todayStatus: {
          label: 'Nov 11',
          status: 'Pass',
          remarks: 'All validations passed after fix',
          timestamp: new Date('2025-11-11T07:00:00Z')
        },
        sheetKey: 'foundational',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'koyfinScripts-0-market-data-sync',
        notebook: 'Market Data Synchronization',
        bucket: 'Market Data',
        automationStatus: 'Automated',
        schedule: 'Every 4 hours',
        estimatedRunTime: '45 minutes',
        days: 'Daily',
        poc: 'Market Team',
        statuses: [
          {
            label: 'Nov 11',
            status: 'Pass',
            remarks: 'Sync completed successfully',
            timestamp: new Date('2025-11-11T08:00:00Z')
          }
        ],
        latestStatus: {
          label: 'Nov 11',
          status: 'Pass',
          remarks: 'Sync completed successfully',
          timestamp: new Date('2025-11-11T08:00:00Z')
        },
        todayStatus: {
          label: 'Nov 11',
          status: 'Pass',
          remarks: 'Sync completed successfully',
          timestamp: new Date('2025-11-11T08:00:00Z')
        },
        sheetKey: 'koyfinScripts',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'koyfinScripts-1-report-generation',
        notebook: 'Daily Report Generation',
        bucket: 'Reporting',
        automationStatus: 'Manual',
        schedule: 'Daily at 9 AM',
        estimatedRunTime: '25 minutes',
        days: 'Monday to Friday',
        poc: 'Analytics Team',
        statuses: [],
        latestStatus: null,
        todayStatus: null,
        sheetKey: 'koyfinScripts',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Clear existing tasks and insert new ones
    await tasksCollection.deleteMany({});
    const taskResult = await tasksCollection.insertMany(sampleTasks);
    console.log(`Inserted ${taskResult.insertedCount} tasks`);
    
    // Insert sample dashboard collections
    const sampleCollections = [
      {
        name: 'Production Pipeline',
        description: 'Critical production tasks that run daily',
        tasks: [
          'foundational-0-data-pipeline',
          'foundational-1-financial-validation'
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Market Data Operations',
        description: 'Market data synchronization and processing',
        tasks: [
          'koyfinScripts-0-market-data-sync',
          'koyfinScripts-1-report-generation'
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    await collectionsCollection.deleteMany({});
    const collectionResult = await collectionsCollection.insertMany(sampleCollections);
    console.log(`Inserted ${collectionResult.insertedCount} dashboard collections`);
    
    // Insert sample status overrides
    const sampleOverrides = [
      {
        taskId: 'foundational-1-financial-validation',
        status: 'Pass',
        remarks: 'Manual override - issue resolved',
        label: 'Nov 11',
        updatedAt: new Date()
      }
    ];
    
    await statusOverridesCollection.deleteMany({});
    const overrideResult = await statusOverridesCollection.insertMany(sampleOverrides);
    console.log(`Inserted ${overrideResult.insertedCount} status overrides`);
    
    // Create indexes for better performance
    console.log('Creating indexes...');
    
    await tasksCollection.createIndex({ id: 1 }, { unique: true });
    await tasksCollection.createIndex({ sheetKey: 1 });
    await tasksCollection.createIndex({ poc: 1 });
    await tasksCollection.createIndex({ 'latestStatus.status': 1 });
    await tasksCollection.createIndex({ updatedAt: -1 });
    
    await collectionsCollection.createIndex({ name: 1 }, { unique: true });
    await statusOverridesCollection.createIndex({ taskId: 1 });
    
    console.log('Indexes created successfully');
    
    // Display collection stats
    const taskCount = await tasksCollection.countDocuments();
    const collectionCount = await collectionsCollection.countDocuments();
    const overrideCount = await statusOverridesCollection.countDocuments();
    
    console.log('\n=== Database Setup Complete ===');
    console.log(`Database: ${DB_NAME}`);
    console.log(`Tasks: ${taskCount}`);
    console.log(`Dashboard Collections: ${collectionCount}`);
    console.log(`Status Overrides: ${overrideCount}`);
    console.log('================================\n');
    
  } catch (error) {
    console.error('Error setting up MongoDB:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the setup
setupMongoDB();
