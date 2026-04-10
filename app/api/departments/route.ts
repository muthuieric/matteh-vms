import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // 1. Check for keys INSIDE the handler
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase URL or Service Role Key");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 2. Initialize the admin client safely
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const body = await request.json();
    const { company_id, name } = body;

    if (!company_id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('departments')
      .insert([{ company_id, name }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ADD THIS NEW GET FUNCTION
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get('company_id');

    if (!company_id) {
      return NextResponse.json({ error: 'Missing company_id' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabaseAdmin.from('departments').select('*').eq('company_id', company_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}