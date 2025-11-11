import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { DashboardCollection, COLLECTIONS } from '@/lib/models';

// GET /api/collections - Get all dashboard collections
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const db = await getDatabase();
    const collection = db.collection<DashboardCollection>(COLLECTIONS.DASHBOARD_COLLECTIONS);

    const collections = await collection
      .find({})
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments({});

    return NextResponse.json({
      collections,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

// POST /api/collections - Create a new dashboard collection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<DashboardCollection>(COLLECTIONS.DASHBOARD_COLLECTIONS);

    // Check if collection with same name already exists
    const existingCollection = await collection.findOne({ name: body.name });
    if (existingCollection) {
      return NextResponse.json(
        { error: 'Collection with this name already exists' },
        { status: 409 }
      );
    }

    const newCollection: DashboardCollection = {
      name: body.name,
      description: body.description || '',
      tasks: body.tasks || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newCollection);
    const createdCollection = await collection.findOne({ _id: result.insertedId });

    return NextResponse.json(createdCollection, { status: 201 });
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}
