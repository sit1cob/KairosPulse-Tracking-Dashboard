import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

const COLLECTION_NAME = 'kairos-pulse-alert';

// GET /api/alerts - Get all alerts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');

    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

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

    // Add metadata to the alert document
    const alertDocument = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(alertDocument);
    const savedAlert = await collection.findOne({ _id: result.insertedId });

    return NextResponse.json({
      success: true,
      data: savedAlert,
      message: 'Alert saved successfully'
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
