// 用 macOS 內置 say + afconvert 生成卡片音頻（Daniel，英國男聲）。
// 用法：node scripts/generate-audio.js [張數]（唔寫就全部）
// 輸出：audio/<卡 id>-normal.m4a、audio/<卡 id>-slow.m4a，同 src/audio-manifest.js（英文原文 → 卡 id）。
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cards } from '../src/cards.js';

const VOICE = 'Daniel';
const WPM = { normal: 175, slow: 125 };

const limit = Number(process.argv[2]) || cards.length;
const chosen = cards.slice(0, limit);

mkdirSync('audio', { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'cards-audio-'));

for (const { id, en } of chosen) {
  for (const [speed, wpm] of Object.entries(WPM)) {
    const aiff = join(tmp, `${id}-${speed}.aiff`);
    execFileSync('say', ['-v', VOICE, '-r', String(wpm), '-o', aiff, en]);
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', aiff, join('audio', `${id}-${speed}.m4a`)]);
  }
}
rmSync(tmp, { recursive: true });

const manifest = Object.fromEntries(chosen.map(({ id, en }) => [en, id]));
writeFileSync(
  'src/audio-manifest.js',
  `// 由 scripts/generate-audio.js 生成，唔好手改。英文原文 → 卡 id（音頻檔 audio/<id>-normal|slow.m4a）。\nexport const audioManifest = ${JSON.stringify(manifest, null, 2)};\n`,
);
console.log(`生成咗 ${chosen.length} 張卡，共 ${chosen.length * 2} 個音頻檔。`);
