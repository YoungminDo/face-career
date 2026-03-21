import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, updateQueueStatus } from '@/lib/reportQueue';
import { computeAll, replaceTemplate } from '@/lib/reportEngine';

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
    if (queueItem.status === 'processing') {
      return NextResponse.json({ message: 'Already processing' });
    }
    if (queueItem.status === 'completed' && !body.force) {
      return NextResponse.json({ message: 'Already completed. Pass force:true to regenerate.' });
    }

    // 1) 서버사이드 HTML 생성 (Puppeteer 불필요)
    const diagData = queueItem.diagnosis_data;
    if (!diagData || typeof diagData !== 'object') {
      throw new Error('diagnosis_data 없음 또는 형식 오류');
    }

    await updateQueueStatus(queueId, { status: 'processing', started_at: new Date().toISOString(), progress: 10 });

    const r = computeAll(diagData);
    if (!r) throw new Error('computeAll 실패: 진단 데이터 형식 오류');

    await updateQueueStatus(queueId, { progress: 25 });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');

    const templateHtml = fs.readFileSync(
      path.join(process.cwd(), 'public/report-template.html'),
      'utf-8'
    );

    // 폰트를 CDN 없이 base64로 임베드 → 환경 무관하게 항상 동일 렌더링
    const fontPath = path.join(process.cwd(), 'public/fonts/PretendardVariable.woff2');
    const fontBase64 = fs.readFileSync(fontPath).toString('base64');
    const fontFaceStyle = `<style>
@font-face {
  font-family: 'Pretendard';
  src: url('data:font/woff2;base64,${fontBase64}') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}
</style>`;

    const finalHtml = replaceTemplate(templateHtml, r)
      .replace('</head>', fontFaceStyle + '</head>');

    await updateQueueStatus(queueId, { progress: 40 });

    // ── Puppeteer: setContent → PDF (navigate 없음) ──────────────
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const chromium = require('@sparticuz/chromium-min');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const puppeteer = require('puppeteer-core');

    const executablePath = process.env.CHROMIUM_PATH || await chromium.executablePath(CHROMIUM_URL);
    console.log('[worker] chromium path:', executablePath, '| exists:', fs.existsSync(executablePath));

    if (!process.env.CHROMIUM_PATH && fs.existsSync(executablePath)) {
      try { fs.chmodSync(executablePath, 0o755); } catch {}
    }

    let browser: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        browser = await puppeteer.launch({
          executablePath,
          args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
          headless: chromium.headless ?? true,
          defaultViewport: { width: 794, height: 1123 },
        });
        break;
      } catch (e: any) {
        console.warn(`[worker] launch attempt ${attempt} failed:`, e.message);
        if (attempt < 3 && (e.message?.includes('ETXTBSY') || e.message?.includes('ENOENT'))) {
          await new Promise(res => setTimeout(res, 2000 * attempt));
        } else {
          throw e;
        }
      }
    }

    await updateQueueStatus(queueId, { progress: 60 });

    const page = await browser.newPage();
    page.on('console', (msg: any) => console.log('[page]', msg.type(), msg.text()));
    page.on('pageerror', (err: any) => console.error('[page error]', err.message));

    // 페이지 navigate 없이 바로 HTML 주입 → waitForFunction 불필요
    await page.setContent(finalHtml, { waitUntil: 'networkidle0', timeout: 20000 });

    await updateQueueStatus(queueId, { progress: 80 });

    // PDF 생성
    const pdfData = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: true,
      scale: 1.0,
    });

    await browser.close();
    // ── Puppeteer 끝 ─────────────────────────────────────────────

    await updateQueueStatus(queueId, { progress: 90 });

    // Storage 업로드
    const storagePath = `reports/${queueId}.pdf`;
    const pdfBuffer = Buffer.from(pdfData);

    const { error: uploadError } = await supabase.storage
      .from('report_files')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });

    if (uploadError) throw new Error('Storage 업로드 실패: ' + uploadError.message);

    // 파일명 생성: FACE 프리미엄 리포트_학교_이름_유형_날짜
    const pdfName = (() => {
      const name = diagData.userName || '회원';
      const school = diagData.school || '';
      const typeCode = diagData.focusResult?.primary
        ? (diagData.focusResult.primary + (diagData.focusResult.secondary || ''))
        : '';
      const date = (diagData.completedAt || new Date().toISOString()).slice(0, 10).replace(/-/g, '');
      return ['FACE 프리미엄 리포트', school, name, typeCode, date].filter(Boolean).join('_') + '.pdf';
    })();

    // Signed URL (30일 유효, 다운로드 파일명 지정)
    const { data: signedData, error: signErr } = await supabase.storage
      .from('report_files')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 30, { download: pdfName });

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
