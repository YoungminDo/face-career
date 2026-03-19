import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FACE Career Diagnosis",
  description: "나다운 커리어를 마주하는 시간",
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
