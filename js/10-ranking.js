// ============================================================
// 챌린지 결과창 + 랭킹 + 명예의 전당 (Supabase REST)
// ============================================================
// 원본: ShoichiSimulator_v2.1/index.html 899~1083행 (2026-10-15 분리).
//
// 의존: 00-config (SUPABASE_*) · 20-unity3d (exitUnity3D·lobbyEl — 클릭 핸들러 안에서만 쓰므로 로드 순서는 무관)
// 제공: chalDbOn · chalDbHeaders · SITE_TEXT · loadSiteText · chalLoadBoard · openChalResult · closeChalResult
//
// ⚠ 고전 스크립트다 (type="module" 아님). 파일들이 **같은 전역 스크립트 스코프**를
//   공유하므로 const/let/function 선언이 파일 경계를 넘어 그대로 보인다 —
//   분리 전 한 <script> 안에 있던 때와 의미가 완전히 같다. 대신 로드 순서가 곧 실행
//   순서이므로 index.html 의 <script> 순서(= 파일 번호)를 바꾸지 말 것.
//   같은 이름을 두 파일에서 선언하면 SyntaxError 로 페이지 전체가 죽는다.
// ============================================================

// ============================================================
// 챌린지 결과창 + 랭킹 (Supabase REST — SDK 불필요)
// ============================================================
// 2D 챌린지 모드는 걷어냈지만 결과창 UI·기록 등록·TOP10 조회는 통째로 남겨뒀다.
// 3D 챌린지를 붙일 때는 클리어 시점에 아래 한 줄만 호출하면 된다:
//     openChalResult(clearMs, { onRetry: () => {...}, onLobby: () => {...} })
// 게임 로직과의 연결은 이 두 콜백이 전부다 (2D 시절의 chalMode·chalPhase 의존은 제거).
// 테이블: challenge_best(뷰, 닉네임당 최고기록) / challenge_records(등록) — supabase_setup.sql 참고.
const chalDbOn = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);
function chalDbHeaders() {
  return { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
}

// ── 사이트 문구 설정 (site_config 테이블) ──
// 재배포 없이 SQL Editor에서 값만 고치면 사이트 문구가 바뀐다.
// 아래는 DB를 못 읽었을 때 쓰는 기본값이다 (file:// 로 열거나 오프라인일 때도 빈 문구가 안 뜨게).
//   season_name      현재 시즌 이름. 랭킹 모달 제목에 붙는다
//   update_link_text 로비의 업데이트 내역 링크 문구. {ver} 자리에 최신 버전이 들어간다
//   hof_title        명예의 전당 모달 제목
const SITE_TEXT = {
  season_name: '시즌 2',
  update_link_text: '쇼이치 시뮬레이터 {ver} 업데이트 내역',
  hof_title: '명예의 전당',
};
let siteTextLoaded = null;   // 중복 요청 방지 (여러 UI가 같은 값을 필요로 한다)
function loadSiteText() {
  if (siteTextLoaded) return siteTextLoaded;
  siteTextLoaded = (async () => {
    if (!chalDbOn()) return SITE_TEXT;
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/site_config?select=key,value', { headers: chalDbHeaders() });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      for (const row of await r.json()) {
        // 값이 빈 문자열이면 기본값을 남긴다 — 실수로 비운 행이 문구를 지우지 않게
        if (row && row.key in SITE_TEXT && String(row.value || '').trim())
          SITE_TEXT[row.key] = String(row.value);
      }
    } catch (e) {
      // 문구는 부가 정보다 — 실패해도 기본값으로 계속 간다
      console.warn('사이트 문구 설정을 불러오지 못했습니다:', e.message);
    }
    return SITE_TEXT;
  })();
  return siteTextLoaded;
}
async function chalLoadBoard(listEl) {
  // listEl 미지정 시 챌린지 결과창 리스트 (로비 랭킹 모달은 #lobby-lb-list를 넘겨 재사용)
  const list = listEl || document.getElementById('chal-lb-list');
  list.textContent = '';
  if (!chalDbOn()) { list.textContent = '랭킹 서버가 아직 설정되지 않았습니다'; return; }
  list.textContent = '불러오는 중...';
  try {
    // challenge_best 뷰: 닉네임당 최고 기록 1개만 반환 (도배 방지)
    const r = await fetch(SUPABASE_URL + '/rest/v1/challenge_best?select=nickname,clear_ms&order=clear_ms.asc&limit=10',
      { headers: chalDbHeaders() });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rows = await r.json();
    list.textContent = '';
    if (!rows.length) { list.textContent = '아직 등록된 기록이 없습니다 — 1위에 도전하세요!'; return; }
    rows.forEach((row, i) => {
      // 닉네임은 사용자 입력 데이터 — textContent로만 그린다 (HTML 해석 방지)
      const div = document.createElement('div'); div.className = 'lb-row' + (i === 0 ? ' top1' : '');
      const rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = (i + 1) + '위';
      const nk = document.createElement('span'); nk.className = 'nk'; nk.textContent = row.nickname;
      const tm = document.createElement('span'); tm.className = 'tm'; tm.textContent = (row.clear_ms / 1000).toFixed(2) + '초';
      div.append(rk, nk, tm); list.appendChild(div);
    });
  } catch (e) { list.textContent = '랭킹을 불러오지 못했습니다 (' + e.message + ')'; }
}

