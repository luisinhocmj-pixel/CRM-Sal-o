import { NextResponse } from 'next/server';
import { createCalendarEvent } from '@/lib/google-calendar';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { appointment } = await request.json();
    
    // Initializing the server-side Supabase client for safe cookie handling
    const supabase = await createClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error creating calendar event:', authError);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Pass the user.id to the utility to perform the calendar insertion
    const event = await createCalendarEvent(user.id, appointment);
    
    return NextResponse.json({ 
      success: !!event, 
      event,
      info: !event ? 'Could not create event. Check Google connection.' : undefined
    });
  } catch (error) {
    console.error('Critical error in calendar event API:', error);
    return NextResponse.json({ 
      error: 'Internal server error during event creation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
