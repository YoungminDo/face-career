'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/admin', label: '대시보드', icon: '📊' },
  { href: '/admin/users', label: '사용자 관리', icon: '👥' },
  { href: '/admin/diagnoses', label: '진단 관리', icon: '📋' },
  { href: '/admin/reports', label: '리포트 관리', icon: '📄' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* 사이드바 */}
      <aside style={{
        width: 220, background: '#0F172A', color: 'white', padding: '24px 0',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#22C55E', letterSpacing: 2 }}>FACE Admin</div>
        </div>
        <nav style={{ flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 20px', fontSize: 14, fontWeight: isActive ? 700 : 400,
                color: isActive ? 'white' : '#94A3B8',
                background: isActive ? '#22C55E' : 'transparent',
                borderRadius: isActive ? '0 8px 8px 0' : 0,
                marginRight: 12,
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1E293B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>A</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Admin</div>
              <div style={{ fontSize: 10, color: '#64748B' }}>관리자</div>
            </div>
          </div>
        </div>
      </aside>

      {/* 메인 */}
      <main style={{ flex: 1, background: '#F8FAFC', padding: '24px 32px', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
