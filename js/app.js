import { getEmployees, getCertificates, getFlag, normalizeSearch } from './data.js';
import { LANGS, getLang, setLang, t } from './i18n.js';

const homeView = document.getElementById('homeView');
const portfolioView = document.getElementById('portfolioView');
const cardsGrid = document.getElementById('cardsGrid');
const portfolioContent = document.getElementById('portfolioContent');
const otherEmployeesGrid = document.getElementById('otherEmployeesGrid');
const backBtn = document.getElementById('backBtn');
const logoBtn = document.getElementById('logoBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeToggleText = document.getElementById('themeToggleText');
const compareBtn = document.getElementById('compareBtn');
const bookmarkCount = document.getElementById('bookmarkCount');
const langSwitch = document.getElementById('langSwitch');
const compareView = document.getElementById('compareView');

/** Сотрудники на текущем языке — пересобирается при переключении языка */
let people = getEmployees(getLang());

const PHOTO_PLACEHOLDER = '/photos/placeholder.svg';

/** Подставляет заглушку, если фото сотрудника не загрузилось */
function withPhotoFallback(img) {
  if (!img) return;
  const applyFallback = () => {
    if (img.dataset.photoFallback) return;
    img.dataset.photoFallback = '1';
    img.classList.add('photo--placeholder');
    img.src = PHOTO_PLACEHOLDER;
  };
  img.addEventListener('error', applyFallback, { once: true });
  // Картинка могла отвалиться ещё до того, как повесили обработчик
  if (img.complete && img.naturalWidth === 0) applyFallback();
}

/** Множество id из localStorage; если хранилище недоступно или битое — пустое */
function readIdSet(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function writeIdSet(key, ids) {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    /* приватный режим — просто не сохраняем */
  }
}

/**
 * Системная настройка «меньше движения». Читаем через matchMedia, а не один раз:
 * пользователь может переключить её, не перезагружая страницу.
 */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Плавная прокрутка только если движение не отключено */
const scrollBehavior = () => (reducedMotion.matches ? 'auto' : 'smooth');

/** Пауза между сменой видов — при отключённом движении ждать нечего */
const viewTransitionMs = () => (reducedMotion.matches ? 0 : 300);

// Bookmark management
const BOOKMARKS_KEY = 'crowe_bookmarks';
const bookmarkedEmployees = readIdSet(BOOKMARKS_KEY);

function saveBookmarks() {
  writeIdSet(BOOKMARKS_KEY, bookmarkedEmployees);
  updateCompareButton();
}

function updateCompareButton() {
  if (compareBtn && bookmarkCount) {
    const count = bookmarkedEmployees.size;
    bookmarkCount.textContent = count;
    compareBtn.style.display = count > 0 ? 'inline-flex' : 'none';
  }
}

function toggleBookmark(employeeId) {
  if (bookmarkedEmployees.has(employeeId)) {
    bookmarkedEmployees.delete(employeeId);
  } else {
    bookmarkedEmployees.add(employeeId);
  }
  saveBookmarks();
  
  // Update UI if on portfolio page
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  if (bookmarkBtn) {
    const isBookmarked = bookmarkedEmployees.has(employeeId);
    bookmarkBtn.classList.toggle('portfolio__bookmark-btn--active', isBookmarked);
    bookmarkBtn.querySelector('svg').setAttribute('fill', isBookmarked ? 'currentColor' : 'none');
    bookmarkBtn.querySelector('span').textContent = t(isBookmarked ? 'portfolio.bookmarkAdded' : 'portfolio.bookmarkAdd');
  }
  
  // Re-render filters to update bookmark count
  applyFilters();
  if (!compareView.hidden) renderComparison();
}

updateCompareButton();

compareBtn?.addEventListener('click', () => openComparison());

// Language management
function setMetaContent(attr, name, value) {
  const el = document.querySelector(`meta[${attr}="${name}"]`);
  if (el) el.setAttribute('content', value);
}

/** Проставляет переводы во всю статическую разметку (data-i18n*) и в мета-теги */
function applyStaticTranslations() {
  document.documentElement.lang = t('html.lang');
  updateDocumentTitle();

  setMetaContent('name', 'description', t('meta.description'));
  setMetaContent('property', 'og:title', t('meta.title'));
  setMetaContent('property', 'og:description', t('meta.description'));
  setMetaContent('name', 'twitter:title', t('meta.title'));
  setMetaContent('name', 'twitter:description', t('meta.description'));

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.setAttribute('title', t(el.dataset.i18nTitle));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  });
  document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
    el.setAttribute('alt', t(el.dataset.i18nAlt));
  });
}

