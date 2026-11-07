// ============================================================
// 3D 시뮬레이터 (Unity WebGL) — iframe 격리 · postMessage 브리지
// ============================================================
// 원본: ShoichiSimulator_v2.1/index.html 1084~1238행 (2026-10-15 분리).
//
// 의존: 10-ranking (openChalResult)
// 제공: unity3dActive · lobbyEl · u3dFrame · u3dPending · fitUnity3D · enterUnity3D · exitUnity3D · sendToUnity
//
// ⚠ 고전 스크립트다 (type="module" 아님). 파일들이 **같은 전역 스크립트 스코프**를
//   공유하므로 const/let/function 선언이 파일 경계를 넘어 그대로 보인다 —
//   분리 전 한 <script> 안에 있던 때와 의미가 완전히 같다. 대신 로드 순서가 곧 실행
//   순서이므로 index.html 의 <script> 순서(= 파일 번호)를 바꾸지 말 것.
//   같은 이름을 두 파일에서 선언하면 SyntaxError 로 페이지 전체가 죽는다.
// ============================================================

// ============================================================
// 3D 시뮬레이터 (Unity WebGL) — iframe 격리
// ============================================================
// 같은 문서에 Unity 로더를 넣으면 전역이 오염되고 왕복 시 wasm 힙이 안 풀린다.
// iframe에 가둬두고, 나갈 때 src를 about:blank로 되돌려 통째로 언로드한다.

// ⚠ **규칙 변형 스위치** (2026-10-15 v2.4에서 상수로 분리).
// v2.1 과 v2.2 는 index.html 이 **이 한 줄만** 달랐다 — 같은 Unity 빌드를 쓰면서 iframe 주소에
// ?variant=v22 를 붙이는지 여부뿐이었다(DebugSimView.ApplyTestVariant). 셸 전체를 복사해 두느라
// 두 폴더를 따로 고쳐야 했으니, v2.4 부터는 여기 한 줄만 바꾼다.
//   ''                  v2.1 과 동일 (운영 기본값)
//   '?variant=v22'      v2.2 테스트 변형 — 궁단검 3 m + 보정 줌 + Q/R·E 이동 규칙
const U3D_VARIANT = '';
let unity3dActive = false;
// 지연 언로드 타이머 (exitUnity3D 주석 참고). 재진입 시 반드시 취소해야 한다.
let u3dUnloadT = 0;
const lobbyEl = document.getElementById('lobby-screen');
const u3dWrap = document.getElementById('unity3d-wrap');
const u3dFrame = document.getElementById('unity3d-frame');
const u3dLoad = document.getElementById('unity3d-load');

// 3D 뷰포트를 exe와 같은 1920×1080으로 고정하고, 창 크기에 맞춰 늘려 배치한다.
// 창 픽셀 높이를 그대로 쓰면 보이는 월드 범위가 창 높이에 비례해 좁아진다(= 확대돼 보인다).
// iframe 안쪽은 언제나 1920×1080이므로 Unity가 보는 Screen.height는 항상 1080이고,
// 월드가 보이는 범위도 창 비율과 무관하게 exe와 같다. 바깥에서 CSS로만 늘린다.
//
// 2026-11-04: 검은 띠를 없애 달라는 요청으로 다시 **가로·세로 배율을 따로** 준다(= 레터박스 없음, 11-02 이전과 같음).
// 16:9 창·전체화면(F11)에서는 sx === sy 라 차이가 없고, 비율이 어긋난 창에서는 화면이 그 비율만큼 늘어난다
// (예: 1920×950 창이면 세로 0.88배 — 사거리 원이 약간 납작해진다). 마우스 좌표는 브라우저가 iframe 경계에서
// 변환 행렬을 역적용하므로 비균일 배율도 정확하다.
// 레터박스로 되돌리려면: s = min(w/U3D_W, h/U3D_H); translate((w-U3D_W*s)/2, (h-U3D_H*s)/2) scale(s)
const U3D_W = 1920, U3D_H = 1080;
function fitUnity3D() {
  const w = u3dWrap.clientWidth || window.innerWidth;
  const h = u3dWrap.clientHeight || window.innerHeight;
  u3dFrame.style.transform = `scale(${w / U3D_W}, ${h / U3D_H})`;
}
window.addEventListener('resize', () => { if (unity3dActive) fitUnity3D(); });

