import { NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/google-calendar';

export async function GET() {
  try {
    const url = getGoogleAuthUrl();
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating Google Auth URL:', error);
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
}
