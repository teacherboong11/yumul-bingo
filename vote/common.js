/* 공통: 서버 주소, 선택지, 소리, 통신 */
var VOTE_API = "https://script.google.com/macros/s/AKfycbw8TB782By_nQijqxPs7jLLMXAkgD9u-VMzC0bhtk-GaS8_bVUeltdNsTpKaulNq7p5/exec";  // Apps Script 웹 앱 주소(…/exec)
var N = 22;
var OPTS = [
  { emo: "🏠", nm: "튼튼한 집",            ds: "비바람과 맹수를 막아 주는", c: "#ff9f43" },
  { emo: "🌾", nm: "곡식 한 가마",          ds: "1년 내내 먹을 수 있는",     c: "#f6d14b" },
  { emo: "⚔️", nm: "강한 무기",            ds: "적도 맹수도 물리치는",      c: "#ff5a5f" },
  { emo: "🙏", nm: "소원 비는 불상",        ds: "매일 소원을 빌 수 있는",    c: "#b98cff" },
  { emo: "🌏", nm: "먼 나라의 신기한 물건", ds: "배를 타고 바다 건너온",     c: "#3fd3c6" }
];

function $(s) { return document.querySelector(s); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function josa(w) { var c = w.charCodeAt(w.length - 1) - 0xAC00; return (c >= 0 && c % 28) ? "을" : "를"; }
function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

function gs(fn, args) {
  if (!VOTE_API) return Promise.reject(new Error("아직 투표 서버가 연결되지 않았어요."));
  return fetch(VOTE_API, { method: "POST", credentials: "omit", redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ fn: fn, args: [args || {}] }) })
    .then(function (r) { if (!r.ok) throw new Error("연결에 문제가 있어요."); return r.json(); })
    .then(function (j) { if (!j.ok) throw new Error(j.error || "요청을 처리하지 못했어요."); return j.data; });
}
function errMsg(e) { return (e && e.message) ? String(e.message).replace(/^Error:\s*/, "") : "연결에 문제가 있어요."; }

/* 서버 시계 맞추기 */
var clockOffset = 0;
function syncClock(st, sentAt) { if (st && st.now) { var rtt = Date.now() - sentAt; clockOffset = st.now + rtt / 2 - Date.now(); } }
function serverNow() { return Date.now() + clockOffset; }

/* 소리 */
var ac = null;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ac && ac.state === "suspended") ac.resume(); return ac; }
function tone(f, d, type, vol, when, slide) {
  var a = audio(); if (!a) return; d = d || .12; var t = a.currentTime + (when || 0);
  var o = a.createOscillator(), g = a.createGain(); o.type = type || "square"; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
  g.gain.setValueAtTime(vol || .08, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .02);
}
var sfx = {
  start: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, .14, "square", .07, i * .09); }); },
  tick: function () { tone(880, .05, "triangle", .07); },
  hurry: function () { tone(1320, .08, "square", .09); },
  buzz: function () { tone(180, .7, "sawtooth", .12, 0, 90); tone(120, .7, "square", .08); },
  blip: function (i) { tone(600 + ((i || 0) % 8) * 70, .08, "square", .06); },
  pick: function () { tone(660, .07, "square", .07); tone(990, .1, "square", .07, .07); },
  roll: function () { for (var i = 0; i < 18; i++) tone(140 + Math.random() * 40, .05, "triangle", .06, i * .06); },
  fan: function () { [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone(f, .22, "square", .08, i * .13); }); },
  click: function () { tone(1000, .04, "square", .05); }
};

/* 별 배경 */
function stars(canvas) {
  var x = canvas.getContext("2d"), W, H, S = [];
  function sz() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; S = []; for (var i = 0; i < 110; i++) S.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + .3, p: Math.random() * 6 }); }
  sz(); addEventListener("resize", sz);
  var rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  (function f(t) { x.clearRect(0, 0, W, H); for (var i = 0; i < S.length; i++) { var s = S[i]; x.globalAlpha = .4 + .6 * Math.abs(Math.sin(t / 900 + s.p)); x.fillStyle = "#fff"; x.beginPath(); x.arc(s.x, s.y, s.r, 0, 7); x.fill(); } if (!rm) requestAnimationFrame(f); })(0);
}