function updateLangSwitchUI() {
  if (!langSwitch) return;
  const lang = getLang();
  langSwitch.querySelectorAll('[data-lang]').forEach((btn) => {
    const isActive = btn.dataset.lang === lang;
    btn.classList.toggle('lang-switch__btn--active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

function applyLanguage(lang) {
  if (!LANGS.includes(lang) || lang === getLang()) return;

  setLang(lang);
  people = getEmployees(lang);

  applyStaticTranslations();
  updateLangSwitchUI();
  applyTheme(localStorage.getItem('crowe_theme') || 'crowe-light');

  // Перерисовываем всё, что построено из данных
  applyFilters();
  if (!compareView.hidden) renderComparison();
  if (!portfolioView.hidden && currentEmployeeId) {
    const employee = people.find((e) => e.id === currentEmployeeId);
    if (employee) renderPortfolio(employee);
  }
}

langSwitch?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-lang]');
  if (btn) applyLanguage(btn.dataset.lang);
});

// Theme management
const THEMES = ['crowe-light', 'warm'];

function initTheme() {
  const savedTheme = localStorage.getItem('crowe_theme') || 'crowe-light';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  if (!THEMES.includes(theme)) theme = 'crowe-light';

  if (theme === 'crowe-light') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }

  if (themeToggleText) {
    themeToggleText.textContent = t(`theme.${theme}`);
  }
  localStorage.setItem('crowe_theme', theme);
}

themeToggleBtn?.addEventListener('click', () => {
  const currentTheme = localStorage.getItem('crowe_theme') || 'crowe-light';
  const nextIndex = (THEMES.indexOf(currentTheme) + 1) % THEMES.length;
  applyTheme(THEMES[nextIndex]);
});

initTheme();

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxLens = document.getElementById('lightboxLens');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const lightboxCounter = document.getElementById('lightboxCounter');

let currentCerts = [];
let lightboxTrigger = null;
let currentCertIndex = 0;
/** Отметки «уже смотрел» переживают перезагрузку, как и закладки */
const VIEWED_KEY = 'crowe_viewed';
const viewedEmployees = readIdSet(VIEWED_KEY);

function renderSection(section, delayIndex) {
  const el = document.createElement('div');
  el.className = 'portfolio__section';
  el.style.animationDelay = `${0.35 + delayIndex * 0.08}s`;

  const title = document.createElement('h3');
  title.className = 'portfolio__section-title';
  title.textContent = section.title;
  el.appendChild(title);

  if (section.type === 'paragraphs') {
    section.items.forEach((text) => {
      const p = document.createElement('p');
      p.className = 'text';
      p.textContent = text;
      el.appendChild(p);
    });
  } else if (section.type === 'list') {
    const ul = document.createElement('ul');
    ul.className = 'portfolio__list text';
    section.items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    el.appendChild(ul);
  } else if (section.type === 'experience') {
    section.items.forEach((exp) => {
      const item = document.createElement('div');
      item.className = 'portfolio__experience-item';
      item.innerHTML = `
        <div class="portfolio__experience-role">${exp.role}</div>
        <div class="portfolio__experience-meta">${exp.period} / ${exp.company}</div>
      `;
      el.appendChild(item);
    });
  }

  return el;
}

