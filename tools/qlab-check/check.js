// Quality Lab(app-d) 데이터 생성기 검증 스크립트
//
// apps/app-d/index.html에 인라인된 생성기·통계 코드를 그대로 추출해 실행한다
// (코드 중복 없음 — HTML이 단일 진실). 생성기를 수정했다면 이 스크립트로
// "재생성해도 항상 이야기가 되는 데이터" 범위가 유지되는지 확인한다.
//
//   node tools/qlab-check/check.js
//
// 검사 범위: Cpk 0.75~1.35 · |r| 0.55~0.8 · 불량률 3~6.5% · 파레토 지배 40~75%
// (고정 8시드 + 무작위 200시드 스윕, 재현성·규격선 빈 정렬·n-가드 포함)

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', '..', 'apps', 'app-d', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// 인라인 스크립트에서 "생성기+통계 유틸" 구간만 추출 (대시보드 IIFE 직전까지)
const start = html.indexOf('/* ── 시드 RNG');
const end = html.indexOf('   대시보드 앱');
if (start < 0 || end < 0 || end <= start) {
  console.error('추출 마커를 찾지 못했습니다 — index.html 구조가 바뀌었으면 이 스크립트도 갱신하세요.');
  process.exit(2);
}
const core = html.slice(start, html.lastIndexOf('/* ═', end));

const ctx = { Math, console };
vm.createContext(ctx);
// const 선언(LINES, SPEC 등)은 vm 전역에 붙지 않으므로 명시적으로 내보낸다
vm.runInContext(core + '\n;this.SPEC = SPEC; this.LINES = LINES;', ctx, { filename: 'app-d-inline-core.js' });
const Q = ctx; // genParams, genData, processCapability, linreg, pareto, quantile, makeBins, SPEC, LINES ...

let fails = 0;
const check = (label, val, lo, hi) => {
  const ok = val >= lo && val <= hi;
  if (!ok) { fails++; console.log(`  FAIL ${label}=${val} (want ${lo}~${hi})`); }
  return ok;
};

const metrics = (seed) => {
  const p = Q.genParams(seed);
  const { records } = Q.genData(p);
  const cap = Q.processCapability(records.map(r => r.dim));
  const reg = Q.linreg(records.map(r => r.temp), records.map(r => r.step));
  const par = Q.pareto(records);
  return {
    defRate: records.filter(r => r.defect).length / records.length,
    cpk: cap.cpk, r: Math.abs(reg.r), top: par[0].share, n: records.length,
  };
};

// 고정 8시드
for (const seed of [1, 42, 777, 20260811, 3141592, 8675309, 999983, 271828]) {
  const m = metrics(seed);
  const ok = check(`seed${seed}.n`, m.n, 4000, 4000) &
    check(`seed${seed}.cpk`, m.cpk, 0.75, 1.35) &
    check(`seed${seed}.|r|`, m.r, 0.55, 0.80) &
    check(`seed${seed}.defRate`, m.defRate, 0.03, 0.065) &
    check(`seed${seed}.paretoTop`, m.top, 40, 75);
  console.log(`seed ${seed}: ${ok ? 'ok' : 'FAIL'}`);
}

// 200시드 스윕
let sweepBad = 0;
for (let s = 100; s < 300; s++) {
  const m = metrics(s);
  if (m.cpk < 0.75 || m.cpk > 1.35 || m.r < 0.55 || m.r > 0.80 ||
      m.defRate < 0.03 || m.defRate > 0.065 || m.top < 40 || m.top > 75) {
    sweepBad++; console.log(`  FAIL sweep seed=${s}`, JSON.stringify(m));
  }
}
console.log(`sweep 100..299: ${sweepBad === 0 ? 'ok' : sweepBad + ' out of range'}`);
fails += sweepBad;

// 재현성 · 규격선 빈 정렬 · n-가드
const a = Q.genData(Q.genParams(42)).records[1234];
const b = Q.genData(Q.genParams(42)).records[1234];
if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('  FAIL reproducibility'); }
const bins = Q.makeBins([9.7, 10.3]);
const onEdge = v => bins.edges.some(e => Math.abs(e - v) < 1e-9);
if (!(onEdge(Q.SPEC.LSL) && onEdge(Q.SPEC.USL))) { fails++; console.log('  FAIL spec-on-edge'); }
if (!(Q.processCapability([1, 2]) === null && Q.linreg([1], [2]) === null && Q.pareto([]) === null)) {
  fails++; console.log('  FAIL n-guards');
}

console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
