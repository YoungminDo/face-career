/**
 * Twemoji SVG → base64 data URI 변환 스크립트
 * 실행: node scripts/generate-emoji-map.mjs
 * 출력: src/lib/emojiMap.ts
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 사용되는 이모지 전체 목록 (emoji: twemoji 파일명)
const EMOJI_LIST = [
  { emoji: '☀️',  file: '2600' },
  { emoji: '⚖️',  file: '2696' },
  { emoji: '⚠️',  file: '26a0' },
  { emoji: '⚡️',  file: '26a1' },
  { emoji: '✅',  file: '2705' },
  { emoji: '✨',  file: '2728' },
  { emoji: '🌍',  file: '1f30d' },
  { emoji: '🌐',  file: '1f310' },
  { emoji: '🌙',  file: '1f319' },
  { emoji: '🌱',  file: '1f331' },
  { emoji: '🎯',  file: '1f3af' },
  { emoji: '🏠',  file: '1f3e0' },
  { emoji: '🏢',  file: '1f3e2' },
  { emoji: '🏥',  file: '1f3e5' },
  { emoji: '💡',  file: '1f4a1' },
  { emoji: '💼',  file: '1f4bc' },
  { emoji: '📊',  file: '1f4ca' },
  { emoji: '📋',  file: '1f4cb' },
  { emoji: '🔀',  file: '1f500' },
  { emoji: '🔋',  file: '1f50b' },
  { emoji: '🔬',  file: '1f52c' },
  { emoji: '🔴',  file: '1f534' },
  { emoji: '🔵',  file: '1f535' },
  { emoji: '🚀',  file: '1f680' },
  { emoji: '🛡️',  file: '1f6e1' },
  { emoji: '🟡',  file: '1f7e1' },
  { emoji: '🟢',  file: '1f7e2' },
  { emoji: '🤝',  file: '1f91d' },
  { emoji: '🦅',  file: '1f985' },
];

const BASE_URL = 'https://twemoji.maxcdn.com/v/latest/svg';

async function fetchSvgAsDataUri(file) {
  const url = `${BASE_URL}/${file}.svg`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  const svg = await res.text();
  // SVG를 base64 data URI로
  const b64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

async function main() {
  console.log(`총 ${EMOJI_LIST.length}개 이모지 다운로드 중...`);

  const entries = [];
  for (const { emoji, file } of EMOJI_LIST) {
    try {
      const dataUri = await fetchSvgAsDataUri(file);
      // key: 이모지 문자에서 variation selector(FE0F) 제거
      const key = emoji.replace(/\uFE0F/g, '');
      entries.push(`  ${JSON.stringify(key)}: ${JSON.stringify(dataUri)}`);
      process.stdout.write(`  ✓ ${emoji} (${file})\n`);
    } catch (e) {
      process.stdout.write(`  ✗ ${emoji} (${file}): ${e.message}\n`);
    }
  }

  const output = `// 자동 생성 파일 — node scripts/generate-emoji-map.mjs
// Twemoji SVG (MIT License, Copyright Twitter)
// 수정하지 마세요. 이모지 추가/변경 시 스크립트 재실행.

export const EMOJI_MAP: Record<string, string> = {
${entries.join(',\n')}
};

/** 이모지 문자를 <img> 태그로 변환 (PDF 렌더링용) */
export function emojiToImg(emoji: string, size = '1.2em'): string {
  const key = emoji.replace(/\\uFE0F/g, '');
  const src = EMOJI_MAP[key];
  if (!src) return emoji; // 없으면 그냥 반환
  return \`<img src="\${src}" style="width:\${size};height:\${size};vertical-align:middle;display:inline-block;" alt="\${emoji}">\`;
}
`;

  const outPath = join(__dirname, '../src/lib/emojiMap.ts');
  writeFileSync(outPath, output, 'utf-8');
  console.log(`\n완료! → ${outPath}`);
}

main().catch(console.error);
