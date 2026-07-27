"use strict";
// ============================================================================
// 記憶力テスト : 純ロジック層（DOM を一切使わない。node からも読める）
// ----------------------------------------------------------------------------
// 3課題:
//   digit    数字を順に思い出す（順唱スパン）
//   rdigit   数字を逆から思い出す（逆唱スパン＝ワーキングメモリの中核）
//   corsi    光った場所を順にたどる（視空間スパン / Corsi ブロック課題）
//
// 測り方は「スパン法」。正解したら1つ長く、間違えたら1つ短く出し、
// 同じ長さで2回落ちたらその課題を終了する（階段法）。
// 最後まで安定して答えられた長さ＝スパンを、その人の成績とする。
// ============================================================================
(function (root) {

  // ---- 決定論の種（同じ日なら全員同じ問題） ----
  function dailySeed(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const START_LEN = { digit: 3, rdigit: 3, corsi: 3 };
  const MAX_LEN = 12;
  const MISS_TO_END = 2;   // 同じ長さで2回落ちたら終了
  // 1課題あたりの上限回数。落ちない人（メモを取る等）でも必ず終わるようにする。
  // 3から始めて毎回正解しても 3→12 で9回なので、9回で上限に到達する。
  const MAX_TRIALS = 9;

  // ---- 出題 ----
  // 数字列: 直前と同じ数字は続けない（「11」が読み上げにくいのと同じ理由）
  function makeDigits(len, rng) {
    const out = [];
    for (let i = 0; i < len; i++) {
      let d;
      do { d = Math.floor(rng() * 10); } while (i > 0 && d === out[i - 1]);
      out.push(d);
    }
    return out;
  }
  // 位置列: 直前と同じマスは続けない（同じ所が2回光ると1回に見えるため）
  function makeCorsi(len, cells, rng) {
    const out = [];
    for (let i = 0; i < len; i++) {
      let c;
      do { c = Math.floor(rng() * cells); } while (i > 0 && c === out[i - 1]);
      out.push(c);
    }
    return out;
  }
  function makeTrial(kind, len, rng, cells) {
    const seq = kind === "corsi" ? makeCorsi(len, cells || 9, rng) : makeDigits(len, rng);
    // 逆唱は「出した順の逆」が正解
    const answer = kind === "rdigit" ? seq.slice().reverse() : seq.slice();
    return { kind, len, seq, answer };
  }

  // ---- 採点 ----
  function isCorrect(trial, input) {
    if (!Array.isArray(input) || input.length !== trial.answer.length) return false;
    for (let i = 0; i < input.length; i++) if (input[i] !== trial.answer[i]) return false;
    return true;
  }

  // ---- 階段法の状態 ----
  function newStair(kind) {
    return { kind, len: START_LEN[kind], miss: 0, best: 0, done: false, trials: 0 };
  }
  // 1問ぶん結果を反映して、次の長さを決める（純関数: 新しい状態を返す）
  function advance(st, ok) {
    if (st.done) return st;
    const n = Object.assign({}, st, { trials: st.trials + 1 });
    if (ok) {
      n.best = Math.max(st.best, st.len);
      n.miss = 0;
      // 上限の長さを正解したら、それ以上は測れないのでそこで終了
      if (st.len >= MAX_LEN) { n.done = true; }
      else { n.len = st.len + 1; }
    } else {
      n.miss = st.miss + 1;
      if (n.miss >= MISS_TO_END) { n.done = true; }
      else { n.len = Math.max(START_LEN[st.kind], st.len - 1); }
    }
    // 回数の上限（落ち続けない人でも必ず終わる保険）
    if (n.trials >= MAX_TRIALS) n.done = true;
    return n;
  }

  // ---- 偏差値（このテストの採点モデルによる擬似値。全国調査ではない） ----
  // 素点 = 3課題のスパンの重みつき和。逆唱を重く見る（ワーキングメモリの中核のため）。
  // 基準値は下の COMMENT を参照。
  const W = { digit: 1.0, rdigit: 1.4, corsi: 1.2 };
  // 一般に、健康な成人の目安は順唱7前後・逆唱5前後・視空間5前後とされる
  // （順唱7±2 は Miller 1956 の古典的な指摘）。それを素点50に置いた。
  const REF_MEAN = 7 * W.digit + 5 * W.rdigit + 5 * W.corsi;   // = 20.0
  const REF_SD = 3.2;                                           // 素点1目盛≒偏差値3強

  function rawScore(spans) {
    return (spans.digit || 0) * W.digit + (spans.rdigit || 0) * W.rdigit + (spans.corsi || 0) * W.corsi;
  }
  function hensachi(spans) {
    const raw = rawScore(spans);
    const h = 50 + 10 * (raw - REF_MEAN) / REF_SD;
    return Math.max(25, Math.min(80, Math.round(h)));
  }
  function title(h) {
    if (h >= 70) return "頭の中にメモ帳がある";
    if (h >= 62) return "電話番号は聞けば覚える";
    if (h >= 55) return "買い物メモを持たない人";
    if (h >= 45) return "ふつうに覚えられる";
    if (h >= 38) return "メモを取ると強い";
    return "スマホに任せるタイプ";
  }

  // ---- 弱点の指摘（3課題の偏りから） ----
  function weakness(spans) {
    const d = spans.digit || 0, r = spans.rdigit || 0, c = spans.corsi || 0;
    if (d === 0 && r === 0 && c === 0) return "3課題とも最初の長さで止まりました。操作に戸惑っただけかもしれないので、もう一度試してみてください。";
    if (d - r >= 3) return "覚えるのは得意だが、頭の中で並べ替えるのが苦手なタイプ。逆唱だけ落ちている。";
    if (c - ((d + r) / 2) >= 2) return "場所で覚えるのが得意なタイプ。記憶術（場所法）が向いている。";
    if (((d + r) / 2) - c >= 2) return "言葉で覚えるのが得意なタイプ。図や地図より、声に出すほうが残る。";
    if (d >= 8 && r >= 6) return "順唱・逆唱ともに高い。短期記憶の容量そのものが大きい。";
    return "3課題とも大きな偏りなし。";
  }

  const api = { dailySeed, mulberry, makeDigits, makeCorsi, makeTrial, isCorrect,
                newStair, advance, rawScore, hensachi, title, weakness,
                START_LEN, MAX_LEN, MISS_TO_END, MAX_TRIALS, W, REF_MEAN, REF_SD };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MEM = api;
})(typeof window !== "undefined" ? window : globalThis);
