"use strict";
/* Alma brasileira – application (aucune dépendance). Données : recipes.json, ingredients.json, regions.json, glossary.json. */
const A = window.ALMA, TXT = window.I18N, CFG = window.ALMA_CONFIG || {};
const LANGS = A.LANGS;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ST = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
const SS = { get(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

let lang = ST.get("lang", "");
if (!LANGS.includes(lang)) { lang = (navigator.language || "fr").slice(0, 2); if (!LANGS.includes(lang)) lang = "fr"; }
let token = ST.get("token", ""), user = ST.get("user", null);
let RECIPES = [], ING = {}, REG = {}, GLOSS = [], IDX = [], loaded = false, seq = 0, msgTimer, timerQ, pend = null, openThread = null;
const F = { q: "", cat: "", region: "", maxTotal: 0, maxDiff: 0, fav: false, ...ST.get("prefs", { diets: [], avoid: [], avoidIng: "" }) };
F.diets = F.diets || []; F.avoid = F.avoid || [];
const tt = (k, v) => { let s = (TXT[lang] && TXT[lang][k]) || (TXT.fr && TXT.fr[k]) || k; if (v) for (const x in v) s = s.replace("{" + x + "}", v[x]); return s; };
const L10 = (o) => (o && (o[lang] || o.fr)) || "";
const catName = (c) => tt("cat" + c[0].toUpperCase() + c.slice(1));
const regName = (c) => (REG[c] ? L10(REG[c].name) : c);
const who = (a) => (a === "Compte supprimé" ? tt("gone") : a);
const fmtDate = (d) => new Date(d).toLocaleDateString(lang === "pt" ? "pt-BR" : lang);
const fmtMin = (m) => { if (!m) return "0 " + tt("minAbbr"); const h = Math.floor(m / 60), r = m % 60; return h ? h + " " + tt("hAbbr") + (r ? " " + String(r).padStart(2, "0") : "") : m + " " + tt("minAbbr"); };
const setAuth = (t, u) => { if (!t) { try { Object.keys(localStorage).filter((k) => k.startsWith("rc:")).forEach((k) => localStorage.removeItem(k)); } catch (e) {} Object.keys(FULL).forEach((k) => delete FULL[k]); } token = t; user = u; ST.set("token", t); ST.set("user", u); };
const FULL = {};

function msg(text) { const b = $("#banner"); b.textContent = text; b.hidden = false; clearTimeout(msgTimer); msgTimer = setTimeout(() => { b.hidden = true; }, 4500); }
async function api(path, method = "GET", body) {
  const h = { "Content-Type": "application/json" }; if (token) h.Authorization = "Bearer " + token;
  let r; try { r = await fetch("/api" + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined }); } catch (e) { const er = new Error(tt("err")); er.network = true; throw er; }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { if (r.status === 401 && token) { setAuth("", null); render(); } const er = new Error(j.error || tt("err")); er.status = r.status; throw er; }
  return j;
}
const showErr = (e) => { const m = $("#dlg[open] .err") || $("#main .err"); if (m) m.textContent = e.message; else msg(e.message); };

/* ---------- données ---------- */
async function loadData() {
  const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(u); return r.json(); };
  [RECIPES, ING, REG, GLOSS] = await Promise.all([get("recipes.json"), get("ingredients.json"), get("regions.json"), get("glossary.json")]);
  IDX = A.buildIndex(ING); loaded = true;
}
async function getFull(slug) {
  if (FULL[slug]) return FULL[slug];
  try { const j = await api("/recipes/" + encodeURIComponent(slug)); FULL[slug] = j.recipe; ST.set("rc:" + slug, j.recipe); return j.recipe; }
  catch (e) { if (e.network) { const c = ST.get("rc:" + slug, null); if (c) { FULL[slug] = c; return c; } } throw e; }
}

/* ---------- état personnel (cet appareil) ---------- */
const favs = () => new Set(ST.get("favs", []));
const toggleFav = (s) => { const f = favs(); f.has(s) ? f.delete(s) : f.add(s); ST.set("favs", [...f]); };
const pushRecent = (s) => { const r = ST.get("recent", []).filter((x) => x !== s); r.unshift(s); ST.set("recent", r.slice(0, 12)); };
const SHOP0 = () => ST.get("shop", { entries: [], manual: [], done: {}, recipes: {} });

/* ---------- briques d'affichage ---------- */
const diffDots = (d) => `<span class="dots" role="img" aria-label="${esc(tt("fDiff"))}: ${esc(tt("diff" + d))}">${"●".repeat(d)}${"○".repeat(3 - d)}</span>`;
function photo(r, big) {
  if (r.img) return `<img class="ph-img" src="${esc(r.img)}" alt="${esc(L10(r.title))}" loading="lazy" decoding="async" data-emoji="${esc(r.emoji)}" data-cat="${esc(r.category)}">`;
  return `<div class="ph ph-${esc(r.category)}${big ? " big" : ""}" role="img" aria-label="${esc(L10(r.title))} – ${esc(tt("photoSoon"))}"><span aria-hidden="true">${esc(r.emoji)}</span></div>`;
}
function card(r) {
  const f = favs().has(r.slug);
  return `<article class="card"><a class="cardlink" href="#recette/${esc(r.slug)}">${photo(r)}<div class="b"><span class="tag">${esc(catName(r.category))} · ${esc(fmtMin(r.total))}</span><h3>${esc(L10(r.title))}</h3><p>${esc(L10(r.description))}</p><span class="meta">${diffDots(r.diff)}${r.diet.veg ? `<span class="pill">${esc(tt("veg"))}</span>` : ""}</span></div></a><button class="heart" type="button" data-fav="${esc(r.slug)}" aria-pressed="${f}" aria-label="${esc(f ? tt("favDel") : tt("favAdd"))}: ${esc(L10(r.title))}">${f ? "♥" : "♡"}</button></article>`;
}
const row = (title, list, href) => list.length ? `<section class="sec"><div class="sech"><h2>${esc(title)}</h2>${href ? `<a class="seeall" href="${href}">${esc(tt("seeAll"))} →</a>` : ""}</div><div class="rail">${list.map(card).join("")}</div></section>` : "";
const needLogin = (t) => `<h1>${esc(t)}</h1><p>${esc(tt("need"))}</p><button class="btn" type="button" data-auth>${esc(tt("login"))}</button>`;
function showDlg(html, labelled = true) { const d = $("#dlg"); d.innerHTML = html; if (labelled) d.setAttribute("aria-labelledby", "dt"); else d.removeAttribute("aria-labelledby"); if (!d.open) d.showModal(); }
const dlgHead = (t) => `<div class="dh"><h2 id="dt">${t}</h2><button class="x" type="button" aria-label="${esc(tt("close"))}" data-close>×</button></div>`;

