// 웹 빌드(dist) 뒤에 실행: 서비스 워커가 미리 저장할 파일 목록과 캐시 버전을 채웁니다.
// 그래서 한 번 연 뒤에는 인터넷이 끊겨도 모든 화면이 열립니다. (음원은 제외)
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const dist = 'dist';

// 링크 미리보기: 절대 주소가 필요해 빌드 때 사이트 주소를 넣음 (Vercel 운영이면 운영 주소, 프리뷰면 프리뷰 주소)
const host = process.env.VERCEL_ENV === 'production' ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
const site = host ? `https://${host}` : '';
const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8').replaceAll('%SITE%', site);
writeFileSync(join(dist, 'index.html'), indexHtml);
// 숲 선물 링크(/gift) 미리보기: 같은 앱을 열되 제목·설명·그림만 선물용으로
const giftHtml = indexHtml
  .replace('<meta property="og:title" content="쉼표. 나만의 숲" />', '<meta property="og:title" content="누군가 당신에게 작은 숲을 선물했어요" />')
  .replace('<meta property="og:description" content="숨 고르기와 숲에 머물기로 잠깐 쉬어 가는 곳" />', '<meta property="og:description" content="쉼표. 잠깐 쉬어 갈 수 있는 작은 숲" />')
  .replace(`${site}/og-forest.jpg`, `${site}/og-gift.jpg`)
  .replace(`content="${site}/"`, `content="${site}/gift"`)
  .replace('<title>쉼표.</title>', '<title>쉼표. 작은 숲 선물</title>');
mkdirSync(join(dist, 'gift'), { recursive: true });
writeFileSync(join(dist, 'gift', 'index.html'), giftHtml);
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else files.push('/' + relative(dist, full).split(sep).join('/'));
  }
};
walk(dist);

const precache = files.filter((f) => /^\/(_expo\/|assets\/)/.test(f) && !/\.(mp3|m4a|wav|map)$/i.test(f)).sort();
const hash = createHash('sha256');
for (const f of [...precache, '/index.html']) hash.update(f + readFileSync(join(dist, f)).length);
const version = hash.digest('hex').slice(0, 12);

const swPath = join(dist, 'sw.js');
const sw = readFileSync(swPath, 'utf8')
  .replace("const CACHE = 'shimpyo-dev';", `const CACHE = 'shimpyo-${version}';`)
  .replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(precache)};`);
writeFileSync(swPath, sw);
console.log(`sw.js: ${precache.length}개 파일 미리 저장, 캐시 버전 ${version}`);
