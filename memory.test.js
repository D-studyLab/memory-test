"use strict";
// 記憶力テストの品質ゲート:  node memory.test.js
const M = require("./memory.js");

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name + (extra ? " — " + extra : "")); }
  else { fail++; console.log("  ✗ " + name + (extra ? " — " + extra : "")); }
}

console.log("\n[決定論]");
{
  const a = M.dailySeed("2026-07-27"), b = M.dailySeed("2026-07-27"), c = M.dailySeed("2026-07-28");
  ok("同じ日付なら同じ種", a === b, String(a));
  ok("別の日付なら別の種", a !== c);
  const r1 = M.mulberry(a), r2 = M.mulberry(a);
  const s1 = M.makeDigits(9, r1), s2 = M.makeDigits(9, r2);
  ok("同じ種なら同じ数字列", s1.join("") === s2.join(""), s1.join(""));
}

console.log("\n[出題の性質]");
{
  const rng = M.mulberry(12345);
  let bad = 0, n = 0;
  for (let t = 0; t < 400; t++) {
    const len = 3 + (t % 8);
    const d = M.makeDigits(len, rng);
    n++;
    if (d.length !== len) bad++;
    for (let i = 1; i < d.length; i++) if (d[i] === d[i - 1]) bad++;
    if (d.some(x => x < 0 || x > 9 || !Number.isInteger(x))) bad++;
  }
  ok("数字列: 長さ・範囲・同じ数字の連続なし（400回）", bad === 0, n + "件検査");

  let bad2 = 0;
  for (let t = 0; t < 400; t++) {
    const len = 3 + (t % 8);
    const c = M.makeCorsi(len, 9, rng);
    if (c.length !== len) bad2++;
    for (let i = 1; i < c.length; i++) if (c[i] === c[i - 1]) bad2++;
    if (c.some(x => x < 0 || x > 8)) bad2++;
  }
  ok("位置列: 長さ・範囲・同じマスの連続なし（400回）", bad2 === 0);
}

console.log("\n[逆唱の正解]");
{
  const rng = M.mulberry(7);
  const t = M.makeTrial("rdigit", 5, rng);
  ok("逆唱の正解は出題の逆順", t.answer.join("") === t.seq.slice().reverse().join(""),
     t.seq.join("") + " → " + t.answer.join(""));
  const f = M.makeTrial("digit", 5, rng);
  ok("順唱の正解は出題と同じ", f.answer.join("") === f.seq.join(""));
  ok("正解の判定が効く", M.isCorrect(t, t.answer) === true && M.isCorrect(t, t.seq) === false);
  ok("長さ違いは不正解", M.isCorrect(t, t.answer.slice(0, 4)) === false);
  ok("配列でなければ不正解", M.isCorrect(t, null) === false);
}

console.log("\n[階段法]");
{
  let st = M.newStair("digit");
  const start = st.len;
  st = M.advance(st, true);
  ok("正解すると1つ長くなる", st.len === start + 1, start + " → " + st.len);
  ok("元の状態を書き換えていない", M.newStair("digit").len === start);
  let s2 = M.advance(M.newStair("digit"), false);
  ok("1回落ちても終わらない", s2.done === false && s2.miss === 1);
  s2 = M.advance(s2, false);
  ok("同じ長さで2回落ちたら終了", s2.done === true, "trials=" + s2.trials);
  ok("終了後は状態が変わらない", M.advance(s2, true) === s2);
  let s3 = M.newStair("corsi");
  for (let i = 0; i < 30; i++) s3 = M.advance(s3, true);
  ok("上限を超えない", s3.len <= M.MAX_LEN, "len=" + s3.len);
  ok("正解し続けても必ず終わる（無限に続かない）", s3.done === true, "trials=" + s3.trials);
  ok("回数の上限を超えない", s3.trials <= M.MAX_TRIALS, "trials=" + s3.trials + " / 上限" + M.MAX_TRIALS);
  ok("best は到達した最長", s3.best >= M.MAX_LEN - 1, "best=" + s3.best);
  // 落ちたり正解したりを繰り返しても必ず終わる
  let mixed = M.newStair("digit"), steps = 0;
  while (!mixed.done && steps < 500) { mixed = M.advance(mixed, steps % 3 !== 2); steps++; }
  ok("正解と誤答が混ざっても必ず終わる", mixed.done === true, steps + "回で終了");
  let s4 = M.newStair("digit");
  s4 = M.advance(s4, false);
  ok("下限を割らない", s4.len >= M.START_LEN.digit, "len=" + s4.len);
}

console.log("\n[偏差値]");
{
  const ref = { digit: 7, rdigit: 5, corsi: 5 };
  ok("目安どおりの成績はほぼ50", Math.abs(M.hensachi(ref) - 50) <= 1, "→ " + M.hensachi(ref));
  const hi = M.hensachi({ digit: 11, rdigit: 9, corsi: 9 });
  const lo = M.hensachi({ digit: 3, rdigit: 3, corsi: 3 });
  ok("良い成績ほど高い", hi > 50 && lo < 50, lo + " … 50 … " + hi);
  ok("上下で頭打ちする", M.hensachi({ digit: 12, rdigit: 12, corsi: 12 }) <= 80 &&
                          M.hensachi({ digit: 0, rdigit: 0, corsi: 0 }) >= 25,
     M.hensachi({ digit: 0, rdigit: 0, corsi: 0 }) + " 〜 " + M.hensachi({ digit: 12, rdigit: 12, corsi: 12 }));
  ok("逆唱の重みが順唱より大きい", M.W.rdigit > M.W.digit);
  ok("逆唱が1伸びるほうが順唱より上がる",
     M.hensachi({ digit: 7, rdigit: 6, corsi: 5 }) > M.hensachi({ digit: 8, rdigit: 5, corsi: 5 }));
  let mono = true, prev = -1;
  for (let s = 0; s <= 12; s++) { const h = M.hensachi({ digit: s, rdigit: s, corsi: s }); if (h < prev) mono = false; prev = h; }
  ok("スパンが伸びて偏差値が下がることはない", mono);
}

console.log("\n[称号と弱点]");
{
  const seen = new Set();
  for (let h = 25; h <= 80; h++) seen.add(M.title(h));
  ok("称号が段階的に出る", seen.size >= 5, [...seen].join(" / "));
  ok("称号は必ず返る", typeof M.title(50) === "string" && M.title(50).length > 0);
  ok("逆唱だけ低いと指摘される", /並べ替え/.test(M.weakness({ digit: 8, rdigit: 4, corsi: 6 })));
  ok("位置が高いと場所法を勧める", /場所法/.test(M.weakness({ digit: 5, rdigit: 4, corsi: 8 })));
  ok("偏りがなければその旨を返す", typeof M.weakness({ digit: 6, rdigit: 5, corsi: 5 }) === "string");
}

console.log("\n" + (fail === 0 ? "✅ " : "❌ ") + pass + " PASS / " + fail + " FAIL\n");
process.exit(fail === 0 ? 0 : 1);
