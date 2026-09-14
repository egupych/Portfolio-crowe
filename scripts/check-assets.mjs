/**
 * Проверяет, что данные и картинки не разъехались:
 *   - каждый ключ CERTS соответствует существующему сотруднику;
 *   - все файлы, на которые ссылаются данные, лежат на диске;
 *   - в certificates/ нет исходников, которые никому не принадлежат.
 *
 * Запуск:  node scripts/check-assets.mjs
 * Код возврата 1 — что-то не сходится.
 */
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { employees, CERTS, getCertificates, getEmployees } from '../js/data.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
// Пути в данных корневые ('/photos/...') — для диска ведущий слэш убираем
const exists = (webPath) => existsSync(join(ROOT, webPath.replace(/^\//, '')));

// --- Ключи CERTS: именно из-за них переименование сотрудника раньше молча
// оставляло его без сертификатов
const ids = new Set(employees.map((e) => e.id));
for (const id of Object.keys(CERTS)) {
  if (!ids.has(id)) problems.push(`CERTS: «${id}» — нет сотрудника с таким id`);
}

// --- Файлы, на которые ссылаются данные
for (const emp of employees) {
  if (!exists(emp.photo)) problems.push(`${emp.id}: нет фото ${emp.photo}`);

  for (const { thumb, full } of getCertificates(emp.id)) {
    if (!exists(thumb)) problems.push(`${emp.id}: нет превью ${thumb}`);
    if (!exists(full)) problems.push(`${emp.id}: нет полного размера ${full}`);
  }
}

// --- Исходники без владельца
const claimed = new Set(Object.values(CERTS).flat().map((file) => `${file}.png`));
for (const file of readdirSync(join(ROOT, 'certificates'))) {
  if (file.endsWith('.png') && !claimed.has(file)) {
    problems.push(`certificates/${file} — не привязан ни к кому`);
  }
}

const visible = getEmployees('en').length;
const certCount = Object.values(CERTS).flat().length;
console.log(`Сотрудников: ${employees.length} (видимых ${visible}), сертификатов: ${certCount}`);

if (problems.length) {
  console.error(`\nПроблемы (${problems.length}):`);
  problems.forEach((p) => console.error(`  - ${p}`));
  process.exit(1);
}
console.log('Все ссылки на месте.');
