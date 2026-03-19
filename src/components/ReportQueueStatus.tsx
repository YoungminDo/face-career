'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  queueId: string;
  onComplete: (reportUrl: string) => void;
  onError: () => void;
}

interface StatusResponse {
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  progress: number;
  reportUrl?: string;
  position?: number;
  estimatedSec?: number;
  errorMessage?: string;
}

const POLL_INTERVAL_MS = 3000;

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{
      width: '100%', height: 8, background: 'rgba(255,255,255,0.1)',
      borderRadius: 4, overflow: 'hidden', margin: '12px 0',
    }}>
      <div style={{
        height: '100%',
        width: `${Math.min(100, Math.max(0, value))}%`,
        background: 'linear-gradient(90deg, #22C55E, #86EFAC)',
        borderRadius: 4,
        transition: 'width 0.6s ease',
      }} />
    </div>
  );
}

function SpinnerIcon() {
  return (
    <div style={{
      width: 64, height: 64, borderRadius: 32,
      border: '4px solid rgba(34,197,94,0.2)',
      borderTop: '4px solid #22C55E',
      animation: 'spin 1s linear infinite',
      margin: '0 auto 20px',
    }} />
  );
}

function PulseIcon({ emoji }: { emoji: string }) {
  return (
    <div style={{
      fontSize: 48, textAlign: 'center', margin: '0 auto 20px',
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      {emoji}
    </div>
  );
}

export default function ReportQueueStatus({ queueId, onComplete, onError }: Props) {
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const poll = async () => {
    try {
      const res = await fetch(`/api/report/status/${queueId}`);
      if (!res.ok) throw new Error('status fetch failed');
      const data: StatusResponse = await res.json();
      setStatusData(data);

      if (data.status === 'completed' && data.reportUrl && !completedRef.current) {
        completedRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        onComplete(data.reportUrl);
      }

      if (data.status === 'failed' && !completedRef.current) {
        completedRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        onError();
      }
    } catch {
      setFetchError(true);
    }
  };

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueId]);

  const containerStyle: React.CSSProperties = {
    fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
    background: '#0F172A',
    color: 'white',
    borderRadius: 20,
    padding: '40px 32px',
    maxWidth: 400,
    margin: '0 auto',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  };

  if (fetchError) {
    return (
      <div style={containerStyle}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.6;transform:scale(0.92);} }
        `}</style>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>상태 조회 실패</div>
        <div style={{ fontSize: 13, color: '#94A3B8' }}>잠시 후 다시 시도해 주세요.</div>
      </div>
    );
  }

  if (!statusData) {
    return (
      <div style={containerStyle}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.6;transform:scale(0.92);} }
        `}</style>
        <SpinnerIcon />
        <div style={{ fontSize: 16, fontWeight: 700 }}>연결 중...</div>
      </div>
    );
  }

  const { status, progress, position, estimatedSec, errorMessage } = statusData;

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.6;transform:scale(0.92);} }
      `}</style>

      {status === 'waiting' && (
        <>
          <PulseIcon emoji="⏳" />
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
            리포트를 생성하고 있어요
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20 }}>
            잠시만 기다려 주세요
          </div>
          <ProgressBar value={0} />
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 16px',
            marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            {position !== undefined && (
              <div style={{ fontSize: 14, fontWeight: 600, color: '#F59E0B' }}>
                현재 {position}번째 대기 중
              </div>
            )}
            {estimatedSec !== undefined && estimatedSec > 0 && (
              <div style={{ fontSize: 13, color: '#94A3B8' }}>
                예상 시간: 약 {estimatedSec}초
              </div>
            )}
          </div>
        </>
      )}

      {status === 'processing' && (
        <>
          <SpinnerIcon />
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
            리포트를 생성하고 있어요
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 4 }}>
            PDF를 만드는 중입니다
          </div>
          <ProgressBar value={progress} />
          <div style={{ fontSize: 24, fontWeight: 900, color: '#22C55E', marginTop: 4 }}>
            {progress}%
          </div>

          <div style={{
            display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20,
            fontSize: 12, color: '#475569',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 20, opacity: progress >= 10 ? 1 : 0.3 }}>📋</span>
              <span style={{ color: progress >= 10 ? '#22C55E' : '#475569' }}>데이터 수집</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 20, opacity: progress >= 50 ? 1 : 0.3 }}>🎨</span>
              <span style={{ color: progress >= 50 ? '#22C55E' : '#475569' }}>리포트 생성</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 20, opacity: progress >= 85 ? 1 : 0.3 }}>📄</span>
              <span style={{ color: progress >= 85 ? '#22C55E' : '#475569' }}>PDF 변환</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 20, opacity: progress >= 95 ? 1 : 0.3 }}>☁️</span>
              <span style={{ color: progress >= 95 ? '#22C55E' : '#475569' }}>업로드</span>
            </div>
          </div>
        </>
      )}

      {status === 'completed' && (
        <>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#22C55E' }}>
            리포트 생성 완료!
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8' }}>
            잠시 후 다운로드가 시작됩니다.
          </div>
          <ProgressBar value={100} />
        </>
      )}

      {status === 'failed' && (
        <>
          <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#EF4444' }}>
            생성에 실패했어요
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>
            다시 시도해 주세요.
          </div>
          {errorMessage && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#FCA5A5',
              wordBreak: 'break-all', textAlign: 'left',
            }}>
              {errorMessage}
            </div>
          )}
        </>
      )}
    </div>
  );
}
