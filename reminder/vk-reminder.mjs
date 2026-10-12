// Утреннее напоминание «Я прикрою!» во ВКонтакте.
// Берёт товары из общей базы Firebase и отправляет сводку от имени
// сообщества ВК всем, кто написал сообществу хотя бы одно сообщение.
// Ключ сообщества хранится в секрете GitHub VK_TOKEN, в коде его нет.

import { FIREBASE_DB_URL, recipients, sendAll, fail } from './vk-common.mjs';
const DEFAULT_DEPARTMENTS = {
  drinks: 'Напитки', grocery: 'Бакалея', sof: 'СОФ',
  gastro1: 'Гастроном 1', gastro2: 'Гастроном 2', sweets: 'Кондитерские изделия',
};
const SOON_DAYS = 3;   // «горит»: осталось 0–3 дня
const WEEK_DAYS = 7;   // «на неделе»: 4–7 дней
const TZ_OFFSET_MIN = 4 * 60; // Самара, UTC+4
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

export function buildMessage(departments, today = todayLocal(), names = DEFAULT_DEPARTMENTS) {
  const blocks = [];
  let total = 0;
  for (const [id, title] of Object.entries(names)) {
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

async function main() {
  let res;
  try { res = await fetch(`${FIREBASE_DB_URL}/departments.json`); }
  catch (e) { throw new Error(`Нет связи с общей базой Firebase: ${e.message}`); }
  if (!res.ok) throw new Error(`Общая база Firebase ответила ошибкой ${res.status}`);
  // Названия отделов — из списка, который админ правит в приложении.
  let names = DEFAULT_DEPARTMENTS;
  try {
    const c = await (await fetch(`${FIREBASE_DB_URL}/config/catalog.json`)).json();
    const list = Array.isArray(c) ? c : (c && typeof c === 'object' ? Object.values(c) : []);
    const map = Object.fromEntries(list.filter(d => d && d.id && d.name).map(d => [d.id, d.name]));
    if (Object.keys(map).length) names = map;
  } catch (e) { /* остаются названия по умолчанию */ }
  const message = buildMessage(await res.json(), todayLocal(), names);
  console.log(message);
  if (dryRun) return;
  const peers = await recipients();
  await sendAll(peers, message);
  console.log('Отправлено:', peers.length);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(fail);
}
