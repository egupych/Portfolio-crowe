import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CERTS, employees, getCertificates, getEmployees, getFlag, levenshteinDistance, matchSearchTerm, normalizeSearch } from '../js/data.js';
import { employeesEn } from '../js/data.en.js';
import { employeesUz } from '../js/data.uz.js';
import { generateQrSvg } from '../js/qr.js';
import { generateVCard } from '../js/vcard.js';

const ru = getEmployees('ru');
const en = getEmployees('en');
const uz = getEmployees('uz');
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

test('узбекская версия переводит имя, должность и теги', () => {
  const vera = byId(uz, 'vera-bell');
  assert.equal(vera.name, 'Vera Bell');
  assert.equal(vera.role, 'Boshqaruvchi hamkor');
  assert.notDeepEqual(vera.tags, byId(ru, 'vera-bell').tags);
});

test('ключи фильтров остаются русскими на всех языках', () => {
  // roleKey и officeKey — стабильные идентификаторы: при смене языка
  // активный фильтр не должен слетать
  for (const list of [en, uz]) {
    for (const emp of list) {
      const same = byId(ru, emp.id);
      assert.equal(emp.roleKey, same.role);
      assert.equal(emp.officeKey, same.office);
    }
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
    assert.match(cert.thumb, /^\/certificates\/thumb\/[a-z0-9-]+\.webp$/);
    assert.match(cert.full, /^\/certificates\/webp\/[a-z0-9-]+\.webp$/);
  }
  assert.deepEqual(getCertificates('нет-такого'), []);
});

test('пути к картинкам — латиница без пробелов', () => {
  // Иначе ссылка в адресной строке превращается в %D0%A4%D0%BE%D1%82%D0%BE%20...
  const ascii = /^[a-z0-9/_.-]+$/;
  for (const emp of employees) {
    assert.match(emp.photo, ascii, `${emp.id}: путь к фото`);
    for (const cert of getCertificates(emp.id)) {
      assert.match(cert.thumb, ascii, `${emp.id}: путь к превью`);
      assert.match(cert.full, ascii, `${emp.id}: путь к сертификату`);
    }
  }
  for (const code of ['ru', 'uk', 'uz', 'fr', 'it']) {
    assert.match(getFlag(code), ascii, `флаг ${code}`);
  }
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
  for (const id of Object.keys(employeesUz)) {
    assert.ok(ids.has(id), `data.uz.js: «${id}» — нет сотрудника с таким id`);
  }
});

test('id сотрудников уникальны', () => {
  const ids = employees.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('у каждого сотрудника заполнены обязательные поля', () => {
  for (const list of [en, uz]) {
    for (const emp of list) {
      for (const field of ['id', 'name', 'role', 'photo', 'search']) {
        assert.ok(emp[field], `${emp.id}: пустое поле ${field}`);
      }
      assert.ok(Array.isArray(emp.tags) && emp.tags.length, `${emp.id}: нет тегов`);
      assert.ok(Array.isArray(emp.languages), `${emp.id}: нет списка языков`);
    }
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

test('generateQrSvg создаёт валидный SVG с правильной разметкой', () => {
  const svg = generateQrSvg('https://portfoliocrowe.vercel.app/team/vera-bell');
  assert.ok(svg.startsWith('<svg'), 'начинается с <svg');
  assert.ok(svg.includes('viewBox="0 0'), 'содержит viewBox');
  assert.ok(svg.includes('<rect'), 'содержит фоновый <rect');
  assert.ok(svg.includes('<path d="M'), 'содержит путь с матрицей пикселей');
  assert.ok(svg.endsWith('</svg>'), 'заканчивается на </svg>');
});

test('generateVCard генерирует валидный vCard 3.0', () => {
  const vera = byId(ru, 'vera-bell');
  const vcard = generateVCard(vera, 'https://portfoliocrowe.vercel.app');
  assert.ok(vcard.startsWith('BEGIN:VCARD'), 'начинается с BEGIN:VCARD');
  assert.ok(vcard.includes('VERSION:3.0'), 'версия 3.0');
  assert.ok(vcard.includes('FN;CHARSET=UTF-8:Вера Белл'), 'полное имя');
  assert.ok(vcard.includes('N;CHARSET=UTF-8:Белл;Вера;;;'), 'структурированное имя');
  assert.ok(vcard.includes('ORG;CHARSET=UTF-8:Crowe Uzbekistan'), 'организация');
  assert.ok(vcard.includes('TITLE;CHARSET=UTF-8:Управляющий партнёр'), 'должность');
  assert.ok(vcard.includes('URL;WORK;CHARSET=UTF-8:https://portfoliocrowe.vercel.app/team/vera-bell'), 'адрес профиля');
  assert.ok(vcard.endsWith('END:VCARD'), 'заканчивается на END:VCARD');
});

test('levenshteinDistance корректно считает расстояние редактирования', () => {
  assert.equal(levenshteinDistance('test', 'test'), 0);
  assert.equal(levenshteinDistance('test', 'text'), 1);
  assert.equal(levenshteinDistance('kitten', 'sitting'), 3);
  assert.equal(levenshteinDistance('', 'abc'), 3);
  assert.equal(levenshteinDistance('abc', ''), 3);
});

test('matchSearchTerm находит совпадения с опечатками и псевдонимами', () => {
  const vera = byId(ru, 'vera-bell');
  assert.ok(matchSearchTerm('дилигинс', vera), 'дилигинс -> Due Diligence');
  assert.ok(matchSearchTerm('бугалтер', vera), 'бугалтер -> бухгалтер');
  assert.ok(matchSearchTerm('адитор', vera), 'адитор -> аудитор');
  assert.ok(matchSearchTerm('мфо', vera), 'мфо -> МСФО');

  const randomEmp = byId(ru, 'sherzodbek-abdukhalimov');
  assert.equal(matchSearchTerm('совершеннонесуществующееслово123', randomEmp), false);
});

