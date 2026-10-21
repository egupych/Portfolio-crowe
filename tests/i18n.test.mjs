import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_LANG, LANGS, STRINGS, getLang, setLang, t, getPlural } from '../js/i18n.js';

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

test('getPlural корректно склоняет слова для русского, английского и узбекского', () => {
  assert.equal(getPlural(1, 'specialists', 'ru'), '1 специалист');
  assert.equal(getPlural(2, 'specialists', 'ru'), '2 специалиста');
  assert.equal(getPlural(3, 'specialists', 'ru'), '3 специалиста');
  assert.equal(getPlural(4, 'specialists', 'ru'), '4 специалиста');
  assert.equal(getPlural(5, 'specialists', 'ru'), '5 специалистов');
  assert.equal(getPlural(21, 'specialists', 'ru'), '21 специалист');
  assert.equal(getPlural(22, 'specialists', 'ru'), '22 специалиста');

  assert.equal(getPlural(1, 'certificates', 'ru'), '1 сертификат');
  assert.equal(getPlural(2, 'certificates', 'ru'), '2 сертификата');
  assert.equal(getPlural(5, 'certificates', 'ru'), '5 сертификатов');

  assert.equal(getPlural(1, 'specialists', 'en'), '1 Specialist');
  assert.equal(getPlural(2, 'specialists', 'en'), '2 Specialists');

  assert.equal(getPlural(1, 'specialists', 'uz'), '1 mutaxassis');
  assert.equal(getPlural(2, 'specialists', 'uz'), '2 mutaxassis');
});