// ── 챌린지 결과창 ──
const chalModalEl = document.getElementById('chal-modal');
let chalTimeMs = 0;   // 등록 대상 기록 (openChalResult가 채운다)
let chalHooks = {};   // { onRetry, onLobby } — 게임 쪽이 넘기는 유일한 연결점
// 3D 챌린지 진입점: 클리어 시간(ms)과 버튼 콜백을 넘기면 결과창·기록등록·TOP10을 여기서 처리한다
function openChalResult(clearMs, hooks) {
  chalTimeMs = Math.max(0, +clearMs || 0);
  chalHooks = hooks || {};
  document.getElementById('chal-result-time').textContent = (chalTimeMs / 1000).toFixed(2) + '초';
  document.getElementById('chal-submit-btn').disabled = false;
  document.getElementById('chal-status').textContent = '';
  try { document.getElementById('chal-nick').value = localStorage.getItem('shoichiNick') || ''; } catch (e) { }
  chalModalEl.classList.add('show');
  chalLoadBoard();
}
function closeChalResult() { chalModalEl.classList.remove('show'); }

let chalSubmitting = false;
async function chalSubmitRecord() {
  const st = document.getElementById('chal-status');
  const btn = document.getElementById('chal-submit-btn');
  const nick = document.getElementById('chal-nick').value.trim();
  if (!chalDbOn()) { st.textContent = '랭킹 서버가 아직 설정되지 않았습니다'; return; }
  if (!nick) { st.textContent = '닉네임을 입력해주세요'; return; }
  if (chalSubmitting) return;
  chalSubmitting = true; btn.disabled = true; st.textContent = '등록 중...';
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/challenge_records', {
      method: 'POST',
      headers: { ...chalDbHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify({ nickname: nick, clear_ms: Math.round(chalTimeMs) })
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    st.textContent = '등록 완료!';
    try { localStorage.setItem('shoichiNick', nick); } catch (e) { }
    chalLoadBoard(); // 등록 직후 순위 반영
  } catch (e) { st.textContent = '등록 실패 (' + e.message + ')'; btn.disabled = false; }
  chalSubmitting = false;
}

document.getElementById('chal-submit-btn').addEventListener('click', chalSubmitRecord);
document.getElementById('chal-nick').addEventListener('keydown', e => { if (e.code === 'Enter' || e.code === 'NumpadEnter') chalSubmitRecord(); });
document.getElementById('chal-retry-btn').addEventListener('click', e => {
  e.currentTarget.blur();
  closeChalResult();
  if (chalHooks.onRetry) chalHooks.onRetry();
});
document.getElementById('chal-lobby-btn').addEventListener('click', e => {
  e.currentTarget.blur();
  closeChalResult();
  if (chalHooks.onLobby) chalHooks.onLobby();
  else { exitUnity3D(); lobbyEl.style.display = 'flex'; } // 연결이 없으면 로비로 되돌린다
});