function enterUnity3D() {
  // 나갔다가 0.4초 안에 다시 들어오는 경우. 예약된 언로드가 그대로 터지면
  // 방금 띄운 새 인스턴스를 about:blank로 날려 버린다.
  if (u3dUnloadT) { clearTimeout(u3dUnloadT); u3dUnloadT = 0; }
  lobbyEl.style.display = 'none';
  unity3dActive = true;
  u3dWrap.classList.add('show');
  u3dWrap.classList.remove('loaded');
  fitUnity3D(); // 표시 직후(레이아웃 확정 후) 1920×1080 → 창 크기로 축소 배치
  // file://에서는 wasm/fetch가 CORS로 막혀 아예 뜨지 않는다 — 검은 화면 대신 안내를 띄운다
  if (location.protocol === 'file:') {
    u3dLoad.textContent = '3D 시뮬레이터는 로컬 서버에서만 동작합니다. 이 폴더에서 "node serve.js"를 실행한 뒤 http://localhost:8000 으로 접속하세요.';
    return;
  }
  u3dLoad.textContent = '3D 시뮬레이터 로딩 중…';
  u3dFrame.src = 'unity3d/index.html' + U3D_VARIANT;
  u3dFrame.addEventListener('load', () => u3dWrap.classList.add('loaded'), { once: true });
  setTimeout(() => u3dFrame.focus(), 0); // 키 입력을 iframe으로 넘긴다
}

// ⚠ 언로드를 즉시 하지 않고 늦추는 이유 — 설정이 사라지는 버그
//
// Unity WebGL의 PlayerPrefs는 IndexedDB에 저장되는데 그 쓰기가 **비동기**다.
// PlayerPrefs.Save()는 파일만 써 놓고 즉시 반환하고, 실제 반영은
//   IDBFS.queuePersist → setTimeout(startPersist, 0) → IDBFS.syncfs → IndexedDB 트랜잭션
// 순서로 최소 한 매크로태스크 뒤에 시작한다(unity3d.framework.js.unityweb).
//
// 그런데 로비 복귀는 Unity가 SaveSettings() 직후 곧바로 'shoichi3d-exit'을 보내고,
// 여기서 src를 about:blank로 만들어 iframe을 통째로 파괴한다. 진행 중이던 트랜잭션이
// 취소되면서 방금 바꾼 값이 유실된다 — 한 번도 저장에 성공한 적이 없으면 키 자체가
// 없으므로 다음 방문에 기본값(쿨감 0)으로 보인다. "어떨 땐 유지되고 어떨 땐 초기화"의 정체다.
//
// 로비 표시·포커스는 즉시 하고 iframe 파괴만 미루므로 체감 지연은 없다.
// 400ms는 IndexedDB 왕복에 충분하면서, 남겨 둬도 사용자가 눈치채지 못하는 길이다.
const U3D_UNLOAD_DELAY = 400;

function exitUnity3D() {
  if (!unity3dActive) return;
  unity3dActive = false;              // 먼저 내려야 재진입·resize 핸들러가 꼬이지 않는다
  u3dWrap.classList.remove('show', 'loaded');
  lobbyEl.style.display = 'flex';
  window.focus();
  if (u3dUnloadT) clearTimeout(u3dUnloadT);
  u3dUnloadT = setTimeout(() => {
    u3dUnloadT = 0;
    // 그 사이 다시 들어갔으면 건드리지 않는다. enterUnity3D가 타이머를 취소하지만,
    // 취소가 한 발 늦는 경우까지 여기서 막는다 (살아 있는 게임을 날리는 사고라 이중으로 건다).
    if (unity3dActive) return;
    u3dFrame.src = 'about:blank';     // 언로드 = wasm 힙·AudioContext·rAF 전부 해제
  }, U3D_UNLOAD_DELAY);
}

