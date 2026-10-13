// Ночное обслуживание базы «Я прикрою!» (запускается вместе с утренней сводкой):
// 1) резервная копия базы файлом руководителям сообщества во ВКонтакте;
// 2) удаление переписок по запросам доступа, где не было сообщений больше 30 дней.
import { FIREBASE_DB_URL, vk, recipients, fail } from './vk-common.mjs';

const KEEP_DAYS = 30;
const get = async path => {
  const r = await fetch(`${FIREBASE_DB_URL}/${path}.json`);
  if (!r.ok) throw new Error(`База: ${path} — ошибка ${r.status}`);
  return r.json();
};
const asList = x => (Array.isArray(x) ? x : (x && typeof x === 'object' ? Object.values(x) : []));

async function cleanup() {
  const reqs = (await get('requests')) || {};
  const border = Date.now() - KEEP_DAYS * 86400000;
  let n = 0;
  for (const [id, r] of Object.entries(reqs)) {
    if (!r || typeof r !== 'object') continue;
    const last = Math.max(Number(r.ts) || 0, ...Object.values(r.messages || {}).map(m => Number(m?.ts) || 0));
    if (last && last < border) {
      await fetch(`${FIREBASE_DB_URL}/requests/${encodeURIComponent(id)}.json`, { method: 'DELETE' });
      n++;
    }
  }
  console.log('Удалено старых переписок:', n);
}

async function backup() {
  const [departments, staff, catalog, places, barcodes, requests] = await Promise.all(
    ['departments', 'staff', 'config/catalog', 'config/places', 'barcodes', 'requests'].map(get));
  const now = new Date();
  const data = {
    formatVersion: 1,
    createdAt: now.toISOString(),
    createdBy: 'GitHub (ночная копия)',
    departments: departments || {},
    users: Object.values(staff || {}).filter(Boolean),
    catalog: catalog || null,
    places: places || null,
    barcodes: barcodes || {},
    requests: requests || {},
  };
  const products = Object.values(data.departments).reduce((s, d) => s + asList(d?.products).length, 0);
  const json = JSON.stringify(data, null, 1);
  const stamp = new Date(now.getTime() + 4 * 3600000).toISOString().slice(0, 10);
  const title = `ya-prikroyu-backup-${stamp}.json`;

  const peers = await recipients();
  for (const peer of peers) {
    const { upload_url } = await vk('docs.getMessagesUploadServer', { type: 'doc', peer_id: peer });
    const form = new FormData();
    form.append('file', new Blob([json], { type: 'application/json' }), title);
    const up = await (await fetch(upload_url, { method: 'POST', body: form })).json();
    if (!up.file) throw new Error('ВК не принял файл копии: ' + JSON.stringify(up).slice(0, 200));
    const saved = await vk('docs.save', { file: up.file, title });
    const doc = saved.doc || saved[0] || saved;
    await vk('messages.send', {
      peer_id: peer, random_id: Math.floor(Math.random() * 2 ** 31),
      message: `💾 Резервная копия «Я прикрою!» за ${stamp}: ${products} товар., ${data.users.length} сотр.\nВосстановить: приложение → 👤 → «Восстановить из файла».`,
      attachment: `doc${doc.owner_id}_${doc.id}`,
    });
  }
  console.log('Копия отправлена:', peers.length, 'получател.;', products, 'товаров;', Math.round(json.length / 1024), 'КБ');
}

async function main() {
  await cleanup();
  await backup();
}
main().catch(fail);
