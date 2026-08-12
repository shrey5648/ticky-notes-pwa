import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // Check size limit: max 2MB
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 2MB limit.' }, { status: 400 });
    }

    // Check mime type to ensure it is an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Uploaded file is not a valid image.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Save to public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Standardize naming using time + random string to avoid name collision
    const ext = file.type.split('/')[1] || 'png';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('[Upload API Error]:', err);
    return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 });
  }
}
