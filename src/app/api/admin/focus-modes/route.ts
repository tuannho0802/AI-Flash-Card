import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

async function checkAdmin(supabase: any) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized', status: 401 };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const adminEmail = process.env.ADMIN_EMAIL;
    if (profile?.role !== 'admin' || user.email !== adminEmail) {
        return { error: 'Forbidden. Admin access required.', status: 403 };
    }
    return { user };
}

export async function GET() {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('focus_modes')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const adminCheck = await checkAdmin(supabase);
        if ('error' in adminCheck) {
            return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
        }

        const body = await request.json();
        const { title, icon_name, youtube_id, order_index, is_active } = body;

        const { data, error } = await supabase
            .from('focus_modes')
            .insert([{ title, icon_name, youtube_id, order_index, is_active }])
            .select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createClient();
        const adminCheck = await checkAdmin(supabase);
        if ('error' in adminCheck) {
            return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
        }

        const body = await request.json();
        const { id, title, icon_name, youtube_id, order_index, is_active } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const { data, error } = await supabase
            .from('focus_modes')
            .update({ title, icon_name, youtube_id, order_index, is_active })
            .eq('id', id)
            .select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const adminCheck = await checkAdmin(supabase);
        if ('error' in adminCheck) {
            return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const { error } = await supabase
            .from('focus_modes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
