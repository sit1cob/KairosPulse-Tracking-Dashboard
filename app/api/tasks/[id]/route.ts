import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { TaskRecord, validateTaskRecord, COLLECTIONS } from '@/lib/models';
import { ObjectId } from 'mongodb';

// GET /api/tasks/[id] - Get a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const db = await getDatabase();
    const collection = db.collection<TaskRecord>(COLLECTIONS.TASKS);

    // Try to find by MongoDB _id first, then by custom id field
    let task;
    if (ObjectId.isValid(id)) {
      task = await collection.findOne({ _id: new ObjectId(id) });
    }
    
    if (!task) {
      task = await collection.findOne({ id: id });
    }

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Update a specific task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!validateTaskRecord(body)) {
      return NextResponse.json(
        { error: 'Invalid task data' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<TaskRecord>(COLLECTIONS.TASKS);

    // Build filter for finding the task
    let filter: any;
    if (ObjectId.isValid(id)) {
      filter = { _id: new ObjectId(id) };
    } else {
      filter = { id: id };
    }

    const updateData = {
      ...body,
      updatedAt: new Date(),
    };

    const result = await collection.findOneAndUpdate(
      filter,
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a specific task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const db = await getDatabase();
    const collection = db.collection<TaskRecord>(COLLECTIONS.TASKS);

    // Build filter for finding the task
    let filter: any;
    if (ObjectId.isValid(id)) {
      filter = { _id: new ObjectId(id) };
    } else {
      filter = { id: id };
    }

    const result = await collection.findOneAndDelete(filter);

    if (!result) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id] - Partially update a task (e.g., just status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const db = await getDatabase();
    const collection = db.collection<TaskRecord>(COLLECTIONS.TASKS);

    // Build filter for finding the task
    let filter: any;
    if (ObjectId.isValid(id)) {
      filter = { _id: new ObjectId(id) };
    } else {
      filter = { id: id };
    }

    // Build update object - only include provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Handle specific field updates
    if (body.latestStatus) {
      updateData.latestStatus = body.latestStatus;
    }
    if (body.todayStatus) {
      updateData.todayStatus = body.todayStatus;
    }
    if (body.statuses) {
      updateData.statuses = body.statuses;
    }
    if (body.automationStatus) {
      updateData.automationStatus = body.automationStatus;
    }
    if (body.remarks) {
      updateData.remarks = body.remarks;
    }

    const result = await collection.findOneAndUpdate(
      filter,
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error patching task:', error);
    return NextResponse.json(
      { error: 'Failed to patch task' },
      { status: 500 }
    );
  }
}
