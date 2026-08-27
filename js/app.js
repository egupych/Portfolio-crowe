// ?v= обязателен: index.html версионирует только app.js, а импорты
// без версии браузер продолжает брать из кэша. Поднимать вместе.
import { getEmployees, getCertificates, getFlag } from './data.js?v=28';
import { LANGS, getLang, setLang, t } from './i18n.js?v=28';

const homeView = document.getElementById('homeView');
const portfolioView = document.getElementById('portfolioView');
const cardsGrid = document.getElementById('cardsGrid');
const portfolioContent = document.getElementById('portfolioContent');
const otherEmployeesGrid = document.getElementById('otherEmployeesGrid');
const backBtn = document.getElementById('backBtn');
const headerBackBtn = document.getElementById('headerBackBtn');
const logoBtn = document.getElementById('logoBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeToggleText = document.getElementById('themeToggleText');
const compareBtn = document.getElementById('compareBtn');
const bookmarkCount = document.getElementById('bookmarkCount');
const langSwitch = document.getElementById('langSwitch');

/** Сотрудники на текущем языке — пересобирается при переключении языка */
let people = getEmployees(getLang());

const PHOTO_PLACEHOLDER = 'Фото профилей/placeholder.svg';

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

// Bookmark management
let bookmarkedEmployees = new Set();
const BOOKMARKS_KEY = 'crowe_bookmarks';

function initBookmarks() {
  const savedBookmarks = localStorage.getItem(BOOKMARKS_KEY);
  if (savedBookmarks) {
    bookmarkedEmployees = new Set(JSON.parse(savedBookmarks));
  }
}

function saveBookmarks() {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...bookmarkedEmployees]));
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
}

initBookmarks();
updateCompareButton();

// Compare button functionality
compareBtn?.addEventListener('click', () => {
  const bookmarkedEmployeesList = people.filter((emp) => bookmarkedEmployees.has(emp.id));
  if (bookmarkedEmployeesList.length > 0) {
    showComparison();
  }
});

