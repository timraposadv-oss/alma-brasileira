// Alma brasileira – API (Cloudflare Pages Functions + base D1). Aucune dépendance externe.
// Connexion sans mot de passe : code à 6 chiffres envoyé par e-mail.

const LANGS = ["fr", "nl", "de", "en", "pt"];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const HOUR = 3600e3;
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, consent_at INTEGER NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS login_codes (email TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS spices (user_id TEXT NOT NULL, name TEXT NOT NULL, norm TEXT NOT NULL, PRIMARY KEY (user_id, norm))`,
  `CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, author_id TEXT, author_name TEXT NOT NULL, created_at INTEGER NOT NULL, last_activity_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_threads_act ON threads(last_activity_at)`,
  `CREATE TABLE IF NOT EXISTS replies (id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, body TEXT NOT NULL, author_id TEXT, author_name TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_replies_thread ON replies(thread_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, kind TEXT NOT NULL, target_id TEXT NOT NULL, reporter_id TEXT NOT NULL, reason TEXT NOT NULL, created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open', UNIQUE(reporter_id, kind, target_id))`,
  `CREATE TABLE IF NOT EXISTS limits (k TEXT PRIMARY KEY, n INTEGER NOT NULL, reset_at INTEGER NOT NULL)`,
];

const MAIL = {
  fr: ["Votre code de connexion Alma brasileira", (c) => `Votre code : ${c}\n\nIl est valable 10 minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.`],
  nl: ["Je inlogcode voor Alma brasileira", (c) => `Je code: ${c}\n\nHij is 10 minuten geldig. Heb je dit niet aangevraagd, negeer dan dit bericht.`],
  de: ["Dein Anmeldecode für Alma brasileira", (c) => `Dein Code: ${c}\n\nEr ist 10 Minuten gültig. Falls du das nicht angefordert hast, ignoriere diese Nachricht.`],
  en: ["Your Alma brasileira sign-in code", (c) => `Your code: ${c}\n\nIt is valid for 10 minutes. If you did not request it, please ignore this message.`],
  pt: ["Seu código de acesso ao Alma brasileira", (c) => `Seu código: ${c}\n\nEle vale por 10 minutos. Se você não solicitou, ignore esta mensagem.`],
};

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (msg, status = 400) => { throw new HttpError(status, msg); };
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });

const sha = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
const rand = (n = 32) => {
  const a = crypto.getRandomValues(new Uint8Array(n));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const clean = (s, min, max) => {
  if (typeof s !== "string") return null;
  const t = s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return t.length >= min && t.length <= max ? t : null;
};
const cleanText = (s, min, max) => {
  if (typeof s !== "string") return null;
  const t = s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (t.length < min || t.length > max) return null;
  if ((t.match(/https?:\/\//gi) || []).length > 2) bad("Deux liens maximum par message.");
  return t;
};

const schemaReady = new WeakMap();
function ensureSchema(db) {
  if (!schemaReady.has(db)) {
    schemaReady.set(db, db.batch(SCHEMA.map((s) => db.prepare(s))).catch((e) => { schemaReady.delete(db); throw e; }));
  }
  return schemaReady.get(db);
}

async function hit(db, key, limit, windowMs) {
  const now = Date.now();
  const row = await db.prepare("SELECT n, reset_at FROM limits WHERE k = ?").bind(key).first();
  if (!row || row.reset_at <= now) {
    await db.prepare("INSERT OR REPLACE INTO limits (k, n, reset_at) VALUES (?, 1, ?)").bind(key, now + windowMs).run();
    return true;
  }
  if (row.n >= limit) return false;
  await db.prepare("UPDATE limits SET n = n + 1 WHERE k = ?").bind(key).run();
  return true;
}
const limitOrFail = async (db, key, limit, windowMs) => {
  if (!(await hit(db, key, limit, windowMs))) bad("Trop de demandes, réessayez plus tard.", 429);
};

async function getUser(request, env) {
  const h = request.headers.get("authorization") || "";
  if (!h.startsWith("Bearer ")) return null;
  const row = await env.DB.prepare(
    "SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?"
  ).bind(await sha(h.slice(7)), Date.now()).first();
  if (!row) return null;
  row.admin = !!env.ADMIN_EMAIL && row.email === String(env.ADMIN_EMAIL).trim().toLowerCase();
  return row;
}
const requireUser = async (request, env) => (await getUser(request, env)) || bad("Connexion requise.", 401);
const pub = (u) => ({ name: u.name, email: u.email, admin: !!u.admin });

async function sendMail(env, to, lang, code) {
  if (!env.BREVO_API_KEY) {
    if (env.DEV_RETURN_CODE === "1") return;
    bad("L’envoi d’e-mails n’est pas configuré.", 503);
  }
  const [subject, text] = MAIL[lang];
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { name: env.MAIL_FROM_NAME || "Alma brasileira", email: env.MAIL_FROM }, to: [{ email: to }], subject, textContent: text(code) }),
  });
  if (!r.ok) bad("Impossible d’envoyer l’e-mail pour le moment.", 502);
}

