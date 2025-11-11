# KairosPulse Tracking Dashboard - REST API Documentation

## Database Configuration
- **Database Name**: `KairosPulse-Tracking`
- **Collections**: 
  - `tasks` - Individual task records
  - `dashboard_collections` - Groups of tasks
  - `status_overrides` - Status override data

## Environment Setup

Create a `.env.local` file in your project root with:

```bash
# For local MongoDB
MONGODB_URI=mongodb://localhost:27017/KairosPulse-Tracking

# For MongoDB Atlas (cloud)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/KairosPulse-Tracking
```

## API Endpoints

### Tasks API

#### GET /api/tasks
Get all tasks with optional filtering and pagination.

**Query Parameters:**
- `sheetKey` - Filter by sheet type (`foundational` or `koyfinScripts`)
- `poc` - Filter by Point of Contact (partial match)
- `status` - Filter by status (partial match)
- `limit` - Number of results (default: 100)
- `skip` - Number of results to skip (default: 0)

**Example:**
```bash
curl "http://localhost:3000/api/tasks?sheetKey=foundational&limit=10"
```

#### POST /api/tasks
Create a new task.

**Request Body:**
```json
{
  "id": "unique-task-id",
  "notebook": "Task Notebook Name",
  "bucket": "Task Bucket",
  "automationStatus": "Automated",
  "schedule": "Daily",
  "estimatedRunTime": "30 mins",
  "days": "Mon-Fri",
  "poc": "John Doe",
  "statuses": [],
  "latestStatus": null,
  "todayStatus": null,
  "sheetKey": "foundational"
}
```

#### PUT /api/tasks
Bulk update or create multiple tasks.

**Request Body:**
```json
{
  "tasks": [
    {
      "id": "task-1",
      "notebook": "Updated Notebook",
      // ... other task fields
    }
  ]
}
```

#### GET /api/tasks/[id]
Get a specific task by ID (MongoDB _id or custom id field).

#### PUT /api/tasks/[id]
Update a specific task completely.

#### PATCH /api/tasks/[id]
Partially update a task (only provided fields).

**Example:**
```json
{
  "latestStatus": {
    "label": "2024-11-11",
    "status": "Completed",
    "remarks": "Task finished successfully"
  }
}
```

#### DELETE /api/tasks/[id]
Delete a specific task.

### Status Updates API

#### POST /api/tasks/[id]/status
Add a new status entry to a task.

**Request Body:**
```json
{
  "label": "2024-11-11",
  "status": "In Progress",
  "remarks": "Working on implementation"
}
```

#### PUT /api/tasks/[id]/status
Update the latest status of a task.

### Collections API

#### GET /api/collections
Get all dashboard collections.

#### POST /api/collections
Create a new dashboard collection.

**Request Body:**
```json
{
  "name": "My Dashboard Collection",
  "description": "Collection of related tasks",
  "tasks": []
}
```

## Example Usage

### 1. Create a New Task
```javascript
const response = await fetch('/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    id: 'data-pipeline-1',
    notebook: 'Daily Data Pipeline',
    bucket: 'ETL',
    automationStatus: 'Automated',
    schedule: 'Daily at 6 AM',
    estimatedRunTime: '45 minutes',
    days: 'Monday to Friday',
    poc: 'Data Team',
    statuses: [],
    latestStatus: null,
    todayStatus: null,
    sheetKey: 'foundational'
  })
});

const newTask = await response.json();
console.log('Created task:', newTask);
```

### 2. Update Task Status
```javascript
const response = await fetch('/api/tasks/data-pipeline-1/status', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    label: new Date().toISOString().split('T')[0],
    status: 'Completed',
    remarks: 'Pipeline executed successfully'
  })
});

const result = await response.json();
console.log('Status updated:', result);
```

### 3. Get Tasks with Filtering
```javascript
const response = await fetch('/api/tasks?sheetKey=foundational&poc=Data Team');
const data = await response.json();
console.log('Filtered tasks:', data.tasks);
console.log('Pagination:', data.pagination);
```

### 4. Bulk Update Tasks
```javascript
const response = await fetch('/api/tasks', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tasks: [
      {
        id: 'task-1',
        notebook: 'Updated Notebook 1',
        // ... other fields
      },
      {
        id: 'task-2',
        notebook: 'Updated Notebook 2',
        // ... other fields
      }
    ]
  })
});

const result = await response.json();
console.log('Bulk update result:', result);
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

Error responses include a descriptive message:
```json
{
  "error": "Task not found"
}
```

## Data Validation

The API validates all incoming data according to the defined schemas:
- Task records must include all required fields
- Status entries must have `label`, `status`, and `remarks`
- Sheet keys must be either `foundational` or `koyfinScripts`
