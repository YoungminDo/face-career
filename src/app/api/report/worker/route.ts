import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, updateQueueStatus } from '@/lib/reportQueue';

export const maxDuration = 60;

// @sparticuz/chromium-min v143 용 바이너리 URL
const CHROMIUM_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar';

export async function POST(req: NextRequest) {
  let queueId: string | undefined;

  try {
    const body = await req.json();
    queueId = body.queueId;
    if (!queueId) return NextResponse.json({ error: 'queueId is required' }, { status: 400 });

    const supabase = getAdminClient();

    // 큐 항목 조회
    const { data: queueItem, error: fetchError } = await supabase
      .from('report_queue')
      .select('id, diagnosis_data, status')
      .eq('id', queueId)
      .single();

    if (fetchError || !queueItem) return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    if (queueItem.status === 'processing' || queueItem.status === 'completed') {
      return NextResponse.json({ message: 'Already processing or completed' });
    }

    await updateQueueStatus(queueId, { status: 'processing', started_at: new Date().toISOString(), progress: 10 });

    // ── Puppeteer ──────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const chromium = require('@sparticuz/chromium-min');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const puppeteer = require('puppeteer-core');

    const executablePath = process.env.CHROMIUM_PATH || await chromium.executablePath(CHROMIUM_URL);

    const browser = await puppeteer.launch({
      executablePath,
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      headless: chromium.headless ?? true,
      defaultViewport: { width: 1240, height: 1754 },
    });

    await updateQueueStatus(queueId, { progress: 25 });

    const page = await browser.newPage();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://face.da-sh.io';

    // 1) 도메인 방문 → localStorage 설정 가능 상태
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // 2) 진단 데이터 localStorage에 주입
    await page.evaluate((data: any) => {
      localStorage.setItem('face_diagnosis', JSON.stringify(data));
    }, queueItem.diagnosis_data);

    await updateQueueStatus(queueId, { progress: 40 });

    // 3) print 모드로 리포트 페이지 이동 → __reportReady + __reportHtml 세팅 대기
    await page.goto(`${appUrl}/report?print=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await updateQueueStatus(queueId, { progress: 60 });

    // 4) 준비 신호 대기 (최대 40초) — document.write() 제거, window 변수로 통신
    await page.waitForFunction('window.__reportReady === true', { timeout: 40000 });

    await updateQueueStatus(queueId, { progress: 75 });

    // 5) HTML 추출 후 page.setContent()로 깨끗하게 로드 (context 파괴 없음)
    const reportHtml = await page.evaluate(() => (window as any).__reportHtml as string);
    await page.setContent(reportHtml, { waitUntil: 'networkidle0', timeout: 20000 });

    await updateQueueStatus(queueId, { progress: 85 });

    // 6) PDF 생성
    const pdfData = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      scale: 0.95,
    });

    await browser.close();
    // ── Puppeteer 끝 ───────────────────────────────────────────

    await updateQueueStatus(queueId, { progress: 90 });

    // Storage 업로드
    const storagePath = `reports/${queueId}.pdf`;
    const pdfBuffer = Buffer.from(pdfData);

    const { error: uploadError } = await supabase.storage
      .from('report-files')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });

    if (uploadError) throw new Error('Storage 업로드 실패: ' + uploadError.message);

    // Signed URL (30일 유효)
    const { data: signedData, error: signErr } = await supabase.storage
      .from('report-files')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 30);

    if (signErr || !signedData?.signedUrl) throw new Error('URL 생성 실패');

    await updateQueueStatus(queueId, {
      status: 'completed',
      report_url: signedData.signedUrl,
      completed_at: new Date().toISOString(),
      progress: 100,
    });

    return NextResponse.json({ success: true, reportUrl: signedData.signedUrl });

  } catch (err: any) {
    console.error('[worker] error:', err);
    if (queueId) {
      await updateQueueStatus(queueId, {
        status: 'failed',
        error_message: err?.message || 'Unknown error',
      }).catch(() => {});
    }
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
