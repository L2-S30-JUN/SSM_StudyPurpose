// ============================================================
// 업데이트 내역 (기본값 + Supabase 갱신)
// ============================================================
// 원본: ShoichiSimulator_v2.1/index.html 1333~1479행 (2026-10-15 분리).
//
// 의존: 00-config (SUPABASE_*) · 10-ranking (chalDbOn·chalDbHeaders·SITE_TEXT·loadSiteText)
// 제공: UPDATE_LOG
//
// ⚠ 고전 스크립트다 (type="module" 아님). 파일들이 **같은 전역 스크립트 스코프**를
//   공유하므로 const/let/function 선언이 파일 경계를 넘어 그대로 보인다 —
//   분리 전 한 <script> 안에 있던 때와 의미가 완전히 같다. 대신 로드 순서가 곧 실행
//   순서이므로 index.html 의 <script> 순서(= 파일 번호)를 바꾸지 말 것.
//   같은 이름을 두 파일에서 선언하면 SyntaxError 로 페이지 전체가 죽는다.
// ============================================================

// ============================================================
// 업데이트 내역 (로비 → '업데이트 내역' 클릭)
// ============================================================
// 평소 갱신은 재배포 없이 Supabase 대시보드 → Table Editor → site_updates 에서 행을 추가하면 된다
// (테이블 생성 SQL은 supabase_setup.sql 참고). 아래 UPDATE_LOG는 DB가 비었거나 못 불러왔을 때
// 쓰이는 기본값(fallback)이다 — file:// 로 열거나 오프라인일 때도 빈 창이 뜨지 않게 한다.
//   ver   : 버전 문구 (맨 위 항목이 로비 링크 문구 'v1.9 업데이트 내역'에도 쓰인다)
//   date  : 날짜 문구 (빈 문자열이면 표시 안 함)
//   video : 유튜브 등 영상 주소 (빈 문자열이면 '▶ 영상' 링크를 안 만든다)
//   items : 문자열, 또는 하위 항목이 있으면 { t: '제목', sub: ['...', '...'] }
const UPDATE_LOG = [
  {
    ver: 'v1.9', date: '', video: '',
    items: [
      '3D 시뮬레이터가 본편이 되었습니다 — 로비의 "게임 시작"으로 바로 진입합니다',
      '2D 연습 모드(더미 처치 챌린지 · V자 각 퀴즈 · 쇼이치 클래식 · 콤보 녹화)를 정리했습니다',
      "'연막무스 파훼' 모드를 없앴습니다",
    ],
  },
  {
    ver: 'v1.8', date: '2026-07-26', video: '',
    items: [
      { t: "'쇼이치 클래식' 모드 추가", sub: [
        '궁 시전시간 0.6초 (선딜 0.15 + 후딜 0.45초)',
        '패시브 최대 6스택 옵션',
        '패시브 스택 저장 — 최대 9스택 (6스택 옵션 시 11스택)',
        '패시브 단검이 적중하면 스택 획득',
      ] },
      '3D 시뮬레이터(실험) 로비 버튼 추가',
      '3D 화면 배율을 exe 전체화면과 동일하게 수정',
    ],
  },
  {
    ver: 'v1.7', date: '', video: 'https://www.youtube.com/watch?v=eUCUH4sENAM',
    items: ['자세한 변경 내용은 영상으로 확인해주세요'],
  },
];

