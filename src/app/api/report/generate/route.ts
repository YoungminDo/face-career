import { NextRequest, NextResponse } from 'next/server';
import { createQueueItem, getQueuePosition, estimateWaitSeconds } from '@/lib/reportQueue';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { diagnosisData, userId } = body;

    if (!diagnosisData) {
      return NextResponse.json({ error: 'diagnosisData is required' }, { status: 400 });
    }

    // 큐에 항목 추가
    const queueId = await createQueueItem(diagnosisData, userId);

    // 현재 위치 + 예상 대기시간 계산
    const position = await getQueuePosition(queueId);
    const estimatedSec = await estimateWaitSeconds(position);

    // 백그라운드에서 worker 호출 (non-blocking)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    fetch(`${appUrl}/api/report/worker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queueId }),
    }).catch((err) => {
      console.error('[generate] worker trigger failed:', err);
    });

    return NextResponse.json({ queueId, position, estimatedSec });
  } catch (err: any) {
    console.error('[generate] error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
