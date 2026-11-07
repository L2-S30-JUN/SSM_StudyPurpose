// ============================================================
// 설정 값 · 키 바인딩 저장/복원
// ============================================================
// 원본: ShoichiSimulator_v2.1/index.html 1480~1571행 (2026-10-15 분리).
//
// 의존: 없음
// 제공: settings · keyBind · DEFAULT_BIND · ALL_SLOTS · BINDABLE_RE · CODE_PUNCT · captureSlot · codeLabel · toCode · saveSettings · loadSettings · updateKeyBtns
//
// ⚠ 고전 스크립트다 (type="module" 아님). 파일들이 **같은 전역 스크립트 스코프**를
//   공유하므로 const/let/function 선언이 파일 경계를 넘어 그대로 보인다 —
//   분리 전 한 <script> 안에 있던 때와 의미가 완전히 같다. 대신 로드 순서가 곧 실행
//   순서이므로 index.html 의 <script> 순서(= 파일 번호)를 바꾸지 말 것.
//   같은 이름을 두 파일에서 선언하면 SyntaxError 로 페이지 전체가 죽는다.
// ============================================================

// ============================================================
// 설정 (자동평타 / 마우스 반전 / D-F 스왑 / 입력 지연 / 키 커스텀)
// ============================================================
// 값은 localStorage('shoichiSettings')에 저장된다. 2D 본체가 사라진 지금 이 값을 읽는 쪽은
// 아직 없다 — 3D(Unity)는 자체 옵션 패널 + PlayerPrefs를 쓴다. 셸 → Unity 브리지가 붙을 때
// 그대로 재사용할 수 있도록 저장 포맷(키 이름)은 v1.8과 동일하게 유지한다.
// 2D 엔진 전용이던 항목(사운드 볼륨 · FPS 제한 · 화면 흔들림 · 비약 피격판정 표시 · 카메라 고정)은 제거.
// netDelay/netPing 은 아직 읽는 쪽이 없는 값이지만(위 주석), 3D의 실제 기본값과 어긋난 채
// 두면 나중에 셸 → Unity 브리지가 붙는 순간 조용히 옛 기본값이 되살아난다. 값만 맞춰 둔다
// (키 이름은 v1.8 그대로 — 저장 포맷 호환). 2026-10-10: 입력 지연 기본 OFF · 스킬 핑 0ms.
const settings = { autoAtk: true, mouseInvert: false, dfSwap: false, moveAtkClick: true, netDelay: false, netPing: 0 };
// 키 입력은 e.code(물리 키 위치) 기반: 한/영 입력 상태·Caps Lock과 무관하게 동작 (macOS 한글 IME 대응)
const keyBind = {
  q: 'KeyQ', w: 'KeyW', e: 'KeyE', r: 'KeyR',
  stealth: 'KeyD', blink: 'KeyF',    // 은신·블링크 — 'D/F 위치 변경' 옵션은 두 키의 "기능"을 맞바꾸는 별개 옵션
  moveAtk: 'KeyA', stop: 'KeyS',     // 이동공격 / 정지
  cdReset: 'Backquote', cdrDown: 'Digit1', cdrUp: 'Digit2', dummySpawn: 'Digit3', dummyDel: 'Digit4', // 연습 도구
  camCenter: 'Space', camLock: 'KeyY'
};
const DEFAULT_BIND = { ...keyBind }; // 초기화용 기본값 스냅샷
const KEY_SLOTS = ['q', 'w', 'e', 'r', 'stealth', 'blink'];
const UTIL_SLOTS = ['moveAtk', 'stop'];
const TOOL_SLOTS = ['cdReset', 'cdrDown', 'cdrUp', 'dummySpawn', 'dummyDel'];
const CAM_SLOTS = ['camCenter', 'camLock']; // 카메라: 중앙이동 / 고정토글
const ALL_SLOTS = [...KEY_SLOTS, ...UTIL_SLOTS, ...TOOL_SLOTS, ...CAM_SLOTS];
// 예약 키 목록은 없다 — 중복 입력은 두 슬롯의 키 맞교환으로 처리한다
const BINDABLE_RE = /^(Key[A-Z]|Digit\d|Numpad\d|Minus|Equal|BracketLeft|BracketRight|Semicolon|Quote|Comma|Period|Slash|Backslash|Backquote)$/;
const CODE_PUNCT = { Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Backquote: '`' };
let captureSlot = null; // 키 입력 대기 중인 슬롯

