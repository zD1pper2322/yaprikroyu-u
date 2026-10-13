// Общие функции для отправки сообщений от сообщества ВК.
export const FIREBASE_DB_URL = 'https://ya-prikroyu-default-rtdb.europe-west1.firebasedatabase.app';
const VK_V = '5.199';

// Вход бота в базу. Секрет FIREBASE_BOT = «почта пароль» (создаётся в админке
// приложения кнопкой «Создать ключ для GitHub»). Пока секрета нет, запросы
// идут без входа — это работает, только пока база открыта.
const FIREBASE_API_KEY = 'AIzaSyACN9IXzwhSzoxBWvi4WTccFn_AFfRHgqE';
let botToken = null;
async function botSignIn() {
  const cred = (process.env.FIREBASE_BOT || '').trim();
  if (!cred) return null;
  const [email, password] = cred.split(/\s+/);
  const res = await rawFetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Вход бота в базу не удался (${j?.error?.message || res.status}). Создайте новый ключ в админке и обновите секрет FIREBASE_BOT.`);
  return j.idToken;
}
const rawFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (url, opt) => {
  url = String(url);
  if (url.startsWith('https://ya-prikroyu-default-rtdb.')) {
    if (botToken === null) botToken = (await botSignIn()) || '';
    if (botToken) url += (url.includes('?') ? '&' : '?') + 'auth=' + encodeURIComponent(botToken);
  }
  return rawFetch(url, opt);
};

export async function vk(method, params) {
  const token = process.env.VK_TOKEN;
  if (!token) throw new Error('Нет секрета VK_TOKEN: добавьте ключ сообщества в Settings → Secrets and variables → Actions.');
  const body = new URLSearchParams({ ...params, access_token: token, v: VK_V });
  let res;
  try { res = await fetch(`https://api.vk.com/method/${method}`, { method: 'POST', body }); }
  catch (e) { throw new Error(`Нет связи с ВКонтакте: ${e.message}`); }
  const json = await res.json();
  if (json.error) throw new Error(`VK ${method}: ${json.error.error_code} ${json.error.error_msg}`);
  return json.response;
}

// Кому писать: руководители сообщества, которые писали сообществу.
// Если список руководителей получить нельзя — всем, кто писал сообществу.
export async function recipients() {
  const conv = await vk('messages.getConversations', { count: 200, filter: 'all' });
  let peers = conv.items.map(i => i.conversation.peer).filter(p => p.type === 'user').map(p => p.id);
  if (!peers.length) throw new Error('Сообществу ещё никто не писал. Напишите сообществу любое сообщение со своей страницы ВК (ссылка vk.me/club…).');
  try {
    const g = await vk('groups.getById', {});
    const gid = (g.groups || g)[0].id;
    const m = await vk('groups.getMembers', { group_id: gid, filter: 'managers' });
    const ids = m.items.map(x => (typeof x === 'object' ? x.id : x));
    const admins = peers.filter(id => ids.includes(id));
    if (admins.length) peers = admins;
  } catch (e) {
    console.log(`::warning::Не удалось получить руководителей сообщества (${e.message}) — отправляю всем, кто писал сообществу.`);
  }
  return peers;
}

export function chunks(text, max = 3900) {
  const out = []; let cur = '';
  for (const l of text.split('\n')) {
    if ((cur + '\n' + l).length > max) { out.push(cur); cur = l; } else cur = cur ? cur + '\n' + l : l;
  }
  if (cur) out.push(cur);
  return out;
}

export async function sendAll(peers, text) {
  for (const peer of peers) {
    for (const part of chunks(text)) {
      await vk('messages.send', { peer_id: peer, message: part, random_id: Math.floor(Math.random() * 2 ** 31) });
    }
  }
}

export function fail(e) {
  console.log(`::error title=Сообщение не отправлено::${String(e.message).replace(/\n/g, ' ')}`);
  process.exit(1);
}
