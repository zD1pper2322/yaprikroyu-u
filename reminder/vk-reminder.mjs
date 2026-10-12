// Утреннее напоминание «Я прикрою!» во ВКонтакте.
// Берёт товары из общей базы Firebase и отправляет сводку от имени
// сообщества ВК всем, кто написал сообществу хотя бы одно сообщение.
// Ключ сообщества хранится в секрете GitHub VK_TOKEN, в коде его нет.

const FIREBASE_DB_URL = 'https://ya-prikroyu-default-rtdb.europe-west1.firebasedatabase.app';
const DEPARTMENTS = {
  drinks: 'Напитки', grocery: 'Бакалея', sof: 'СОФ',
  gastro1: 'Гастроном 1', gastro2: 'Гастроном 2', sweets: 'Кондитерские изделия',
};
const SOON_DAYS = 3;   // «горит»: осталось 0–3 дня
const WEEK_DAYS = 7;   // «на неделе»: 4–7 дней
const TZ_OFFSET_MIN = 4 * 60; // Самара, UTC+4
const VK_V = '5.199';
const token = process.env.VK_TOKEN;
const dryRun = process.env.DRY_RUN === '1';

function todayLocal() {
  const now = new Date(Date.now() + TZ_OFFSET_MIN * 60000);
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}
function daysLeft(iso, today) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - today) / 86400000);
}
function fmt(iso) { const [, m, d] = String(iso).slice(0, 10).split('-'); return `${d}.${m}`; }
function plural(n, a, b, c) { n = Math.abs(n) % 100; const n1 = n % 10; if (n > 10 && n < 20) return c; if (n1 > 1 && n1 < 5) return b; if (n1 === 1) return a; return c; }

function line(p, days) {
  const tags = [p.sub, p.place].filter(Boolean).join(', ');
  let when;
  if (days < 0) when = `просрочено ${-days} дн.`;
  else if (days === 0) when = 'последний день';
  else when = `${days} ${plural(days, 'день', 'дня', 'дней')}`;
  return `• ${p.name} — до ${fmt(p.date)} (${when})${tags ? ' · ' + tags : ''}${p.onPromo ? ' · на акции' : ''}`;
}

export function buildMessage(departments, today = todayLocal()) {
  const blocks = [];
  let total = 0;
  for (const [id, title] of Object.entries(DEPARTMENTS)) {
    const node = departments?.[id];
    const products = Array.isArray(node) ? node : (Array.isArray(node?.products) ? node.products : []);
    const rows = products.filter(p => p && p.name && p.date)
      .map(p => ({ p, d: daysLeft(p.date, today) }))
      .filter(x => x.d <= WEEK_DAYS)
      .sort((a, b) => a.d - b.d);
    if (!rows.length) continue;
    total += rows.length;
    const expired = rows.filter(x => x.d < 0), soon = rows.filter(x => x.d >= 0 && x.d <= SOON_DAYS), week = rows.filter(x => x.d > SOON_DAYS);
    const parts = [`📦 ${title}`];
    if (expired.length) parts.push('❌ Просрочено:', ...expired.map(x => line(x.p, x.d)));
    if (soon.length) parts.push('🔥 Горит (до 3 дней):', ...soon.map(x => line(x.p, x.d)));
    if (week.length) parts.push('🕒 На этой неделе:', ...week.map(x => line(x.p, x.d)));
    blocks.push(parts.join('\n'));
  }
  const d = new Date(today);
  const head = `Я прикрою! · ${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  if (!total) return `${head}\n✅ Ничего не горит на ближайшую неделю.`;
  return `${head}\nТребуют внимания: ${total} ${plural(total, 'позиция', 'позиции', 'позиций')}\n\n${blocks.join('\n\n')}`;
}

async function vk(method, params) {
  const body = new URLSearchParams({ ...params, access_token: token, v: VK_V });
  let res;
  try { res = await fetch(`https://api.vk.com/method/${method}`, { method: 'POST', body }); }
  catch (e) { throw new Error(`Нет связи с ВКонтакте: ${e.message}`); }
  const json = await res.json();
  if (json.error) throw new Error(`VK ${method}: ${json.error.error_code} ${json.error.error_msg}`);
  return json.response;
}

function chunks(text, max = 3900) {
  const out = []; let cur = '';
  for (const l of text.split('\n')) {
    if ((cur + '\n' + l).length > max) { out.push(cur); cur = l; } else cur = cur ? cur + '\n' + l : l;
  }
  if (cur) out.push(cur);
  return out;
}

async function main() {
  let res;
  try { res = await fetch(`${FIREBASE_DB_URL}/departments.json`); }
  catch (e) { throw new Error(`Нет связи с общей базой Firebase: ${e.message}`); }
  if (!res.ok) throw new Error(`Общая база Firebase ответила ошибкой ${res.status}`);
  const message = buildMessage(await res.json());
  console.log(message);
  if (dryRun) return;
  if (!token) throw new Error('Нет секрета VK_TOKEN: добавьте ключ сообщества в Settings → Secrets and variables → Actions.');

  const conv = await vk('messages.getConversations', { count: 200, filter: 'all' });
  const peers = conv.items.map(i => i.conversation.peer).filter(p => p.type === 'user').map(p => p.id);
  if (!peers.length) throw new Error('Сообществу ещё никто не писал. Напишите сообществу любое сообщение со своей страницы ВК.');
  for (const peer of peers) {
    for (const part of chunks(message)) {
      await vk('messages.send', { peer_id: peer, message: part, random_id: Math.floor(Math.random() * 2 ** 31) });
    }
    console.log('Отправлено:', peer);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => {
    // ::error:: показывает причину прямо на странице запуска в GitHub
    console.log(`::error title=Напоминание не отправлено::${String(e.message).replace(/\n/g, ' ')}`);
    process.exit(1);
  });
}