function showComparison() {
  // Switch to home view and filter by bookmarks
  activeTag = 'bookmarks';
  searchQuery = '';
  if (searchInput) searchInput.value = '';
  if (searchClearBtn) searchClearBtn.hidden = true;
  applyFilters();

  // Если открыт профиль — возвращаемся к сетке, иначе отфильтрованный список не виден
  if (!portfolioView.hidden) switchView(false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Language management
function setMetaContent(attr, name, value) {
  const el = document.querySelector(`meta[${attr}="${name}"]`);
  if (el) el.setAttribute('content', value);
}

/** Проставляет переводы во всю статическую разметку (data-i18n*) и в мета-теги */
function applyStaticTranslations() {
  document.documentElement.lang = t('html.lang');
  document.title = t('meta.title');

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
let currentCertIndex = 0;
let viewedEmployees = new Set();

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

function renderCertificates(name, options = {}) {
  const certs = getCertificates(name);
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

  certs.forEach((src, i) => {
    const item = document.createElement('div');
    item.className = 'cert-item';

    const card = document.createElement('div');
    card.className = 'cert-card';
    card.style.animationDelay = `${0.5 + i * 0.07}s`;
    card.innerHTML = `
      <img class="cert-card__img" src="${src}" alt="${t('certs.alt', { n: i + 1 })}" loading="lazy">
      <div class="cert-card__overlay">
        <span class="cert-card__zoom">${t('certs.zoom')}</span>
      </div>
    `;
    card.addEventListener('click', () => openLightbox(certs, i));
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
    pdfBtn.addEventListener('click', () => printCertificate(item, displayName, i));
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
      <h2 class="portfolio__name">${employee.name}</h2>
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
  const certsBlock = renderCertificates(employee.assetName, { displayName: employee.name });
  if (certsBlock) portfolioContent.appendChild(certsBlock);

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
  const restoreTitle = () => {
    document.title = t('meta.title');
  };
  window.addEventListener('afterprint', restoreTitle, { once: true });

  window.print();

  // Safari не всегда шлёт afterprint — подстраховываемся
  setTimeout(restoreTitle, 500);
}

/**
 * Печатает один сертификат. Ориентация страницы берётся из пропорций
 * изображения: среди сертификатов есть и портретные, и альбомные.
 */
async function printCertificate(item, displayName, index) {
  // Быстрый повторный клик мог оставить прошлый сертификат помеченным —
  // иначе в печать попали бы оба
  document.querySelectorAll('.cert-item--printing').forEach((el) => el.classList.remove('cert-item--printing'));
  document.querySelectorAll('style[data-print-page]').forEach((el) => el.remove());

  const img = item.querySelector('.cert-card__img');

  // Картинки помечены loading="lazy" — до печати могут быть не загружены
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
    document.title = t('meta.title');
  };
  window.addEventListener('afterprint', cleanup, { once: true });

  window.print();
  setTimeout(cleanup, 500);
}

function renderOtherEmployees(currentId) {
  otherEmployeesGrid.innerHTML = '';
  const otherEmployees = people.filter((e) => e.id !== currentId);
  
  otherEmployees.forEach((emp, i) => {
    const card = document.createElement('article');
    card.className = 'employee-card';
    if (viewedEmployees.has(emp.id)) {
      card.classList.add('employee-card--viewed');
    }
    card.style.animationDelay = `${0.05 * i}s`;
    card.innerHTML = `
      <div class="employee-card__photo-wrap">
        <img class="employee-card__photo" src="${emp.photo}" alt="${emp.name}" loading="lazy">
      </div>
      <h2 class="employee-card__name">${emp.name}</h2>
      <p class="employee-card__role">${emp.role}</p>
    `;
    withPhotoFallback(card.querySelector('.employee-card__photo'));
    card.addEventListener('click', () => openPortfolio(emp.id));
    otherEmployeesGrid.appendChild(card);
  });
}

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
  const q = query.trim().toLowerCase();
  const [kind, value] = splitTag(tagKey);

  return people.filter((emp) => {
    const matchesTag =
      kind === 'all' ||
      (kind === 'bookmarks' && bookmarkedEmployees.has(emp.id)) ||
      (kind === 'office' && emp.officeKey === value) ||
      (kind === 'role' && emp.roleKey === value);

    const matchesQuery =
      !q ||
      emp.name.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q) ||
      emp.tags.some((tagText) => tagText.toLowerCase().includes(q));

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

  // Sort so 'All' is first, available tags (count > 0) are next, and disabled (count === 0) are moved to the end
  tagItems.sort((a, b) => {
    if (a.tag === 'all') return -1;
    if (b.tag === 'all') return 1;
    const aAvailable = a.count > 0;
    const bAvailable = b.count > 0;
    if (aAvailable && !bAvailable) return -1;
    if (!aAvailable && bAvailable) return 1;
    return 0;
  });

  tagItems.forEach(({ tag, count }) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `filter-chip ${tag === activeTag ? 'filter-chip--active' : ''}`;

    if (count === 0 && tag !== 'all') {
      chip.classList.add('filter-chip--disabled');
      chip.disabled = true;
    }

    if (tag === 'bookmarks') {
      // Только иконка — подпись и счётчик уходят в aria-label и подсказку
      const label = `${t('filter.bookmarks')} (${count})`;
      chip.classList.add('filter-chip--bookmarks');
      chip.setAttribute('aria-label', label);
      chip.title = label;
      chip.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
    } else {
      if (tag === 'all') chip.classList.add('filter-chip--all');
      else if (tag.startsWith('office:')) chip.classList.add('filter-chip--office');
      chip.innerHTML = `
        <span>${getTagLabel(tag)}</span>
        <span class="filter-chip__count">(${count})</span>
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
  list.forEach((emp, i) => {
    const card = document.createElement('article');
    card.className = 'employee-card';
    if (viewedEmployees.has(emp.id)) {
      card.classList.add('employee-card--viewed');
    }
    card.style.animationDelay = `${0.05 * i}s`;
    card.innerHTML = `
      <div class="employee-card__photo-wrap">
        <img class="employee-card__photo" src="${emp.photo}" alt="${emp.name}" loading="lazy">
      </div>
      <h2 class="employee-card__name">${emp.name}</h2>
      <p class="employee-card__role">${emp.role}</p>
    `;
    withPhotoFallback(card.querySelector('.employee-card__photo'));
    card.addEventListener('click', () => openPortfolio(emp.id));
    cardsGrid.appendChild(card);
  });
}

function switchView(toPortfolio) {
  if (toPortfolio) {
    backBtn.style.display = 'inline-flex';
    homeView.classList.add('view--leaving');
    homeView.classList.remove('view--active');
    setTimeout(() => {
      homeView.hidden = true;
      portfolioView.hidden = false;
      requestAnimationFrame(() => {
        portfolioView.classList.add('view--active');
      });
    }, 300);
  } else {
    backBtn.style.display = 'none';
    portfolioView.classList.remove('view--active');
    portfolioView.classList.add('view--leaving');
    setTimeout(() => {
      portfolioView.hidden = true;
      portfolioView.classList.remove('view--leaving');
      homeView.hidden = false;
      homeView.classList.remove('view--leaving');
      requestAnimationFrame(() => {
        homeView.classList.add('view--active');
      });
    }, 300);
    history.pushState(null, '', '#');
  }
}

let currentEmployeeId = null;

function openPortfolio(id) {
  const employee = people.find((e) => e.id === id);
  if (!employee) return;
  currentEmployeeId = id;
  viewedEmployees.add(id);
  renderPortfolio(employee);
  renderCards();
  switchView(true);
  history.pushState({ id }, '', `#${id}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openLightbox(certs, index) {
  currentCerts = certs;
  currentCertIndex = index;
  updateLightbox();
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = '';
  lightboxLens.style.display = 'none';
}

function updateLightbox() {
  lightboxImg.src = currentCerts[currentCertIndex];
  lightboxCounter.textContent = `${currentCertIndex + 1} / ${currentCerts.length}`;
  lightboxPrev.style.visibility = currentCerts.length > 1 ? 'visible' : 'hidden';
  lightboxNext.style.visibility = currentCerts.length > 1 ? 'visible' : 'hidden';
  lightboxLens.style.display = 'none';
}

function navigateLightbox(dir) {
  currentCertIndex = (currentCertIndex + dir + currentCerts.length) % currentCerts.length;
  lightboxImg.style.animation = 'none';
  lightboxImg.offsetHeight;
  lightboxImg.style.animation = 'zoomIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both';
  updateLightbox();
}

backBtn.addEventListener('click', () => switchView(false));
logoBtn.addEventListener('click', () => {
  if (!portfolioView.hidden) switchView(false);
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

lightboxImg.addEventListener('click', () => {
  window.open(lightboxImg.src, '_blank');
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
    return;
  }

  // 2. Portfolio view active
  if (!portfolioView.hidden) {
    if (e.key === 'Escape') {
      switchView(false);
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
  const hash = location.hash.slice(1);
  if (hash) {
    const employee = people.find((e) => e.id === hash);
    if (employee) {
      currentEmployeeId = hash;
      renderPortfolio(employee);
      if (portfolioView.hidden) switchView(true);
      return;
    }
  }
  if (!portfolioView.hidden) switchView(false);
});

function initFromHash() {
  const hash = location.hash.slice(1);
  if (hash) {
    const employee = people.find((e) => e.id === hash);
    if (employee) {
      currentEmployeeId = hash;
      renderPortfolio(employee);
      homeView.hidden = true;
      homeView.classList.remove('view--active');
      portfolioView.hidden = false;
      portfolioView.classList.add('view--active');
      backBtn.style.display = 'inline-flex';
    } else {
      backBtn.style.display = 'none';
    }
  } else {
    backBtn.style.display = 'none';
  }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
initFromHash();