function renderCertificates(employeeId, options = {}) {
  const certs = getCertificates(employeeId);
  if (!certs.length) return null;

  const block = document.createElement('div');
  block.className = 'certificates';
  if (options.bare) block.classList.add('certificates--bare');

  if (!options.bare) {
    const title = document.createElement('h3');
    title.className = 'certificates__title';
    title.textContent = t('certs.title');
    block.appendChild(title);
  }

  const grid = document.createElement('div');
  grid.className = 'certificates__grid';

  const displayName = options.displayName || name;

  certs.forEach((cert, i) => {
    const item = document.createElement('div');
    item.className = 'cert-item';

    const card = document.createElement('div');
    card.className = 'cert-card';
    card.role = 'button';
    card.tabIndex = 0;
    card.setAttribute('aria-label', t('certs.alt', { n: i + 1 }));
    card.style.animationDelay = `${0.5 + i * 0.07}s`;
    card.innerHTML = `
      <img class="cert-card__img" src="${cert.thumb}" alt="${t('certs.alt', { n: i + 1 })}" loading="lazy">
      <div class="cert-card__overlay">
        <span class="cert-card__zoom">${t('certs.zoom')}</span>
      </div>
    `;
    card.addEventListener('click', () => openLightbox(certs, i, card));
    card.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openLightbox(certs, i, card);
    });
    item.appendChild(card);

    const pdfBtn = document.createElement('button');
    pdfBtn.type = 'button';
    pdfBtn.className = 'cert-item__pdf-btn';
    pdfBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2.5V12.5M10 12.5L6.25 8.75M10 12.5L13.75 8.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3.75 15.5H16.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span>${t('certs.download')}</span>
    `;
    pdfBtn.addEventListener('click', () => printCertificate(item, cert, displayName, i));
    item.appendChild(pdfBtn);

    grid.appendChild(item);
  });

  block.appendChild(grid);
  return block;
}

function renderPortfolio(employee) {
  portfolioContent.innerHTML = '';

  // ----- Resume content (header + tags + body) -----
  const resumeContent = document.createElement('div');
  resumeContent.id = 'resumeContent';

  const header = document.createElement('header');
  header.className = 'portfolio__header';
  header.innerHTML = `
    <img class="portfolio__photo" src="${employee.photo}" alt="${employee.name}">
    <div class="portfolio__info">
      <h1 class="portfolio__name">${employee.name}</h1>
      <p class="portfolio__role role">${employee.role}</p>
      ${employee.office ? `<span class="portfolio__office">${employee.office}</span>` : ''}
      <div class="portfolio__languages">
        <div class="portfolio__flags">
          ${employee.languages.map((code) => `<img class="portfolio__flag" src="${getFlag(code)}" alt="">`).join('')}
        </div>
      </div>
    </div>
  `;
  withPhotoFallback(header.querySelector('.portfolio__photo'));
  resumeContent.appendChild(header);

  const tags = document.createElement('div');
  tags.className = 'portfolio__tags';
  employee.tags.forEach((tagText) => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = tagText;
    tags.appendChild(span);
  });
  resumeContent.appendChild(tags);

  const body = document.createElement('div');
  body.className = 'portfolio__body';

  const leftCol = document.createElement('div');
  employee.left.forEach((s, i) => leftCol.appendChild(renderSection(s, i)));
  body.appendChild(leftCol);

  const rightCol = document.createElement('div');
  employee.right.forEach((s, i) => rightCol.appendChild(renderSection(s, i + employee.left.length)));
  body.appendChild(rightCol);

  resumeContent.appendChild(body);
  portfolioContent.appendChild(resumeContent);

  // ----- Actions bar (Download PDF + Direct Telegram link + Bookmark) -----
  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'portfolio__actions-wrap';
  
  const isBookmarked = bookmarkedEmployees.has(employee.id);
  
  actionsWrap.innerHTML = `
    <button class="portfolio__download-btn" id="downloadPdfBtn" type="button">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2.5V12.5M10 12.5L6.25 8.75M10 12.5L13.75 8.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3.75 15.5H16.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span>${t('portfolio.download')}</span>
    </button>
    <a class="portfolio__contact-btn" href="https://t.me/crowe_uz" target="_blank" rel="noopener">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span>${t('portfolio.telegram')}</span>
    </a>
    <button class="portfolio__bookmark-btn ${isBookmarked ? 'portfolio__bookmark-btn--active' : ''}" id="bookmarkBtn" type="button">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      <span>${t(isBookmarked ? 'portfolio.bookmarkAdded' : 'portfolio.bookmarkAdd')}</span>
    </button>
  `;
  portfolioContent.appendChild(actionsWrap);
  
  // Bookmark button functionality
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  bookmarkBtn.addEventListener('click', () => toggleBookmark(employee.id));

  document.getElementById('downloadPdfBtn')?.addEventListener('click', () => printResume(employee));

  // ----- Certificates -----
  const certsBlock = renderCertificates(employee.id, { displayName: employee.name });
  if (certsBlock) portfolioContent.appendChild(certsBlock);

  updateDocumentTitle();
  renderOtherEmployees(employee.id);
}

/**
 * Резюме формируется браузером из текущей вёрстки (см. @media print),
 * поэтому оно всегда на том языке, который выбран на сайте.
 * Имя файла в диалоге «Сохранить как PDF» браузер берёт из document.title.
 */
function printResume(employee) {
  document.title = t('portfolio.downloadFile', { name: employee.name }).replace(/\.pdf$/i, '');

  // Возвращаем заголовок из словаря, а не из сохранённого значения: иначе
  // повторный клик или смена языка во время печати оставят имя файла в титуле
  const restoreTitle = updateDocumentTitle;
  window.addEventListener('afterprint', restoreTitle, { once: true });

  window.print();

  // Safari не всегда шлёт afterprint — подстраховываемся
  setTimeout(restoreTitle, 500);
}

/**
 * Печатает один сертификат. Ориентация страницы берётся из пропорций
 * изображения: среди сертификатов есть и портретные, и альбомные.
 */
async function printCertificate(item, cert, displayName, index) {
  // Быстрый повторный клик мог оставить прошлый сертификат помеченным —
  // иначе в печать попали бы оба
  document.querySelectorAll('.cert-item--printing').forEach((el) => el.classList.remove('cert-item--printing'));
  document.querySelectorAll('style[data-print-page]').forEach((el) => el.remove());

  const img = item.querySelector('.cert-card__img');

  // В сетке висит превью на 400 px — на A4 его бы размазало, поэтому
  // на время печати подставляем полноразмерную картинку
  const thumbSrc = img.src;
  img.src = cert.full;

  // Картинка ещё и ленивая — до печати может быть не загружена
  if (!img.complete || !img.naturalWidth) {
    await new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }

  const landscape = img.naturalWidth > img.naturalHeight;
  const pageStyle = document.createElement('style');
  pageStyle.textContent = `
    @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 10mm; }
    @media print {
      body[data-print="certificate"] .cert-card__img { max-height: ${landscape ? 190 : 277}mm; }
    }
  `;
  pageStyle.dataset.printPage = '';
  document.head.appendChild(pageStyle);

  document.body.dataset.print = 'certificate';
  item.classList.add('cert-item--printing');
  document.title = t('certs.fileName', { name: displayName, n: index + 1 });

  const cleanup = () => {
    document.body.removeAttribute('data-print');
    item.classList.remove('cert-item--printing');
    pageStyle.remove();
    img.src = thumbSrc;
    updateDocumentTitle();
  };
  window.addEventListener('afterprint', cleanup, { once: true });

  window.print();
  setTimeout(cleanup, 500);
}

/**
 * Карточка сотрудника — ссылка на его страницу. Так она попадает в обход
 * с клавиатуры, открывается в новой вкладке и остаётся ссылкой для краулера;
 * обычный клик перехватываем и показываем профиль без перезагрузки.
 */
function createEmployeeCard(emp, index) {
  const card = document.createElement('a');
  card.className = 'employee-card';
  card.href = profileUrl(emp.id);
  if (viewedEmployees.has(emp.id)) {
    card.classList.add('employee-card--viewed');
  }
  card.style.animationDelay = `${0.05 * index}s`;
  card.innerHTML = `
      <div class="employee-card__photo-wrap">
        <img class="employee-card__photo" src="${emp.photo}" alt="${emp.name}" loading="lazy">
      </div>
      <h2 class="employee-card__name">${emp.name}</h2>
      <p class="employee-card__role">${emp.role}</p>
  `;
  withPhotoFallback(card.querySelector('.employee-card__photo'));

  card.addEventListener('click', (e) => {
    // Ctrl/Cmd/Shift и средняя кнопка — работа браузера, не перехватываем
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    openPortfolio(emp.id);
  });

  return card;
}

function renderOtherEmployees(currentId) {
  otherEmployeesGrid.innerHTML = '';
  people
    .filter((e) => e.id !== currentId)
    .forEach((emp, i) => otherEmployeesGrid.appendChild(createEmployeeCard(emp, i)));
}

// ----- Comparison -----
const COMPARE_PATH = '/compare';
const compareTable = document.getElementById('compareTable');
const compareHint = document.getElementById('compareHint');
const compareOnlyDiff = document.getElementById('compareOnlyDiff');

const isComparePath = () => location.pathname.replace(/\/+$/, '') === COMPARE_PATH;

/** Отмеченные сотрудники в порядке общего списка, а не в порядке отметки */
const comparedEmployees = () => people.filter((emp) => bookmarkedEmployees.has(emp.id));

/**
 * Строки таблицы: фиксированные поля плюс объединение заголовков секций,
 * отсортированных по частоте. Список строк не приходится вести отдельно —
 * он следует за данными: появится новая секция, появится и строка.
 */
function comparisonRows(list) {
  const sectionsOf = (emp) => [...emp.left, ...emp.right];

  const rows = [
    { label: t('compare.role'), kind: 'text', values: list.map((e) => [e.role]) },
    { label: t('compare.office'), kind: 'text', values: list.map((e) => (e.office ? [e.office] : [])) },
    { label: t('compare.languages'), kind: 'flags', values: list.map((e) => e.languages) },
    { label: t('compare.tags'), kind: 'tags', values: list.map((e) => e.tags) },
    { label: t('compare.certificates'), kind: 'certs', values: list.map((e) => getCertificates(e.id)) },
  ];

  const frequency = new Map();
  for (const emp of list) {
    for (const section of sectionsOf(emp)) {
      frequency.set(section.title, (frequency.get(section.title) || 0) + 1);
    }
  }

  for (const [title] of [...frequency.entries()].sort((a, b) => b[1] - a[1])) {
    rows.push({
      label: title,
      kind: 'list',
      values: list.map((emp) => {
        const section = sectionsOf(emp).find((s) => s.title === title);
        if (!section) return [];
        // Опыт хранится объектами, остальные типы секций — строками
        return section.type === 'experience'
          ? section.items.map((item) => `${item.role} — ${item.company}, ${item.period}`)
          : section.items;
      }),
    });
  }

  return rows;
}

/** Ячейка строки: у каждого вида содержимого своя вёрстка */
function renderCompareCell(row, index) {
  const cell = document.createElement('td');
  cell.className = 'compare__cell';
  const value = row.values[index];

  if (!value.length) {
    cell.classList.add('compare__cell--empty');
    cell.textContent = '—';
    return cell;
  }

  if (row.kind === 'flags') {
    const wrap = document.createElement('div');
    wrap.className = 'compare__flags';
    for (const code of value) {
      const img = document.createElement('img');
      img.className = 'portfolio__flag';
      img.src = getFlag(code);
      img.alt = '';
      wrap.appendChild(img);
    }
    cell.appendChild(wrap);
    return cell;
  }

  if (row.kind === 'tags') {
    const wrap = document.createElement('div');
    wrap.className = 'compare__tags';
    for (const text of value) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = text;
      wrap.appendChild(tag);
    }
    cell.appendChild(wrap);
    return cell;
  }

  if (row.kind === 'certs') {
    const wrap = document.createElement('div');
    wrap.className = 'compare__certs';
    value.forEach((cert, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'compare__cert';
      button.setAttribute('aria-label', t('certs.alt', { n: i + 1 }));
      const img = document.createElement('img');
      img.src = cert.thumb;
      img.alt = '';
      img.loading = 'lazy';
      button.appendChild(img);
      button.addEventListener('click', () => openLightbox(value, i, button));
      wrap.appendChild(button);
    });
    cell.appendChild(wrap);
    return cell;
  }

  if (row.kind === 'text' && value.length === 1) {
    cell.textContent = value[0];
    return cell;
  }

  const list = document.createElement('ul');
  list.className = 'compare__list';
  for (const text of value) {
    const item = document.createElement('li');
    item.textContent = text;
    list.appendChild(item);
  }
  cell.appendChild(list);
  return cell;
}

/** Шапка колонки: фото, имя со ссылкой на профиль и кнопка «убрать» */
function renderCompareHead(employee) {
  const th = document.createElement('th');
  th.scope = 'col';
  th.className = 'compare__person';

  const link = document.createElement('a');
  link.className = 'compare__person-link';
  link.href = profileUrl(employee.id);
  link.innerHTML = `
    <img class="compare__photo" src="${employee.photo}" alt="" loading="lazy">
    <span class="compare__name">${employee.name}</span>
    <span class="compare__role">${employee.role}</span>
  `;
  withPhotoFallback(link.querySelector('.compare__photo'));
  link.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    openPortfolio(employee.id);
  });

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'compare__remove';
  remove.setAttribute('aria-label', t('compare.remove', { name: employee.name }));
  remove.innerHTML = `
    <svg width="8" height="8" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
  remove.addEventListener('click', () => toggleBookmark(employee.id));

  const inner = document.createElement('div');
  inner.className = 'compare__person-inner';
  inner.append(link, remove);
  th.append(inner);
  return th;
}

