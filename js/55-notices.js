// ============================================================
// 진입 안내 · 첫 방문 안내 · 크레딧 모달
// ============================================================
// 원본: ShoichiSimulator_v2.1/index.html 1572~1618행 (2026-10-15 분리).
//
// 의존: 30-lobby (noticeThen)
// 제공: maybeShowF11Notice · f11NoticeShown
//
// ⚠ 고전 스크립트다 (type="module" 아님). 파일들이 **같은 전역 스크립트 스코프**를
//   공유하므로 const/let/function 선언이 파일 경계를 넘어 그대로 보인다 —
//   분리 전 한 <script> 안에 있던 때와 의미가 완전히 같다. 대신 로드 순서가 곧 실행
//   순서이므로 index.html 의 <script> 순서(= 파일 번호)를 바꾸지 말 것.
//   같은 이름을 두 파일에서 선언하면 SyntaxError 로 페이지 전체가 죽는다.
// ============================================================

// ── 안내 팝업(전체화면·마우스 제스처): 3D 진입 시 표시 ──
// '하루동안 다시 보지 않기' 지원. 표시했으면 true를 돌려주고, 호출측은 확인 버튼까지 진입을 미룬다.
let f11NoticeShown = false; // 같은 세션에서 로비를 오갈 때 반복 표시 방지
function maybeShowF11Notice() {
  if (f11NoticeShown) return false;
  try { if (Date.now() < +(localStorage.getItem('shoichiF11HideUntil') || 0)) return false; } catch (e) { }
  if (window.innerHeight >= screen.height - 1) return false; // 이미 전체화면(F11)이면 안내 불필요
  f11NoticeShown = true;
  document.getElementById('notice-hide-chk').checked = false;
  document.getElementById('notice-modal').classList.add('show');
  return true;
}
(() => {
  const m = document.getElementById('notice-modal');
  document.getElementById('notice-close').addEventListener('click', () => {
    if (document.getElementById('notice-hide-chk').checked) {
      try { localStorage.setItem('shoichiF11HideUntil', String(Date.now() + 24 * 60 * 60 * 1000)); } catch (e) { }
    }
    m.classList.remove('show');
    const fn = noticeThen; noticeThen = null;
    if (fn) fn(); // 팝업 때문에 미뤄둔 3D 진입 재개
  });
})();

// ── 입장 고지 (2026-11-04): 검은 화면에 비공식·비영리 문구 → 문구 페이드 인, 3초 머문 뒤 화면째 페이드 아웃.
//    클릭·아무 키로 바로 넘긴다. 사라진 뒤 아래에 이미 떠 있던 첫 방문 안내(#intro-modal)가 보인다. 매 입장마다 띄운다.
//    우하단 '안내문구 보지 않기'를 켜면 localStorage shoichiDisclaimerSkip=1 — 다음 입장부터 index.html 의 인라인 스크립트가 지운다.
//    체크박스 클릭은 화면을 닫지 않는다(읽던 중일 수 있다) — 시간이 다 되거나 다른 곳을 클릭하면 닫힌다.
function setDisclaimerSkip(on) {
  try { if (on) localStorage.setItem('shoichiPersonalDisclaimerSkip', '1'); else localStorage.removeItem('shoichiPersonalDisclaimerSkip'); } catch (e) { }
  const a = document.getElementById('disclaimer-skip'), b = document.getElementById('lobby-disclaimer-skip-chk');
  if (a) a.checked = on;
  if (b) b.checked = on;
}
// 로비 우하단 체크박스 — 입장 화면을 꺼 둔 사람이 다시 켤 수 있는 곳 (두 체크박스는 같은 값을 보인다)
(() => {
  const b = document.getElementById('lobby-disclaimer-skip-chk');
  try { b.checked = localStorage.getItem('shoichiPersonalDisclaimerSkip') === '1'; } catch (e) { }
  b.addEventListener('change', () => setDisclaimerSkip(b.checked));
})();
(() => {
  const sp = document.getElementById('disclaimer-splash');
  if (!sp) return;
  let done = false;
  const close = e => {
    if (e && e.type === 'keydown') { e.preventDefault(); e.stopPropagation(); }   // 넘기는 키가 로비 단축키로 새지 않게
    if (done) return; done = true;
    sp.classList.add('out');
    document.removeEventListener('keydown', close, true);
    setTimeout(() => sp.remove(), 900);
  };
  requestAnimationFrame(() => requestAnimationFrame(() => sp.classList.add('in')));
  setTimeout(close, 800 + 3000);
  sp.addEventListener('click', close);
  const skip = document.getElementById('disclaimer-skip');
  sp.querySelector('.skip').addEventListener('click', e => e.stopPropagation());
  skip.addEventListener('change', () => setDisclaimerSkip(skip.checked));
  document.addEventListener('keydown', close, true);
})();

// ── 첫 방문 안내 (2026-09-16): 원작과 조작감이 다르다는 고지. 2026-11-04 비공식·비영리 고지를 위에 추가하면서
//    저장 키를 shoichiIntroHideUntil2 로 바꿨다 — 예전에 '하루 동안 안 보기'를 누른 사람도 새 고지를 한 번은 본다.
//    로비가 뜰 때 표시하고
//    '하루 동안 다시 보지 않기'면 localStorage(shoichiIntroHideUntil)에 만료 시각을 둔다. 텍스트는 정적(innerHTML 미사용).
(() => {
  const m = document.getElementById('intro-modal');
  const chk = document.getElementById('intro-hide-day');
  let hidden = false;
  try { hidden = Date.now() < +(localStorage.getItem('shoichiIntroHideUntil2') || 0); } catch (e) { }
  if (!hidden) { chk.checked = false; m.classList.add('show'); }
  document.getElementById('intro-ok-btn').addEventListener('click', e => {
    e.currentTarget.blur();
    if (chk.checked) { try { localStorage.setItem('shoichiIntroHideUntil2', String(Date.now() + 24 * 60 * 60 * 1000)); } catch (e2) { } }
    m.classList.remove('show');
  });
})();

// ── 크레딧 ──
(() => {
  const m = document.getElementById('credit-modal');
  document.getElementById('credit').addEventListener('click', () => m.classList.add('show'));
  document.getElementById('credit-close').addEventListener('click', () => m.classList.remove('show'));
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
})();
