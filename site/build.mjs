// knowledge/ 를 Tufte CSS 스타일의 정적 사이트(dist/)로 빌드한다.
// - 원본 md는 고치지 않는다. knowledge 밖으로 가는 링크는 GitHub 원문 URL로 바꾼다.
// - heading id는 rehype-slug(github-slugger)로 만들어 GitHub 앵커와 같게 한다.
// - 끊긴 링크·앵커가 하나라도 있으면 빌드를 실패시킨다.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { toString as hastToString } from 'hast-util-to-string';
import YAML from 'yaml';

const SITE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(SITE_DIR, '..');
const KNOWLEDGE = path.join(REPO, 'knowledge');
const DIST = path.join(SITE_DIR, 'dist');
const GITHUB_BLOB = 'https://github.com/gunhaa/knowledge/blob/main/';
const SITE_TITLE = 'gunhaa';
const GITHUB_PROFILE = 'https://github.com/gunhaa';
// github.com/<계정>.png는 현재 프로필 사진으로 넘겨 주므로, 프로필 사진을 바꾸면 사이트도 따라 바뀐다
const AVATAR = (size) => `${GITHUB_PROFILE}.png?size=${size}`;
// style.css·views.js를 고치면 주소가 바뀌어 브라우저가 캐시된 옛 파일을 쓰지 않는다
const fileVersion = (name) =>
  crypto.createHash('sha256').update(fs.readFileSync(path.join(SITE_DIR, name))).digest('hex').slice(0, 8);
const STYLE_VERSION = fileVersion('style.css');
const VIEWS_VERSION = fileVersion('views.js');
// 조회수 API 주소 (규격은 views.js 맨 위). 비어 있으면 조회수를 표시하지 않는다.
// GitHub Actions에서는 저장소 변수 VIEWS_API로 넘긴다
const VIEWS_API = (process.env.VIEWS_API ?? '').replace(/\/+$/, '');

// 대주제 표시 이름 (CLAUDE.md 대주제 맵 기준)
const TOPIC_LABELS = {
  ai: 'AI',
  'game-ai': '게임 AI',
  database: '데이터베이스',
  'distributed-systems': '분산 시스템',
  web: '웹',
  infra: '인프라',
  cs: '컴퓨터 과학',
  languages: '프로그래밍 언어',
  'software-engineering': '소프트웨어 공학',
  'dev-tools': '개발 도구',
  security: '보안',
  'external-apis': '외부 API',
  'study-and-career': '학습과 커리어',
};

// 첫 화면에 보일 대주제 순서. 언어 → DB → 분산 시스템 → 인프라처럼 아래 계층에서 위로 쌓아 읽는다.
// 여기에 없는 대주제는 맨 뒤에 이름순으로 붙는다.
const TOPIC_ORDER = ['languages', 'database', 'distributed-systems', 'infra', 'web'];
const topicRank = (topic) => {
  const i = TOPIC_ORDER.indexOf(topic);
  return i === -1 ? TOPIC_ORDER.length : i;
};