function renderComparison() {
  const list = comparedEmployees();
  compareTable.innerHTML = '';

  if (!list.length) {
    compareHint.hidden = false;
    compareHint.textContent = t('compare.nothing');
    return;
  }

  const rows = comparisonRows(list);
  // «Только различия» прячет строки, одинаковые у всех: ради них таблицу не открывают
  const onlyDiff = Boolean(compareOnlyDiff?.checked) && list.length > 1;
  const same = (row) => new Set(row.values.map((v) => JSON.stringify(v))).size === 1;
  const visible = onlyDiff ? rows.filter((row) => !same(row)) : rows;

  // Минимальная ширина таблицы зависит от числа колонок — считает CSS
  compareTable.style.setProperty('--compare-columns', list.length);

  const head = compareTable.createTHead().insertRow();
  head.appendChild(document.createElement('td')).className = 'compare__corner';
  for (const employee of list) head.appendChild(renderCompareHead(employee));

  const body = compareTable.createTBody();
  for (const row of visible) {
    const tr = body.insertRow();
    const label = document.createElement('th');
    label.scope = 'row';
    label.className = 'compare__label';
    label.textContent = row.label;
    tr.appendChild(label);
    list.forEach((employee, i) => tr.appendChild(renderCompareCell(row, i)));
  }

  if (list.length === 1) {
    compareHint.hidden = false;
    compareHint.textContent = t('compare.hintOne');
  } else if (onlyDiff && !visible.length) {
    compareHint.hidden = false;
    compareHint.textContent = t('compare.hintSame');
  } else {
    compareHint.hidden = true;
  }
}

