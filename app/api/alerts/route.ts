import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

const COLLECTION_NAME = 'KairosPulse-Tracking';

// GET /api/alerts - Get all alerts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');

    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    // Debug logging
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://kairos_admin:Sears234%23@lc-sywrelay-kairos-mongo-prod-825d03041ac5a48a.elb.us-east-2.amazonaws.com:27017/?authMechanism=SCRAM-SHA-1&authSource=kairosdb&readPreference=primaryPreferred&directConnection=true';
    console.log('MongoDB URL:', mongoUrl);
    console.log('Database name:', db.databaseName);
    console.log('Collection name:', COLLECTION_NAME);
    console.log('Full collection namespace:', `${db.databaseName}.${COLLECTION_NAME}`);

    const alerts = await collection
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments();

    return NextResponse.json({
      success: true,
      data: alerts,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/alerts - Save new alert (dump JSON)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

    // Debug logging
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://kairos_admin:Sears234%23@lc-sywrelay-kairos-mongo-prod-825d03041ac5a48a.elb.us-east-2.amazonaws.com:27017/?authMechanism=SCRAM-SHA-1&authSource=kairosdb&readPreference=primaryPreferred&directConnection=true';
    console.log('POST - MongoDB URL:', mongoUrl);
    console.log('POST - Database name:', db.databaseName);
    console.log('POST - Collection name:', COLLECTION_NAME);
    console.log('POST - Full collection namespace:', `${db.databaseName}.${COLLECTION_NAME}`);

    // Create a new document/node - always insert, never replace
    const alertDocument = {
      ...body,
      _id: undefined, // Ensure MongoDB generates a new ObjectId
      createdAt: new Date(),
      updatedAt: new Date(),
      nodeId: new Date().getTime(), // Add unique node identifier
    };

    // Remove any existing _id from the request body to prevent conflicts
    delete alertDocument._id;

    console.log('Creating new alert node:', { nodeId: alertDocument.nodeId });

    // Insert as a new document (creates new node, never replaces)
    const result = await collection.insertOne(alertDocument);
    const savedAlert = await collection.findOne({ _id: result.insertedId });

    console.log('New alert node created with ID:', result.insertedId);

    return NextResponse.json({
      success: true,
      data: savedAlert,
      message: 'New alert node created successfully',
      nodeInfo: {
        mongoId: result.insertedId,
        nodeId: alertDocument.nodeId,
        createdAt: alertDocument.createdAt
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error saving alert:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to save alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
