import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

const COLLECTION_NAME = 'KairosPulse-Tracking';

// GET /api/alerts/latest - Get only the latest/most recent alert
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    // Debug logging
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://kairos_admin:Sears234%23@lc-sywrelay-kairos-mongo-prod-825d03041ac5a48a.elb.us-east-2.amazonaws.com:27017/?authMechanism=SCRAM-SHA-1&authSource=kairosdb&readPreference=primaryPreferred&directConnection=true';
    console.log('LATEST - MongoDB URL:', mongoUrl);
    console.log('LATEST - Database name:', db.databaseName);
    console.log('LATEST - Collection name:', COLLECTION_NAME);

    // Get the most recent document based on createdAt timestamp
    const latestAlert = await collection
      .findOne(
        {}, 
        { 
          sort: { createdAt: -1 } // Sort by createdAt descending to get the latest
        }
      );

    if (!latestAlert) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No alerts found'
      });
    }

    return NextResponse.json({
      success: true,
      data: latestAlert,
      message: 'Latest alert retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching latest alert:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch latest alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