(() => {
  const m = document.getElementById('update-modal');
  const link = document.getElementById('lobby-update-link');
  const list = document.getElementById('update-list');

  // 내용이 DB에서 올 수 있으므로 렌더는 전부 textContent로 한다 (HTML 해석 방지)
  const li = (text) => { const e = document.createElement('li'); e.textContent = text; return e; };

  // 로비 링크 문구: 형식은 site_config.update_link_text, 버전은 최신 릴리스에서 온다.
  // 둘이 서로 다른 시점에 도착하므로(패치노트 fetch / 문구 fetch) 마지막 버전을 들고 있다가
  // 어느 쪽이 늦게 와도 최종 문구가 맞도록 이 함수로 모아 그린다.
  let lastVer = '';
  function applyUpdateLinkText() {
    if (!lastVer) return;
    link.textContent = SITE_TEXT.update_link_text.replace(/\{ver\}/g, lastVer);
  }
  // href는 textContent로 막을 수 없다 — http/https만 통과시켜 javascript: 스킴을 차단
  const safeUrl = (u) => /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '';

  function renderUpdateLog(releases) {
    list.textContent = '';
    for (const rel of releases) {
      const hd = document.createElement('div');
      hd.className = 'ver-hd';
      const v = document.createElement('span'); v.className = 'ver'; v.textContent = rel.ver; hd.appendChild(v);
      if (rel.date) { const d = document.createElement('span'); d.className = 'date'; d.textContent = rel.date; hd.appendChild(d); }
      const vurl = safeUrl(rel.video);
      if (vurl) {
        const a = document.createElement('a');
        a.className = 'vid'; a.href = vurl; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = '▶ 영상 보기';
        hd.appendChild(a);
      }
      list.appendChild(hd);

      const ul = document.createElement('ul');
      for (const it of rel.items) {
        if (typeof it === 'string') { ul.appendChild(li(it)); continue; }
        const parent = li(it.t);
        const sub = document.createElement('ul');
        for (const s of (it.sub || [])) sub.appendChild(li(s));
        parent.appendChild(sub);
        ul.appendChild(parent);
      }
      list.appendChild(ul);
    }

    // 로비 링크 문구는 최신 버전을 따라간다 — 버전을 올려도 HTML을 고칠 일이 없다
    // 문구 자체도 DB(site_config.update_link_text)에서 온다 — '{ver}' 자리에 최신 버전이 들어간다.
    // 응답이 오기 전에는 SITE_TEXT의 기본값으로 그려지고, 오면 아래 loadSiteText().then이 다시 그린다.
    if (releases.length) {
      lastVer = releases[0].ver;
      applyUpdateLinkText();
    }
  }

  // body 한 칸(text)을 items 배열로 — 줄 하나가 항목 하나,
  // '-' 로 시작하는 줄은 바로 위 항목의 하위 항목이 된다 (Table Editor에서 쓰기 쉬운 형식)
  function parseUpdateBody(body) {
    const items = [];
    for (const raw of String(body || '').split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      const sub = /^[-·*]\s*/.test(line);
      const text = line.replace(/^[-·*]\s*/, '');
      if (!text) continue;
      const last = items[items.length - 1];
      if (sub && last) {
        if (typeof last === 'string') items[items.length - 1] = { t: last, sub: [text] };
        else last.sub.push(text);
      } else {
        items.push(text);
      }
    }
    return items;
  }

  // ── Supabase에서 최신 패치노트 가져오기 (재배포 없이 갱신하기 위한 경로) ──
  // 실패하거나 행이 없으면 위의 UPDATE_LOG 기본값을 그대로 둔다.
  async function loadUpdateLogFromDb() {
    if (!chalDbOn()) return;
    try {
      const r = await fetch(SUPABASE_URL +
        '/rest/v1/site_updates?select=ver,released_on,video_url,body&published=is.true&order=sort_key.desc,id.desc&limit=30',
        { headers: chalDbHeaders() });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const rows = await r.json();
      if (!Array.isArray(rows) || !rows.length) return; // 테이블이 비어 있으면 기본값 유지
      renderUpdateLog(rows.map(row => ({
        ver: String(row.ver || ''),
        date: row.released_on ? String(row.released_on) : '',
        video: String(row.video_url || ''),
        items: parseUpdateBody(row.body),
      })));
    } catch (e) {
      // 패치노트는 부가 정보다 — 실패해도 진행에 영향을 주지 않게 조용히 기본값 유지
      console.warn('업데이트 내역을 불러오지 못했습니다:', e.message);
    }
  }

  renderUpdateLog(UPDATE_LOG); // 먼저 기본값으로 그려두고, DB 응답이 오면 교체한다
  loadUpdateLogFromDb();
  loadSiteText().then(applyUpdateLinkText); // 문구 형식이 DB에서 오면 다시 그린다

  link.addEventListener('click', () => { list.scrollTop = 0; m.classList.add('show'); });
  document.getElementById('update-close').addEventListener('click', () => m.classList.remove('show'));
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
})();
