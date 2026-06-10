import { NextResponse } from 'next/server';
import { listCachedImages } from '@/lib/utils/imageCache';

export async function GET() {
  try {
    const images = listCachedImages();
    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json({ images: [] });
  }
}
