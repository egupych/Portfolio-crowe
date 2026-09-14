import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Линтера в проекте нет, но синтаксис проверить дёшево: app.js в браузере
 * подключается модулем, и опечатка в нём просто оставляет пустую страницу.
 */
const files = ['js', 'scripts', 'tests'].flatMap((dir) =>
  readdirSync(join(ROOT, dir))
    .filter((f) => f.endsWith('.js') || f.endsWith('.mjs'))
    .map((f) => join(dir, f)),
);

test('все модули разбираются без синтаксических ошибок', () => {
  assert.ok(files.length >= 4, 'файлы для проверки не нашлись');
  for (const file of files) {
    assert.doesNotThrow(
      () => execFileSync(process.execPath, ['--check', file], { cwd: ROOT, stdio: 'pipe' }),
      `синтаксическая ошибка в ${file}`,
    );
  }
});
