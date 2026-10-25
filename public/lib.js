/* Alma brasileira – logique pure (sans DOM), testée dans tests/lib.test.mjs */
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.ALMA = factory(); })(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const LANGS = ["fr", "nl", "de", "en", "pt"];
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/[’']/g, " ").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

  /* ---------- nombres et unités ---------- */
  const FR = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
  const WHOLE = new Set(["oeuf", "jaune-oeuf", "cuisse-poulet", "saucisse-fumee", "pequi", "citron", "citron-vert", "pomme-terre", "tomate", "carotte"]);
  const COUNT_U = new Set([null, undefined, "clove", "leaf"]);
  const roundTo = (x, step) => Math.round(x / step) * step;
  const clean = (x) => Math.round(x * 1000) / 1000;

  function scale(q, u, f, key) {
    if (q == null) return { q: null, u: u || null, approx: false };
    const raw = q * f; let r = raw, unit = u || null;
    if (unit === "g") { if (raw >= 1000) { r = roundTo(raw / 1000, 0.05); unit = "kg"; } else r = raw < 50 ? Math.max(1, Math.round(raw)) : raw < 200 ? roundTo(raw, 5) : roundTo(raw, 10); }
    else if (unit === "kg") r = roundTo(raw, 0.05);
    else if (unit === "ml") { if (raw >= 1000) { r = roundTo(raw / 1000, 0.05); unit = "l"; } else r = raw < 50 ? Math.max(1, Math.round(raw)) : raw < 200 ? roundTo(raw, 5) : roundTo(raw, 10); }
    else if (unit === "l") { if (raw < 1) { r = roundTo(raw * 1000, 10); unit = "ml"; } else r = roundTo(raw, 0.05); }
    else if (unit === "tsp") { if (raw >= 3) { r = roundTo(raw / 3, raw / 3 < 4 ? 0.25 : 0.5); unit = "tbsp"; } else r = roundTo(raw, 0.25); }
    else if (unit === "tbsp") r = roundTo(raw, raw < 4 ? 0.25 : 0.5);
    else if (unit === "cup") r = roundTo(raw, 0.25);
    else if (COUNT_U.has(unit) || unit === "can" || unit === "sachet" || unit === "bunch") {
      const whole = WHOLE.has(key) || unit === "clove" || unit === "leaf" || raw >= 4;
      r = whole ? Math.max(1, Math.round(raw)) : Math.max(0.5, roundTo(raw, 0.5));
    }
    r = clean(r);
    const base = unit === u ? raw : (u === "g" ? raw / 1000 : u === "ml" ? raw / 1000 : u === "l" ? raw * 1000 : u === "tsp" ? raw / 3 : raw);
    const approx = Math.abs(r - base) / Math.max(base, 0.0001) > 0.12;
    return { q: r, u: unit, approx };
  }

  function fmtNum(x, lang) {
    if (x == null) return "";
    const whole = Math.floor(x + 1e-9), frac = clean(x - whole);
    if (frac === 0) return String(whole);
    if (FR[frac]) return (whole ? whole + " " : "") + FR[frac];
    if (Math.abs(frac - 1 / 3) < 0.02) return (whole ? whole + " " : "") + "⅓";
    if (Math.abs(frac - 2 / 3) < 0.02) return (whole ? whole + " " : "") + "⅔";
    const s = String(clean(x));
    return lang === "en" ? s : s.replace(".", ",");
  }

  const U = {
    g: { all: "g" }, kg: { all: "kg" }, ml: { all: "ml" }, l: { all: "l" },
    tsp: { fr: "c. à c.", nl: "tl", de: "TL", en: "tsp", pt: "c. de chá" },
    tbsp: { fr: "c. à s.", nl: "el", de: "EL", en: "tbsp", pt: "c. de sopa" },
    cup: { fr: "tasse|tasses", nl: "kopje|kopjes", de: "Tasse|Tassen", en: "cup|cups", pt: "xícara|xícaras" },
    can: { fr: "boîte|boîtes", nl: "blik|blikken", de: "Dose|Dosen", en: "can|cans", pt: "lata|latas" },
    sachet: { fr: "sachet|sachets", nl: "zakje|zakjes", de: "Päckchen|Päckchen", en: "sachet|sachets", pt: "sachê|sachês" },
    bunch: { fr: "botte|bottes", nl: "bos|bossen", de: "Bund|Bünde", en: "bunch|bunches", pt: "maço|maços" },
  };
  const METRIC = new Set(["g", "kg", "ml", "l", "tsp", "tbsp"]);
  const isPlural = (q, lang) => (lang === "fr" ? q >= 2 : q !== 1 && q != null);
  const pick = (s, plural) => { const p = String(s).split("|"); return plural && p[1] ? p[1] : p[0]; };
  const nameOf = (ING, key, lang, plural) => { const e = ING[key]; if (!e) return key; return pick(e.n[LANGS.indexOf(lang)], plural); };
  const elide = (lang, name) => (lang === "fr" && /^[aeiouyàâéèêëîïôöùûüœh]/i.test(name) && !/^haricot/i.test(name) ? "d’" : lang === "fr" ? "de " : lang === "pt" ? "de " : "");

  function unitLabel(u, lang, q) {
    const e = U[u]; if (!e) return "";
    return pick(e.all || e[lang], isPlural(q, lang) && !(lang === "fr" && q < 2));
  }
  /* texte d'une ligne d'ingrédient, pour une langue et un facteur de portions */
  function ingredientText(item, ING, lang, f) {
    const sc = scale(item.q, item.u, f || 1, item.k);
    const plural = sc.q != null && isPlural(sc.q, lang);
    if (sc.q == null) return nameOf(ING, item.k, lang, false);
    const noLabel = !sc.u || sc.u === "clove" || sc.u === "leaf";
    if (noLabel) return fmtNum(sc.q, lang) + " " + nameOf(ING, item.k, lang, plural);
    const lab = unitLabel(sc.u, lang, sc.q);
    const nm = nameOf(ING, item.k, lang, false);
    let join = " ";
    if (lang === "fr" || lang === "pt") join = " " + elide(lang, nm);
    else if (lang === "en" && !METRIC.has(sc.u)) join = " of ";
    return fmtNum(sc.q, lang) + " " + lab + join + nm;
  }
  const SERVE = { fr: "pour servir", nl: "om te serveren", de: "zum Servieren", en: "to serve", pt: "para servir" };
  const TASTE = { fr: "au goût", nl: "naar smaak", de: "nach Geschmack", en: "to taste", pt: "a gosto" };
  const OPT = { fr: "facultatif", nl: "optioneel", de: "optional", en: "optional", pt: "opcional" };
  function ingredientLine(item, ING, lang, f) {
    let t = ingredientText(item, ING, lang, f);
    if (item.q == null) t += " (" + (item.m === "serve" ? SERVE[lang] : TASTE[lang]) + ")";
    else if (item.m === "serve") t += " (" + SERVE[lang] + ")";
    if (item.o) t += " (" + OPT[lang] + ")";
    return t;
  }

  /* ---------- liste de courses ---------- */
  const FAMILY = { g: ["m", 1], kg: ["m", 1000], ml: ["v", 1], l: ["v", 1000], tsp: ["s", 1], tbsp: ["s", 3], cup: ["cup", 1], can: ["can", 1], sachet: ["sachet", 1], bunch: ["bunch", 1], clove: ["n", 1], leaf: ["n", 1] };
  const famOf = (u) => FAMILY[u || ""] || (u ? [u, 1] : ["n", 1]);
  const BASEU = { m: "g", v: "ml", s: "tsp", cup: "cup", can: "can", sachet: "sachet", bunch: "bunch", n: null };
  /* entries: [{k, q, u, from}] -> lignes fusionnées uniquement si les unités sont compatibles */
  function mergeList(entries) {
    const q = new Map(), free = new Map();
    for (const e of entries) {
      if (e.k === "eau") continue;
      if (e.q == null) { const c = free.get(e.k) || { k: e.k, q: null, u: null, from: [] }; if (e.from && !c.from.includes(e.from)) c.from.push(e.from); free.set(e.k, c); continue; }
      const [fam, mul] = famOf(e.u), id = e.k + "|" + fam;
      const c = q.get(id) || { k: e.k, fam, total: 0, from: [] };
      c.total += e.q * mul; if (e.from && !c.from.includes(e.from)) c.from.push(e.from); q.set(id, c);
    }
    const out = [...q.values()].map((c) => ({ k: c.k, q: clean(c.total), u: BASEU[c.fam], from: c.from }));
    for (const c of free.values()) { const t = out.find((x) => x.k === c.k); if (t) c.from.forEach((s) => !t.from.includes(s) && t.from.push(s)); else out.push(c); }
    return out;
  }

  /* ---------- recherche d'ingrédients disponibles ---------- */
  const GROUPS = [
    ["poulet", "chicken", "kip", "huhn", "hahnchen", "frango", ["cuisse-poulet", "blanc-poulet", "blanc-poulet-cru"]],
    ["riz", "rice", "rijst", "reis", "arroz", ["riz", "riz-long"]],
    ["haricots", "haricot", "beans", "bonen", "bohnen", "feijao", ["haricots-noirs", "haricots-rouges"]],
    ["chocolat", "chocolate", "chocolade", "schokolade", "chocolate", ["cacao", "chocolat-noir"]],
    ["creme", "cream", "room", "sahne", "creme de leite", ["creme", "creme-fraiche"]],
    ["poivron", "paprika", "pepper", "pimentao", ["poivron", "poivron-rouge", "poivron-vert"]],
    ["fromage", "cheese", "kaas", "kase", "queijo", ["fromage-rape", "gouda-vieux"]],
    ["boeuf", "beef", "rundvlees", "rindfleisch", "carne", ["boeuf-effiloche"]],
    ["manioc", "cassava", "cassave", "maniok", "mandioca", "aipim", "yuca", ["manioc"]],
    ["farine de manioc", "cassava flour", "cassavemeel", "maniokmehl", "farinha de mandioca", ["farine-manioc"]],
    ["pate de tomate", "tomatenpuree", "tomato puree", "tomatenmark", ["concentre-tomate"]],
    ["noix de coco", "coconut", "kokos", "coco", ["noix-coco", "lait-coco"]],
  ];
  const STOP = new Set(["de", "du", "des", "la", "le", "les", "d", "of", "van", "von", "het", "en", "e", "do", "da", "dos", "das", "ou", "et", "or", "of", "oder"]);
  const stem = (w) => w.replace(/(en|es|s|x)$/, "");
  const toks = (t) => norm(t).split(" ").filter((w) => w && !STOP.has(w)).map(stem);
  function buildIndex(ING) {
    const idx = [];
    for (const [k, e] of Object.entries(ING)) for (const n of e.n) for (const v of String(n).split("|")) idx.push({ t: toks(v), n: norm(v), ks: [k] });
    for (const g of GROUPS) { const keys = g[g.length - 1]; for (const w of g.slice(0, -1)) idx.push({ t: toks(w), n: norm(w), ks: keys }); }
    return idx;
  }
  /* "poulet", "Pommes de terre", "garnalen" -> clés d'ingrédients */
  function parseInput(text, idx) {
    const q = toks(text); if (!q.length || norm(text).length < 2) return [];
    const hit = new Set(); let exact = false;
    const eq = (a, b) => a.length === b.length && a.every((w, i) => w === b[i]);
    for (const e of idx) if (eq(q, e.t)) { e.ks.forEach((k) => hit.add(k)); exact = true; }
    if (!exact) for (const e of idx) if (q.every((w) => w.length >= 3 && e.t.some((x) => x === w || (w.length >= 4 && x.startsWith(w))))) e.ks.forEach((k) => hit.add(k));
    return [...hit];
  }
  const essential = (r) => r.keys.filter((x) => !x.o && !x.p).map((x) => x.k);
  function matchRecipe(r, have) {
    const ess = essential(r), h = new Set(have);
    const miss = ess.filter((k) => !h.has(k)), got = ess.filter((k) => h.has(k));
    const opt = r.keys.filter((x) => x.o && !x.p).map((x) => x.k);
    return { slug: r.slug, essentials: ess, have: got, missing: miss, optional: opt, optionalMissing: opt.filter((k) => !h.has(k)), score: ess.length ? Math.round((100 * got.length) / ess.length) : 0, doable: miss.length === 0 && ess.length > 0 };
  }

  /* ---------- filtres ---------- */
  function filterRecipes(list, f, extra) {
    extra = extra || {};
    const q = norm(f.q || "");
    return list.filter((r) => {
      if (f.cat && r.category !== f.cat) return false;
      if (f.region && r.region !== f.region) return false;
      if (f.maxTotal && r.total > f.maxTotal) return false;
      if (f.maxActive && r.prep + r.cook > f.maxActive) return false;
      if (f.maxDiff && r.diff > f.maxDiff) return false;
      if (f.tag && !r.tags.includes(f.tag)) return false;
      if (f.favOnly && !(extra.favs && extra.favs.has(r.slug))) return false;
      for (const d of f.diets || []) if (!r.diet[d]) return false;
      for (const a of f.avoid || []) if (r.allergens.includes(a)) return false;
      for (const k of f.avoidKeys || []) if (r.keys.some((x) => x.k === k)) return false;
      if (q) {
        const hay = norm(Object.values(r.title).join(" ") + " " + Object.values(r.description).join(" ") + " " + (r.kw || []).join(" ") + " " + (extra.catName ? extra.catName(r.category) : "") + " " + (extra.regionName ? extra.regionName(r.region) : ""));
        if (!q.split(" ").every((w) => hay.includes(w))) return false;
      }
      return true;
    });
  }
  const dayIndex = (d) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const recipeOfDay = (list, d) => (list.length ? list[dayIndex(d || new Date()) % list.length] : null);
  const SHOP = ["fl", "vi", "fr", "se", "ep", "ex", "au"];

  return { LANGS, norm, scale, fmtNum, ingredientText, ingredientLine, unitLabel, mergeList, buildIndex, parseInput, matchRecipe, essential, filterRecipes, recipeOfDay, SHOP, famOf, nameOf };
});
