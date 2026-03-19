import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FACE 커리어 진단 — 나다운 일의 단서를 찾아보세요",
  description: "어떤 일이 나에게 맞는지 모르겠다면? Focus·Anchor·Capacity·Energy 4가지 진단으로 직무 적합도·가치관·강점을 15분 만에 확인하세요.",
  openGraph: {
    title: "FACE 커리어 진단 — 나다운 일의 단서를 찾아보세요",
    description: "어떤 일이 나에게 맞는지 모르겠다면? 15분 진단으로 직무 적합도·가치관·강점의 단서를 찾을 수 있어요.",
    url: "https://face.da-sh.io",
    siteName: "FACE Career Diagnosis",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FACE 커리어 진단 — 나다운 일의 단서를 찾아보세요",
    description: "15분 진단으로 직무 적합도·가치관·강점의 단서를 찾을 수 있어요.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" as="style" crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className="font-[Pretendard] antialiased">
        {children}
      </body>
    </html>
  );
}