// ── 셸 → Unity 명령 ──
// 같은 오리진 iframe이라 unityInstance.SendMessage를 직접 부를 수 있다
// (unity3d/index.html이 로드 완료 시 window.unityInstance를 노출한다).
// 아직 로딩 중이면 보류했다가 'shoichi3d-ready'를 받고 보낸다.
// 받는 쪽 메서드가 모드마다 다르다. C#은 같은 이름을 두 번 선언할 수 없어서, 모드 파일을
// 각자 소유한 작업자들이 자기 파일에 진입점을 하나씩 만들었다(한 파일에 case를 몰면
// 그 파일이 모든 모드의 공유 파일이 돼 병렬 작업이 막힌다). 그래서 메서드 이름을 같이 싣는다.
let u3dPending = null;              // { m: 메서드, c: 명령 }
function sendToUnity(cmd, method) {
  const m = method || 'OnShellCommand';
  const inst = u3dFrame.contentWindow && u3dFrame.contentWindow.unityInstance;
  if (inst) { inst.SendMessage('ShoichiDebugView', m, cmd); return true; }
  u3dPending = { m: m, c: cmd };
  return false;
}

// ── Unity → 셸 ──
window.addEventListener('message', e => {
  if (e.source !== u3dFrame.contentWindow || !e.data) return;
  switch (e.data.type) {
    case 'shoichi3d-exit':   // iframe에서 Esc — 로비 복귀 요청
      exitUnity3D();
      break;
    case 'shoichi3d-ready':  // Unity 인스턴스 생성 완료 — 보류해 둔 명령 발사
      if (u3dPending) { const p = u3dPending; u3dPending = null; sendToUnity(p.c, p.m); }
      break;
    case 'shoichi3d-chal-clear':
      // 챌린지 클리어 — 결과창·기록 등록·TOP10은 전부 여기(셸) 몫이다.
      // Unity는 이 사이 시뮬레이션을 스스로 멈춘다(쿨다운 무료 회복 방지, v1.7 4497).
      openChalResult(e.data.ms, {
        // 다시 도전: 키 입력이 다시 게임으로 가야 하므로 iframe에 포커스를 돌려준다
        onRetry: () => { sendToUnity('chal-retry'); u3dFrame.focus(); },
        onLobby: () => { sendToUnity('chal-exit'); exitUnity3D(); },
      });
      // 닉네임 입력에 키보드가 필요하다 — 포커스를 iframe에서 되찾아온다
      window.focus();
      setTimeout(() => { try { document.getElementById('chal-nick').focus(); } catch (err) { } }, 0);
      break;

    // ── 콤보 공유코드 클립보드 ──
    // Unity(IMGUI)의 GUIUtility.systemCopyBuffer는 WebGL에서 브라우저 보안 정책에 막힌다.
    // 그래서 셸이 대신 navigator.clipboard를 쓰고 결과만 되돌려준다.
    // navigator.clipboard 자체가 보안 컨텍스트(https 또는 localhost)에서만 존재하므로
    // LAN 주소(http://192.168.x.x)로 열면 undefined다 — 그 경우도 폴백으로 흘린다.
    case 'shoichi3d-combo-copy':
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(e.data.code).then(
          () => sendToUnity('copy-ok', 'OnComboCommand'),
          () => sendToUnity('copy-fail', 'OnComboCommand'));
      } else {
        // Unity 쪽은 실패를 받으면 "직접 선택해 복사하세요" 안내를 띄운다
        sendToUnity('copy-fail', 'OnComboCommand');
      }
      break;
    case 'shoichi3d-combo-paste': {
      // readText()는 Chrome에서 사용자 제스처 + 권한이 필요하다. 거부·미지원이면
      // prompt로 받는다 — 권한 없이도 붙여넣기가 항상 가능해야 한다.
      const askCode = () => {
        const t = window.prompt('공유받은 콤보 코드를 붙여넣으세요');
        if (t) sendToUnity(t, 'OnComboCode');
        u3dFrame.focus();   // prompt가 가져간 포커스를 게임에 돌려준다
      };
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(
          t => { if (t) sendToUnity(t, 'OnComboCode'); else askCode(); },
          askCode);
      } else askCode();
      break;
    }
  }
});
