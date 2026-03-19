import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, getQueuePosition, estimateWaitSeconds } from '@/lib/reportQueue';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('report_queue')
      .select('id, status, progress, report_url, error_message, created_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    const response: {
      status: string;
      progress: number;
      reportUrl?: string;
      position?: number;
      estimatedSec?: number;
      errorMessage?: string;
    } = {
      status: data.status,
      progress: data.progress ?? 0,
    };

    if (data.report_url) {
      response.reportUrl = data.report_url;
    }

    if (data.error_message) {
      response.errorMessage = data.error_message;
    }

    // waiting 상태일 때만 position, estimatedSec 포함
    if (data.status === 'waiting') {
      const position = await getQueuePosition(id);
      const estimatedSec = await estimateWaitSeconds(position);
      response.position = position;
      response.estimatedSec = estimatedSec;
    }

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('[status] error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
