import { NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image, folder } = body;

    if (!image) {
      return NextResponse.json({ error: 'لم يتم إرسال صورة للرفع' }, { status: 400 });
    }

    const uploadedUrl = await uploadToCloudinary(image, folder || 'ruaad_smart');

    return NextResponse.json({
      success: true,
      url: uploadedUrl
    });
  } catch (error: any) {
    console.error('Error in /api/upload:', error);
    return NextResponse.json({ error: error.message || 'فشل رفع الصورة إلى Cloudinary' }, { status: 500 });
  }
}
