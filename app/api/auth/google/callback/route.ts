import { NextResponse } from 'next/server';
import { getTokensFromCode, saveTokens } from '@/lib/google-calendar';
import { createClient } from '@/lib/supabase-server';

/**
 * Ideal implementation for Next.js 15 App Router.
 * Uses @supabase/ssr to handle cookies and session correctly in server context.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // 1. Check for the auth code
  if (!code) {
    return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
  }

  try {
    // 2. Exchange authorization code for Google tokens
    const tokens = await getTokensFromCode(code);
    
    // 3. Initialize the server-side Supabase client (handles cookies/session)
    const supabase = await createClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // 4. Securely get the user session from cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Supabase auth error in callback:', authError);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // 5. Store Google tokens linked to the authenticated user ID
    // We pass user.id to ensure the tokens are saved for the correct person
    await saveTokens(user.id, tokens);

    // 6. Return response to allow the popup to close and refresh the app state
    return new NextResponse(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Autenticação Google</title>
      </head>
      <body style="font-family: -apple-system, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f0f2f5;">
        <script>
          // Send message to the main window and close this popup
          if (window.opener) {
            window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, window.location.origin);
            setTimeout(() => window.close(), 1000);
          } else {
            window.location.href = '/';
          }
        </script>
        <div style="text-align: center; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <div style="color: #10b981; font-size: 48px; margin-bottom: 16px;">✓</div>
          <h2 style="margin: 0 0 8px; color: #111827;">Conectado com sucesso!</h2>
          <p style="margin: 0; color: #6b7280;">Sua conta Google foi vinculada ao CRM.</p>
          <p style="margin-top: 16px; font-size: 14px; color: #9ca3af;">Esta janela fechará automaticamente...</p>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Fatal error in Google OAuth callback:', error);
    return NextResponse.json({ 
      error: 'Failed to process Google OAuth callback',
      details: error instanceof Error ? error.message : 'Unknown technical error'
    }, { status: 500 });
  }
}
