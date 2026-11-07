// ============================================================
// 셸 개요 + Supabase 연결 설정
// ============================================================
// 원본: ShoichiSimulator_v2.1/index.html 886~898행 (2026-10-15 분리).
//
// 의존: 없음 (맨 처음 로드)
// 제공: SUPABASE_URL · SUPABASE_ANON_KEY
//
// ⚠ 고전 스크립트다 (type="module" 아님). 파일들이 **같은 전역 스크립트 스코프**를
//   공유하므로 const/let/function 선언이 파일 경계를 넘어 그대로 보인다 —
//   분리 전 한 <script> 안에 있던 때와 의미가 완전히 같다. 대신 로드 순서가 곧 실행
//   순서이므로 index.html 의 <script> 순서(= 파일 번호)를 바꾸지 말 것.
//   같은 이름을 두 파일에서 선언하면 SyntaxError 로 페이지 전체가 죽는다.
// ============================================================

// ============================================================
// 쇼이치 시뮬레이터 — 3D 전용 셸
// ============================================================
// 이 페이지는 로비/모달/랭킹만 담당하고, 게임 본체는 unity3d/(Unity WebGL)가 전부 맡는다.
// v1.8까지 있던 2D 캔버스 게임(그리기·물리·스킬·이펙트)과 2D 전용 모드 로직은 v1.9에서 제거했다.
// 단, 그 모드들은 3D로 다시 만들 예정이므로 로비의 모드 목록·챌린지 결과창·랭킹 UI는 남겨뒀다.
// → 되살리는 방법은 아래 '[보류] 3D 재구현 대기 모드' 블록 참고.

// ── Supabase 연결 설정 ──
// anon public 키는 페이지에 노출되어도 되는 공개 키다 — 권한은 DB의 RLS 정책이 제한한다.
const SUPABASE_URL = 'https://wasccnzalbwthaiwoutp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indhc2NjbnphbGJ3dGhhaXdvdXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NDI4ODQsImV4cCI6MjA5OTMxODg4NH0.djtWUifZOH_LAVJqIHT1OqdJ_7xCNeCf2U6sR_hAtvI';
