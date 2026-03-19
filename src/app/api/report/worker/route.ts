import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, updateQueueStatus } from '@/lib/reportQueue';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let queueId: string | undefined;

  try {
    const body = await req.json();
    queueId = body.queueId;

    if (!queueId) {
      return NextResponse.json({ error: 'queueId is required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 큐 항목에서 diagnosis_data 조회
    const { data: queueItem, error: fetchError } = await supabase
      .from('report_queue')
      .select('id, diagnosis_data, status')
      .eq('id', queueId)
      .single();

    if (fetchError || !queueItem) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    // 이미 처리 중이거나 완료된 경우 스킵
    if (queueItem.status === 'processing' || queueItem.status === 'completed') {
      return NextResponse.json({ message: 'Already processing or completed' });
    }

    const diagnosisData = queueItem.diagnosis_data;

    // status → 'processing', started_at 업데이트
    await updateQueueStatus(queueId, {
      status: 'processing',
      started_at: new Date().toISOString(),
      progress: 10,
    });

    // HTML 생성
    // TODO: import { computeAll, replaceTemplate } from '@/lib/reportTemplate';
    // const r = computeAll(diagnosisData);
    // const html = replaceTemplate(templateHtml, r);
    const html = `<html><body style="font-family:sans-serif;padding:40px;background:#0F172A;color:white;">
      <h1 style="color:#22C55E;">FACE Career Report</h1>
      <p>Queue ID: ${queueId}</p>
      <pre style="background:#1E293B;padding:20px;border-radius:8px;overflow:auto;font-size:12px;">${JSON.stringify(diagnosisData, null, 2)}</pre>
    </body></html>`;

    await updateQueueStatus(queueId, { progress: 30 });

    // Puppeteer로 PDF 생성
    let pdfBuffer: Buffer;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const chromium = require('@sparticuz/chromium-min');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const puppeteer = require('puppeteer-core');

      const executablePath = await chromium.executablePath();

      const browser = await puppeteer.launch({
        executablePath,
        args: chromium.args,
        headless: chromium.headless,
        defaultViewport: { width: 1240, height: 1754 },
      });

      await updateQueueStatus(queueId, { progress: 50 });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      await updateQueueStatus(queueId, { progress: 70 });

      const pdfData = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      await browser.close();

      pdfBuffer = Buffer.from(pdfData);
    } catch (puppeteerErr: any) {
      console.error('[worker] puppeteer error:', puppeteerErr);
      throw new Error('PDF 생성 실패: ' + (puppeteerErr?.message || 'Unknown puppeteer error'));
    }

    await updateQueueStatus(queueId, { progress: 85 });

    // Supabase Storage에 업로드
    const storagePath = `reports/${queueId}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('report-files')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error('Storage 업로드 실패: ' + uploadError.message);
    }

    await updateQueueStatus(queueId, { progress: 95 });

    // 공개 URL 생성
    const { data: publicUrlData } = supabase.storage
      .from('report-files')
      .getPublicUrl(storagePath);

    const reportUrl = publicUrlData?.publicUrl;

    if (!reportUrl) {
      throw new Error('Public URL 생성 실패');
    }

    // 완료 업데이트
    await updateQueueStatus(queueId, {
      status: 'completed',
      report_url: reportUrl,
      completed_at: new Date().toISOString(),
      progress: 100,
    });

    return NextResponse.json({ success: true, reportUrl });
  } catch (err: any) {
    console.error('[worker] error:', err);

    if (queueId) {
      await updateQueueStatus(queueId, {
        status: 'failed',
        error_message: err?.message || 'Unknown error',
      }).catch((updateErr) => {
        console.error('[worker] failed to update error status:', updateErr);
      });
    }

    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