// 문서 종류 라벨은 파일명에서 순서 번호를 뗀 영어 이름 그대로 쓴다 (01-history → history).
// 저장소 경로·사이트 주소·화면 라벨이 같은 이름이 된다
const docKind = (name) => name.replace(/^\d+-/, '');
const kindLink = (href, label, cls = '') =>
  `<a class="kind${cls ? ` ${cls}` : ''}" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;

const toPosix = (p) => p.split(path.sep).join('/');
const isExternalUrl = (url) => /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//');

// ---------- 1. knowledge 문서 수집 ----------

const sets = []; // { topic, dir, id, docs: [{ name, file, rel }] }
for (const topic of fs.readdirSync(KNOWLEDGE).sort()) {
  const topicDir = path.join(KNOWLEDGE, topic);
  if (!fs.statSync(topicDir).isDirectory()) continue;
  for (const setDir of fs.readdirSync(topicDir).sort()) {
    const full = path.join(topicDir, setDir);
    if (!fs.statSync(full).isDirectory()) continue;
    const docs = fs
      .readdirSync(full)
      .filter((f) => f.endsWith('.md'))
      .sort()
      .map((f) => ({
        name: f.replace(/\.md$/, ''),
        file: path.join(full, f),
        rel: toPosix(path.relative(KNOWLEDGE, path.join(full, f))),
      }));
    sets.push({ topic, dir: setDir, docs });
  }
}

// ---------- 2. 마크다운 → hast ----------

const mdProcessor = unified()
  .use(remarkParse)
  // 한국어 본문의 범위 표기(50~75%, 수 ms~1초)가 취소선이 되지 않도록 ~~ 두 개일 때만 취소선으로 본다
  .use(remarkGfm, { singleTilde: false })
  .use(remarkFrontmatter, ['yaml']);
const hastProcessor = unified()
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSlug);

function parseMarkdown(file) {
  const mdast = mdProcessor.parse(fs.readFileSync(file, 'utf8'));
  let frontmatter = {};
  visit(mdast, 'yaml', (node) => {
    frontmatter = YAML.parse(node.value) ?? {};
  });
  return { mdast, frontmatter };
}

// 어떤 md 파일이든 heading id 목록을 만든다 (GitHub 원문 앵커 검사용)
const idCache = new Map();
function headingIds(file) {
  if (!idCache.has(file)) {
    const { mdast } = parseMarkdown(file);
    const hast = hastProcessor.runSync(mdast);
    const ids = new Set();
    visit(hast, 'element', (el) => {
      if (/^h[1-6]$/.test(el.tagName) && el.properties?.id) ids.add(el.properties.id);
    });
    idCache.set(file, ids);
  }
  return idCache.get(file);
}

// ---------- 3. 링크 변환 + 검사 ----------

const problems = [];

// 정제본 링크 (site/distilled.yaml). 키는 대주제·세트·문서 경로,
// 값은 computer_study 저장소 안 경로(CS/Database/Distilled.md#redis) 또는 전체 주소.
// 위치를 적지 않은 세트·문서는 "distilled (soon)"으로 computer_study 첫 화면에 연결한다.
const DISTILLED_REPO = 'https://github.com/gunhaa/computer_study';
const distilledUrl = (v) =>
  /^https?:\/\//.test(v) ? v : `${DISTILLED_REPO}/${/\.md(#|$)/.test(v) ? 'blob' : 'tree'}/main/${encodeURI(v.replace(/^\/+/, ''))}`;
const distilled = Object.fromEntries(
  Object.entries(YAML.parse(fs.readFileSync(path.join(SITE_DIR, 'distilled.yaml'), 'utf8')) ?? {})
    .map(([k, v]) => [k, distilledUrl(String(v))]),
);
const knownKeys = new Set(
  sets.flatMap((s) => [s.topic, `${s.topic}/${s.dir}`, ...s.docs.map((d) => `${s.topic}/${s.dir}/${d.name}`)]),
);
for (const key of Object.keys(distilled)) {
  if (!knownKeys.has(key)) problems.push(`distilled.yaml: 없는 경로 ${key}`);
}
// 문서 → 세트 → 대주제 순으로 가장 구체적인 정제본 주소
const distilledFor = (...keys) => keys.map((k) => distilled[k]).find(Boolean);
const distilledLink = (url) =>
  url ? kindLink(url, 'distilled', 'gh distilled') : kindLink(DISTILLED_REPO, 'distilled (soon)', 'gh distilled pending');

// 실습 프로젝트 (site/labs.yaml). 따로 배포된 예제 코드 사이트로, 연결한 세트에만 labs 링크가 붙는다
const labs = YAML.parse(fs.readFileSync(path.join(SITE_DIR, 'labs.yaml'), 'utf8')) ?? [];
const setKeys = new Set(sets.map((s) => `${s.topic}/${s.dir}`));
for (const lab of labs) {
  if (!lab.name || !lab.url) problems.push(`labs.yaml: name·url이 없는 항목 ${JSON.stringify(lab)}`);
  for (const key of lab.sets ?? []) {
    if (!setKeys.has(key)) problems.push(`labs.yaml: 없는 세트 ${key} (${lab.name})`);
  }
}
const labsFor = (setKey) => labs.filter((lab) => lab.sets?.includes(setKey));
// 한 세트에 실습이 여럿이면 labs 링크가 여럿 붙고, 마우스를 올리면 이름·설명이 보인다
const labsLinks = (setKey) =>
  labsFor(setKey).map((lab) => {
    const title = lab.description ? `${lab.name} — ${lab.description}` : lab.name;
    return `<a class="kind gh labs" href="${escapeHtml(lab.url)}" title="${escapeHtml(title)}">labs</a>`;
  });

function rewriteLinks(mdast, sourceFile) {
  visit(mdast, ['link', 'definition'], (node) => {
    const url = node.url;
    if (!url || isExternalUrl(url)) return;

    const [rawPath, rawHash = ''] = url.split('#');
    const hash = rawHash ? decodeURIComponent(rawHash) : '';
    const where = `${toPosix(path.relative(REPO, sourceFile))} → ${url}`;

    // 같은 문서 안 앵커
    if (!rawPath) {
      if (hash && !headingIds(sourceFile).has(hash)) problems.push(`앵커 없음: ${where}`);
      return;
    }

    const target = path.resolve(path.dirname(sourceFile), decodeURIComponent(rawPath));
    if (!fs.existsSync(target)) {
      problems.push(`파일 없음: ${where}`);
      return;
    }
    if (hash && target.endsWith('.md') && !headingIds(target).has(hash)) {
      problems.push(`앵커 없음: ${where}`);
    }

    const insideKnowledge = !path.relative(KNOWLEDGE, target).startsWith('..');
    if (insideKnowledge && target.endsWith('.md')) {
      // 사이트 안 링크: .md → .html, 상대 경로 유지
      node.url = rawPath.replace(/\.md$/, '.html') + (rawHash ? `#${rawHash}` : '');
    } else {
      // 사이트 밖: GitHub 원문으로
      const repoRel = toPosix(path.relative(REPO, target));
      node.url = GITHUB_BLOB + encodeURI(repoRel) + (rawHash ? `#${rawHash}` : '');
      node.data = { ...node.data, hProperties: { className: ['gh'] } };
    }
  });
}

// ---------- 4. Tufte 구조로 감싸기 ----------

const escapeHtml = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const el = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });

// h1을 떼어 내고, h2마다 <section>으로 묶고, 표·mermaid를 Tufte에 맞게 바꾼다
function tufteBody(hast) {
  let title = '';
  let hasMermaid = false;

  visit(hast, 'element', (node, index, parent) => {
    if (node.tagName === 'table' && parent) {
      parent.children[index] = el('div', { className: ['table-wrapper'] }, [node]);
      return 'skip';
    }
    if (node.tagName === 'pre') {
      const code = node.children[0];
      if (code?.properties?.className?.includes('language-mermaid')) {
        hasMermaid = true;
        node.properties = { className: ['mermaid'] };
        node.children = [{ type: 'text', value: hastToString(code) }];
      }
    }
  });

  const sections = [];
  let current = el('section', {}, []);
  for (const node of hast.children) {
    if (node.type === 'element' && node.tagName === 'h1' && !title) {
      title = hastToString(node);
      continue;
    }
    if (node.type === 'element' && node.tagName === 'h2' && current.children.some((c) => c.type === 'element')) {
      sections.push(current);
      current = el('section', {}, []);
    }
    current.children.push(node);
  }
  sections.push(current);

  const html = unified().use(rehypeStringify).stringify({ type: 'root', children: sections });
  return { title, html, hasMermaid };
}

// ---------- 5. 페이지 템플릿 ----------

// 문서 제목 아래 정보 블록: frontmatter 중 작성일·작성 주체·모델만 보여 준다
// claude-opus-5-5 → Claude Opus 5.5
const modelLabel = (id) =>
  String(id).replace(/^claude-([a-z]+)-(\d+)(?:-(\d+))?$/, (_, family, major, minor) =>
    `Claude ${family[0].toUpperCase()}${family.slice(1)} ${major}${minor ? `.${minor}` : ''}`);
const AUTHOR_LABELS = { agent: 'Claude Code', human: '사람' };
const META_FIELDS = [
  ['created', '작성일', (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v)],
  ['author', '작성', (v) => AUTHOR_LABELS[v] ?? v],
  ['model', '모델', (v) => (v === 'unknown' ? '알 수 없음' : modelLabel(v))],
];
function docMeta(frontmatter) {
  const rows = [];
  for (const [key, label, render] of META_FIELDS) {
    if (frontmatter[key] != null) rows.push([label, escapeHtml(String(render(frontmatter[key])))]);
  }
  // 조회수는 views.js가 숫자를 채우고 줄을 드러낸다
  if (VIEWS_API) rows.push(['조회', '<span data-views></span>', 'hidden']);
  if (!rows.length) return '';
  const items = rows
    .map(([label, value, hidden]) => `<div${hidden ? ' hidden' : ''}><dt>${label}</dt><dd>${value}</dd></div>`)
    .join('');
  return `<dl class="doc-meta">${items}</dl>`;
}

