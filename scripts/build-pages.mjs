/**
 * Собирает статическую страницу для каждого сотрудника и карту сайта.
 *
 *   node scripts/build-pages.mjs
 *
 * Зачем: приложение одностраничное, и без этих файлов профиль по адресу
 * /team/<id> не открылся бы напрямую, поисковик его бы не увидел, а мессенджер
 * показал бы общее превью сайта. Страница — та же index.html с подменёнными
 * мета-тегами; дальше её подхватывает app.js и открывает нужного человека.
 *
 * Запускать после правок в js/data.js, js/data.en.js или index.html.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

import { getEmployees } from '../js/data.js';
import { t } from '../js/i18n.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://portfoliocrowe.vercel.app';
const OUT = join(ROOT, 'team');

const template = readFileSync(join(ROOT, 'index.html'), 'utf8');

const escapeAttr = (value) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Абсолютный адрес для мета-тегов: кириллица в пути должна быть закодирована */
const absolute = (webPath) => SITE + encodeURI(webPath);

/**
 * Для превью в мессенджерах берём исходный PNG: WebP разворачивают не все.
 * Если исходника нет — общая картинка сайта.
 */
function ogImage(employee) {
  const png = employee.photo.replace('/webp/', '/').replace(/\.webp$/, '.png');
  return absolute(existsSync(join(ROOT, png.slice(1))) ? png : '/og-image.jpg');
}

function buildPage(employee) {
  const title = t('meta.personTitle', { name: employee.name, role: employee.role });
  const description = t('meta.personDescription', { name: employee.name, role: employee.role });
  const url = `${SITE}/team/${employee.id}`;
  const image = ogImage(employee);

  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${escapeAttr(description)}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${escapeAttr(title)}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${escapeAttr(description)}"`)
    .replace(/(<meta property="og:image" content=")[^"]*"/, `$1${image}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta name="twitter:title" content=")[^"]*"/, `$1${escapeAttr(title)}"`)
    .replace(/(<meta name="twitter:description" content=")[^"]*"/, `$1${escapeAttr(description)}"`)
    .replace(/(<meta name="twitter:image" content=")[^"]*"/, `$1${image}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
    // og:image:width/height описывают общую картинку 1200x630 — у фото они другие
    .replace(/\s*<meta property="og:image:(?:width|height)" content="\d+">/g, '');
}

const employees = getEmployees('en');

// Каталог пересоздаём: иначе страница удалённого сотрудника осталась бы висеть
rmSync(OUT, { recursive: true, force: true });
for (const employee of employees) {
  const dir = join(OUT, employee.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), buildPage(employee), 'utf8');
}

const urls = [`${SITE}/`, ...employees.map((e) => `${SITE}/team/${e.id}`)];
writeFileSync(
  join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>
`,
  'utf8',
);

writeFileSync(
  join(ROOT, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`,
  'utf8',
);

console.log(`Страниц сотрудников: ${employees.length}, адресов в sitemap.xml: ${urls.length}`);