// code → 표시용 라벨 ('KeyT'→'T', 'Digit5'→'5', 'Semicolon'→';', 'Mouse4'→'M4')
function codeLabel(c) {
  if (c === 'Space') return 'Space';
  if (c === 'Mouse4' || c === 'Mouse5') return 'M' + c.slice(5);
  if (c.startsWith('Key')) return c.slice(3);
  if (c.startsWith('Digit')) return c.slice(5);
  if (c.startsWith('Numpad')) return 'N' + c.slice(6);
  return CODE_PUNCT[c] || c;
}
// 구버전 저장값(단일 문자) 또는 code 문자열 → 유효한 code로 정규화 (무효 시 null)
function toCode(v) {
  if (typeof v !== 'string') return null;
  if (v === 'Space' || v === 'Mouse4' || v === 'Mouse5') return v; // 특수 값: 스페이스·마우스 엄지버튼
  if (/^[a-z]$/.test(v)) return 'Key' + v.toUpperCase();
  if (/^[0-9]$/.test(v)) return 'Digit' + v;
  for (const code in CODE_PUNCT) if (CODE_PUNCT[code] === v) return code;
  if (BINDABLE_RE.test(v)) return v;
  return null;
}

// 설정 localStorage 저장/복원 (키 이름은 v1.8과 동일 — 기존 사용자의 저장값을 그대로 잇는다)
function saveSettings() {
  try {
    localStorage.setItem('shoichiSettings', JSON.stringify({
      autoAtk: settings.autoAtk, mouseInvert: settings.mouseInvert, dfSwap: settings.dfSwap,
      moveAtkClick: settings.moveAtkClick, netDelay: settings.netDelay, netPing: settings.netPing, keyBind
    }));
  } catch (e) { }
}
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('shoichiSettings'));
    if (!s) return;
    if (typeof s.autoAtk === 'boolean') settings.autoAtk = s.autoAtk;
    if (typeof s.mouseInvert === 'boolean') settings.mouseInvert = s.mouseInvert;
    if (typeof s.dfSwap === 'boolean') settings.dfSwap = s.dfSwap;
    if (typeof s.moveAtkClick === 'boolean') settings.moveAtkClick = s.moveAtkClick;
    if (typeof s.netDelay === 'boolean') settings.netDelay = s.netDelay;
    if (typeof s.netPing === 'number' && isFinite(s.netPing)) settings.netPing = Math.min(150, Math.max(0, s.netPing));
    if (s.keyBind) {
      // 전 슬롯 복원 — 구버전 저장(스킬·카메라만 존재)은 나머지 슬롯이 기본값으로 남는다
      for (const k of ALL_SLOTS) {
        const code = toCode(s.keyBind[k]); // 구버전(문자) 저장값 마이그레이션 + Space·Mouse4/5 통과
        if (code) keyBind[k] = code;
      }
      // 저장값이 손상되어 중복 바인딩이면 뒤 슬롯을 기본키로 복구
      const seen = new Set();
      for (const k of ALL_SLOTS) { if (seen.has(keyBind[k])) keyBind[k] = DEFAULT_BIND[k]; seen.add(keyBind[k]); }
    }
  } catch (e) { }
}

function updateKeyBtns() {
  for (const s of ALL_SLOTS) {
    const b = document.getElementById('key-' + s);
    if (!b) continue;
    b.textContent = captureSlot === s ? '...' : codeLabel(keyBind[s]);
    b.classList.toggle('capturing', captureSlot === s);
  }
}
