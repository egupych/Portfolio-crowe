import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';

import { DEFAULT_LANG, setLang } from '../js/i18n.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * app.js — модуль побочных эффектов: он не экспортирует ничего, а на импорте
 * навешивается на разметку из index.html. Поэтому поднимаем настоящий DOM,
 * прокидываем его в глобальные и дальше дёргаем интерфейс так же, как человек.
 */
let dom;

/**
 * Свежая страница на каждый блок тестов: состояние в app.js глобальное.
 * storage заполняется до импорта — модуль читает его на старте.
 */
async function loadApp(url = 'http://localhost/', storage = {}) {
  dom = new JSDOM(readFileSync(join(ROOT, 'index.html'), 'utf8'), {
    url,
    pretendToBeVisual: true,
  });

  // i18n кэшируется на весь процесс: без сброса выбранный язык утекает
  // из одного блока тестов в следующий
  setLang(DEFAULT_LANG);

  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.scrollTo = () => {};
  window.print = () => {};
  window.localStorage.clear();
  for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);

  // defineProperty, а не присваивание: navigator в Node доступен только на чтение
  for (const key of ['window', 'document', 'location', 'history', 'localStorage', 'navigator', 'HTMLElement', 'Event', 'KeyboardEvent', 'MouseEvent', 'requestAnimationFrame']) {
    Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
  }

  // Кэш модулей общий на процесс — уникальный запрос заставляет выполнить его заново
  await import(`../js/app.js?t=${Date.now()}${Math.random()}`);
  await new Promise((r) => setTimeout(r, 0));
}

const $ = (sel) => dom.window.document.querySelector(sel);
const $$ = (sel) => [...dom.window.document.querySelectorAll(sel)];
const cards = () => $$('#cardsGrid .employee-card');
const names = () => cards().map((c) => c.querySelector('.employee-card__name').textContent);
const activeChip = () => $('.filter-chip--active')?.textContent.replace(/\s+/g, ' ').trim();

/** Ввод в поиск идёт через событие, как у настоящего пользователя */
async function search(query) {
  const input = $('#searchInput');
  input.value = query;
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 0));
}

async function click(el) {
  el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  // Смена вида идёт через setTimeout
  await new Promise((r) => setTimeout(r, 400));
}

after(() => dom?.window.close());

describe('стартовый рендер', () => {
  before(() => loadApp());

  test('рисует всех видимых сотрудников', () => {
    assert.equal(cards().length, 13);
  });

  test('карточка — ссылка на страницу профиля', () => {
    const card = cards()[0];
    assert.equal(card.tagName, 'A');
    assert.match(card.getAttribute('href'), /^\/team\/[a-z-]+$/);
  });

  test('чипы начинаются с «Все», потом офис', () => {
    const chips = $$('.filter-chip').map((c) => c.textContent.replace(/\s+/g, ' ').trim());
    assert.match(chips[0], /^All/);
    assert.ok($$('.filter-chip')[1].classList.contains('filter-chip--office'));
  });

  test('счётчики чипов не растут вверх по списку', () => {
    const counts = $$('.filter-chip:not(.filter-chip--all):not(.filter-chip--office)')
      .map((c) => Number(c.querySelector('.filter-chip__count')?.textContent))
      .filter((n) => !Number.isNaN(n));
    const sorted = [...counts].sort((a, b) => b - a);
    assert.deepEqual(counts, sorted);
  });
});

describe('поиск', () => {
  before(() => loadApp());

  test('находит по тексту секции, а не только по имени', async () => {
    await search('KPMG');
    assert.deepEqual(names(), ['Ekaterina Ganova']);
  });

  test('слова ищутся по И и в любом порядке', async () => {
    await search('audit Tashkent');
    const прямой = names();
    await search('Tashkent audit');
    assert.deepEqual(names(), прямой);
    assert.ok(прямой.length > 1);
  });

  test('пустой результат показывает заглушку', async () => {
    await search('такого точно нет');
    assert.equal(cards().length, 0);
    assert.equal($('#cardsGrid').hidden, true);
    assert.equal($('#noResults').hidden, false);
  });

  test('сброс возвращает всех', async () => {
    await search('такого точно нет');
    await click($('#resetFiltersBtn'));
    assert.equal(cards().length, 13);
    assert.equal($('#searchInput').value, '');
  });
});

