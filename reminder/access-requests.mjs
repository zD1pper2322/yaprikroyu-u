// Уведомление админу во ВКонтакте о новых запросах доступа.
// Запускается GitHub каждые 10 минут. Каждый запрос отправляется один раз
// (после отправки в базе ставится notified: true).
import { FIREBASE_DB_URL, vk, recipients, sendAll, fail } from './vk-common.mjs';

async function main() {
  const res = await fetch(`${FIREBASE_DB_URL}/requests.json`);
  if (!res.ok) throw new Error(`Общая база Firebase ответила ошибкой ${res.status}`);
  const all = (await res.json()) || {};
  const fresh = Object.entries(all).filter(([, r]) => r && r.name && r.notified !== true);
  if (!fresh.length) { console.log('Новых запросов нет'); return; }

  let names = {};
  try {
    const c = await (await fetch(`${FIREBASE_DB_URL}/config/catalog.json`)).json();
    (Array.isArray(c) ? c : Object.values(c || {})).forEach(d => { if (d && d.id) names[d.id] = d.name; });
  } catch (e) {}

  const lines = fresh.map(([, r]) => {
    const depts = (Array.isArray(r.depts) ? r.depts : Object.values(r.depts || {})).map(id => names[id] || id).join(', ') || 'отдел не указан';
    return `• ${String(r.name).slice(0, 60)} — ${depts}\n  Связь: ${String(r.contact || 'не указана').slice(0, 80)}${r.comment ? `\n  ${String(r.comment).slice(0, 120)}` : ''}`;
  });
  const text = `🔑 Я прикрою! · ${fresh.length === 1 ? 'новый запрос доступа' : `новых запросов доступа: ${fresh.length}`}\n\n${lines.join('\n\n')}\n\nСоздать сотрудника: приложение → 👤 → «Запросы доступа».`;

  const peers = await recipients();
  await sendAll(peers, text);
  for (const [id] of fresh) {
    await fetch(`${FIREBASE_DB_URL}/requests/${encodeURIComponent(id)}.json`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notified: true }),
    });
  }
  console.log('Отправлено запросов:', fresh.length);
}

main().catch(fail);