// ── 로비 랭킹 모달 (현재 시즌) ──
const lbModalEl = document.getElementById('lb-modal');
document.getElementById('lobby-rank-btn').addEventListener('click', e => {
  e.currentTarget.blur();
  lbModalEl.classList.add('show');
  chalLoadBoard(document.getElementById('lobby-lb-list'));
  // 제목에 현재 시즌 이름을 붙인다. DB 응답을 기다리는 동안에도 기본 문구가 이미 떠 있다.
  loadSiteText().then(t => {
    document.getElementById('lb-title').textContent = `더미 처치 챌린지 랭킹 — ${t.season_name}`;
  });
});
document.getElementById('lb-close-btn').addEventListener('click', e => { e.currentTarget.blur(); lbModalEl.classList.remove('show'); });
// 모달 바깥(어두운 배경) 클릭 = 닫기
lbModalEl.addEventListener('mousedown', e => { if (e.target === lbModalEl) lbModalEl.classList.remove('show'); });

// ── 명예의 전당 모달 (지난 시즌 TOP 10) ──
// 시즌이 끝날 때 그 시즌의 TOP 10을 hall_of_fame 테이블에 옮겨 두고 challenge_records를
// 비운다(supabase_setup.sql의 '시즌 마감' 절차). 그래서 여기 데이터는 읽기 전용 기록이다.
// 시즌이 여러 개 쌓여도 코드를 고칠 필요가 없도록 시즌 내림차순으로 통째로 받아 묶어 그린다.
const hofModalEl = document.getElementById('hof-modal');
async function hofLoadBoard() {
  const list = document.getElementById('hof-list');
  list.textContent = '';
  if (!chalDbOn()) { list.textContent = '랭킹 서버가 아직 설정되지 않았습니다'; return; }
  list.textContent = '불러오는 중...';
  try {
    const r = await fetch(SUPABASE_URL +
      '/rest/v1/hall_of_fame?select=season,season_name,rank,nickname,clear_ms&order=season.desc,rank.asc',
      { headers: chalDbHeaders() });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rows = await r.json();
    list.textContent = '';
    if (!rows.length) { list.textContent = '아직 마감된 시즌이 없습니다'; return; }
    let curSeason = null;
    for (const row of rows) {
      if (row.season !== curSeason) {
        curSeason = row.season;
        const hd = document.createElement('div');
        hd.className = 'season-hd';
        // season_name도 사용자가 SQL로 넣는 값이다 — textContent로만 그린다
        hd.textContent = (row.season_name || ('시즌 ' + row.season)) + ' TOP 10';
        list.appendChild(hd);
      }
      // 닉네임은 사용자 입력 데이터 — textContent로만 그린다 (HTML 해석 방지)
      const div = document.createElement('div'); div.className = 'lb-row' + (row.rank === 1 ? ' top1' : '');
      const rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = row.rank + '위';
      const nk = document.createElement('span'); nk.className = 'nk'; nk.textContent = row.nickname;
      const tm = document.createElement('span'); tm.className = 'tm'; tm.textContent = (row.clear_ms / 1000).toFixed(2) + '초';
      div.append(rk, nk, tm); list.appendChild(div);
    }
  } catch (e) { list.textContent = '명예의 전당을 불러오지 못했습니다 (' + e.message + ')'; }
}
document.getElementById('mode-hof-btn').addEventListener('click', e => {
  e.currentTarget.blur();
  hofModalEl.classList.add('show');
  hofLoadBoard();
  loadSiteText().then(t => { hofModalEl.querySelector('.ttl').textContent = t.hof_title; });
});
document.getElementById('hof-close-btn').addEventListener('click', e => { e.currentTarget.blur(); hofModalEl.classList.remove('show'); });
hofModalEl.addEventListener('mousedown', e => { if (e.target === hofModalEl) hofModalEl.classList.remove('show'); });