/** immediate — заход по прямому адресу: страница и так грузится, переход не нужен */
function openComparison({ push = true, immediate = false } = {}) {
  renderComparison();
  currentEmployeeId = null;
  document.title = t('meta.compareTitle');
  if (push) history.pushState(null, '', COMPARE_PATH);
  if (immediate) revealImmediately(compareView);
  else showView(compareView);
  window.scrollTo({ top: 0, behavior: scrollBehavior() });
}

compareOnlyDiff?.addEventListener('change', renderComparison);

// ----- Search & Filter -----
const searchInput = document.getElementById('searchInput');
const searchClearBtn = document.getElementById('searchClearBtn');
const filterChipsContainer = document.getElementById('filterChips');
const noResultsBlock = document.getElementById('noResults');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');

let activeTag = 'all';
let searchQuery = '';

const SPECIAL_TAGS = ['all', 'bookmarks'];

/** Разбирает ключ вида `role:...` / `office:...` на тип и значение */
function splitTag(tagKey) {
  if (SPECIAL_TAGS.includes(tagKey)) return [tagKey, null];
  const i = tagKey.indexOf(':');
  return [tagKey.slice(0, i), tagKey.slice(i + 1)];
}

/** Ключи фильтров: «Все», закладки, офисы и должности из данных */
function getFilterTags() {
  const offices = [];
  const roles = [];
  people.forEach((emp) => {
    if (emp.officeKey && !offices.includes(emp.officeKey)) offices.push(emp.officeKey);
    if (!roles.includes(emp.roleKey)) roles.push(emp.roleKey);
  });
  return [
    ...SPECIAL_TAGS,
    ...offices.map((office) => `office:${office}`),
    ...roles.map((role) => `role:${role}`),
  ];
}