function page({ title, depth, crumbs, heading, meta = '', marginNav = '', body, footer = '', hasMermaid = false, viewsKey = '' }) {
  const up = '../'.repeat(depth);
  const mermaid = hasMermaid
    ? `<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs';
const dark = matchMedia('(prefers-color-scheme: dark)').matches;
mermaid.initialize({ startOnLoad: true, theme: dark ? 'dark' : 'neutral' });
</script>`
    : '';
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title === SITE_TITLE ? SITE_TITLE : `${escapeHtml(title)} — ${SITE_TITLE}`}</title>
<link rel="icon" href="${AVATAR(64)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/joungkyun/font-d2coding@1.3.2/d2coding.css">
<link rel="stylesheet" href="${up}tufte.css">
<link rel="stylesheet" href="${up}style.css?v=${STYLE_VERSION}">
</head>
<body>
<article>
${crumbs ? `<p class="crumbs">${crumbs}</p>` : ''}
${heading ?? `<h1>${escapeHtml(title)}</h1>`}
${meta}
${marginNav}
${body}
${footer}
</article>
${mermaid}
${VIEWS_API && viewsKey ? `<script src="${up}views.js?v=${VIEWS_VERSION}" data-api="${escapeHtml(VIEWS_API)}" data-key="${escapeHtml(viewsKey)}" defer></script>` : ''}
</body>
</html>
`;
}

// ---------- 6. 빌드 ----------

// 폴더는 두고 내용만 비운다 (Windows에서 dist가 다른 프로세스의 작업 폴더면 폴더 삭제가 막힌다)
fs.mkdirSync(DIST, { recursive: true });
for (const entry of fs.readdirSync(DIST)) {
  fs.rmSync(path.join(DIST, entry), { recursive: true, force: true });
}

// 세트 표시 이름: 02-overview의 H1에서 " 개요" 앞부분
for (const set of sets) {
  const overview = set.docs.find((d) => d.name === '02-overview');
  const h1 = overview && fs.readFileSync(overview.file, 'utf8').match(/^# (.+)$/m)?.[1];
  set.label = h1 ? h1.split(' 개요')[0].trim() : set.dir.replace(/^\d+-/, '');
}

let pageCount = 0;
for (const set of sets) {
  const topicLabel = TOPIC_LABELS[set.topic] ?? set.topic;
  for (const doc of set.docs) {
    const { mdast, frontmatter } = parseMarkdown(doc.file);
    rewriteLinks(mdast, doc.file);
    const { title, html, hasMermaid } = tufteBody(hastProcessor.runSync(mdast));

    const navItems = set.docs
      .map((d) => {
        const label = `${d.name.slice(0, 2)} ${docKind(d.name)}`;
        return d === doc
          ? `<span class="kind current">${label}</span>`
          : kindLink(`${d.name}.html`, label);
      })
      .join('<br>');
    const docDistilled = distilledFor(`${set.topic}/${set.dir}/${doc.name}`, `${set.topic}/${set.dir}`, set.topic);
    const extras = [distilledLink(docDistilled), ...labsLinks(`${set.topic}/${set.dir}`)].join('<br>');
    const marginNav = `<p class="nav-holder"><span class="marginnote margin-nav"><strong>${escapeHtml(set.label)}</strong><br>${navItems}<br><br>${extras}<br><a href="../../index.html">← 전체 목록</a></span></p>`;

    const crumbs = `<a class="home" href="../../index.html"><img class="avatar-sm" src="${AVATAR(40)}" alt="" width="20" height="20">${SITE_TITLE}</a> / ${escapeHtml(topicLabel)} / ${escapeHtml(set.label)}`;
    const meta = docMeta(frontmatter);
    const footer = `<footer class="doc-footer"><p><a class="gh" href="${GITHUB_BLOB}knowledge/${encodeURI(doc.rel)}">GitHub 원문</a></p></footer>`;

    const out = path.join(DIST, doc.rel.replace(/\.md$/, '.html'));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, page({ title, depth: 2, crumbs, meta, viewsKey: doc.rel.replace(/\.md$/, ''), marginNav, body: html, footer, hasMermaid }));
    pageCount++;
  }
}

// 첫 화면: 대주제 → 세트 → 01~05
const byTopic = Map.groupBy(
  sets.toSorted((a, b) => topicRank(a.topic) - topicRank(b.topic) || a.topic.localeCompare(b.topic)),
  (s) => s.topic,
);
const kindTag = (label) => `<span class="kind">${label}</span>`;
const indexBody = [
  `<section><p>하나의 지식을 다섯 문서로 정리합니다.</p><ul>`
    + `<li>${['history', 'overview', 'tradeoffs', 'pitfalls', 'failure-modes'].map(kindTag).join(' · ')}: 역사 → 개요 → 트레이드오프 → 흔한 함정 → 장애 유형 순서로 읽습니다.</li>`
    + `<li>${kindTag('distilled')}: 정리된 내용을 사람이 직접 검수하고 다듬은 핵심 요약입니다. 분야별로 <a class="gh" href="${DISTILLED_REPO}">computer_study</a>에 올립니다.</li>`
    + `<li>${kindTag('labs')}: 직접 코드로 확인한 예제 프로젝트입니다.</li>`
    + `</ul><p>질문 단위로 쓴 기록은 <a class="gh" href="https://github.com/gunhaa/knowledge">GitHub 저장소</a>에 있습니다.</p></section>`,
  // 대주제마다 표 하나: 세트 이름 | 원본 5문서 | 정리·실습
  // distilled·labs는 칸 안의 고정 자리에 두어, 없는 세트도 자리를 비워 세로줄을 맞춘다
  ...[...byTopic].map(([topic, topicSets]) => {
    const rows = topicSets
      .map((s) => {
        const links = s.docs
          .map((d) => {
            const docDistilled = distilled[`${s.topic}/${s.dir}/${d.name}`];
            return `${kindLink(`${s.topic}/${s.dir}/${d.name}.html`, docKind(d.name))}${docDistilled ? `<sup>${distilledLink(docDistilled)}</sup>` : ''}`;
          })
          .join('');
        const setKey = `${s.topic}/${s.dir}`;
        const setDistilled = distilledFor(setKey, s.topic);
        const distilledSlot = setDistilled
          ? kindLink(setDistilled, 'distilled', 'gh distilled')
          : '<span class="kind off" title="준비 중">distilled</span>';
        const labsSlot = `<span class="slot">${labsLinks(setKey).join(' ')}</span>`;
        return `<tr><td class="name">${escapeHtml(s.label)}</td><td class="docs">${links}</td><td class="extra"><span class="slot">${distilledSlot}</span>${labsSlot}</td></tr>`;
      })
      .join('\n');
    const topicDistilled = distilled[topic];
    return `<section><h2>${escapeHtml(TOPIC_LABELS[topic] ?? topic)}${topicDistilled ? ` <small>${distilledLink(topicDistilled)}</small>` : ''}</h2>`
      + `<table class="sets"><thead><tr><th></th><th>원본 5문서</th><th class="extra">정리·실습</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  }),
].join('\n');
fs.writeFileSync(path.join(DIST, 'index.html'), page({
    title: SITE_TITLE,
    depth: 0,
    crumbs: '',
    heading: `<header class="site-header"><a href="${GITHUB_PROFILE}"><img class="avatar" src="${AVATAR(200)}" alt="${SITE_TITLE}의 GitHub 프로필 사진" width="96" height="96"></a><div><h1>${SITE_TITLE}</h1><p class="site-sub">기술 노트 · <a href="${GITHUB_PROFILE}">GitHub</a></p></div></header>`,
    body: indexBody,
  }));

// 정적 파일
const tufteDir = path.join(SITE_DIR, 'node_modules', 'tufte-css');
fs.copyFileSync(path.join(tufteDir, 'tufte.css'), path.join(DIST, 'tufte.css'));
fs.cpSync(path.join(tufteDir, 'et-book'), path.join(DIST, 'et-book'), { recursive: true });
fs.copyFileSync(path.join(SITE_DIR, 'style.css'), path.join(DIST, 'style.css'));
fs.copyFileSync(path.join(SITE_DIR, 'views.js'), path.join(DIST, 'views.js'));
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

console.log(`세트 ${sets.length}개, 문서 ${pageCount}개 → ${toPosix(path.relative(REPO, DIST))}/`);
if (problems.length) {
  console.error(`\n빌드 문제 ${problems.length}개 (끊긴 링크·앵커, distilled.yaml·labs.yaml 경로):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