describe('фильтр и возврат из профиля', () => {
  before(() => loadApp());

  test('фильтр по должности сужает выдачу', async () => {
    const chip = $$('.filter-chip').find((c) => c.textContent.includes('IFRS Consultant'));
    await click(chip);
    assert.equal(cards().length, 4);
  });

  test('после возврата из профиля фильтр остаётся применённым', async () => {
    const chip = $$('.filter-chip').find((c) => c.textContent.includes('IFRS Consultant'));
    await click(chip);
    await click(cards()[0]);
    assert.equal($('#portfolioView').hidden, false);

    await click($('#backBtn'));
    assert.match(activeChip(), /IFRS Consultant/);
    assert.equal(cards().length, 4, 'сетка должна остаться отфильтрованной');
  });
});

describe('роутинг', () => {
  before(() => loadApp());

  test('клик по карточке открывает профиль и меняет адрес', async () => {
    await click(cards()[0]);
    assert.equal($('#portfolioView').hidden, false);
    assert.equal(dom.window.location.pathname, '/team/vera-bell');
    assert.equal($('.portfolio__name').textContent, 'Vera Bell');
    assert.equal($('.portfolio__name').tagName, 'H1');
  });

  test('возврат к команде очищает адрес', async () => {
    await click(cards()[0]);
    await click($('#backBtn'));
    assert.equal(dom.window.location.pathname, '/');
    assert.equal($('#homeView').hidden, false);
  });

  test('заголовок вкладки следует за профилем', async () => {
    await click(cards()[1]);
    assert.match(dom.window.document.title, /Tatyana Shukst — Audit Director/);
    await click($('#backBtn'));
    assert.match(dom.window.document.title, /Team Portfolio/);
  });
});

describe('прямой заход по адресу профиля', () => {
  before(() => loadApp('http://localhost/team/ekaterina-ganova'));

  test('открывает нужного человека сразу', () => {
    assert.equal($('#portfolioView').hidden, false);
    assert.equal($('#homeView').hidden, true);
    assert.equal($('.portfolio__name').textContent, 'Ekaterina Ganova');
  });
});

describe('старые ссылки с хэшем', () => {
  before(() => loadApp('http://localhost/#validzhon-tursunov'));

  test('открываются и переписываются на новый адрес', () => {
    assert.equal($('.portfolio__name').textContent, 'Validzhon Tursunov');
    assert.equal(dom.window.location.pathname, '/team/validzhon-tursunov');
    assert.equal(dom.window.location.hash, '');
  });
});

describe('закладки', () => {
  before(() => loadApp());

  test('кнопка в профиле пишет закладку в хранилище', async () => {
    await click(cards()[0]);
    await click($('#bookmarkBtn'));
    assert.equal(dom.window.localStorage.getItem('crowe_bookmarks'), '["vera-bell"]');
  });

  test('сохранённая закладка поднимает счётчик и чип при следующем заходе', async () => {
    await loadApp('http://localhost/', { crowe_bookmarks: '["vera-bell"]' });
    assert.equal($('#bookmarkCount').textContent, '1');
    assert.ok($('.filter-chip--bookmarks'), 'чип закладок должен появиться');
  });

  test('битое хранилище не роняет страницу', async () => {
    await loadApp('http://localhost/', { crowe_bookmarks: '{сломано', crowe_viewed: 'не json' });
    assert.equal(cards().length, 13);
    assert.equal($('#bookmarkCount').textContent, '0');
  });
});

describe('лайтбокс', () => {
  before(() => loadApp('http://localhost/team/vera-bell'));

  test('открывается с превью, запирает фокус и возвращает его', async () => {
    const preview = $('.cert-card');
    assert.equal(preview.getAttribute('role'), 'button');
    assert.equal(preview.tabIndex, 0);

    preview.focus();
    await click(preview);
    const lightbox = $('#lightbox');
    assert.equal(lightbox.hidden, false);
    assert.equal(lightbox.getAttribute('aria-modal'), 'true');
    assert.equal(dom.window.document.activeElement, $('#lightboxClose'));

    // Tab с последней кнопки возвращает на первую
    $('#lightboxNext').focus();
    dom.window.document.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    assert.equal(dom.window.document.activeElement, $('#lightboxClose'));

    dom.window.document.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    assert.equal(lightbox.hidden, true);
    assert.equal(dom.window.document.activeElement, preview, 'фокус должен вернуться на превью');
  });
});

describe('переключение языка', () => {
  before(() => loadApp());

  test('перерисовывает карточки и чипы, не сбрасывая фильтр', async () => {
    const chip = $$('.filter-chip').find((c) => c.textContent.includes('IFRS Consultant'));
    await click(chip);
    assert.equal(cards().length, 4);

    await click($('#langSwitch [data-lang="ru"]'));
    assert.equal(dom.window.document.documentElement.lang, 'ru');
    assert.match(activeChip(), /Консультант по МСФО/);
    assert.equal(cards().length, 4, 'фильтр не должен слетать при смене языка');
    assert.ok(names().includes('Валиджон Турсунов'));
  });
});