/** Подпись чипа: у офисов и должностей — переведённое значение с карточки */
function getTagLabel(tagKey) {
  if (SPECIAL_TAGS.includes(tagKey)) return t(`filter.${tagKey}`);
  const [kind, value] = splitTag(tagKey);
  const emp = people.find((e) => (kind === 'office' ? e.officeKey : e.roleKey) === value);
  if (!emp) return value;
  return kind === 'office' ? emp.office : emp.role;
}

function getEmployeesMatchingTagAndQuery(tagKey, query) {
  // Запрос разбиваем на слова: «аудит Ташкент» должно находить человека,
  // у которого эти слова стоят в разных пунктах резюме
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const [kind, value] = splitTag(tagKey);

  return people.filter((emp) => {
    const matchesTag =
      kind === 'all' ||
      (kind === 'bookmarks' && bookmarkedEmployees.has(emp.id)) ||
      (kind === 'office' && emp.officeKey === value) ||
      (kind === 'role' && emp.roleKey === value);

    // emp.search — имя, роль, офис, теги и текст всех секций одной строкой.
    // Пустой запрос даёт пустой terms, а every по нему — true
    const matchesQuery = terms.every((term) => emp.search.includes(term));

    return matchesTag && matchesQuery;
  });
}

function renderFilterChips() {
  if (!filterChipsContainer) return;
  filterChipsContainer.innerHTML = '';

  const tagItems = getFilterTags()
    .map((tag) => ({ tag, count: getEmployeesMatchingTagAndQuery(tag, searchQuery).length }))
    // Чип закладок появляется, только если в закладках кто-то есть
    .filter(({ tag }) => tag !== 'bookmarks' || bookmarkedEmployees.size > 0);

  // Порядок групп: «Все», закладки, офисы, дальше должности.
  // Внутри группы — по убыванию счётчика, поэтому пустые (0) сами уходят в конец.
  const chipRank = (tag) => {
    if (tag === 'all') return 0;
    if (tag === 'bookmarks') return 1;
    if (tag.startsWith('office:')) return 2;
    return 3;
  };
  tagItems.sort((a, b) => chipRank(a.tag) - chipRank(b.tag) || b.count - a.count);

  tagItems.forEach(({ tag, count }) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `filter-chip ${tag === activeTag ? 'filter-chip--active' : ''}`;

    if (count === 0 && tag !== 'all') {
      chip.classList.add('filter-chip--disabled');
      chip.disabled = true;
    }

    if (tag === 'bookmarks') {
      const label = `${t('filter.bookmarks')} (${count})`;
      chip.classList.add('filter-chip--bookmarks');
      chip.setAttribute('aria-label', label);
      chip.title = label;
      chip.innerHTML = `
        <span class="filter-chip__label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
        </span>
        <span class="filter-chip__count">${count}</span>
      `;
    } else {
      if (tag === 'all') chip.classList.add('filter-chip--all');
      else if (tag.startsWith('office:')) chip.classList.add('filter-chip--office');
      chip.innerHTML = `
        <span class="filter-chip__label">${getTagLabel(tag)}</span>
        <span class="filter-chip__count">${count}</span>
      `;
    }

    chip.addEventListener('click', () => {
      if (chip.disabled) return;
      activeTag = tag;
      applyFilters();
    });

    filterChipsContainer.appendChild(chip);
  });
}

function applyFilters() {
  // Чип закладок скрыт при пустом списке — возвращаемся к «Все»
  if (activeTag === 'bookmarks' && bookmarkedEmployees.size === 0) activeTag = 'all';

  const filtered = getEmployeesMatchingTagAndQuery(activeTag, searchQuery);

  renderCards(filtered);
  renderFilterChips();

  if (filtered.length === 0) {
    cardsGrid.hidden = true;
    if (noResultsBlock) noResultsBlock.hidden = false;
  } else {
    cardsGrid.hidden = false;
    if (noResultsBlock) noResultsBlock.hidden = true;
  }
  
  // Update compare button when filters change
  updateCompareButton();
}

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchClearBtn) searchClearBtn.hidden = !searchQuery;
    applyFilters();
  });
}

if (searchClearBtn) {
  searchClearBtn.addEventListener('click', () => {
    searchQuery = '';
    searchInput.value = '';
    searchClearBtn.hidden = true;
    applyFilters();
    searchInput.focus();
  });
}

if (resetFiltersBtn) {
  resetFiltersBtn.addEventListener('click', () => {
    activeTag = 'all';
    searchQuery = '';
    if (searchInput) searchInput.value = '';
    if (searchClearBtn) searchClearBtn.hidden = true;
    renderFilterChips();
    applyFilters();
  });
}

