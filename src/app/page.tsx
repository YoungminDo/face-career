import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <h1 className="text-6xl font-black text-[#22C55E] mb-2">FACE</h1>
        <p className="text-lg text-slate-400 mb-1">career diagnosis</p>
        <p className="text-sm text-slate-500 mb-12">나다운 커리어를 마주하는 시간</p>

        <div className="space-y-3 mb-12 text-left">
          <div className="border border-slate-700 rounded-xl p-4">
            <span className="text-[#22C55E] font-bold text-sm">F — Focus</span>
            <p className="text-slate-300 text-sm mt-1">나는 일할 때 무엇에 집중하는 사람인가?</p>
          </div>
          <div className="border border-slate-700 rounded-xl p-4">
            <span className="text-[#F97316] font-bold text-sm">A — Anchor</span>
            <p className="text-slate-300 text-sm mt-1">나는 일에서 무엇을 포기할 수 없는가?</p>
          </div>
          <div className="border border-slate-700 rounded-xl p-4">
            <span className="text-[#3B82F6] font-bold text-sm">C — Capacity</span>
            <p className="text-slate-300 text-sm mt-1">지금 무엇을 잘하고, 무엇을 키워야 하는가?</p>
          </div>
          <div className="border border-slate-700 rounded-xl p-4">
            <span className="text-[#8B5CF6] font-bold text-sm">E — Energy</span>
            <p className="text-slate-300 text-sm mt-1">지금 움직일 준비가 되었는가?</p>
          </div>
        </div>

        <Link
          href="/diagnosis"
          className="inline-block bg-[#22C55E] text-white font-bold text-lg px-12 py-4 rounded-2xl hover:bg-[#16A34A] transition-colors"
        >
          진단 시작하기
        </Link>

        <p className="text-xs text-slate-600 mt-4">약 20분 소요 · 76~83문항</p>
        <Link href="/mypage" className="text-sm text-gray-400 mt-3 inline-block underline">마이페이지</Link>
      </div>
    </div>
  );
}
