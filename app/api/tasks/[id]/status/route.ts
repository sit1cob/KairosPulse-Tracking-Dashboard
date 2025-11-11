import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { TaskRecord, StatusEntry, validateStatusEntry, COLLECTIONS } from '@/lib/models';
import { ObjectId } from 'mongodb';

// POST /api/tasks/[id]/status - Add a new status entry to a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!validateStatusEntry(body)) {
      return NextResponse.json(
        { error: 'Invalid status entry data' },
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

    const newStatus: StatusEntry = {
      ...body,
      timestamp: new Date(),
    };

    // Add the new status to the statuses array and update latest/today status
    const today = new Date().toDateString();
    const isToday = newStatus.timestamp && newStatus.timestamp.toDateString() === today;

    const updateData: any = {
      $push: { statuses: newStatus },
      $set: {
        latestStatus: newStatus,
        updatedAt: new Date(),
      }
    };

    // Update today's status if this is from today
    if (isToday) {
      updateData.$set.todayStatus = newStatus;
    }

    const result = await collection.findOneAndUpdate(
      filter,
      updateData,
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Status added successfully',
      task: result,
      addedStatus: newStatus
    });
  } catch (error) {
    console.error('Error adding status:', error);
    return NextResponse.json(
      { error: 'Failed to add status' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id]/status - Update the latest status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!validateStatusEntry(body)) {
      return NextResponse.json(
        { error: 'Invalid status entry data' },
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

    const updatedStatus: StatusEntry = {
      ...body,
      timestamp: new Date(),
    };

    const today = new Date().toDateString();
    const isToday = updatedStatus.timestamp && updatedStatus.timestamp.toDateString() === today;

    const updateData: any = {
      $set: {
        latestStatus: updatedStatus,
        updatedAt: new Date(),
      }
    };

    // Update today's status if this is from today
    if (isToday) {
      updateData.$set.todayStatus = updatedStatus;
    }

    const result = await collection.findOneAndUpdate(
      filter,
      updateData,
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Status updated successfully',
      task: result,
      updatedStatus: updatedStatus
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}