function renderCards(list = people) {
  cardsGrid.innerHTML = '';
  list.forEach((emp, i) => cardsGrid.appendChild(createEmployeeCard(emp, i)));
}

/** Показывает один из видов, гася предыдущий. Адрес и заголовок — на вызывающем */
function showView(target) {
  const views = [homeView, compareView, portfolioView];
  const current = views.find((v) => !v.hidden);
  backBtn.style.display = target === homeView ? 'none' : 'inline-flex';
  if (current === target) return;

  current.classList.remove('view--active');
  current.classList.add('view--leaving');
  setTimeout(() => {
    current.hidden = true;
    current.classList.remove('view--leaving');
    target.hidden = false;
    target.classList.remove('view--leaving');
    requestAnimationFrame(() => target.classList.add('view--active'));
  }, viewTransitionMs());
}

/** Возврат к списку команды. push=false — когда сюда привёл сам браузер */
function goHome({ push = true } = {}) {
  currentEmployeeId = null;
  updateDocumentTitle();
  if (push) history.pushState(null, '', '/');
  showView(homeView);
}

let currentEmployeeId = null;

/** Профиль живёт по своему адресу — его и индексирует поиск, и разворачивают мессенджеры */
const PROFILE_PREFIX = '/team/';

const profileUrl = (id) => `${PROFILE_PREFIX}${id}`;

/** id сотрудника из адреса; старые ссылки вида #id тоже понимаем */
function employeeIdFromUrl() {
  const path = location.pathname.replace(/\/+$/, '');
  if (path.startsWith(PROFILE_PREFIX)) return decodeURIComponent(path.slice(PROFILE_PREFIX.length));
  return location.hash.slice(1);
}

/** Заголовок вкладки: на странице сотрудника — его имя и должность */
function updateDocumentTitle() {
  if (!compareView.hidden) {
    document.title = t('meta.compareTitle');
    return;
  }
  const employee = currentEmployeeId && people.find((e) => e.id === currentEmployeeId);
  document.title = employee
    ? t('meta.personTitle', { name: employee.name, role: employee.role })
    : t('meta.title');
}

function openPortfolio(id) {
  const employee = people.find((e) => e.id === id);
  if (!employee) return;
  currentEmployeeId = id;
  viewedEmployees.add(id);
  writeIdSet(VIEWED_KEY, viewedEmployees);
  renderPortfolio(employee);
  // Именно applyFilters, а не renderCards: иначе после возврата из профиля
  // чип остаётся активным, а в сетке снова все
  applyFilters();
  showView(portfolioView);
  history.pushState({ id }, '', profileUrl(id));
  window.scrollTo({ top: 0, behavior: scrollBehavior() });
}

function openLightbox(certs, index, trigger) {
  currentCerts = certs;
  currentCertIndex = index;
  lightboxTrigger = trigger || null;
  updateLightbox();
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
  lightboxClose.focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = '';
  lightboxLens.style.display = 'none';
  // Возвращаем фокус туда, откуда открыли, иначе он падает в начало страницы
  lightboxTrigger?.focus();
  lightboxTrigger = null;
}

/**
 * Пока диалог открыт, Tab ходит только по его кнопкам. Стрелки листания
 * скрыты при единственном сертификате и в обход не попадают.
 */
function trapLightboxFocus(e) {
  const focusable = [lightboxClose, lightboxPrev, lightboxNext].filter((el) => !el.hidden);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (e.shiftKey && (active === first || !lightbox.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !lightbox.contains(active))) {
    e.preventDefault();
    first.focus();
  }
}

function updateLightbox() {
  lightboxImg.src = currentCerts[currentCertIndex].full;
  lightboxCounter.textContent = `${currentCertIndex + 1} / ${currentCerts.length}`;
  lightboxPrev.hidden = currentCerts.length < 2;
  lightboxNext.hidden = currentCerts.length < 2;
  lightboxLens.style.display = 'none';
}

function navigateLightbox(dir) {
  currentCertIndex = (currentCertIndex + dir + currentCerts.length) % currentCerts.length;
  lightboxImg.style.animation = 'none';
  lightboxImg.offsetHeight;
  lightboxImg.style.animation = 'zoomIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both';
  updateLightbox();
}

backBtn.addEventListener('click', () => goHome());
logoBtn.addEventListener('click', () => {
  if (homeView.hidden) goHome();
});

lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
lightboxNext.addEventListener('click', () => navigateLightbox(1));

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

// Touch device detection
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Swipe gesture functionality
let touchStartX = 0;
let touchStartY = 0;

lightbox.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].clientX;
  touchStartY = e.changedTouches[0].clientY;
}, { passive: true });

lightbox.addEventListener('touchend', (e) => {
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  
  const diffX = touchEndX - touchStartX;
  const diffY = touchEndY - touchStartY;
  
  // Verify horizontal swipe (threshold of 50px difference horizontally, and low vertical drag)
  if (Math.abs(diffX) > 50 && Math.abs(diffY) < 100) {
    if (diffX > 0) {
      navigateLightbox(-1);
    } else {
      navigateLightbox(1);
    }
  }
}, { passive: true });

