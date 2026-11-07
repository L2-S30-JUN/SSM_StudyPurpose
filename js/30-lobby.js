// ============================================================
// 로비 — 게임 시작 · 모드 진입
// ============================================================
// 원본: ShoichiSimulator_v2.1/index.html 1239~1332행 (2026-10-15 분리).
//
// 의존: 20-unity3d (enterUnity3D·u3dPending) · 10-ranking (closeChalResult) · 55-notices (maybeShowF11Notice — 클릭 시점)
// 제공: noticeThen · enterMode
//
// ⚠ 고전 스크립트다 (type="module" 아님). 파일들이 **같은 전역 스크립트 스코프**를
//   공유하므로 const/let/function 선언이 파일 경계를 넘어 그대로 보인다 —
//   분리 전 한 <script> 안에 있던 때와 의미가 완전히 같다. 대신 로드 순서가 곧 실행
//   순서이므로 index.html 의 <script> 순서(= 파일 번호)를 바꾸지 말 것.
//   같은 이름을 두 파일에서 선언하면 SyntaxError 로 페이지 전체가 죽는다.
// ============================================================

// ============================================================
// 로비
// ============================================================
// '게임 시작' = 3D 시뮬레이터 진입 (본편). 처음 진입할 때만 F11 안내를 한 번 띄우고,
// 확인을 누른 뒤에 실제로 들어간다.
let noticeThen = null; // 안내 팝업 확인 후 이어서 실행할 동작
document.getElementById('lobby-start-btn').addEventListener('click', e => {
  e.currentTarget.blur();
  if (maybeShowF11Notice()) { noticeThen = enterUnity3D; return; }
  enterUnity3D();
});
// 로비의 '설정' 버튼과 설정 모달은 없앴다 (2026-07-29).
// 그 창은 localStorage에만 쓰고 3D 게임은 읽지 않는 죽은 UI였다 — 실제로 동작하는 설정은
// 게임 안 Esc 메뉴 → '설정'(Unity PlayerPrefs)뿐이라, 같은 이름의 창이 둘이면 오해만 샀다.

// ── 3D 챌린지 진입 ──
// 3D 시뮬레이터를 띄운 뒤 Unity에 'chal-enter'를 보낸다. 로딩 중이면 sendToUnity가
// 보류했다가 'shoichi3d-ready' 시점에 발사한다. 챌린지는 카운트다운이 바로 시작되므로
// '게임 시작'과 달리 F11 안내 팝업을 띄우지 않는다 (v1.7 5044와 같은 이유).
document.getElementById('mode-chal-btn').addEventListener('click', e => {
  e.currentTarget.blur();
  closeChalResult();
  // 보류부터 걸어 둔다 — iframe을 막 띄운 직후라 unityInstance가 아직 없고,
  // 직전 세션의 죽어가는 인스턴스에 잘못 보내는 경우도 이걸로 막힌다.
  u3dPending = { m: 'OnShellCommand', c: 'chal-enter' };
  enterUnity3D();
});

// ── 나머지 3D 모드 진입 ──
// 챌린지와 같은 방식이다: 보류를 먼저 걸고 iframe을 띄운 뒤, 'shoichi3d-ready'에서 발사한다.
// 메서드 이름이 모드마다 다른 이유는 sendToUnity 위 주석 참고.
//
// 로비로 나갈 때 별도의 'exit' 명령을 보내지 않는 이유: exitUnity3D()가 iframe을
// 'about:blank'로 언로드해 wasm 힙째로 사라진다. 다음 진입은 항상 새 인스턴스다.
// (챌린지가 onLobby에서 'chal-exit'를 보내는 건 결과창 경로의 안전장치일 뿐 필수가 아니다.)
function enterMode(cmd, method) {
  return e => {
    e.currentTarget.blur();
    u3dPending = { m: method, c: cmd };
    enterUnity3D();
  };
}

// V자 각 퀴즈 — DebugSimView.Vquiz.cs
// (같은 파일에 있던 '연막무스 파훼'는 2026-07-29에 모드째 삭제됐다)
document.getElementById('mode-vquiz-btn')
  .addEventListener('click', enterMode('vquiz-enter', 'OnShellVquizCommand'));

// 단검 에임 연습 — DebugSimView.Aim.cs
// 원본(v1.7/v1.8)에 없는 3D 신규 모드다. 아레나 안에 궁 단검 2개가 놓이고, 커서를 얹고
// W를 누르면 그 자리로 비약하며 회수한다. 하나가 사라지면 즉시 하나가 새로 생겨 항상
// 2개가 유지된다. 단검 회수가 W 쿨을 0.05초로 되돌리는 쇼이치 기믹 덕분에 계속 이어 쓸
// 수 있고, 빗나간 W는 쿨을 소모하지 않는다.
// 배치는 대체로 랜덤이지만 가끔 짧은 패턴(삼각·별) 한 덩이가 섞인다 — 배치 열에 한둘쯤.
// 표적 수는 언제나 2개 그대로다. 왕복 계열·완만한 점프·사각형(궁 단검 배치)은 표적이
// 2개인 이 모드와 맞지 않아 넣지 않았다 — 이유는 SimWorld.Aim.cs의 [패턴 섞기] 참고.
// 진짜 궁 단검 배치를 타는 연습은 광물타기 연습이 그 일만 한다.
document.getElementById('mode-aim-btn')
  .addEventListener('click', enterMode('aim-enter', 'OnShellAimCommand'));

