// ============================================================
// 전역 키·마우스 입력 (Esc · 바인딩 캡처 · 마우스4/5)
// ============================================================
// 원본: ShoichiSimulator_v2.1/index.html 1619~1680행 (2026-10-15 분리).
//
// 의존: 20-unity3d (unity3dActive·sendToUnity·u3dFrame) · 50-settings (captureSlot·keyBind·ALL_SLOTS·updateKeyBtns·saveSettings)
// 제공: mouseBtnCode
//
// ⚠ 고전 스크립트다 (type="module" 아님). 파일들이 **같은 전역 스크립트 스코프**를
//   공유하므로 const/let/function 선언이 파일 경계를 넘어 그대로 보인다 —
//   분리 전 한 <script> 안에 있던 때와 의미가 완전히 같다. 대신 로드 순서가 곧 실행
//   순서이므로 index.html 의 <script> 순서(= 파일 번호)를 바꾸지 말 것.
//   같은 이름을 두 파일에서 선언하면 SyntaxError 로 페이지 전체가 죽는다.
// ============================================================

// ============================================================
// F1 — 크롬 도움말 탭 막기 (2026-11-04)
// ============================================================
// F1 은 게임 안 조작키 도움말 키인데, 크롬은 F1 에 자기 도움말 탭을 연다. 예약 키가 아니라서 keydown 을
// preventDefault 하면 열리지 않는다. 여기는 로비·모달 등 부모 문서에 포커스가 있을 때 몫이고,
// 게임(iframe)에 포커스가 있을 때는 키가 여기까지 오지 않으므로 unity3d/index.html(WebGL 템플릿)이 같은 일을 한다.
window.addEventListener('keydown', e => { if (e.key === 'F1' || e.code === 'F1') e.preventDefault(); }, true);

// ============================================================
// 전역 키 입력 (Esc 복귀 · 설정창 키 바인딩 캡처)
// ============================================================
document.addEventListener('keydown', e => {
  if (e.repeat) return; // 키 홀드 시 자동 반복 입력 무시
  const c = e.code; // 물리 키 기반: 한/영 입력 상태와 무관 (macOS 한글 IME 대응)
  // 3D 중: Esc는 게임 안 메뉴(계속하기/설정/로비로 돌아가기)를 여는 키다.
  // 평소엔 iframe이 키를 먹으므로 여기까지 오지 않는다. 여기 오는 건 포커스가 부모로 샌
  // 경우뿐이라(모달을 닫은 직후 등) Unity에 대신 넘겨주고 포커스를 게임에 돌려준다.
  // 예전엔 여기서 바로 exitUnity3D()를 불렀는데, 그러면 포커스 위치에 따라 같은 Esc가
  // 어떤 때는 메뉴를 열고 어떤 때는 로비로 튕겨 나가 동작이 예측 불가였다.
  if (unity3dActive) {
    if (c === 'Escape') { sendToUnity('menu-toggle', 'OnShellMenu'); u3dFrame.focus(); }
    return;
  }
  // 설정창의 키 변경 입력 대기 중이면 바인딩 처리
  if (captureSlot) {
    e.preventDefault();
    if (c === 'Escape') { captureSlot = null; updateKeyBtns(); return; }
    // 모든 슬롯 동일 규칙: 문자·숫자·기호·Space 허용 (예약 키 없음 — 중복은 맞교환으로 해소)
    const ok = c === 'Space' || BINDABLE_RE.test(c);
    if (ok) {
      // 이미 다른 슬롯에 배정된 키면 두 슬롯의 키를 맞교환
      const other = ALL_SLOTS.find(s => s !== captureSlot && keyBind[s] === c);
      if (other) keyBind[other] = keyBind[captureSlot];
      keyBind[captureSlot] = c;
      captureSlot = null; updateKeyBtns(); saveSettings();
    }
    return;
  }
  // Esc로 열려 있는 모달 닫기
  if (c === 'Escape') {
    const open = document.querySelector('#chal-modal.show,#lb-modal.show,#hof-modal.show,#update-modal.show,#credit-modal.show');
    if (open) open.classList.remove('show');
  }
});

// ── 마우스4·5(엄지 버튼) 바인딩 ──
// 크로뮴(크롬·엣지)은 엄지 버튼에도 mousedown/mouseup을 보내고, 히스토리 이동(뒤로/앞으로)을
// mouseup 시점에 실행하되 페이지가 이벤트를 소비(preventDefault)하면 취소한다.
// 파이어폭스·사파리는 엄지 버튼 입력을 페이지에 주지 않아 이 바인딩이 동작하지 않는다 (설정창에 안내).
function mouseBtnCode(btn) { return btn === 3 ? 'Mouse4' : btn === 4 ? 'Mouse5' : null; }
document.addEventListener('mousedown', e => {
  const c = mouseBtnCode(e.button);
  if (!c) return;
  // 키 캡처 중이면 마우스4·5를 바인딩으로 소비 (키보드 캡처와 동일한 맞교환 규칙)
  if (captureSlot) {
    e.preventDefault(); e.stopPropagation();
    const other = ALL_SLOTS.find(s => s !== captureSlot && keyBind[s] === c);
    if (other) keyBind[other] = keyBind[captureSlot];
    keyBind[captureSlot] = c;
    captureSlot = null; updateKeyBtns(); saveSettings();
    return;
  }
  if (ALL_SLOTS.some(s => keyBind[s] === c)) e.preventDefault(); // 바인딩된 버튼은 뒤로가기로 새지 않게 소비
});
document.addEventListener('mouseup', e => {
  const c = mouseBtnCode(e.button);
  if (!c) return;
  // 크로뮴: mouseup을 소비해야 히스토리 이동이 취소된다
  if (captureSlot !== null || ALL_SLOTS.some(s => keyBind[s] === c)) e.preventDefault();
});
