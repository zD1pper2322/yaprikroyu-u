// Уведомление админу во ВКонтакте о новых запросах доступа и новых
// сообщениях в чате поддержки. Запускается GitHub каждые 10 минут.
// Каждое сообщение пересылается один раз (в базе ставится notified: true).
import { FIREBASE_DB_URL, recipients, sendAll, fail } from './vk-common.mjs';

const clip = (s, n) => String(s ?? '').slice(0, n);
const asList = x => (Array.isArray(x) ? x : (x && typeof x === 'object' ? Object.values(x) : []));

async function patch(path, body) {
  await fetch(`${FIREBASE_DB_URL}/${path}.json`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

async function main() {
  const res = await fetch(`${FIREBASE_DB_URL}/requests.json`);
  if (!res.ok) throw new Error(`Общая база Firebase ответила ошибкой ${res.status}`);
  const all = (await res.json()) || {};

  let names = {};
  try {
    asList(await (await fetch(`${FIREBASE_DB_URL}/config/catalog.json`)).json()).forEach(d => { if (d && d.id) names[d.id] = d.name; });
  } catch (e) {}

  const blocks = [];
  const marks = []; // что пометить как отправленное
  for (const [rid, r] of Object.entries(all)) {
    if (!r || !r.name) continue;
    const msgs = Object.entries(r.messages || {}).filter(([, m]) => m && m.from === 'user' && m.notified !== true && m.text)
      .sort((a, b) => (a[1].ts || 0) - (b[1].ts || 0));
    const isNew = r.notified !== true;
    if (!isNew && !msgs.length) continue;
    const depts = asList(r.depts).map(id => names[id] || id).join(', ') || 'отдел не указан';
    const lines = [];
    if (isNew) lines.push(`🔑 Новый запрос доступа: ${clip(r.name, 60)} — ${depts}${r.contact ? `\nСвязь: ${clip(r.contact, 80)}` : ''}`);
    else lines.push(`💬 ${clip(r.name, 60)} пишет:`);
    msgs.forEach(([, m]) => lines.push(`«${clip(m.text, 500)}»`));
    blocks.push(lines.join('\n'));
    if (isNew) marks.push([`requests/${encodeURIComponent(rid)}`, { notified: true }]);
    msgs.forEach(([mid]) => marks.push([`requests/${encodeURIComponent(rid)}/messages/${encodeURIComponent(mid)}`, { notified: true }]));
  }
  if (!blocks.length) { console.log('Новых запросов и сообщений нет'); return; }

  const text = `Я прикрою! · чат поддержки\n\n${blocks.join('\n\n')}\n\nОтветить: приложение → 👤 → «Запросы доступа и чат».`;
  const peers = await recipients();
  await sendAll(peers, text);
  for (const [path, body] of marks) await patch(path, body);
  console.log('Отправлено блоков:', blocks.length);
}

main().catch(fail);
