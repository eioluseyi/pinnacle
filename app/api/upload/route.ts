import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const bucketDir = path.join(process.cwd(), 'public', 'bucket');

    // Ensure bucket exists
    await fs.mkdir(bucketDir, { recursive: true });

    // Generate a unique filename
    const extension = path.extname(file.name);
    const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;

    const filepath = path.join(bucketDir, filename);

    // Save file
    await fs.writeFile(filepath, buffer);

    // URL to access the file (assuming bucket is publicly served)
    const url = `/bucket/${filename}`;

    return NextResponse.json({
      success: true,
      url,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
      },
      {
        status: 500,
      },
    );
  }
}
