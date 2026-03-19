import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function getAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey);
}

/** 현재 waiting 순서 */
export async function getQueuePosition(queueId: string): Promise<number> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('report_queue')
    .select('id, created_at')
    .eq('status', 'waiting')
    .order('created_at', { ascending: true });

  if (!data) return 1;
  const idx = data.findIndex((r) => r.id === queueId);
  return idx === -1 ? 1 : idx + 1;
}

/** 최근 10건 완료 기록 기반 평균 처리시간(초) */
export async function getAvgProcessingSeconds(): Promise<number> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('report_queue')
    .select('started_at, completed_at')
    .eq('status', 'completed')
    .not('started_at', 'is', null)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(10);

  if (!data || data.length === 0) return 30; // 기본 30초

  const times = data.map((r) => {
    const s = new Date(r.started_at!).getTime();
    const e = new Date(r.completed_at!).getTime();
    return (e - s) / 1000;
  });
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
}

/** 예상 대기시간(초) = 평균처리시간 × (현재순서 - 1 + 처리중건수×0.5) */
export async function estimateWaitSeconds(position: number): Promise<number> {
  const supabase = getAdminClient();
  const { count: processingCount } = await supabase
    .from('report_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'processing');

  const avg = await getAvgProcessingSeconds();
  const ahead = (position - 1) + ((processingCount || 0) * 0.5);
  return Math.max(0, Math.round(ahead * avg));
}

/** 큐 항목 생성 */
export async function createQueueItem(diagnosisData: any, userId?: string): Promise<string> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('report_queue')
    .insert({ diagnosis_data: diagnosisData, user_id: userId || null, status: 'waiting' })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to create queue item');
  return data.id;
}

/** 큐 상태 업데이트 */
export async function updateQueueStatus(
  id: string,
  update: Partial<{
    status: string;
    progress: number;
    report_url: string;
    error_message: string;
    started_at: string;
    completed_at: string;
  }>
) {
  const supabase = getAdminClient();
  await supabase.from('report_queue').update(update).eq('id', id);
}
