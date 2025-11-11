import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const EXCEL_FILE_NAME = 'Koyfin Dashboard and PA nbs Execution Details_Latest 1 - SriniK.xlsx';
const EXCEL_DIR = path.join(process.cwd(), 'src', 'components');
const EXCEL_FILE_PATH = path.join(EXCEL_DIR, EXCEL_FILE_NAME);

// POST /api/upload-excel - Upload and replace Excel file
export async function POST(request: NextRequest) {
  try {
    console.log('Excel upload request received');
    console.log('Target file path:', EXCEL_FILE_PATH);

    // Get the uploaded file from form data
    const formData = await request.formData();
    const file = formData.get('excel') as File;

    if (!file) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No file uploaded',
          message: 'Please provide an Excel file in the "excel" field'
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid file type',
          message: 'Please upload a valid Excel file (.xlsx or .xls)',
          receivedType: file.type
        },
        { status: 400 }
      );
    }

    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Ensure the directory exists
    if (!existsSync(EXCEL_DIR)) {
      await mkdir(EXCEL_DIR, { recursive: true });
      console.log('Created directory:', EXCEL_DIR);
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Write the file with the fixed name (always replaces existing)
    await writeFile(EXCEL_FILE_PATH, buffer);

    console.log('Excel file successfully replaced:', EXCEL_FILE_PATH);
    console.log('File size written:', buffer.length, 'bytes');

    return NextResponse.json({
      success: true,
      message: 'Excel file uploaded and replaced successfully',
      fileInfo: {
        originalName: file.name,
        savedAs: EXCEL_FILE_NAME,
        path: EXCEL_FILE_PATH,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error uploading Excel file:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to upload Excel file',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/upload-excel - Get current Excel file info
export async function GET(request: NextRequest) {
  try {
    const fileExists = existsSync(EXCEL_FILE_PATH);
    
    if (!fileExists) {
      return NextResponse.json({
        success: true,
        exists: false,
        message: 'Excel file does not exist',
        expectedPath: EXCEL_FILE_PATH
      });
    }

    // Get file stats
    const fs = await import('fs/promises');
    const stats = await fs.stat(EXCEL_FILE_PATH);

    return NextResponse.json({
      success: true,
      exists: true,
      fileInfo: {
        name: EXCEL_FILE_NAME,
        path: EXCEL_FILE_PATH,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting Excel file info:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get Excel file info',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
