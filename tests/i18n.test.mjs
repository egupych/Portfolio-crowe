import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_LANG, LANGS, STRINGS, getLang, setLang, t } from '../js/i18n.js';

test('язык по умолчанию — английский', () => {
  setLang(DEFAULT_LANG);
  assert.equal(getLang(), 'en');
  assert.equal(DEFAULT_LANG, 'en');
});

test('неизвестный язык откатывается к языку по умолчанию', () => {
  setLang('de');
  assert.equal(getLang(), DEFAULT_LANG);
});

test('подстановки заполняются из vars', () => {
  setLang('en');
  assert.equal(
    t('meta.personTitle', { name: 'Vera Bell', role: 'Managing Partner' }),
    'Vera Bell — Managing Partner | Crowe Uzbekistan',
  );
  assert.equal(t('certs.alt', { n: 3 }), 'Certificate 3');
});

test('неизвестная подстановка остаётся как есть', () => {
  setLang('en');
  assert.match(t('meta.personTitle', { name: 'Vera Bell' }), /\{role\}/);
});

test('неизвестный ключ возвращается сам собой', () => {
  assert.equal(t('нет.такого.ключа'), 'нет.такого.ключа');
});

test('переключение языка меняет выдачу', () => {
  setLang('ru');
  assert.equal(t('filter.all'), 'Все');
  setLang('en');
  assert.equal(t('filter.all'), 'All');
});

test('наборы ключей во всех языках совпадают', () => {
  // Забытый перевод иначе молча отдаёт английскую строку в русском интерфейсе
  const base = Object.keys(STRINGS[DEFAULT_LANG]).sort();
  for (const lang of LANGS) {
    assert.deepEqual(Object.keys(STRINGS[lang]).sort(), base, `язык «${lang}»`);
  }
});

test('пустых строк в словарях нет', () => {
  for (const lang of LANGS) {
    for (const [key, value] of Object.entries(STRINGS[lang])) {
      assert.ok(value.trim(), `${lang}: пустое значение у ключа ${key}`);
    }
  }
});

test('подстановки в переводах те же, что в оригинале', () => {
  const vars = (s) => (s.match(/\{\w+\}/g) || []).sort();
  for (const [key, value] of Object.entries(STRINGS[DEFAULT_LANG])) {
    for (const lang of LANGS) {
      assert.deepEqual(vars(STRINGS[lang][key]), vars(value), `${lang}: ключ ${key}`);
    }
  }
});
