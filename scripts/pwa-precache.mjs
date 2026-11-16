// 웹 빌드(dist) 뒤에 실행: 서비스 워커가 미리 저장할 파일 목록과 캐시 버전을 채웁니다.
// 그래서 한 번 연 뒤에는 인터넷이 끊겨도 모든 화면이 열립니다. (음원은 제외)
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const dist = 'dist';
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