// 광물타기 연습 — DebugSimView.Mine.cs
// 원본(v1.7/v1.8)에 없는 3D 신규 모드다. 광물을 둘러싸고 궁 단검 4개가 X자로 깔리고
// 1·2·3·4 번호가 랜덤으로 붙는다. 번호 순서대로 제한 시간(기본 1초) 안에 전부 비약으로
// 타면 성공, 순서가 틀리거나 시간을 넘기면 V자 각 퀴즈처럼 새 번호로 다시 깔린다.
// 번호는 항상 시계/반시계 한 방향이다 — 대각선은 6.7m로 비약 사거리(5.5m) 밖이라
// 대각선이 연속되는 순서는 애초에 깰 수 없다.
document.getElementById('mode-mine-btn')
  .addEventListener('click', enterMode('mine-enter', 'OnShellMineCommand'));

// 궁 추격 연습 — DebugSimView.Chase.cs (2026-10-22, v2.5)
// 원본(v1.7/v1.8)에 없는 3D 신규 모드다. 개활지는 3·2·1 카운트가 끝나면 상대가 달아나기 시작하고,
// 벽 밀착은 상대가 벽에 붙어 기다리다가 W→R 을 쓰는 순간 시작한다. 상대는 도주·돌진·점멸(돌진 뒤 점멸까지)로
// 빠지거나 엠마 E(변이 1초)·아야 R(공포 1.25초)로 맞받아친다. 반응 시점·방향·Q2 장전이 판마다 바뀌고, 제한 시간
// (개활지 5초 · 벽 4초) 안에 비약을 목표 횟수(기본 3)만큼 맞히면 성공. 반응 종류·벽·Q2·목표는 게임 안 우상단에서 고른다.
document.getElementById('mode-chase-btn')
  .addEventListener('click', enterMode('chase-enter', 'OnShellChaseCommand'));

// 쇼이치 봇 1 vs 1 — DebugSimView.Duel.cs (2026-09-13)
// 원본(v1.7/v1.8)에 없는 3D 신규 모드다. 같은 킷을 가진 봇과 같은 HP로 맞붙어 먼저 0이 되는
// 쪽이 진다. 봇은 HP 달린 더미 + 두뇌로 구현돼 플레이어 스킬 코드는 손대지 않았고, 봇의 킷은
// SimWorld.Duel.cs가 같은 수치로 흉내낸다. 난이도(하·중·상)·시작 HP는 게임 안 우상단에서 고른다.
// 레벨(6~20)·무기 숙련도(1~20)·장비 5부위(보라템/풀템)는 준비 단계(우상단)에서 정하고 시작하면 잠긴다 — 봇도 같은 값을 쓴다.
// 공격력·스킬 증폭·체력·방어력·스킬 피해 계수·장비 고유 효과는 나무위키의 이터널리턴 수치(SimCore/ErStats.cs · ErEffects.cs), 특성은 ErTraits.cs.
// 쿨초기화 모드·쇼이치 클래식은 대전에 적용되지 않는다.
document.getElementById('mode-duel-btn')
  .addEventListener('click', enterMode('duel-enter', 'OnShellDuelCommand'));

// 쇼이치 클래식 — 2026-09-13부터 로비 모드가 아니다 (DebugSimView.Classic.cs)
// 기본 연습모드('게임 시작')의 좌측 옵션 패널 '쇼이치 클래식' 섹션에서 체크박스로 켜고 끈다.
// 켜짐 여부와 옵션 5개(궁 시전 0.6초·6스택·단검 스택·스택 저장·구버전 단검무스)는 Unity가
// PlayerPrefs로 기억한다. Unity의 OnClassicCommand 진입점은 남아 있어 필요하면
// sendToUnity('OnClassicCommand', 'enter:stack6=0') 식으로 부를 수는 있다.

// '시즌 12 미리보기' 모드는 2026-07-30에 삭제됐다. 그 모드의 단검무스 리워크가
// 기본 거동이 되면서 진입해도 달라지는 것이 없어졌기 때문이다. v1.7의 은신 단검무스는
// 쇼이치 클래식으로 옮겨갔다. 단검무스 레벨(1~3)은 게임 안 "능력치 옵션"에서 고른다.

// 이식 원본 (남은 작업용 메모):
//  · 로직·수치의 정답지 = ShoichiSimulator_v1.7\index.html (동결. 읽기 전용)
//  · 쇼이치 클래식만 원본이 v1.8이다 = ShoichiSimulator_v1.8\index.html
//  · 콤보 녹화/재생·공유코드 모달(#combo-modal, COMBO_VER 13 코덱)도 v1.8에 있다 — 이식 진행 중