const ipKey = async (request, env) => sha((request.headers.get("cf-connecting-ip") || "?") + ":" + env.AUTH_SECRET);

async function authRequest(request, env, body) {
  const email = (clean(body.email, 5, 120) || "").toLowerCase();
  if (!EMAIL_RE.test(email)) bad("Adresse e-mail invalide.");
  if (!clean(body.name, 2, 30)) bad("Prénom requis (2 à 30 caractères).");
  if (body.consent !== true) bad("Vous devez accepter les conditions d’utilisation.");
  const lang = LANGS.includes(body.lang) ? body.lang : "fr";
  await limitOrFail(env.DB, "ip:" + (await ipKey(request, env)), 20, HOUR);
  await limitOrFail(env.DB, "mail:" + email, 5, HOUR);
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
  await env.DB.prepare("INSERT OR REPLACE INTO login_codes (email, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0)")
    .bind(email, await sha(`${code}:${email}:${env.AUTH_SECRET}`), Date.now() + 10 * 60e3).run();
  await sendMail(env, email, lang, code);
  return json({ ok: true, ...(env.DEV_RETURN_CODE === "1" ? { devCode: code } : {}) });
}

async function authVerify(request, env, body) {
  const email = (clean(body.email, 5, 120) || "").toLowerCase();
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) bad("Code invalide ou expiré.");
  await limitOrFail(env.DB, "vip:" + (await ipKey(request, env)), 40, HOUR);
  const row = await env.DB.prepare("SELECT code_hash, expires_at, attempts FROM login_codes WHERE email = ?").bind(email).first();
  if (!row || row.expires_at < Date.now() || row.attempts >= 5) bad("Code invalide ou expiré.");
  await env.DB.prepare("UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?").bind(email).run();
  if ((await sha(`${code}:${email}:${env.AUTH_SECRET}`)) !== row.code_hash) bad("Code invalide ou expiré.");
  await env.DB.prepare("DELETE FROM login_codes WHERE email = ?").bind(email).run();
  let user = await env.DB.prepare("SELECT id, email, name FROM users WHERE email = ?").bind(email).first();
  if (!user) {
    const name = clean(body.name, 2, 30);
    if (!name || body.consent !== true) bad("Prénom et acceptation des conditions requis.");
    user = { id: crypto.randomUUID(), email, name };
    const now = Date.now();
    await env.DB.prepare("INSERT INTO users (id, email, name, consent_at, created_at) VALUES (?, ?, ?, ?, ?)").bind(user.id, email, name, now, now).run();
  }
  user.admin = !!env.ADMIN_EMAIL && email === String(env.ADMIN_EMAIL).trim().toLowerCase();
  const token = rand();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(await sha(token), user.id, Date.now() + 90 * 24 * HOUR).run();
  return json({ token, user: pub(user) });
}

const listSpices = async (db, uid) =>
  (await db.prepare("SELECT name FROM spices WHERE user_id = ? ORDER BY norm").bind(uid).all()).results.map((r) => r.name);