// Magnifying lens functionality
lightboxImg.addEventListener('mousemove', (e) => {
  if (isTouchDevice) return;
  const rect = lightboxImg.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  lightboxLens.style.display = 'block';
  lightboxLens.style.left = `${x - 75}px`;
  lightboxLens.style.top = `${y - 75}px`;

  const zoom = 2;
  lightboxLens.style.backgroundImage = `url(${lightboxImg.src})`;
  lightboxLens.style.backgroundSize = `${rect.width * zoom}px ${rect.height * zoom}px`;
  lightboxLens.style.backgroundPosition = `-${x * zoom - 75}px -${y * zoom - 75}px`;
});

lightboxImg.addEventListener('mouseleave', () => {
  if (isTouchDevice) return;
  lightboxLens.style.display = 'none';
});

// Global Keyboard Navigation
document.addEventListener('keydown', (e) => {
  // Ignore keyboard shortcuts when typing in search input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    if (e.key === 'Escape' && searchInput && searchInput.value) {
      searchQuery = '';
      searchInput.value = '';
      if (searchClearBtn) searchClearBtn.hidden = true;
      applyFilters();
      searchInput.blur();
    }
    return;
  }

  // 1. Lightbox active
  if (!lightbox.hidden) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
    if (e.key === 'Tab') trapLightboxFocus(e);
    return;
  }

  // 2. Portfolio view active
  if (!portfolioView.hidden) {
    if (e.key === 'Escape') {
      goHome();
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const idx = people.findIndex((emp) => emp.id === currentEmployeeId);
      if (idx !== -1) {
        const step = e.key === 'ArrowLeft' ? -1 : 1;
        const nextIdx = (idx + step + people.length) % people.length;
        openPortfolio(people[nextIdx].id);
      }
    }
  }
});

window.addEventListener('popstate', () => {
  const id = employeeIdFromUrl();
  const employee = id ? people.find((e) => e.id === id) : null;
  if (employee) {
    currentEmployeeId = employee.id;
    renderPortfolio(employee);
    updateDocumentTitle();
    showView(portfolioView);
    return;
  }
  if (isComparePath()) {
    openComparison({ push: false });
    return;
  }
  // push: false — запись в истории уже сменил сам браузер
  goHome({ push: false });
});

function initFromUrl() {
  if (isComparePath()) {
    openComparison({ push: false, immediate: true });
    return;
  }

  const id = employeeIdFromUrl();
  const employee = id ? people.find((e) => e.id === id) : null;
  if (!employee) {
    backBtn.style.display = 'none';
    return;
  }

  // Ссылки, разосланные до перехода на /team/<id>, переводим на постоянный адрес
  if (location.hash) history.replaceState({ id: employee.id }, '', profileUrl(employee.id));

  currentEmployeeId = employee.id;
  renderPortfolio(employee);
  revealImmediately(portfolioView);
}

/** Первый показ при заходе по прямому адресу — без перехода, страница и так грузится */
function revealImmediately(target) {
  for (const view of [homeView, compareView, portfolioView]) {
    view.hidden = view !== target;
    view.classList.toggle('view--active', view === target);
    view.classList.remove('view--leaving');
  }
  backBtn.style.display = target === homeView ? 'none' : 'inline-flex';
}

// ----- Scroll To Top Button -----
const scrollTopBtn = document.getElementById('scrollTopBtn');

window.addEventListener('scroll', () => {
  if (!scrollTopBtn) return;
  if (window.scrollY > 280) {
    scrollTopBtn.hidden = false;
    scrollTopBtn.classList.add('scroll-top-btn--visible');
  } else {
    scrollTopBtn.classList.remove('scroll-top-btn--visible');
  }
}, { passive: true });

if (scrollTopBtn) {
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  });
}

// ----- Portfolio Side Navigation Buttons -----
const portfolioSidePrev = document.getElementById('portfolioSidePrev');
const portfolioSideNext = document.getElementById('portfolioSideNext');

if (portfolioSidePrev) {
  portfolioSidePrev.addEventListener('click', () => {
    if (!currentEmployeeId) return;
    const idx = people.findIndex((e) => e.id === currentEmployeeId);
    if (idx !== -1) {
      const prevIdx = (idx - 1 + people.length) % people.length;
      openPortfolio(people[prevIdx].id);
    }
  });
}

if (portfolioSideNext) {
  portfolioSideNext.addEventListener('click', () => {
    if (!currentEmployeeId) return;
    const idx = people.findIndex((e) => e.id === currentEmployeeId);
    if (idx !== -1) {
      const nextIdx = (idx + 1) % people.length;
      openPortfolio(people[nextIdx].id);
    }
  });
}

applyStaticTranslations();
updateLangSwitchUI();
renderFilterChips();
renderCards();
initFromUrl();
