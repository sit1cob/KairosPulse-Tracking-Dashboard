import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { TaskRecord, validateTaskRecord, COLLECTIONS } from '@/lib/models';
import { ObjectId } from 'mongodb';

// GET /api/tasks - Get all tasks with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetKey = searchParams.get('sheetKey');
    const poc = searchParams.get('poc');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');

    const db = await getDatabase();
    const collection = db.collection<TaskRecord>(COLLECTIONS.TASKS);

    // Build filter query
    const filter: any = {};
    if (sheetKey) filter.sheetKey = sheetKey;
    if (poc) filter.poc = { $regex: poc, $options: 'i' };
    if (status) filter['latestStatus.status'] = { $regex: status, $options: 'i' };

    const tasks = await collection
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments(filter);

    return NextResponse.json({
      tasks,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!validateTaskRecord(body)) {
      return NextResponse.json(
        { error: 'Invalid task data' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<TaskRecord>(COLLECTIONS.TASKS);

    // Check if task with same ID already exists
    const existingTask = await collection.findOne({ id: body.id });
    if (existingTask) {
      return NextResponse.json(
        { error: 'Task with this ID already exists' },
        { status: 409 }
      );
    }

    const newTask: TaskRecord = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newTask);
    const createdTask = await collection.findOne({ _id: result.insertedId });

    return NextResponse.json(createdTask, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks - Bulk update or create tasks
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!Array.isArray(body.tasks)) {
      return NextResponse.json(
        { error: 'Expected tasks array' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<TaskRecord>(COLLECTIONS.TASKS);

    const bulkOps = body.tasks.map((task: any) => {
      if (!validateTaskRecord(task)) {
        throw new Error(`Invalid task data for task ID: ${task.id}`);
      }

      return {
        updateOne: {
          filter: { id: task.id },
          update: {
            $set: {
              ...task,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            }
          },
          upsert: true
        }
      };
    });

    const result = await collection.bulkWrite(bulkOps);

    return NextResponse.json({
      message: 'Bulk operation completed',
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
    });
  } catch (error) {
    console.error('Error bulk updating tasks:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update tasks' },
      { status: 500 }
    );
  }
}