describe('сравнение', () => {
  const three = { crowe_bookmarks: JSON.stringify(['vera-bell', 'ekaterina-ganova', 'validzhon-tursunov']) };
  const rowLabels = () => [...$('#compareTable').tBodies[0].rows].map((r) => r.cells[0].textContent);
  const columns = () => [...$('#compareTable').tHead.rows[0].cells].slice(1);

  test('прямой заход на /compare открывает таблицу', async () => {
    await loadApp('http://localhost/compare', three);
    assert.equal($('#compareView').hidden, false);
    assert.equal($('#homeView').hidden, true);
    assert.equal(columns().length, 3);
    assert.match(dom.window.document.title, /Comparison/);
  });

  test('строки — фиксированные поля плюс секции из данных', async () => {
    await loadApp('http://localhost/compare', three);
    const labels = rowLabels();
    assert.deepEqual(labels.slice(0, 5), ['Role', 'Office', 'Languages', 'Expertise', 'Certificates']);
    assert.ok(labels.includes('Education'), 'секции сотрудников должны становиться строками');
    assert.ok(labels.includes('Professional Skills'));
  });

  test('пустая ячейка помечается прочерком', async () => {
    await loadApp('http://localhost/compare', three);
    // Офис есть только у Гановой
    const office = [...$('#compareTable').tBodies[0].rows].find((r) => r.cells[0].textContent === 'Office');
    const filled = [...office.cells].slice(1).map((c) => c.textContent.trim());
    assert.deepEqual(filled, ['—', 'Crowe Russia', '—']);
  });

  test('«только различия» прячет одинаковые строки', async () => {
    // Двое с одной должностью, без офиса и с разными языками
    await loadApp('http://localhost/compare', {
      crowe_bookmarks: JSON.stringify(['validzhon-tursunov', 'bekzod-abbosov']),
    });
    const before = rowLabels();
    assert.ok(before.includes('Role'));

    $('#compareOnlyDiff').checked = true;
    $('#compareOnlyDiff').dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const after = rowLabels();
    assert.ok(!after.includes('Role'), 'одинаковая должность должна уйти');
    assert.ok(!after.includes('Office'), 'пустой у обоих офис должен уйти');
    assert.ok(after.length < before.length);
  });

  test('крестик убирает колонку и снимает закладку', async () => {
    await loadApp('http://localhost/compare', three);
    await click(columns()[0].querySelector('.compare__remove'));
    assert.equal(columns().length, 2);
    assert.equal(JSON.parse(dom.window.localStorage.getItem('crowe_bookmarks')).length, 2);
    assert.equal($('#bookmarkCount').textContent, '2');
  });

  test('колонка ведёт в профиль без перезагрузки', async () => {
    await loadApp('http://localhost/compare', three);
    const link = columns()[0].querySelector('.compare__person-link');
    assert.match(link.getAttribute('href'), /^\/team\//);
    await click(link);
    assert.equal($('#portfolioView').hidden, false);
    assert.equal(dom.window.location.pathname, '/team/vera-bell');
  });

  test('кнопка в шапке ведёт на сравнение, «назад» — к команде', async () => {
    await loadApp('http://localhost/', three);
    await click($('#compareBtn'));
    assert.equal($('#compareView').hidden, false);
    assert.equal(dom.window.location.pathname, '/compare');

    await click($('#backBtn'));
    assert.equal($('#homeView').hidden, false);
    assert.equal(dom.window.location.pathname, '/');
  });

  test('одного сравнивать не с кем — показывается подсказка', async () => {
    await loadApp('http://localhost/compare', { crowe_bookmarks: '["vera-bell"]' });
    assert.equal(columns().length, 1);
    assert.equal($('#compareHint').hidden, false);
    assert.match($('#compareHint').textContent, /at least one more/);
  });

  test('без закладок таблица пустая, а не сломанная', async () => {
    await loadApp('http://localhost/compare');
    assert.equal($('#compareView').hidden, false);
    assert.equal($('#compareTable').tHead, null);
    assert.match($('#compareHint').textContent, /Nothing is bookmarked/);
  });

  test('смена языка перерисовывает таблицу', async () => {
    await loadApp('http://localhost/compare', three);
    assert.ok(rowLabels().includes('Education'));

    await click($('#langSwitch [data-lang="ru"]'));
    assert.ok(rowLabels().includes('Образование'), 'заголовки секций должны переехать на русский');
    assert.equal($('#compareView h1').textContent, 'Сравнение', 'заголовок вида остаётся в документе, просто не виден');
    assert.match(dom.window.document.title, /Сравнение/);
  });
});