/* ---------- navigation ---------- */
const MAIN = [["accueil", "nHome", "🏠"], ["recettes", "nRecipes", "📖"], ["cuisiner", "nCook", "🥘"], ["courses", "nShop", "🛒"], ["favoris", "nFavs", "♥"]];
const MORE = [["regions", "nRegions"], ["glossaire", "nGloss"], ["epices", "nSpices"], ["forum", "nForum"]];
const parse = () => { const h = decodeURIComponent(location.hash.replace(/^#\/?/, "")); const [a, ...b] = h.split("/"); return { page: a || "accueil", arg: b.join("/") }; };
function renderChrome() {
  document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;
  const p = parse().page, active = p === "recette" || p === "cuisine" ? "recettes" : p === "region" ? "regions" : p;
  $("#nav").innerHTML = MAIN.map(([id, k, ic]) => `<a href="#${id}" ${active === id ? 'aria-current="page"' : ""}><span class="ic" aria-hidden="true">${ic}</span><span>${esc(tt(k))}</span></a>`).join("") +
    `<button type="button" id="morebtn" aria-expanded="false" aria-controls="more"><span class="ic" aria-hidden="true">⋯</span><span>${esc(tt("nMore"))}</span></button>`;
  const links = MORE.concat(user && user.admin ? [["mod", "mod"]] : []);
  $("#more").innerHTML = links.map(([id, k]) => `<a href="#${id}" ${active === id ? 'aria-current="page"' : ""}>${esc(tt(k))}</a>`).join("");
  $("#more").hidden = true;
  $("#auth").textContent = user ? user.name : tt("login");
  $("#q").placeholder = tt("search"); $("#q").setAttribute("aria-label", tt("search"));
  $("#skip").textContent = tt("skip"); $("#lang").value = lang;
  const safe = (u) => (/^https:\/\//.test(u || "") ? u : "");
  $("#foot").innerHTML = `<p>${esc(tt("ft"))}</p><p><a href="legal.html" target="_blank" rel="noopener">${esc(tt("legalL"))}</a>` + (safe(CFG.SUPPORT_URL) ? ` · <a href="${esc(safe(CFG.SUPPORT_URL))}" target="_blank" rel="noopener noreferrer">${esc(tt("support"))}</a>` : "") + `</p>`;
}
async function render() {
  if (cookState) { cookRender(); return; }
  renderChrome();
  const m = $("#main");
  if (!loaded) { m.innerHTML = `<p class="empty" role="status">${esc(tt("loading"))}</p>`; return; }
  const { page, arg } = parse(), n = ++seq;
  document.title = "Alma brasileira – " + tt("tag");
  const V = { accueil: homeView, recettes: recipesView, recette: (k) => recipeView(arg, k), cuisine: (k) => cookStart(arg, k), cuisiner: cookWhatView, courses: shopView, favoris: favsView, regions: regionsView, region: () => regionView(arg), glossaire: glossView, epices: spicesView, forum: forumView, mod: modView };
  if (!V[page]) { m.innerHTML = `<h1>${esc(tt("pageNF"))}</h1><a class="btn" href="#accueil">${esc(tt("nHome"))}</a>`; return; }
  try { await V[page](n); } catch (e) { if (n === seq) m.innerHTML = `<p class="err" role="alert">${esc(e.message)}</p>`; }
}

/* ---------- accueil ---------- */
function homeView() {
  const R = RECIPES, byTag = (t) => R.filter((r) => r.tags.includes(t)), day = A.recipeOfDay(R, new Date());
  const recent = [...R].sort((a, b) => b.added.localeCompare(a.added) || b.order - a.order).slice(0, 6);
  const regs = ["norte", "nordeste", "centrooeste", "sudeste", "sul"];
  $("#main").innerHTML = `<section class="hero"><p class="eyebrow">${esc(tt("tag"))}</p><h1>${esc(tt("heroT"))}</h1><p>${esc(tt("heroP"))}</p><div class="actions"><a class="btn y" href="#cuisiner">${esc(tt("ctaCook"))}</a><a class="btn ghost light" href="#recettes">${esc(tt("ctaAll"))}</a></div></section>` +
    (day ? `<section class="sec"><h2>${esc(tt("sDay"))}</h2><a class="day" href="#recette/${esc(day.slug)}">${photo(day, true)}<div class="b"><span class="tag">${esc(catName(day.category))} · ${esc(fmtMin(day.total))} · ${esc(regName(day.region))}</span><h3>${esc(L10(day.title))}</h3><p>${esc(L10(day.description))}</p></div></a></section>` : "") +
    row(tt("sClassic"), byTag("classique"), "#recettes") + row(tt("sQuick"), R.filter((r) => r.total <= 30), "#recettes") + row(tt("sEco"), byTag("eco"), "#recettes") + row(tt("sFamily"), byTag("famille"), "#recettes") +
    row(tt("sSalgado"), byTag("salgado"), "#recettes") + row(tt("sDessert"), R.filter((r) => r.category === "dessert"), "#recettes") + row(tt("sFestive"), byTag("festif"), "#recettes") +
    `<section class="sec"><div class="sech"><h2>${esc(tt("sRegional"))}</h2><a class="seeall" href="#regions">${esc(tt("seeAll"))} →</a></div><div class="chips">${regs.map((g) => `<a class="chip" href="#region/${g}">${esc(regName(g))} <small>(${R.filter((r) => r.region === g).length})</small></a>`).join("")}</div></section>` +
    row(tt("sRecent"), recent, "#recettes");
  document.title = "Alma brasileira – " + tt("tag");
}

/* ---------- catalogue + filtres ---------- */
const savePrefs = () => ST.set("prefs", { diets: F.diets, avoid: F.avoid, avoidIng: F.avoidIng });
function applyFilters(list) {
  const avoidKeys = F.avoidIng ? F.avoidIng.split(",").flatMap((t) => A.parseInput(t, IDX)) : [];
  return A.filterRecipes(list, { q: F.q, cat: F.cat, region: F.region, maxTotal: F.maxTotal, maxDiff: F.maxDiff, diets: F.diets, avoid: F.avoid, avoidKeys, favOnly: F.fav }, { favs: favs(), catName, regionName: regName });
}
const activeFilters = () => !!(F.cat || F.region || F.maxTotal || F.maxDiff || F.diets.length || F.avoid.length || F.avoidIng || F.fav || F.q);
function recipesView() {
  const list = applyFilters(RECIPES), opt = (v, cur, lab) => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${esc(lab)}</option>`;
  const chk = (g, v, lab, on) => `<label class="chk"><input type="checkbox" data-f="${g}" value="${v}" ${on ? "checked" : ""}><span>${esc(lab)}</span></label>`;
  const regs = ["norte", "nordeste", "centrooeste", "sudeste", "sul", "nacional"];
  const open = F.region || F.maxTotal || F.maxDiff || F.diets.length || F.avoid.length || F.avoidIng || F.fav;
  $("#main").innerHTML = `<h1>${esc(tt("nRecipes"))}</h1><div class="chips" role="group" aria-label="${esc(tt("nRecipes"))}">${["", "entree", "plat", "accompagnement", "dessert"].map((c) => `<button class="chip" type="button" data-cat="${c}" aria-pressed="${F.cat === c}">${esc(c ? catName(c) : tt("c0"))}</button>`).join("")}</div>` +
    `<details class="filters" ${open ? "open" : ""}><summary>${esc(tt("filters"))}</summary><div class="fgrid">` +
    `<label>${esc(tt("fRegion"))}<select data-f="region"><option value="">${esc(tt("anyRegion"))}</option>${regs.map((g) => opt(g, F.region, regName(g))).join("")}</select></label>` +
    `<label>${esc(tt("fTime"))}<select data-f="maxTotal">${opt(0, F.maxTotal, tt("anyTime"))}${[30, 60, 90, 180].map((m) => opt(m, F.maxTotal, "≤ " + fmtMin(m))).join("")}</select></label>` +
    `<label>${esc(tt("fDiff"))}<select data-f="maxDiff">${opt(0, F.maxDiff, tt("anyDiff"))}${[1, 2, 3].map((d) => opt(d, F.maxDiff, "≤ " + tt("diff" + d))).join("")}</select></label>` +
    `<fieldset><legend>${esc(tt("fDiet"))}</legend>${[["veg"], ["vegan"], ["lf"], ["gf"]].map(([d]) => chk("diet", d, tt(d), F.diets.includes(d))).join("")}</fieldset>` +
    `<fieldset><legend>${esc(tt("fAvoid"))}</legend>${["gluten", "crust", "oeuf", "poisson", "lait"].map((a) => chk("avoid", a, tt("al_" + a), F.avoid.includes(a))).join("")}</fieldset>` +
    `<label>${esc(tt("fAvoidIng"))}<input type="text" data-f="avoidIng" value="${esc(F.avoidIng)}" maxlength="60"></label>${chk("fav", "1", tt("fFav"), F.fav)}</div>` +
    `<p class="small">${esc(tt("filterNote"))}</p></details>` +
    `<div class="rbar"><p role="status" aria-live="polite">${esc(tt(list.length === 1 ? "res1" : "resN", { n: list.length }))}</p>${activeFilters() ? `<button class="btn ghost" type="button" data-reset>${esc(tt("reset"))}</button>` : ""}</div>` +
    (list.length ? `<div class="grid">${list.map(card).join("")}</div>` : `<p class="empty">${esc(tt("none2"))}</p>`);
  document.title = tt("nRecipes") + " – Alma brasileira";
}

/* ---------- fiche recette ---------- */
const PORT = {};
function ingList(r, full, srv) {
  const f = srv / r.servings;
  return full.ing.map((it) => {
    const sc = A.scale(it.q, it.u, f, it.k); let t = esc(A.ingredientLine(it, ING, lang, f));
    if (sc.approx && it.q != null) t += ` <span class="approx" title="${esc(tt("approx"))}">≈</span>`;
    if (it.alt) t += ` <em class="note">${esc(L10(it.alt))}</em>`;
    if (it.note) t += ` <em class="note">(${esc(L10(it.note))})</em>`;
    return `<li>${t}</li>`;
  }).join("");
}
async function recipeView(slug, n) {
  const r = RECIPES.find((x) => x.slug === slug), m = $("#main");
  if (!r) { m.innerHTML = `<h1>${esc(tt("pageNF"))}</h1><a class="btn" href="#recettes">${esc(tt("back2"))}</a>`; return; }
  pushRecent(slug); document.title = L10(r.title) + " – Alma brasileira";
  const f = favs().has(slug), total = fmtMin(r.total);
  const head = `<a class="link" href="#recettes">${esc(tt("back2"))}</a><article class="rec"><div class="rhead">${photo(r, true)}<div class="b"><span class="tag">${esc(catName(r.category))} · ${esc(regName(r.region))}</span><h1>${esc(L10(r.title))}</h1><p class="lead">${esc(L10(r.description))}</p></div></div>` +
    `<dl class="facts"><div><dt>${esc(tt("tPrep"))}</dt><dd>${esc(fmtMin(r.prep))}</dd></div><div><dt>${esc(tt("tCook"))}</dt><dd>${esc(fmtMin(r.cook))}</dd></div>${r.rest ? `<div><dt>${esc(tt("tRest"))}</dt><dd>${esc(fmtMin(r.rest))}</dd></div>` : ""}<div><dt>${esc(tt("tTotal"))}</dt><dd>${esc(total)}</dd></div><div><dt>${esc(tt("servings"))}</dt><dd>${r.servings}</dd></div><div><dt>${esc(tt("fDiff"))}</dt><dd>${diffDots(r.diff)} ${esc(tt("diff" + r.diff))}</dd></div></dl>` +
    `<div class="actions"><button class="btn ghost" type="button" data-fav="${esc(slug)}" aria-pressed="${f}">${f ? "♥ " + esc(tt("favDel")) : "♡ " + esc(tt("favAdd"))}</button><button class="btn ghost" type="button" data-share="${esc(slug)}">${esc(tt("share"))}</button><button class="btn ghost" type="button" data-print>${esc(tt("print"))}</button></div>` +
    `<section><h2>${esc(tt("hOrigin"))}</h2><p>${esc(L10(r.origin))}</p></section>` +
    `<section><h2>${esc(tt("hAllergens"))}</h2><p>${r.allergens.length ? r.allergens.map((a) => `<span class="pill warn">${esc(tt("al_" + a))}</span>`).join(" ") : esc(tt("noAllergen"))}${r.diet.veg ? ` <span class="pill">${esc(tt("veg"))}</span>` : ""}${r.diet.vegan ? ` <span class="pill">${esc(tt("vegan"))}</span>` : ""}${r.diet.lf ? ` <span class="pill">${esc(tt("lf"))}</span>` : ""}${r.diet.gf ? ` <span class="pill">${esc(tt("gf"))}</span>` : ""}</p><p class="small">${esc(tt("allergy"))}</p></section>`;
  m.innerHTML = head + `<p role="status">${esc(tt("loading"))}</p></article>`;
  let full; try { full = await getFull(slug); } catch (e) { if (n !== seq) return; m.innerHTML = head + `<p class="err" role="alert">${esc(e.network ? tt("offline") : e.message)}</p></article>`; return; }
  if (n !== seq) return;
  const srv = PORT[slug] || r.servings, madeOn = ST.get("made", {})[slug], note = ST.get("notes", {})[slug] || "";
  const subs = full.ing.filter((it) => ING[it.k] && ING[it.k].sub);
  const body = `<section><div class="sech"><h2>${esc(tt("hIng"))}</h2><div class="stepper" role="group" aria-label="${esc(tt("servings"))}"><button type="button" data-port="-1" aria-label="−">−</button><output id="srv" aria-live="polite">${srv} ${esc(tt("people"))}</output><button type="button" data-port="1" aria-label="+">+</button></div></div><ul class="ings" id="ings">${ingList(r, full, srv)}</ul><p class="small" id="scalenote" ${srv === r.servings ? "hidden" : ""}>${esc(tt("scaleNote"))}</p></section>` +
    `<div class="actions"><a class="btn" href="#cuisine/${esc(slug)}">▶ ${esc(tt("cookMode"))}</a><button class="btn y" type="button" data-addlist="${esc(slug)}">${esc(tt("addList"))}</button></div>` +
    `<section><h2>${esc(tt("hSteps"))}</h2><ol class="steps">${full.steps.map((s) => `<li>${esc(L10(s.t))}${s.timer ? ` <span class="pill">⏱ ${esc(fmtMin(Math.round(s.timer / 60)))}</span>` : ""}</li>`).join("")}</ol></section>` +
    `<section><h2>${esc(tt("hTip"))}</h2><p>${esc(L10(full.tip))}</p></section><section><h2>${esc(tt("hStorage"))}</h2><p>${esc(L10(full.storage))}</p></section><section><h2>${esc(tt("hBelgian"))}</h2><p class="note">${esc(L10(full.be))}</p></section>` +
    (subs.length ? `<section><h2>${esc(tt("hSubs"))}</h2><ul>${subs.map((it) => `<li><b>${esc(A.nameOf(ING, it.k, lang, false))}</b> – ${esc(L10(ING[it.k].sub))}</li>`).join("")}</ul></section>` : "") +
    `<div class="actions"><button class="btn ghost" type="button" data-addsp="${esc(slug)}">${esc(tt("add"))}</button>${madeOn ? `<span class="pill">✓ ${esc(tt("madeOn", { d: fmtDate(madeOn) }))}</span><button class="link" type="button" data-made="${esc(slug)}">${esc(tt("madeUndo"))}</button>` : `<button class="btn ghost" type="button" data-made="${esc(slug)}">✓ ${esc(tt("made"))}</button>`}</div>` +
    `<section><label for="note"><b>${esc(tt("noteL"))}</b></label><textarea id="note" data-note="${esc(slug)}" rows="3" maxlength="600" placeholder="${esc(tt("notePh"))}">${esc(note)}</textarea></section><p class="err" role="alert"></p><p class="small status">${esc(tt("status"))}</p>`;
  m.innerHTML = head + body + `</article>`;
}

/* ---------- mode cuisine ---------- */
let cookState = null, wake = null, audioCtx = null, tickT = null;
async function cookStart(slug, n) {
  const r = RECIPES.find((x) => x.slug === slug);
  if (!r) { location.hash = "#recettes"; return; }
  let full; try { full = await getFull(slug); } catch (e) { msg(e.network ? tt("offline") : e.message); location.hash = "#recette/" + slug; return; }
  const st = SS.get("cook:" + slug, { step: 0, ing: {} });
  cookState = { r, full, step: Math.min(st.step, full.steps.length - 1), ing: st.ing || {}, timers: {}, showIng: false, srv: PORT[slug] || r.servings };
  document.body.classList.add("cooking"); cookRender(); requestWake();
}
const cookSave = () => SS.set("cook:" + cookState.r.slug, { step: cookState.step, ing: cookState.ing });
function cookRender() {
  const c = cookState; if (!c) return;
  let el = $("#cook"); if (!el) { el = document.createElement("section"); el.id = "cook"; el.className = "cook"; el.setAttribute("aria-label", tt("cookMode")); document.body.appendChild(el); }
  const n = c.full.steps.length, s = c.full.steps[c.step], last = c.step === n - 1, t = c.timers[c.step];
  const rem = t ? Math.max(0, Math.ceil(((t.running ? t.end : Date.now() + t.left) - Date.now()) / 1000)) : s.timer || 0;
  const clock = (x) => String(Math.floor(x / 60)).padStart(2, "0") + ":" + String(x % 60).padStart(2, "0");
  el.innerHTML = `<div class="ch"><strong>${esc(L10(c.r.title))}</strong><div><button class="btn ghost" type="button" data-cooking>${esc(tt("ingBtn"))}</button><button class="btn ghost" type="button" data-cookquit>${esc(tt("quit"))}</button></div></div>` +
    `<progress max="${n}" value="${c.step + 1}" aria-label="${esc(tt("stepOf", { i: c.step + 1, n }))}"></progress><p class="small" role="status" aria-live="polite">${esc(tt("stepOf", { i: c.step + 1, n }))}</p>` +
    `<div class="cstep" tabindex="-1" id="cstep"><p class="big">${esc(L10(s.t))}</p>${s.timer ? `<div class="timer ${t && t.done ? "done" : ""}"><span class="clock" role="timer" aria-live="off">${clock(rem)}</span><span class="small">${esc(L10(s.label))}</span><div class="actions"><button class="btn y" type="button" data-timer="${t && t.running ? "pause" : "start"}">${esc(t && t.running ? tt("tPause") : tt("tStart"))}</button>${t ? `<button class="btn ghost" type="button" data-timer="reset">${esc(tt("tReset"))}</button>` : ""}</div></div>` : ""}</div>` +
    `<div class="cnav"><button class="btn ghost" type="button" data-cstep="-1" ${c.step === 0 ? "disabled" : ""}>← ${esc(tt("prev"))}</button><button class="btn" type="button" data-cstep="1">${esc(last ? tt("finish") : tt("next"))} ${last ? "" : "→"}</button></div><p class="small">${esc(tt("swipe"))}${wake ? " " + esc(tt("awake")) + "." : ""}</p>` +
    `<aside class="cing" ${c.showIng ? "" : "hidden"} aria-label="${esc(tt("hIng"))}"><h2>${esc(tt("hIng"))}</h2><ul class="ings">${c.full.ing.map((it, i) => `<li><label class="chk"><input type="checkbox" data-cing="${i}" ${c.ing[i] ? "checked" : ""}><span>${esc(A.ingredientLine(it, ING, lang, c.srv / c.r.servings))}</span></label></li>`).join("")}</ul></aside>`;
  const f = $("#cstep"); if (f && !c.noFocus) f.focus({ preventScroll: true });
  clearInterval(tickT); if (Object.values(c.timers).some((x) => x.running)) tickT = setInterval(cookTick, 500);
}
function beep() {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.frequency.value = 880; g.gain.value = 0.2; o.start(); o.stop(audioCtx.currentTime + 0.6); } catch (e) {}
  try { navigator.vibrate && navigator.vibrate([300, 150, 300]); } catch (e) {}
}
function cookTick() {
  const c = cookState; if (!c) return;
  for (const [i, t] of Object.entries(c.timers)) if (t.running && Date.now() >= t.end) { t.running = false; t.done = true; t.left = 0; beep(); msg(tt("tDone", { label: L10(c.full.steps[i].label) || "" })); }
  const t = c.timers[c.step], el = document.querySelector("#cook .clock");
  if (t && el) { const rem = Math.max(0, Math.ceil(((t.running ? t.end : Date.now() + t.left) - Date.now()) / 1000)); el.textContent = String(Math.floor(rem / 60)).padStart(2, "0") + ":" + String(rem % 60).padStart(2, "0"); }
  if (!Object.values(c.timers).some((x) => x.running)) { clearInterval(tickT); cookRender(); }
}
async function requestWake() { try { if ("wakeLock" in navigator && cookState) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); cookRender(); } } catch (e) { wake = null; } }
function cookQuit(go) {
  const slug = cookState && cookState.r.slug; clearInterval(tickT); try { wake && wake.release(); } catch (e) {} wake = null;
  const el = $("#cook"); if (el) el.remove(); document.body.classList.remove("cooking"); cookState = null;
  if (go !== false) location.hash = "#recette/" + (slug || "");
}
function cookStep(d) {
  const c = cookState, n = c.full.steps.length, nx = c.step + d;
  if (nx >= n) { const m = ST.get("made", {}); m[c.r.slug] = new Date().toISOString().slice(0, 10); ST.set("made", m); msg(tt("cookDone")); cookQuit(); return; }
  if (nx < 0) return; c.step = nx; cookSave(); cookRender();
}
function cookTimer(a) {
  const c = cookState, s = c.full.steps[c.step]; let t = c.timers[c.step];
  if (a === "reset") { delete c.timers[c.step]; }
  else if (a === "start") { if (!t) t = c.timers[c.step] = { left: s.timer * 1000 }; t.end = Date.now() + t.left; t.running = true; t.done = false; try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  else if (a === "pause" && t) { t.left = Math.max(0, t.end - Date.now()); t.running = false; }
  c.noFocus = true; cookRender(); c.noFocus = false;
}

/* ---------- Que puis-je cuisiner ? ---------- */
const haveTerms = () => ST.get("have", []);
function cookWhatView() {
  const terms = haveTerms(), keys = new Set(terms.flatMap((t) => t.keys)), only = SS.get("only", false), maxT = SS.get("cmax", 0);
  let res = RECIPES.map((r) => ({ r, m: A.matchRecipe(r, [...keys]) })).filter((x) => x.m.have.length > 0);
  const allowed = new Set(applyFilters(RECIPES.map((r) => r)).map((r) => r.slug));
  res = res.filter((x) => allowed.has(x.r.slug) || !activeFilters());
  if (only) res = res.filter((x) => x.m.doable); if (maxT) res = res.filter((x) => x.r.total <= maxT);
  res.sort((a, b) => b.m.doable - a.m.doable || b.m.score - a.m.score || a.r.total - b.r.total);
  const names = [...new Set(Object.values(ING).map((e) => e.n[LANGS.indexOf(lang)].split("|")[0]))].sort();
  $("#main").innerHTML = `<h1>${esc(tt("cTitle"))}</h1><p>${esc(tt("cIntro"))}</p><form class="row" id="cf"><input id="ci" list="ingnames" placeholder="${esc(tt("cPh"))}" aria-label="${esc(tt("cPh"))}" maxlength="60" autocomplete="off" required><button class="btn y">${esc(tt("cAdd"))}</button></form><datalist id="ingnames">${names.map((x) => `<option value="${esc(x)}">`).join("")}</datalist><p class="err" role="alert"></p>` +
    `<h2>${esc(tt("cYours"))}</h2>` + (terms.length ? `<div class="sp">${terms.map((t, i) => `<span>${esc(t.label)}<button type="button" data-hdel="${i}" aria-label="${esc(tt("remove"))} ${esc(t.label)}">×</button></span>`).join("")}</div><button class="link" type="button" data-hclear>${esc(tt("cClear"))}</button>` : `<p class="empty">${esc(tt("noHave"))}</p>`) +
    `<div class="fgrid"><label class="chk"><input type="checkbox" id="conly" ${only ? "checked" : ""}><span>${esc(tt("cOnly"))}</span></label><label>${esc(tt("fTime"))}<select id="cmax">${[0, 30, 60, 90].map((m) => `<option value="${m}" ${maxT === m ? "selected" : ""}>${esc(m ? "≤ " + fmtMin(m) : tt("anyTime"))}</option>`).join("")}</select></label></div><p class="small">${esc(tt("cNote"))}</p>` +
    (terms.length ? (res.length ? `<div class="results">${res.map(({ r, m }) => `<article class="cres ${m.doable ? "ok" : ""}"><a href="#recette/${esc(r.slug)}"><h3>${esc(r.emoji)} ${esc(L10(r.title))}</h3></a><p class="score">${m.doable ? `✓ ${esc(tt("cReady"))}` : esc(tt("cScore", { h: m.have.length, n: m.essentials.length }))} · ${m.score}%</p>${m.missing.length ? `<p><b>${esc(tt("cMissing"))}</b> ${esc(m.missing.map((k) => A.nameOf(ING, k, lang, false)).join(", "))}</p>` : ""}${m.missing.filter((k) => ING[k].sub).map((k) => `<p class="small">${esc(tt("cAlt"))} <b>${esc(A.nameOf(ING, k, lang, false))}</b> – ${esc(L10(ING[k].sub))}</p>`).join("")}</article>`).join("")}</div>` : `<p class="empty">${esc(tt("cNone"))}</p>`) : "");
  document.title = tt("cTitle") + " – Alma brasileira";
}

/* ---------- liste de courses ---------- */
const doneKey = (x) => x.k + "|" + (x.u || "");
async function addToList(slug) {
  const r = RECIPES.find((x) => x.slug === slug), full = await getFull(slug), f = (PORT[slug] || r.servings) / r.servings, S = SHOP0();
  S.entries = S.entries.filter((e) => e.from !== slug);
  for (const it of full.ing) { const sc = A.scale(it.q, it.u, f, it.k); S.entries.push({ k: it.k, q: sc.q, u: sc.u, from: slug }); }
  S.recipes[slug] = { f: PORT[slug] || r.servings }; ST.set("shop", S); msg(tt("addedList"));
}
function shopView() {
  const S = SHOP0(), merged = A.mergeList(S.entries), by = {};
  for (const x of merged) (by[ING[x.k] ? ING[x.k].shop : "au"] = by[ING[x.k] ? ING[x.k].shop : "au"] || []).push(x);
  const sorter = (a, b) => A.nameOf(ING, a.k, lang, false).localeCompare(A.nameOf(ING, b.k, lang, false), lang);
  const sections = A.SHOP.map((c) => {
    const items = (by[c] || []).sort(sorter), man = c === "au" ? S.manual : [];
    if (!items.length && !man.length) return "";
    return `<section class="shopsec"><h2>${esc(tt("shop_" + c))}</h2><ul class="ings">${items.map((x) => { const d = !!S.done[doneKey(x)]; return `<li><label class="chk ${d ? "isdone" : ""}"><input type="checkbox" data-sdone="${esc(doneKey(x))}" ${d ? "checked" : ""}><span>${esc(A.ingredientText({ k: x.k, q: x.q, u: x.u }, ING, lang, 1))}</span></label></li>`; }).join("")}${man.map((x) => `<li><label class="chk ${x.done ? "isdone" : ""}"><input type="checkbox" data-mdone="${esc(x.id)}" ${x.done ? "checked" : ""}><span>${esc(x.text)}</span></label><button class="link" type="button" data-mdel="${esc(x.id)}" aria-label="${esc(tt("remove"))} ${esc(x.text)}">×</button></li>`).join("")}</ul></section>`;
  }).join("");
  const slugs = Object.keys(S.recipes);
  $("#main").innerHTML = `<h1>${esc(tt("sTitle"))}</h1><form class="row" id="shf"><input id="shi" placeholder="${esc(tt("sAddPh"))}" aria-label="${esc(tt("sAddPh"))}" maxlength="60" required><button class="btn y">${esc(tt("cAdd"))}</button></form>` +
    (sections ? sections : `<p class="empty">${esc(tt("sEmpty"))}</p>`) +
    (slugs.length ? `<p class="small">${esc(tt("sRecipes"))} ${slugs.map((s) => { const r = RECIPES.find((x) => x.slug === s); return `<span class="pill">${esc(r ? L10(r.title) : s)} <button class="link" type="button" data-srm="${esc(s)}" aria-label="${esc(tt("remove"))} ${esc(r ? L10(r.title) : s)}">×</button></span>`; }).join(" ")}</p>` : "") +
    (sections ? `<div class="actions noprint"><button class="btn ghost" type="button" data-sclean>${esc(tt("sClearDone"))}</button><button class="btn ghost" type="button" data-sshare>${esc(tt("sShare"))}</button><button class="btn ghost" type="button" data-print>${esc(tt("print"))}</button><button class="btn danger" type="button" data-sall>${esc(tt("sClearAll"))}</button></div>` : "") + `<p class="small">${esc(tt("sNote"))}</p>`;
  document.title = tt("sTitle") + " – Alma brasileira";
}
function shopText() {
  const S = SHOP0(), merged = A.mergeList(S.entries);
  return merged.map((x) => "- " + A.ingredientText({ k: x.k, q: x.q, u: x.u }, ING, lang, 1)).concat(S.manual.map((x) => "- " + x.text)).join("\n");
}

/* ---------- favoris, historique, notes ---------- */
function favsView() {
  const f = favs(), fl = RECIPES.filter((r) => f.has(r.slug)), rec = ST.get("recent", []).map((s) => RECIPES.find((r) => r.slug === s)).filter(Boolean);
  const made = ST.get("made", {}), ml = Object.keys(made).map((s) => RECIPES.find((r) => r.slug === s)).filter(Boolean), notes = ST.get("notes", {});
  const nl = Object.keys(notes).filter((s) => notes[s]).map((s) => RECIPES.find((r) => r.slug === s)).filter(Boolean);
  $("#main").innerHTML = `<h1>${esc(tt("fTitle"))}</h1>` + (fl.length ? `<div class="grid">${fl.map(card).join("")}</div>` : `<p class="empty">${esc(tt("fEmpty"))}</p>`) +
    row(tt("fRecent"), rec) + (ml.length ? `<section class="sec"><h2>${esc(tt("fMade"))}</h2><ul>${ml.map((r) => `<li><a href="#recette/${esc(r.slug)}">${esc(L10(r.title))}</a> – ${esc(tt("madeOn", { d: fmtDate(made[r.slug]) }))}</li>`).join("")}</ul></section>` : "") +
    (nl.length ? `<section class="sec"><h2>${esc(tt("fNotes"))}</h2><ul>${nl.map((r) => `<li><a href="#recette/${esc(r.slug)}">${esc(L10(r.title))}</a> : ${esc(notes[r.slug].slice(0, 120))}</li>`).join("")}</ul></section>` : "") + `<p class="small">${esc(tt("fLocal"))}</p>`;
}

/* ---------- régions et glossaire ---------- */
function regionsView() {
  const ids = ["norte", "nordeste", "centrooeste", "sudeste", "sul"];
  $("#main").innerHTML = `<h1>${esc(tt("rTitle"))}</h1><p>${esc(tt("rIntro"))}</p><div class="grid regs">${ids.map((g) => `<a class="rcard" href="#region/${g}"><h2>${esc(regName(g))}</h2><p>${esc(L10(REG[g].desc))}</p><span class="pill">${esc(tt(RECIPES.filter((r) => r.region === g).length === 1 ? "res1" : "resN", { n: RECIPES.filter((r) => r.region === g).length }))}</span></a>`).join("")}</div>`;
  document.title = tt("rTitle") + " – Alma brasileira";
}
function regionView(id) {
  const g = REG[id]; if (!g) { location.hash = "#regions"; return; }
  const list = RECIPES.filter((r) => r.region === id);
  $("#main").innerHTML = `<a class="link" href="#regions">← ${esc(tt("rTitle"))}</a><h1>${esc(regName(id))}</h1><p class="lead">${esc(L10(g.desc))}</p>` +
    (g.dishes.length ? `<section><h2>${esc(tt("rSpec"))}</h2><p>${g.dishes.map((d) => `<span class="pill">${esc(d)}</span>`).join(" ")}</p></section>` : "") +
    (L10(g.ings) ? `<section><h2>${esc(tt("rIngs"))}</h2><p>${esc(L10(g.ings))}</p></section>` : "") +
    `<section><h2>${esc(tt("rRecipes"))}</h2>${list.length ? `<div class="grid">${list.map(card).join("")}</div>` : `<p class="empty">${esc(tt("rNone"))}</p>`}</section>`;
  document.title = regName(id) + " – Alma brasileira";
}
function glossView() {
  const q = A.norm(F.q), list = GLOSS.filter((x) => !q || A.norm(x.term + " " + L10(x.d)).includes(q)), hard = Object.entries(ING).filter(([k, e]) => e.sub);
  $("#main").innerHTML = `<h1>${esc(tt("gTitle"))}</h1><p>${esc(tt("gIntro"))}</p>` + list.map((x) => `<details class="gl"><summary>${esc(x.term)}</summary><p>${esc(L10(x.d))}</p></details>`).join("") +
    `<h2>${esc(tt("gHard"))}</h2><ul>${hard.map(([k, e]) => `<li><b>${esc(A.nameOf(ING, k, lang, false))}</b> – ${esc(L10(e.sub))}</li>`).join("")}</ul>`;
  document.title = tt("gTitle") + " – Alma brasileira";
}

/* ---------- épices, forum, modération (compte) ---------- */
const localSp = () => ST.get("spices", []);
const spKey = (s) => A.norm(s);
async function getSpices() { return token ? (await api("/spices")).spices : localSp(); }
async function addSpices(names) {
  const clean = [...new Map(names.map((x) => String(x).trim()).filter(Boolean).map((x) => [spKey(x), x])).values()];
  if (token) return (await api("/spices/bulk", "POST", { names: clean })).spices;
  const cur = localSp(), have = new Set(cur.map(spKey)); clean.forEach((x) => { if (!have.has(spKey(x))) cur.push(x); }); ST.set("spices", cur); return cur;
}
async function delSpice(name) { if (token) return (await api("/spices/" + encodeURIComponent(name), "DELETE")).spices; const cur = localSp().filter((x) => x !== name); ST.set("spices", cur); return cur; }
async function spicesView(n) {
  const m = $("#main"); m.innerHTML = "…";
  const s = await getSpices(); if (n !== seq) return;
  m.innerHTML = `<h1>${esc(tt("sp"))}</h1><form class="row" id="sf"><input id="si" placeholder="${esc(tt("sph"))}" aria-label="${esc(tt("sph"))}" required maxlength="40"><button class="btn y">${esc(tt("spa"))}</button></form><p class="err" role="alert"></p>` +
    (s.length ? `<div class="sp">${s.map((x, i) => `<span>${esc(x)}<button type="button" data-del="${i}" aria-label="${esc(tt("dl"))} ${esc(x)}">×</button></span>`).join("")}</div>` : `<p class="empty">${esc(tt("spe"))}</p>`) +
    (token ? "" : `<p class="small">${esc(tt("mine"))} ${esc(tt("spl"))}</p><button class="btn ghost" type="button" data-auth>${esc(tt("login"))}</button>`);
  m.dataset.sp = JSON.stringify(s);
}
async function forumView(n) {
  if (openThread) return threadView(openThread, n);
  const m = $("#main"); m.innerHTML = "…";
  const { threads } = await api("/forum/threads"); if (n !== seq) return;
  const form = token ? `<form class="f" id="ff"><input id="ft" placeholder="${esc(tt("ti"))}" aria-label="${esc(tt("ti"))}" required minlength="3" maxlength="90"><textarea id="fm" rows="3" placeholder="${esc(tt("ms"))}" aria-label="${esc(tt("ms"))}" required maxlength="600"></textarea><button class="btn">${esc(tt("pub"))}</button><span class="err" role="alert"></span></form>` : `<p>${esc(tt("need"))}</p><p><button class="btn" type="button" data-auth>${esc(tt("login"))}</button></p>`;
  m.innerHTML = `<h1>${esc(tt("f"))}</h1><p>${esc(tt("ph"))}</p>${form}` + threads.map((t) => `<button class="post postbtn" type="button" data-th="${esc(t.id)}"><h3>${esc(t.title)}</h3><small>${esc(who(t.author))} · ${fmtDate(t.createdAt)} · ${t.replyCount} ${esc(tt("reps"))}</small></button>`).join("");
}
async function threadView(id, n) {
  const m = $("#main"); m.innerHTML = "…";
  try {
    const { thread: t } = await api("/forum/threads/" + encodeURIComponent(id)); if (n !== undefined && n !== seq) return;
    const acts = (kind, x) => `<div>${token ? `<button class="link" type="button" data-rep="${kind}|${esc(x.id)}">${esc(tt("report"))}</button>` : ""}${x.canDelete ? `<button class="link" type="button" data-${kind === "thread" ? "dth" : "drp"}="${esc(x.id)}">${esc(tt("dl"))}</button>` : ""}</div>`;
    m.innerHTML = `<button class="link" type="button" data-back>${esc(tt("back"))}</button><article class="post"><h1>${esc(t.title)}</h1><small>${esc(who(t.author))} · ${fmtDate(t.createdAt)}</small><p class="pre">${esc(t.body)}</p>${acts("thread", t)}</article>` +
      t.replies.map((r) => `<div class="reply"><small>${esc(who(r.author))} · ${fmtDate(r.createdAt)}</small><p class="pre">${esc(r.body)}</p>${acts("reply", r)}</div>`).join("") +
      (token ? `<form class="f" id="rf" data-id="${esc(t.id)}"><textarea id="rm" rows="3" placeholder="${esc(tt("ms"))}" aria-label="${esc(tt("ms"))}" required maxlength="600"></textarea><button class="btn">${esc(tt("rep"))}</button><span class="err" role="alert"></span></form>` : `<p><button class="btn" type="button" data-auth>${esc(tt("login"))}</button></p>`);
  } catch (e) { m.innerHTML = `<button class="link" type="button" data-back>${esc(tt("back"))}</button><p class="err" role="alert">${esc(e.message)}</p>`; }
}
async function modView(n) {
  const m = $("#main"); m.innerHTML = "…";
  const { reports } = await api("/admin/reports"); if (n !== seq) return;
  m.innerHTML = `<h1>${esc(tt("mod"))}</h1><p class="err" role="alert"></p>` + (reports.length ? reports.map((x) => `<article class="post"><small>${esc(x.kind)} · ${esc(who(x.author))} · ${fmtDate(x.createdAt)}</small><p class="pre">${esc(x.content)}</p><p><b>${esc(tt("reason"))}:</b> ${esc(x.reason)}</p><div class="actions"><button class="btn danger" type="button" data-mod="delete|${esc(x.id)}">${esc(tt("dl"))}</button><button class="btn ghost" type="button" data-mod="dismiss|${esc(x.id)}">${esc(tt("dismiss"))}</button></div></article>`).join("") : `<p class="empty">${esc(tt("nomod"))}</p>`);
}
function authDlg(step) {
  if (step === "code") { showDlg(dlgHead(esc(tt("login"))) + `<div class="db"><p>${esc(tt("sent"))}</p><form class="f" id="af2"><input id="ac" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" minlength="6" autocomplete="one-time-code" placeholder="${esc(tt("code"))}" required aria-label="${esc(tt("code"))}"><button class="btn">${esc(tt("verify"))}</button><span class="err" role="alert"></span></form></div>`); $("#ac").focus(); return; }
  showDlg(dlgHead(esc(tt("login"))) + `<div class="db"><form class="f" id="af1"><input id="an" placeholder="${esc(tt("nm2"))}" aria-label="${esc(tt("nm2"))}" required minlength="2" maxlength="30" autocomplete="given-name"><input id="ae" type="email" placeholder="${esc(tt("em"))}" aria-label="${esc(tt("em"))}" required maxlength="120" autocomplete="email"><label class="chk"><input type="checkbox" id="acc" required><span>${esc(tt("consent"))} <a href="legal.html" target="_blank" rel="noopener">${esc(tt("legalL"))}</a></span></label><button class="btn">${esc(tt("send"))}</button><span class="err" role="alert"></span></form></div>`);
}
const accountDlg = () => showDlg(dlgHead(esc(tt("account"))) + `<div class="db"><p><b>${esc(user.name)}</b><br>${esc(user.email)}</p><div class="actions"><button class="btn ghost" type="button" data-export>${esc(tt("export"))}</button><button class="btn ghost" type="button" data-logout>${esc(tt("out"))}</button><button class="btn danger" type="button" data-delacc>${esc(tt("delacc"))}</button></div><p class="err" role="alert"></p></div>`);
const reportDlg = (kind, id) => showDlg(dlgHead(esc(tt("report"))) + `<div class="db"><form class="f" id="rpf" data-k="${esc(kind)}" data-i="${esc(id)}"><textarea id="rpr" rows="3" required minlength="3" maxlength="300" placeholder="${esc(tt("reason"))}" aria-label="${esc(tt("reason"))}"></textarea><button class="btn">${esc(tt("report"))}</button><span class="err" role="alert"></span></form></div>`);
async function afterLogin() {
  const local = localSp(); if (local.length) { try { await api("/spices/bulk", "POST", { names: local }); ST.set("spices", []); } catch (e) {} }
}
async function share(slug) {
  const r = RECIPES.find((x) => x.slug === slug), url = location.origin + "/r/" + slug + ".html";
  if (navigator.share) { try { await navigator.share({ title: L10(r.title), url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(url); msg(tt("copied")); } catch (e) { msg(url); }
}

/* ---------- événements ---------- */
document.addEventListener("click", async (e) => {
  const mb = e.target.closest("#morebtn");
  if (mb) { const o = $("#more").hidden; $("#more").hidden = !o; mb.setAttribute("aria-expanded", String(o)); return; }
  if (!e.target.closest("#more") && !$("#more").hidden) $("#more").hidden = true;
  const t = e.target.closest("button"); if (!t) return; const d = t.dataset;
  try {
    if (t.id === "auth") { user ? accountDlg() : authDlg(); }
    else if (d.cat !== undefined) { F.cat = d.cat; render(); }
    else if (d.fav) { toggleFav(d.fav); render(); }
    else if ("reset" in d) { Object.assign(F, { q: "", cat: "", region: "", maxTotal: 0, maxDiff: 0, diets: [], avoid: [], avoidIng: "", fav: false }); $("#q").value = ""; savePrefs(); render(); }
    else if ("close" in d) $("#dlg").close();
    else if ("reload" in d) location.reload();
    else if ("auth" in d) authDlg();
    else if (d.share) share(d.share);
    else if ("print" in d) window.print();
    else if (d.port) { const r = RECIPES.find((x) => x.slug === parse().arg), cur = PORT[r.slug] || r.servings; PORT[r.slug] = Math.min(40, Math.max(1, cur + +d.port)); const full = FULL[r.slug]; $("#ings").innerHTML = ingList(r, full, PORT[r.slug]); $("#srv").textContent = PORT[r.slug] + " " + tt("people"); $("#scalenote").hidden = PORT[r.slug] === r.servings; }
    else if (d.addlist) { await addToList(d.addlist); }
    else if (d.addsp) { await addSpices((FULL[d.addsp] || { ing: [] }).ing.filter((i) => ING[i.k] && ["ep"].includes(ING[i.k].shop) && !["sel", "huile", "huile-olive", "eau", "vinaigre-vin", "concentre-tomate", "bouillon-poulet"].includes(i.k)).map((i) => A.nameOf(ING, i.k, "fr", false))); t.textContent = "✓ " + tt("ok"); }
    else if (d.made) { const m = ST.get("made", {}); if (m[d.made]) delete m[d.made]; else m[d.made] = new Date().toISOString().slice(0, 10); ST.set("made", m); render(); }
    else if (d.cstep) cookStep(+d.cstep);
    else if ("cooking" in d) { cookState.showIng = !cookState.showIng; cookState.noFocus = true; cookRender(); cookState.noFocus = false; }
    else if ("cookquit" in d) cookQuit();
    else if (d.timer) cookTimer(d.timer);
    else if (d.hdel !== undefined) { const h = haveTerms(); h.splice(+d.hdel, 1); ST.set("have", h); cookWhatView(); }
    else if ("hclear" in d) { ST.set("have", []); cookWhatView(); }
    else if ("sclean" in d) { const S = SHOP0(); S.entries = S.entries.filter((x) => !S.done[doneKey(x)]); S.manual = S.manual.filter((x) => !x.done); S.done = {}; ST.set("shop", S); shopView(); }
    else if ("sall" in d) { if (confirm(tt("sClearAll") + " ?")) { ST.set("shop", { entries: [], manual: [], done: {}, recipes: {} }); shopView(); } }
    else if (d.srm) { const S = SHOP0(); S.entries = S.entries.filter((x) => x.from !== d.srm); delete S.recipes[d.srm]; ST.set("shop", S); shopView(); }
    else if (d.mdel) { const S = SHOP0(); S.manual = S.manual.filter((x) => x.id !== d.mdel); ST.set("shop", S); shopView(); }
    else if ("sshare" in d) { const text = shopText(); if (navigator.share) { try { await navigator.share({ title: tt("sTitle"), text }); } catch (x) {} } else { try { await navigator.clipboard.writeText(text); msg(tt("copied")); } catch (x) { msg(text); } } }
    else if (d.del !== undefined) { const s = JSON.parse($("#main").dataset.sp || "[]"); await delSpice(s[+d.del]); spicesView(seq); }
    else if (d.th) { openThread = d.th; threadView(d.th); scrollTo(0, 0); }
    else if ("back" in d) { openThread = null; forumView(seq); }
    else if (d.dth) { await api("/forum/threads/" + encodeURIComponent(d.dth), "DELETE"); openThread = null; forumView(seq); }
    else if (d.drp) { await api("/forum/replies/" + encodeURIComponent(d.drp), "DELETE"); threadView(openThread); }
    else if (d.rep) { const [k, i] = d.rep.split("|"); reportDlg(k, i); }
    else if (d.mod) { const [a, i] = d.mod.split("|"); await api("/admin/reports/" + encodeURIComponent(i), "POST", { action: a }); modView(seq); }
    else if ("export" in d) { const j = await api("/me/export"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(j, null, 2)], { type: "application/json" })); a.download = "alma-mes-donnees.json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
    else if ("logout" in d) { try { await api("/auth/logout", "POST"); } catch (x) {} setAuth("", null); openThread = null; $("#dlg").close(); render(); }
    else if ("delacc" in d) { if (confirm(tt("delconf"))) { await api("/me", "DELETE"); setAuth("", null); openThread = null; $("#dlg").close(); render(); } }
  } catch (err) { showErr(err); }
});
document.addEventListener("change", (e) => {
  const t = e.target, f = t.dataset && t.dataset.f;
  if (f) {
    if (f === "region") F.region = t.value; else if (f === "maxTotal") F.maxTotal = +t.value; else if (f === "maxDiff") F.maxDiff = +t.value;
    else if (f === "diet") F.diets = t.checked ? [...new Set([...F.diets, t.value])] : F.diets.filter((x) => x !== t.value);
    else if (f === "avoid") F.avoid = t.checked ? [...new Set([...F.avoid, t.value])] : F.avoid.filter((x) => x !== t.value);
    else if (f === "avoidIng") F.avoidIng = t.value.trim(); else if (f === "fav") F.fav = t.checked;
    savePrefs(); if (parse().page === "recettes") { const keep = document.activeElement && document.activeElement.dataset.f; recipesView(); const el = keep && document.querySelector(`[data-f="${keep}"]${keep === "diet" || keep === "avoid" ? `[value="${t.value}"]` : ""}`); el && el.focus(); }
  } else if (t.id === "conly") { SS.set("only", t.checked); cookWhatView(); }
  else if (t.id === "cmax") { SS.set("cmax", +t.value); cookWhatView(); }
  else if (t.dataset.cing !== undefined) { cookState.ing[t.dataset.cing] = t.checked; cookSave(); }
  else if (t.dataset.sdone !== undefined) { const S = SHOP0(); S.done[t.dataset.sdone] = t.checked; ST.set("shop", S); shopView(); }
  else if (t.dataset.mdone !== undefined) { const S = SHOP0(); const x = S.manual.find((i) => i.id === t.dataset.mdone); if (x) x.done = t.checked; ST.set("shop", S); shopView(); }
  else if (t.dataset.note) { const N = ST.get("notes", {}); N[t.dataset.note] = t.value.slice(0, 600); ST.set("notes", N); msg(tt("noteSaved")); }
});
document.addEventListener("submit", async (e) => {
  e.preventDefault(); const id = e.target.id;
  try {
    if (id === "af1") { pend = { name: $("#an").value.trim(), email: $("#ae").value.trim().toLowerCase() }; await api("/auth/request", "POST", { ...pend, consent: $("#acc").checked, lang }); authDlg("code"); }
    else if (id === "af2") { const j = await api("/auth/verify", "POST", { ...pend, code: $("#ac").value.trim(), consent: true }); setAuth(j.token, j.user); await afterLogin(); $("#dlg").close(); render(); }
    else if (id === "sf") { await addSpices([$("#si").value]); spicesView(seq); }
    else if (id === "cf") {
      const v = $("#ci").value.trim(), keys = A.parseInput(v, IDX);
      if (!keys.length) { $("#main .err").textContent = tt("cUnknown"); return; }
      const h = haveTerms(); if (!h.some((x) => A.norm(x.label) === A.norm(v))) h.push({ label: v, keys }); ST.set("have", h); cookWhatView(); $("#ci").focus();
    }
    else if (id === "shf") { const S = SHOP0(), v = $("#shi").value.trim(); if (v) { S.manual.push({ id: "m" + Date.now(), text: v, done: false }); ST.set("shop", S); } shopView(); $("#shi").focus(); }
    else if (id === "ff") { await api("/forum/threads", "POST", { title: $("#ft").value, body: $("#fm").value }); forumView(seq); }
    else if (id === "rf") { await api("/forum/threads/" + encodeURIComponent(e.target.dataset.id) + "/replies", "POST", { body: $("#rm").value }); threadView(e.target.dataset.id); }
    else if (id === "rpf") { await api("/forum/report", "POST", { kind: e.target.dataset.k, id: e.target.dataset.i, reason: $("#rpr").value }); $("#dlg").close(); msg(tt("reported")); }
  } catch (err) { showErr(err); }
});
$("#q").addEventListener("input", (e) => { F.q = e.target.value; clearTimeout(timerQ); timerQ = setTimeout(() => { const p = parse().page; if (p !== "recettes" && p !== "glossaire") location.hash = "#recettes"; else render(); }, 250); });
$("#lang").addEventListener("change", (e) => { lang = e.target.value; ST.set("lang", lang); render(); });
$("#dlg").addEventListener("click", (e) => { if (e.target === $("#dlg")) $("#dlg").close(); });
document.addEventListener("error", (e) => { const i = e.target; if (i && i.tagName === "IMG" && i.classList.contains("ph-img")) { const d = document.createElement("div"); d.className = "ph ph-" + i.dataset.cat; d.setAttribute("role", "img"); d.setAttribute("aria-label", i.alt); d.innerHTML = `<span aria-hidden="true">${esc(i.dataset.emoji)}</span>`; i.replaceWith(d); } }, true);
document.addEventListener("keydown", (e) => { if (!cookState) return; if (e.key === "ArrowRight") cookStep(1); else if (e.key === "ArrowLeft") cookStep(-1); else if (e.key === "Escape") cookQuit(); });
let tx = null;
document.addEventListener("touchstart", (e) => { if (cookState && e.touches[0]) tx = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
document.addEventListener("touchend", (e) => { if (!cookState || !tx || !e.changedTouches[0]) return; const dx = e.changedTouches[0].clientX - tx[0], dy = e.changedTouches[0].clientY - tx[1]; tx = null; if (Math.abs(dx) > 70 && Math.abs(dy) < 50) cookStep(dx < 0 ? 1 : -1); }, { passive: true });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && cookState && !wake) requestWake(); });
window.addEventListener("hashchange", () => { if (cookState) cookQuit(false); const d = $("#dlg"); if (d.open) d.close(); render(); window.scrollTo(0, 0); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
render();
loadData().then(() => { if (token) api("/me").then((j) => { user = j.user; ST.set("user", user); renderChrome(); }).catch(() => {}); render(); })
  .catch(() => { $("#main").innerHTML = `<p class="err" role="alert">${esc(tt("dataErr"))}</p><button class="btn" type="button" data-reload>${esc(tt("retry"))}</button>`; });
