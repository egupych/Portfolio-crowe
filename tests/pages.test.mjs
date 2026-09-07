import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8');
const body = (html) => html.slice(html.indexOf('<body'));

/**
 * Страницы в team/, compare/ и 404.html — копии index.html с подменённой
 * головой. Правка разметки без запуска scripts/build-pages.mjs оставляет их
 * со старым содержимым, и на сайте это видно только на этих адресах.
 */
test('сгенерированные страницы собраны из текущей index.html', () => {
  const source = body(read('index.html'));
  const generated = [
    ['404.html'],
    ['compare', 'index.html'],
    ...readdirSync(join(ROOT, 'team')).map((id) => ['team', id, 'index.html']),
  ];

  for (const parts of generated) {
    assert.equal(
      body(read(...parts)),
      source,
      `${parts.join('/')} устарел — запустите node scripts/build-pages.mjs`,
    );
  }
});

test('служебные страницы закрыты от индексации', () => {
  for (const parts of [['404.html'], ['compare', 'index.html']]) {
    assert.match(read(...parts), /<meta name="robots" content="noindex">/, parts.join('/'));
  }
});

test('у каждого сотрудника своя страница с каноническим адресом', () => {
  for (const id of readdirSync(join(ROOT, 'team'))) {
    const html = read('team', id, 'index.html');
    assert.match(html, new RegExp(`<link rel="canonical" href="[^"]*/team/${id}">`), id);
    assert.ok(!/<meta name="robots" content="noindex">/.test(html), `${id}: страница профиля не должна быть noindex`);
  }
});
