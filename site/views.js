/*
 * 조회수 표시
 *
 * 문서 페이지 정보 블록의 <span data-views>에 조회 수를 채우고, 숨겨 둔 "조회" 줄을 드러낸다.
 * API 주소와 문서 키는 이 <script> 태그의 data-api, data-key로 받는다.
 *
 * API 규격 (홈서버 구현이 지킬 것)
 *   POST {api}/views/{key}  조회 1회를 기록하고 현재 값을 돌려준다 → 200 {"count": 123}
 *   GET  {api}/views/{key}  기록하지 않고 현재 값만 돌려준다   → 200 {"count": 123}
 *   - key: knowledge/ 기준 경로에서 .md를 뺀 것, URL 인코딩됨 (예: database%2F0001-mysql%2F02-overview)
 *   - CORS: 사이트 출처(https://gunhaa.github.io)에 Access-Control-Allow-Origin 허용
 *   - HTTPS 필수: 사이트가 https라서 http API는 브라우저가 막는다 (mixed content)
 *
 * 같은 탭 세션에서 이미 센 문서는 다시 세지 않고(GET), localhost에서 볼 때도 세지 않는다.
 * API가 응답하지 않으면 아무것도 표시하지 않는다.
 */
(() => {
  const script = document.currentScript;
  const api = script?.dataset.api;
  const key = script?.dataset.key;
  const target = document.querySelector('[data-views]');
  if (!api || !key || !target) return;

  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const seenKey = `viewed:${key}`;
  let seen = false;
  try {
    seen = sessionStorage.getItem(seenKey) === '1';
  } catch {}
  const count = !local && !seen;

  fetch(`${api}/views/${encodeURIComponent(key)}`, { method: count ? 'POST' : 'GET' })
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then(({ count: n }) => {
      if (!Number.isFinite(n)) return;
      target.textContent = n.toLocaleString('ko-KR');
      target.closest('[hidden]')?.removeAttribute('hidden');
      if (count) {
        try {
          sessionStorage.setItem(seenKey, '1');
        } catch {}
      }
    })
    .catch(() => {});
})();