async function addSpices(db, uid, names) {
  const have = new Set((await db.prepare("SELECT norm FROM spices WHERE user_id = ?").bind(uid).all()).results.map((r) => r.norm));
  for (const raw of names) {
    const name = clean(raw, 1, 40);
    if (!name || have.size >= 100) continue;
    const n = norm(name);
    if (have.has(n)) continue;
    await db.prepare("INSERT OR IGNORE INTO spices (user_id, name, norm) VALUES (?, ?, ?)").bind(uid, name, n).run();
    have.add(n);
  }
  return listSpices(db, uid);
}

const ago = () => Date.now();
const threadPublic = (t, me) => ({ id: t.id, title: t.title, body: t.body, author: t.author_name, createdAt: t.created_at, canDelete: !!me && (me.admin || t.author_id === me.id) });

async function deleteThread(db, id) {
  await db.batch([
    db.prepare("DELETE FROM reports WHERE (kind = 'thread' AND target_id = ?) OR (kind = 'reply' AND target_id IN (SELECT id FROM replies WHERE thread_id = ?))").bind(id, id),
    db.prepare("DELETE FROM replies WHERE thread_id = ?").bind(id),
    db.prepare("DELETE FROM threads WHERE id = ?").bind(id),
  ]);
}
async function deleteReply(db, id) {
  await db.batch([
    db.prepare("DELETE FROM reports WHERE kind = 'reply' AND target_id = ?").bind(id),
    db.prepare("DELETE FROM replies WHERE id = ?").bind(id),
  ]);
}

import RECIPES_PRIVATE from "./_recipes.js";

// Point d'extension pour les futurs abonnements : retourner false pour réserver la recette aux abonnés.
const hasAccess = (_user) => true;

