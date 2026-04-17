import { NextResponse } from 'next/server';
import { createCalendarEvent } from '@/lib/google-calendar';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { appointment } = await request.json();
    
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const event = await createCalendarEvent(user.id, appointment);
    
    return NextResponse.json({ success: !!event, event });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 });
  }
}
