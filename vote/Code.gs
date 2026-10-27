/**
 * 아주 오래전, 내가 살았다면? — 투표 서버 (Google Apps Script)
 *
 * 설치
 * 1) script.google.com → 새 프로젝트 → 이 코드를 통째로 붙여넣기
 * 2) 아래 PIN을 원하는 숫자로 바꾸기 (선생님 화면에서 시작/결과 공개할 때 씀)
 * 3) 배포 → 새 배포 → 유형: 웹 앱 → 실행: 나 / 액세스: 모든 사용자 → 배포
 * 4) 나온 웹 앱 URL(…/exec)을 Claude에게 알려 주기
 */
var PIN = '1028';
var N = 22;      // 번호 1~22
var K = 5;       // 선택지 5개
var GRACE = 2500; // 시간 끝난 뒤 늦게 도착한 투표 허용(ms)

function doGet() {
  return out({ ok: true, data: { hello: 'vote api' } });
}

function doPost(e) {
  var req = {};
  try { req = JSON.parse(e.postData.contents); } catch (err) {}
  var fn = req.fn, a = (req.args && req.args[0]) || {};
  try {
    var data;
    if (fn === 'state') data = getState(a);
    else if (fn === 'vote') data = vote(a);
    else if (fn === 'start' || fn === 'reveal' || fn === 'reset') {
      if (String(a.pin) !== PIN) throw new Error('선생님 PIN이 맞지 않아요.');
      data = admin(fn, a);
    } else throw new Error('알 수 없는 요청이에요.');
    return out({ ok: true, data: data });
  } catch (err) {
    return out({ ok: false, error: String(err && err.message || err) });
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- 저장 ---------- */
var P = PropertiesService.getScriptProperties();
function readS() { try { return JSON.parse(P.getProperty('S')) || null; } catch (e) { return null; } }
function readV() { try { return JSON.parse(P.getProperty('V')) || {}; } catch (e) { return {}; } }
function defaultS() { return { phase: 'wait', round: 0, endsAt: 0 }; }

function phaseNow(S, now) {
  if (S.phase === 'vote' && now > S.endsAt) return 'closed';
  return S.phase;
}

/* ---------- 읽기 ---------- */
function getState(a) {
  var now = Date.now();
  var S = readS() || defaultS();
  var V = readV();
  var phase = phaseNow(S, now);
  var voted = Object.keys(V).map(Number).sort(function (x, y) { return x - y; });
  var res = { phase: phase, round: S.round, endsAt: S.endsAt, now: now, count: voted.length, voted: voted, n: N };
  var me = Number(a.n);
  if (me && V[me] != null) res.mine = V[me];
  if (phase === 'result') res.votes = V;
  return res;
}

/* ---------- 투표 ---------- */
function vote(a) {
  var n = Math.floor(Number(a.n)), k = Math.floor(Number(a.k)), round = Number(a.round);
  if (!(n >= 1 && n <= N)) throw new Error('번호를 다시 골라 주세요.');
  if (!(k >= 0 && k < K)) throw new Error('선택지를 다시 골라 주세요.');
  var lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    var now = Date.now();
    var S = readS() || defaultS();
    if (S.phase !== 'vote') throw new Error('지금은 고르는 시간이 아니에요.');
    if (round && round !== S.round) throw new Error('새 투표가 시작됐어요. 다시 골라 주세요.');
    if (now > S.endsAt + GRACE) throw new Error('시간이 끝났어요!');
    var V = readV();
    V[n] = k;
    P.setProperty('V', JSON.stringify(V));
    return { mine: k, count: Object.keys(V).length };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- 선생님 ---------- */
function admin(fn, a) {
  var lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    var now = Date.now();
    var S = readS() || defaultS();
    if (fn === 'start') {
      var secs = Math.min(120, Math.max(5, Number(a.secs) || 25));
      S = { phase: 'vote', round: now, endsAt: now + secs * 1000 };
      P.setProperty('V', '{}');
    } else if (fn === 'reveal') {
      S.phase = 'result';
    } else if (fn === 'reset') {
      S = defaultS();
      P.setProperty('V', '{}');
    }
    P.setProperty('S', JSON.stringify(S));
  } finally {
    lock.releaseLock();
  }
  return getState({});
}