async function route(request, env, parts, body) {
  if (parts[0] === "recipes" && parts[1] && request.method === "GET") {
    const me = await requireUser(request, env);
    if (!hasAccess(me)) bad("Abonnement requis.", 402);
    const rec = Object.prototype.hasOwnProperty.call(RECIPES_PRIVATE, parts[1]) ? RECIPES_PRIVATE[parts[1]] : null;
    if (!rec) bad("Recette introuvable.", 404);
    return json({ recipe: rec });
  }
  const db = env.DB;
  const m = request.method;
  const [a, b, c] = parts;

  if (a === "auth" && m === "POST" && b === "request") return authRequest(request, env, body);
  if (a === "auth" && m === "POST" && b === "verify") return authVerify(request, env, body);
  if (a === "auth" && m === "POST" && b === "logout") {
    const h = request.headers.get("authorization") || "";
    if (h.startsWith("Bearer ")) await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha(h.slice(7))).run();
    return json({ ok: true });
  }

  if (a === "me") {
    const me = await requireUser(request, env);
    if (!b && m === "GET") return json({ user: pub(me) });
    if (b === "export" && m === "GET") {
      const u = await db.prepare("SELECT email, name, consent_at, created_at FROM users WHERE id = ?").bind(me.id).first();
      const threads = (await db.prepare("SELECT title, body, created_at FROM threads WHERE author_id = ?").bind(me.id).all()).results;
      const replies = (await db.prepare("SELECT body, created_at FROM replies WHERE author_id = ?").bind(me.id).all()).results;
      return json({ exportedAt: ago(), account: u, spices: await listSpices(db, me.id), forumThreads: threads, forumReplies: replies });
    }
    if (!b && m === "DELETE") {
      await db.batch([
        db.prepare("UPDATE threads SET author_id = NULL, author_name = 'Compte supprimé' WHERE author_id = ?").bind(me.id),
        db.prepare("UPDATE replies SET author_id = NULL, author_name = 'Compte supprimé' WHERE author_id = ?").bind(me.id),
        db.prepare("DELETE FROM reports WHERE reporter_id = ?").bind(me.id),
        db.prepare("DELETE FROM spices WHERE user_id = ?").bind(me.id),
        db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(me.id),
        db.prepare("DELETE FROM login_codes WHERE email = ?").bind(me.email),
        db.prepare("DELETE FROM users WHERE id = ?").bind(me.id),
      ]);
      return json({ ok: true });
    }
  }

  if (a === "spices") {
    const me = await requireUser(request, env);
    if (!b && m === "GET") return json({ spices: await listSpices(db, me.id) });
    if (!b && m === "POST") {
      const name = clean(body.name, 1, 40) || bad("Nom d’épice requis (40 caractères maximum).");
      return json({ spices: await addSpices(db, me.id, [name]) }, 201);
    }
    if (b === "bulk" && m === "POST") {
      const names = Array.isArray(body.names) ? body.names.slice(0, 50) : bad("Liste requise.");
      return json({ spices: await addSpices(db, me.id, names) });
    }
    if (b && m === "DELETE") {
      await db.prepare("DELETE FROM spices WHERE user_id = ? AND norm = ?").bind(me.id, norm(b)).run();
      return json({ spices: await listSpices(db, me.id) });
    }
  }

  if (a === "forum") {
    if (b === "threads" && !c && m === "GET") {
      const page = Math.max(1, parseInt(new URL(request.url).searchParams.get("page"), 10) || 1);
      const rows = (await db.prepare(
        "SELECT t.id, t.title, t.author_name, t.created_at, (SELECT COUNT(*) FROM replies r WHERE r.thread_id = t.id) AS reply_count FROM threads t ORDER BY t.last_activity_at DESC LIMIT 20 OFFSET ?"
      ).bind((page - 1) * 20).all()).results;
      const total = (await db.prepare("SELECT COUNT(*) AS n FROM threads").first()).n;
      return json({ page, total, threads: rows.map((t) => ({ id: t.id, title: t.title, author: t.author_name, createdAt: t.created_at, replyCount: t.reply_count })) });
    }
    if (b === "threads" && !c && m === "POST") {
      const me = await requireUser(request, env);
      const title = clean(body.title, 3, 90) || bad("Titre requis (3 à 90 caractères).");
      const text = cleanText(body.body, 1, 600) || bad("Message requis (600 caractères maximum).");
      await limitOrFail(db, "post:" + me.id, 10, HOUR);
      const id = crypto.randomUUID(), now = Date.now();
      await db.prepare("INSERT INTO threads (id, title, body, author_id, author_name, created_at, last_activity_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, title, text, me.id, me.name, now, now).run();
      return json({ id }, 201);
    }
    if (b === "threads" && c && !parts[3] && m === "GET") {
      const me = await getUser(request, env);
      const t = await db.prepare("SELECT * FROM threads WHERE id = ?").bind(c).first() || bad("Discussion introuvable.", 404);
      const replies = (await db.prepare("SELECT * FROM replies WHERE thread_id = ? ORDER BY created_at LIMIT 500").bind(c).all()).results;
      return json({ thread: { ...threadPublic(t, me), replies: replies.map((r) => ({ id: r.id, body: r.body, author: r.author_name, createdAt: r.created_at, canDelete: !!me && (me.admin || r.author_id === me.id) })) } });
    }
    if (b === "threads" && c && parts[3] === "replies" && m === "POST") {
      const me = await requireUser(request, env);
      const text = cleanText(body.body, 1, 600) || bad("Message requis (600 caractères maximum).");
      const t = await db.prepare("SELECT id FROM threads WHERE id = ?").bind(c).first() || bad("Discussion introuvable.", 404);
      const n = (await db.prepare("SELECT COUNT(*) AS n FROM replies WHERE thread_id = ?").bind(t.id).first()).n;
      if (n >= 500) bad("Cette discussion est complète.");
      await limitOrFail(db, "post:" + me.id, 10, HOUR);
      const now = Date.now();
      await db.batch([
        db.prepare("INSERT INTO replies (id, thread_id, body, author_id, author_name, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), t.id, text, me.id, me.name, now),
        db.prepare("UPDATE threads SET last_activity_at = ? WHERE id = ?").bind(now, t.id),
      ]);
      return json({ ok: true }, 201);
    }
    if (b === "threads" && c && !parts[3] && m === "DELETE") {
      const me = await requireUser(request, env);
      const t = await db.prepare("SELECT author_id FROM threads WHERE id = ?").bind(c).first() || bad("Discussion introuvable.", 404);
      if (!me.admin && t.author_id !== me.id) bad("Action non autorisée.", 403);
      await deleteThread(db, c);
      return json({ ok: true });
    }
    if (b === "replies" && c && m === "DELETE") {
      const me = await requireUser(request, env);
      const r = await db.prepare("SELECT author_id FROM replies WHERE id = ?").bind(c).first() || bad("Réponse introuvable.", 404);
      if (!me.admin && r.author_id !== me.id) bad("Action non autorisée.", 403);
      await deleteReply(db, c);
      return json({ ok: true });
    }
    if (b === "report" && m === "POST") {
      const me = await requireUser(request, env);
      const kind = body.kind === "reply" ? "reply" : body.kind === "thread" ? "thread" : bad("Type invalide.");
      const reason = clean(body.reason, 3, 300) || bad("Motif requis (3 à 300 caractères).");
      const id = typeof body.id === "string" ? body.id : bad("Contenu invalide.");
      const exists = await db.prepare(`SELECT id FROM ${kind === "thread" ? "threads" : "replies"} WHERE id = ?`).bind(id).first();
      if (!exists) bad("Contenu introuvable.", 404);
      await limitOrFail(db, "rep:" + me.id, 20, 24 * HOUR);
      await db.prepare("INSERT OR IGNORE INTO reports (id, kind, target_id, reporter_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), kind, id, me.id, reason, Date.now()).run();
      return json({ ok: true }, 201);
    }
  }

  if (a === "admin") {
    const me = await requireUser(request, env);
    if (!me.admin) bad("Action non autorisée.", 403);
    if (b === "reports" && !c && m === "GET") {
      const rows = (await db.prepare(
        `SELECT p.id, p.kind, p.target_id, p.reason, p.created_at,
           CASE p.kind WHEN 'thread' THEN t.title || ' — ' || t.body ELSE r.body END AS content,
           CASE p.kind WHEN 'thread' THEN t.author_name ELSE r.author_name END AS author
         FROM reports p LEFT JOIN threads t ON p.kind = 'thread' AND t.id = p.target_id LEFT JOIN replies r ON p.kind = 'reply' AND r.id = p.target_id
         WHERE p.status = 'open' ORDER BY p.created_at LIMIT 100`).all()).results;
      return json({ reports: rows.map((x) => ({ id: x.id, kind: x.kind, reason: x.reason, content: x.content, author: x.author, createdAt: x.created_at })) });
    }
    if (b === "reports" && c && m === "POST") {
      const rep = await db.prepare("SELECT kind, target_id FROM reports WHERE id = ?").bind(c).first() || bad("Signalement introuvable.", 404);
      if (body.action === "delete") {
        if (rep.kind === "thread") await deleteThread(db, rep.target_id); else await deleteReply(db, rep.target_id);
      } else if (body.action === "dismiss") {
        await db.prepare("UPDATE reports SET status = 'closed' WHERE kind = ? AND target_id = ?").bind(rep.kind, rep.target_id).run();
      } else bad("Action invalide.");
      return json({ ok: true });
    }
  }

  return json({ error: "Route introuvable." }, 404);
}

export async function handle(request, env) {
  try {
    if (!env.DB) bad("Base de données non liée (voir le guide).", 500);
    if (!env.AUTH_SECRET || String(env.AUTH_SECRET).length < 32) bad("AUTH_SECRET manquant ou trop court (32 caractères minimum).", 500);
    await ensureSchema(env.DB);
    if (Math.random() < 0.02) {
      const now = Date.now();
      await env.DB.batch([
        env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
        env.DB.prepare("DELETE FROM login_codes WHERE expires_at < ?").bind(now),
        env.DB.prepare("DELETE FROM limits WHERE reset_at < ?").bind(now),
      ]);
    }
    const parts = new URL(request.url).pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    let body = {};
    if (request.method === "POST") {
      const text = await request.text();
      if (text.length > 20000) bad("Requête trop volumineuse.", 413);
      if (text) { try { body = JSON.parse(text); } catch { bad("JSON invalide."); } }
      if (!body || typeof body !== "object" || Array.isArray(body)) body = {};
    }
    return await route(request, env, parts, body);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Erreur du serveur." }, 500);
  }
}

export const onRequest = ({ request, env }) => handle(request, env);
