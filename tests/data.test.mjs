import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CERTS, employees, getCertificates, getEmployees, getFlag, normalizeSearch } from '../js/data.js';
import { employeesEn } from '../js/data.en.js';

const ru = getEmployees('ru');
const en = getEmployees('en');
const byId = (list, id) => list.find((e) => e.id === id);

test('normalizeSearch приводит регистр и убирает ё', () => {
  assert.equal(normalizeSearch('Бухгалтерский УЧЁТ'), 'бухгалтерский учет');
  assert.equal(normalizeSearch('KPMG'), 'kpmg');
});

test('скрытые сотрудники не попадают в выдачу', () => {
  const hidden = employees.filter((e) => e.hidden);
  assert.ok(hidden.length > 0, 'в данных должен быть хотя бы один скрытый — иначе тест ничего не проверяет');
  for (const emp of hidden) {
    assert.equal(byId(ru, emp.id), undefined);
    assert.equal(byId(en, emp.id), undefined);
  }
});

test('английская версия переводит имя, должность и теги', () => {
  const vera = byId(en, 'vera-bell');
  assert.equal(vera.name, 'Vera Bell');
  assert.equal(vera.role, 'Managing Partner');
  assert.notDeepEqual(vera.tags, byId(ru, 'vera-bell').tags);
});

test('ключи фильтров остаются русскими на обоих языках', () => {
  // roleKey и officeKey — стабильные идентификаторы: при смене языка
  // активный фильтр не должен слетать
  for (const emp of en) {
    const same = byId(ru, emp.id);
    assert.equal(emp.roleKey, same.role);
    assert.equal(emp.officeKey, same.office);
  }
});

test('тип секции берётся из базовых данных, а содержимое из перевода', () => {
  for (const emp of en) {
    const same = byId(ru, emp.id);
    const types = (list) => list.map((s) => s.type);
    assert.deepEqual(types(emp.left), types(same.left));
    assert.deepEqual(types(emp.right), types(same.right));
  }
});

test('поисковый индекс покрывает офис, теги и текст секций', () => {
  const ganova = byId(en, 'ekaterina-ganova');
  assert.match(ganova.search, /crowe russia/, 'офис');
  assert.match(ganova.search, /kpmg/, 'компания из секции опыта');

  const vera = byId(ru, 'vera-bell');
  assert.match(vera.search, /bloomberg/, 'текст из абзаца');
  assert.ok(
    vera.tags.every((tag) => vera.search.includes(normalizeSearch(tag))),
    'все теги должны попадать в индекс',
  );
});

test('индекс собран на языке выдачи', () => {
  assert.match(byId(en, 'vera-bell').search, /managing partner/);
  assert.match(byId(ru, 'vera-bell').search, /управляющий партнер/);
});

test('индекс склеен переносами: соседние пункты не образуют ложных совпадений', () => {
  for (const emp of en) {
    assert.ok(emp.search.includes('\n'), `${emp.id}: индекс из одной строки`);
  }
});

test('сертификаты находятся по id и отдают превью с полным размером', () => {
  const certs = getCertificates('vera-bell');
  assert.equal(certs.length, CERTS['vera-bell'].length);
  for (const cert of certs) {
    assert.match(cert.thumb, /^\/Сертификаты\/thumb\/.+\.webp$/);
    assert.match(cert.full, /^\/Сертификаты\/webp\/.+\.webp$/);
  }
  assert.deepEqual(getCertificates('нет-такого'), []);
});

test('каждый ключ CERTS соответствует существующему сотруднику', () => {
  const ids = new Set(employees.map((e) => e.id));
  for (const id of Object.keys(CERTS)) {
    assert.ok(ids.has(id), `CERTS: «${id}» — нет сотрудника с таким id`);
  }
});

test('каждый перевод соответствует существующему сотруднику', () => {
  const ids = new Set(employees.map((e) => e.id));
  for (const id of Object.keys(employeesEn)) {
    assert.ok(ids.has(id), `data.en.js: «${id}» — нет сотрудника с таким id`);
  }
});

test('id сотрудников уникальны', () => {
  const ids = employees.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('у каждого сотрудника заполнены обязательные поля', () => {
  for (const emp of en) {
    for (const field of ['id', 'name', 'role', 'photo', 'search']) {
      assert.ok(emp[field], `${emp.id}: пустое поле ${field}`);
    }
    assert.ok(Array.isArray(emp.tags) && emp.tags.length, `${emp.id}: нет тегов`);
    assert.ok(Array.isArray(emp.languages), `${emp.id}: нет списка языков`);
  }
});

test('секции бывают только известных типов', () => {
  const known = new Set(['list', 'paragraphs', 'experience']);
  for (const emp of ru) {
    for (const section of [...emp.left, ...emp.right]) {
      assert.ok(known.has(section.type), `${emp.id}: неизвестный тип секции ${section.type}`);
      assert.ok(section.title, `${emp.id}: секция без заголовка`);
      assert.ok(section.items.length, `${emp.id}: пустая секция «${section.title}»`);
    }
  }
});

test('у каждого языка сотрудника есть флаг', () => {
  for (const emp of ru) {
    for (const code of emp.languages) {
      assert.notEqual(getFlag(code), '', `${emp.id}: нет флага для «${code}»`);
    }
  }
  assert.equal(getFlag('нет-такого'), '');
});
