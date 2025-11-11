# MongoDB Setup Guide for KairosPulse Tracking Dashboard

## Prerequisites

1. **MongoDB Installation**
   - Local MongoDB: Install MongoDB Community Edition
   - MongoDB Atlas: Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)

2. **Environment Configuration**
   - Create `.env.local` file in project root
   - Add your MongoDB connection string

## Quick Setup

### 1. Configure Environment

Create `.env.local` file:

```bash
# For local MongoDB
MONGODB_URI=mongodb://localhost:27017

# For MongoDB Atlas (replace with your credentials)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Initialize Database

Run the complete setup:

```bash
npm run db-init
```

Or run individual steps:

```bash
# Test connection
node scripts/test-connection.js

# Setup collections and sample data
npm run setup-db

# Migrate existing statusOverrides.json
npm run migrate-overrides
```

## Database Structure

### Collections

1. **`tasks`** - Main task records
2. **`dashboard_collections`** - Grouped task collections
3. **`status_overrides`** - Manual status overrides

### Sample Data Included

The setup script creates:
- 4 sample tasks (2 foundational, 2 koyfinScripts)
- 2 dashboard collections
- Sample status entries and overrides
- Proper indexes for performance

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run db-init` | Complete database initialization |
| `npm run setup-db` | Create collections and sample data |
| `npm run migrate-overrides` | Migrate statusOverrides.json to MongoDB |
| `node scripts/test-connection.js` | Test MongoDB connection |

## API Endpoints

Once setup is complete, these endpoints will be available:

### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/[id]` - Get specific task
- `PUT /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task
- `POST /api/tasks/[id]/status` - Add status entry

### Collections
- `GET /api/collections` - List dashboard collections
- `POST /api/collections` - Create new collection

## Example Usage

### Create a Task via API

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-custom-task",
    "notebook": "My Custom Notebook",
    "bucket": "Custom Bucket",
    "automationStatus": "Automated",
    "schedule": "Daily",
    "estimatedRunTime": "15 minutes",
    "days": "Monday to Friday",
    "poc": "My Team",
    "statuses": [],
    "latestStatus": null,
    "todayStatus": null,
    "sheetKey": "foundational"
  }'
```

### Add Status Update

```bash
curl -X POST http://localhost:3000/api/tasks/my-custom-task/status \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Nov 11",
    "status": "Pass",
    "remarks": "Executed successfully"
  }'
```

### Query Tasks

```bash
# Get all foundational tasks
curl "http://localhost:3000/api/tasks?sheetKey=foundational"

# Get tasks by POC
curl "http://localhost:3000/api/tasks?poc=Data Team"

# Get tasks with specific status
curl "http://localhost:3000/api/tasks?status=Pass"
```

## Troubleshooting

### Connection Issues

1. **Local MongoDB not running**
   ```bash
   # Start MongoDB service
   sudo systemctl start mongod  # Linux
   brew services start mongodb-community  # macOS
   ```

2. **Atlas connection issues**
   - Check network access settings
   - Verify username/password
   - Ensure IP is whitelisted

3. **Environment variables**
   ```bash
   # Check if .env.local is loaded
   echo $MONGODB_URI
   ```

### Common Errors

- **ECONNREFUSED**: MongoDB server not running
- **Authentication failed**: Wrong credentials in connection string
- **Network timeout**: Firewall or network connectivity issues

### Reset Database

To start fresh:

```bash
# Connect to MongoDB shell
mongosh "mongodb://localhost:27017"

# Drop database
use KairosPulse-Tracking
db.dropDatabase()

# Re-run setup
npm run db-init
```

## Data Migration

The migration script (`migrate-status-overrides.js`) will:
1. Read your existing `data/statusOverrides.json`
2. Convert entries to MongoDB documents
3. Update corresponding tasks with status information
4. Preserve all timestamps and metadata

## Performance Optimization

The setup includes these indexes:
- `tasks.id` (unique)
- `tasks.sheetKey`
- `tasks.poc`
- `tasks.latestStatus.status`
- `tasks.updatedAt`
- `dashboard_collections.name` (unique)
- `status_overrides.taskId`

## Backup and Restore

### Backup
```bash
mongodump --db KairosPulse-Tracking --out backup/
```

### Restore
```bash
mongorestore --db KairosPulse-Tracking backup/KairosPulse-Tracking/
```

## Next Steps

1. Run the setup scripts
2. Test the API endpoints
3. Integrate with your existing dashboard
4. Set up regular backups
5. Monitor performance and optimize queries as needed
