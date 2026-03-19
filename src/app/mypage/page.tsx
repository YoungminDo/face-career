'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { FOCUS_TYPES } from '@/data/mappings';

const CODE_TO_TYPE: Record<string, string> = { Em: 'Empathy', Cr: 'Creative', Op: 'Operative', Ar: 'Architect' };

interface DiagnosisRecord {
  id: string;
  userName: string;
  completedAt: string;
  focusResult?: { primary: string; secondary: string; subTypeCode: string };
  desiredJob?: string;
}

export default function MyPage() {
  const [history, setHistory] = useState<DiagnosisRecord[]>([]);
  const [currentData, setCurrentData] = useState<DiagnosisRecord | null>(null);

  useEffect(() => {
    const h = JSON.parse(localStorage.getItem('face_diagnosis_history') || '[]');
    setHistory(h.reverse()); // 최신순
    const current = localStorage.getItem('face_diagnosis');
    if (current) setCurrentData(JSON.parse(current));
  }, []);

  const loadDiagnosis = (record: DiagnosisRecord) => {
    localStorage.setItem('face_diagnosis', JSON.stringify(record));
    window.location.href = '/result';
  };

  const deleteDiagnosis = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('face_diagnosis_history', JSON.stringify([...updated].reverse()));
  };

  const getTypeName = (primary: string) => {
    const typeName = CODE_TO_TYPE[primary] || primary;
    return (FOCUS_TYPES as any)[typeName]?.korean || primary;
  };

  const getTypeColor = (primary: string) => {
    const typeName = CODE_TO_TYPE[primary] || primary;
    return (FOCUS_TYPES as any)[typeName]?.color || '#22C55E';
  };

  const getTypeEmoji = (primary: string) => {
    const typeName = CODE_TO_TYPE[primary] || primary;
    return (FOCUS_TYPES as any)[typeName]?.emoji || '✨';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black">마이페이지</h1>
          <a href="/" className="text-sm text-gray-400">← 홈</a>
        </div>

        {/* 현재 프로필 */}
        {currentData && (
          <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                style={{ background: getTypeColor(currentData.focusResult?.primary || '') + '20' }}>
                {getTypeEmoji(currentData.focusResult?.primary || '')}
              </div>
              <div>
                <div className="text-lg font-bold">{currentData.userName || '회원'}</div>
                {currentData.focusResult && (
                  <div className="text-sm" style={{ color: getTypeColor(currentData.focusResult.primary) }}>
                    {getTypeName(currentData.focusResult.primary)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <a href="/result" className="flex-1 text-center py-2.5 rounded-xl bg-[#22C55E] text-white text-sm font-bold">
                결과 보기
              </a>
              <a href="/report" className="flex-1 text-center py-2.5 rounded-xl bg-[#0F172A] text-white text-sm font-bold">
                프리미엄 리포트
              </a>
            </div>
          </div>
        )}

        {/* 진단 이력 */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">진단 이력</h2>
          <a href="/diagnosis" className="text-sm font-bold text-[#22C55E]">
            + 새 진단 시작
          </a>
        </div>

        {history.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 mb-4">아직 진단 이력이 없어요</p>
            <a href="/diagnosis" className="inline-block bg-[#22C55E] text-white font-bold px-6 py-3 rounded-xl">
              진단 시작하기
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((record, i) => {
              const date = new Date(record.completedAt);
              const dateStr = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
              const primary = record.focusResult?.primary || '';
              const desiredJobName = record.desiredJob?.split('|')[1] || '';

              return (
                <div key={record.id || i} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ background: getTypeColor(primary) + '20' }}>
                      {getTypeEmoji(primary)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{record.userName || '회원'}</span>
                        {primary && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                            style={{ background: getTypeColor(primary) + '20', color: getTypeColor(primary) }}>
                            {getTypeName(primary)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {dateStr}
                        {desiredJobName && <span className="ml-2">· 희망: {desiredJobName}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => loadDiagnosis(record)}
                      className="flex-1 text-center py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
                      결과 보기
                    </button>
                    <button onClick={() => deleteDiagnosis(record.id)}
                      className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-400 hover:bg-red-50 hover:text-red-500">
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
