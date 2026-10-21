import { getEmployees, getCertificates, getFlag, normalizeSearch, matchSearchTerm } from './data.js';
import { LANGS, getLang, setLang, t, getPlural } from './i18n.js';
import { generateQrSvg } from './qr.js';
import { generateVCard } from './vcard.js';

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
const compareExportBtn = document.getElementById('compareExportBtn');

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

/** Строка из localStorage; если хранилище запрещено браузером — null, а не падение скрипта */
function readStored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
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
  if (currentView === compareView) renderComparison();
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
    const key = el.dataset.i18n;
    const val = t(key);
    if (val && val !== key) {
      el.textContent = val;
    }
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
  // Только обновить подпись темы; берём её со страницы — хранилище может быть недоступно
  applyTheme(document.documentElement.getAttribute('data-theme') || 'crowe-light');

  // Перерисовываем всё, что построено из данных
  applyFilters();
  if (currentView === compareView) renderComparison();
  if (currentView === portfolioView && currentEmployeeId) {
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
const THEME_KEY = 'crowe_theme';

function initTheme() {
  const savedTheme = readStored(THEME_KEY) || 'crowe-light';
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
  writeStored(THEME_KEY, theme);
}

themeToggleBtn?.addEventListener('click', () => {
  // Тему берём со страницы, а не из хранилища: оно может быть недоступно
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'crowe-light';
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

const toast = document.getElementById('toast');
const toastText = document.getElementById('toastText');
const qrModal = document.getElementById('qrModal');
const qrModalBackdrop = document.getElementById('qrModalBackdrop');
const qrModalClose = document.getElementById('qrModalClose');
const qrModalName = document.getElementById('qrModalName');
const qrModalRole = document.getElementById('qrModalRole');
const qrModalCodeWrap = document.getElementById('qrModalCodeWrap');
const qrModalCopyBtn = document.getElementById('qrModalCopyBtn');

let toastTimeout = null;

function showToast(message) {
  if (!toast || !toastText) return;
  toastText.textContent = message;
  toast.hidden = false;
  void toast.offsetWidth;
  toast.classList.add('toast--visible');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => {
      if (!toast.classList.contains('toast--visible')) {
        toast.hidden = true;
      }
    }, 300);
  }, 2500);
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback below
    }
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

function getProfileShareUrl(employeeId) {
  const origin =
    typeof window !== 'undefined' && window.location && window.location.origin
      ? window.location.origin
      : 'https://portfoliocrowe.vercel.app';
  return `${origin.replace(/\/$/, '')}/team/${employeeId}`;
}

async function shareProfile(employee) {
  const url = getProfileShareUrl(employee.id);
  await copyTextToClipboard(url);
  showToast(t('portfolio.copied'));
}

function downloadVCardFile(employee) {
  const origin =
    typeof window !== 'undefined' && window.location && window.location.origin
      ? window.location.origin
      : '';
  const vcfData = generateVCard(employee, origin);
  const blob = new Blob([vcfData], { type: 'text/vcard;charset=utf-8;' });
  const objectUrl = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : '#';
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `${employee.id}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (typeof URL.revokeObjectURL === 'function') {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
  showToast(t('portfolio.vcardSaved'));
}

let qrPreviousActiveElement = null;

function openQrModal(employee) {
  if (!qrModal) return;
  qrPreviousActiveElement = document.activeElement;

  const url = getProfileShareUrl(employee.id);
  if (qrModalName) qrModalName.textContent = employee.name;
  if (qrModalRole) qrModalRole.textContent = employee.role;
  if (qrModalCodeWrap) {
    qrModalCodeWrap.innerHTML = generateQrSvg(url, {
      color: '#011E41',
      bgColor: '#FFFFFF',
      margin: 2,
    });
  }

  qrModal.hidden = false;
  document.body.style.overflow = 'hidden';
  qrModalClose?.focus();
}

function closeQrModal() {
  if (!qrModal || qrModal.hidden) return;
  qrModal.hidden = true;
  document.body.style.overflow = '';
  if (qrPreviousActiveElement && typeof qrPreviousActiveElement.focus === 'function') {
    qrPreviousActiveElement.focus();
  }
  qrPreviousActiveElement = null;
}

qrModalClose?.addEventListener('click', closeQrModal);
qrModalBackdrop?.addEventListener('click', closeQrModal);
qrModalCopyBtn?.addEventListener('click', async () => {
  if (!currentEmployeeId) return;
  const url = getProfileShareUrl(currentEmployeeId);
  await copyTextToClipboard(url);
  showToast(t('portfolio.copied'));
});

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
  const certs = getCertificates(employeeId, getLang());
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

  const displayName = options.displayName || '';

  certs.forEach((cert, i) => {
    const item = document.createElement('div');
    item.className = 'cert-item';

    const card = document.createElement('div');
    card.className = 'cert-card';
    card.role = 'button';
    card.tabIndex = 0;
    card.setAttribute('aria-label', cert.title || t('certs.alt', { n: i + 1 }));
    card.title = cert.title || '';
    card.style.animationDelay = `${0.5 + i * 0.07}s`;
    card.innerHTML = `
      <img class="cert-card__img" src="${cert.thumb}" alt="${cert.title || t('certs.alt', { n: i + 1 })}" loading="lazy">
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

  // ----- Actions bar (Download PDF + Share + QR + vCard + Contact + Bookmark) -----
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
    <button class="portfolio__share-btn" id="shareBtn" type="button">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3"/>
        <circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      <span>${t('portfolio.share')}</span>
    </button>
    <button class="portfolio__qr-btn" id="qrBtn" type="button">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
        <rect x="14" y="14" width="3" height="3"/>
        <rect x="18" y="18" width="3" height="3"/>
        <rect x="18" y="14" width="3" height="3"/>
        <rect x="14" y="18" width="3" height="3"/>
      </svg>
      <span>${t('portfolio.qr')}</span>
    </button>
    <button class="portfolio__vcard-btn" id="vcardBtn" type="button">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <line x1="19" y1="8" x2="19" y2="14"/>
        <line x1="22" y1="11" x2="16" y2="11"/>
      </svg>
      <span>${t('portfolio.vcard')}</span>
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
  
  // Action buttons event listeners
  document.getElementById('downloadPdfBtn')?.addEventListener('click', () => printResume(employee));
  document.getElementById('shareBtn')?.addEventListener('click', () => shareProfile(employee));
  document.getElementById('qrBtn')?.addEventListener('click', () => openQrModal(employee));
  document.getElementById('vcardBtn')?.addEventListener('click', () => downloadVCardFile(employee));
  document.getElementById('bookmarkBtn')?.addEventListener('click', () => toggleBookmark(employee.id));

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
  document.title = cert.title ? `${displayName} — ${cert.title}` : t('certs.fileName', { name: displayName, n: index + 1 });

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
    { label: t('compare.certificates'), kind: 'certs', values: list.map((e) => getCertificates(e.id, getLang())) },
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
      button.setAttribute('aria-label', cert.title || t('certs.alt', { n: i + 1 }));
      button.title = cert.title || '';
      const img = document.createElement('img');
      img.src = cert.thumb;
      img.alt = cert.title || '';
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

  if (compareExportBtn) {
    compareExportBtn.disabled = list.length === 0;
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

function printTeamDeck() {
  const list = comparedEmployees();
  if (!list.length) return;

  const prevDeck = document.getElementById('teamDeckPrint');
  if (prevDeck) prevDeck.remove();

  const deck = document.createElement('div');
  deck.id = 'teamDeckPrint';

  const origin =
    typeof window !== 'undefined' && window.location && window.location.origin
      ? window.location.origin
      : 'https://portfoliocrowe.vercel.app';

  // 1. Cover Slide
  const cover = document.createElement('div');
  cover.className = 'deck-page deck-cover';
  cover.innerHTML = `
    <div>
      <div class="deck-cover__badge-confidential">${t('deck.confidential')}</div>
      <div class="deck-cover__header">
        <div class="deck-cover__logo">
          <svg width="240" height="66" viewBox="0 0 360 100" fill="none">
            <path d="M59.0289 0.49264C59.4404 -0.1835 60.058 -0.154089 60.4108 0.522042L112.388 99.3905C112.741 100.096 112.653 100.155 112.153 99.5375L75.3159 53.6754C74.8161 53.0874 74.0222 53.0874 73.5224 53.6754L35.5394 99.5669C35.0397 100.184 34.922 100.096 35.3042 99.4199L66.614 42.2097C66.9667 41.5337 66.8785 41.4748 66.3788 42.0627L18.7525 99.5963C18.2528 100.184 18.1645 100.125 18.5467 99.4493L58.7936 29.4803C59.1758 28.8041 59.0876 28.7453 58.5878 29.3333L0.436746 99.5669C-0.062939 100.184 -0.150645 100.125 0.260909 99.4493L59.0289 0.49264Z" fill="#F5A800"/>
            <path d="M174.182 18.8361C182.796 18.8361 188.822 21.8638 192.791 24.9506L189.352 30.1248V30.0954C186.5 27.7729 180.062 24.833 173.594 24.833C158.689 24.833 149.898 35.5052 149.898 49.6461C149.898 64.8746 160.394 75.1349 173.594 75.1349C180.15 75.1349 185.295 73.077 188.823 70.6663L192.086 75.6641C188.029 78.4276 180.885 81.1617 173.153 81.1617C151.633 81.1617 140.697 66.4328 140.696 49.8225C140.696 34.6821 152.574 18.8361 174.182 18.8361Z" fill="#011E41"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M238.897 36.0346C249.745 36.0346 260.152 44.119 260.152 58.0834C260.152 72.0478 251.626 81.1617 238.897 81.1617C226.167 81.1617 217.7 71.4304 217.7 58.0834C217.7 44.1485 228.049 36.0347 238.897 36.0346ZM238.867 41.5617C229.136 41.5617 226.05 50.3515 226.05 58.0834C226.05 66.168 228.813 75.6641 238.867 75.6641C248.922 75.6641 251.774 66.1974 251.774 58.0834C251.774 49.9693 248.598 41.5617 238.867 41.5617Z" fill="#011E41"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M343.282 36.0346C356.364 36.0346 360.774 47.8233 359.892 59.1124H330.905C330.817 67.7263 336.932 75.6347 345.458 75.6347C349.426 75.6347 354.248 74.1649 357.247 71.9306L359.481 76.164C355.012 79.339 349.662 81.1617 345.193 81.1617C331.758 81.1617 322.879 72.9004 322.879 57.7305C322.879 42.561 333.551 36.0347 343.282 36.0346ZM343.223 41.5323C334.962 41.5324 331.699 48.4113 331.435 53.9382H352.866C352.866 47.2353 350.014 41.5323 343.223 41.5323Z" fill="#011E41"/>
            <path d="M213.375 36.0669C215.198 36.0669 218.109 37.4486 220.519 40.3003L216.991 45.298C215.109 44.3573 213.198 43.4751 211.229 43.4751C207.26 43.4752 203.997 47.4445 203.997 56.9989V80.1649H196.235V37.1248H203.821V42.4166L206.907 39.1536C208.73 37.3308 211.552 36.0669 213.375 36.0669Z" fill="#011E41"/>
            <path d="M324.653 37.4148L309.483 80.1315H304.044C299.752 69.4598 295.343 58.7881 291.139 46.5583H290.962C286.817 58.7881 282.613 69.4598 278.379 80.1315H273.293L258.388 38.1205L265.973 36.2393C269.501 46.8228 273.117 57.3475 276.557 69.9889H276.733C280.878 57.6708 285.082 47.3516 289.316 37.0914H294.402L294.431 37.062C298.664 47.3222 302.869 57.6414 307.014 69.9595H307.19C310.542 57.2887 314.07 46.7934 317.509 36.2099L324.653 37.4148Z" fill="#011E41"/>
          </svg>
        </div>
      </div>
      <div class="deck-cover__main">
        <h1 class="deck-cover__title">${t('deck.coverTitle')}</h1>
        <p class="deck-cover__subtitle">${t('deck.coverSubtitle')}</p>
        <p class="deck-cover__desc">${t('deck.coverDesc')}</p>
      </div>
    </div>
    <div>
      <div class="deck-cover__meta">
        <span class="deck-cover__tag">${getPlural(list.length, 'specialists')}</span>
        <span style="font-size: 0.85rem; color: #011E41; opacity: 0.8;">Tashkent, Uzbekistan</span>
      </div>
      <div class="deck-footer" style="border-top: none; padding-top: 1rem;">
        <span>${t('deck.footer')}</span>
      </div>
    </div>
  `;
  deck.appendChild(cover);

  // 2. Individual Member Slides
  list.forEach((emp) => {
    const slide = document.createElement('div');
    slide.className = 'deck-page deck-member';

    const tagsHtml = (emp.tags || []).slice(0, 8).map((tg) => `<span class="deck-member__tag">${tg}</span>`).join('');
    const bioText = (emp.left?.[1]?.items || emp.left?.[0]?.items || []).slice(0, 3).join('<br><br>');
    const profileUrl = `${origin.replace(/\/$/, '')}/team/${emp.id}`;
    const qrSvg = generateQrSvg(profileUrl, { color: '#011E41', bgColor: '#FFFFFF', margin: 1 });

    slide.innerHTML = `
      <div class="deck-member__header">
        <div>
          <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: #F5A800; font-weight: 700;">Crowe Uzbekistan</span>
          <div style="font-size: 0.85rem; color: #011E41; opacity: 0.7;">${emp.office || 'Tashkent'}</div>
        </div>
        <div style="font-weight: 600; font-size: 0.85rem; color: #011E41;">${t('deck.summaryTitle')}</div>
      </div>
      <div class="deck-member__body">
        <div>
          <img class="deck-member__photo" src="${emp.photo}" alt="${emp.name}">
        </div>
        <div>
          <h2 class="deck-member__name">${emp.name}</h2>
          <div class="deck-member__role">${emp.role}</div>
          <div class="deck-member__tags">${tagsHtml}</div>
          <div class="deck-member__bio">${bioText}</div>
        </div>
        <div class="deck-member__qr-block">
          <div class="deck-member__qr-code">${qrSvg}</div>
          <div class="deck-member__qr-caption">${t('deck.profileLink')}</div>
        </div>
      </div>
      <div class="deck-footer">
        <span>${t('deck.footer')}</span>
        <span>${emp.name} — ${emp.role}</span>
      </div>
    `;
    deck.appendChild(slide);
  });

  // 3. Credentials & Certification Matrix Slide
  const matrixSlide = document.createElement('div');
  matrixSlide.className = 'deck-page deck-matrix';

  const rowsHtml = list.map((emp) => {
    const certs = getCertificates(emp.id, getLang());
    const certContent = certs.length
      ? `<div class="deck-matrix__cert-count">${getPlural(certs.length, 'certificates')}</div>` +
        `<ul class="deck-matrix__cert-list">${certs.map((c) => `<li>${c.title}</li>`).join('')}</ul>`
      : '—';
    const langs = (emp.languages || []).map((l) => l.toUpperCase()).join(', ');
    return `
      <tr>
        <td style="font-weight: 600; color: #011E41; white-space: nowrap;">${emp.name}</td>
        <td>${emp.role}</td>
        <td>${emp.office || 'Tashkent'}</td>
        <td style="white-space: nowrap;">${langs}</td>
        <td>${certContent}</td>
      </tr>
    `;
  }).join('');

  matrixSlide.innerHTML = `
    <div>
      <h2 class="deck-matrix__title">${t('deck.certsTitle')}</h2>
      <table class="deck-matrix__table">
        <thead>
          <tr>
            <th>${t('deck.thSpecialist')}</th>
            <th>${t('deck.thRole')}</th>
            <th>${t('deck.thOffice')}</th>
            <th>${t('deck.thLanguages')}</th>
            <th>${t('deck.thCertificates')}</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
    <div class="deck-footer">
      <span>${t('deck.footer')}</span>
      <span>${getPlural(list.length, 'specialists')}</span>
    </div>
  `;
  deck.appendChild(matrixSlide);

  document.body.appendChild(deck);
  document.body.dataset.print = 'team-deck';
  document.title = t('compare.exportFileName');

  const restore = () => {
    document.body.removeAttribute('data-print');
    deck.remove();
    updateDocumentTitle();
  };

  window.addEventListener('afterprint', restore, { once: true });
  window.print();
  setTimeout(restore, 600);
}

compareExportBtn?.addEventListener('click', printTeamDeck);

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
    const matchesQuery = terms.every((term) => matchSearchTerm(term, emp));

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
      else chip.classList.add('filter-chip--role');
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

  // На телефоне чипы должностей занимали полэкрана — там их заменяет меню.
  // Рисуем оба варианта, а какой показать, решает CSS по ширине экрана.
  const roleItems = tagItems.filter(({ tag }) => tag.startsWith('role:'));
  if (roleItems.length) {
    const menu = renderRoleMenu(roleItems);
    const firstRoleChip = filterChipsContainer.querySelector('.filter-chip--role');
    filterChipsContainer.insertBefore(menu, firstRoleChip);
  }
}

/** Открыто ли меню должностей — переживает перерисовку чипов при вводе в поиск */
let roleMenuOpen = false;

function renderRoleMenu(roleItems) {
  const activeRole = activeTag.startsWith('role:') ? activeTag : null;

  const menu = document.createElement('div');
  menu.className = 'role-menu';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'roleMenuToggle';
  toggle.className = 'role-menu__toggle';
  toggle.classList.toggle('role-menu__toggle--active', Boolean(activeRole));
  toggle.classList.toggle('role-menu__toggle--open', roleMenuOpen);
  toggle.setAttribute('aria-haspopup', 'true');
  toggle.setAttribute('aria-controls', 'roleMenuPanel');
  toggle.setAttribute('aria-expanded', String(roleMenuOpen));
  toggle.innerHTML = `
    <span class="role-menu__label"></span>
    <svg class="role-menu__sort" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true">
      <path d="M2.5 4h5M2.5 8h4M2.5 12h3"/>
      <path d="M10.5 5.5l1.5-2.5 1.5 2.5m-2.4-.8h1.8" stroke-width="1.2"/>
      <path d="M11 10.5h2.5l-2.5 3h2.5" stroke-width="1.2"/>
    </svg>
    <svg class="role-menu__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 4.5L6 7.5L9 4.5"/>
    </svg>
  `;
  // Выбранная должность видна прямо на кнопке — иначе непонятно, почему карточек мало
  const roleTitle = t('filter.role');
  const fallbackTitle = getLang() === 'ru' ? 'Должность' : 'Role';
  const label = activeRole ? getTagLabel(activeRole) : (roleTitle && roleTitle !== 'filter.role' ? roleTitle : fallbackTitle);
  toggle.querySelector('.role-menu__label').textContent = label;
  toggle.addEventListener('click', () => setRoleMenuOpen(!roleMenuOpen));

  const panel = document.createElement('div');
  panel.id = 'roleMenuPanel';
  panel.className = 'role-menu__panel';
  panel.setAttribute('role', 'group');
  const accessibleRoleTitle = roleTitle && roleTitle !== 'filter.role' ? roleTitle : fallbackTitle;
  panel.setAttribute('aria-label', accessibleRoleTitle);
  panel.hidden = !roleMenuOpen;

  // В меню — по алфавиту единым списком без колонок
  const collator = new Intl.Collator(getLang());
  roleItems
    .map((item) => ({ ...item, label: getTagLabel(item.tag) }))
    .sort((a, b) => collator.compare(a.label, b.label))
    .forEach(({ tag, count, label }) => {
      const isActive = tag === activeTag;
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'role-menu__option';
      option.classList.toggle('role-menu__option--active', isActive);
      option.setAttribute('aria-pressed', String(isActive));
      option.disabled = count === 0 && !isActive;
      option.innerHTML = '<span class="role-menu__name"></span><span class="role-menu__count"></span>';
      option.querySelector('.role-menu__name').textContent = label;
      option.querySelector('.role-menu__count').textContent = count;
      option.addEventListener('click', () => {
        // Повторный выбор той же должности снимает фильтр
        activeTag = isActive ? 'all' : tag;
        roleMenuOpen = false;
        applyFilters();
        document.getElementById('roleMenuToggle')?.focus();
      });
      panel.appendChild(option);
    });

  menu.append(toggle, panel);
  return menu;
}

/** Открытие/закрытие без перерисовки — чтобы не терялся фокус на кнопке */
function setRoleMenuOpen(open) {
  roleMenuOpen = open;
  const toggle = document.getElementById('roleMenuToggle');
  const panel = document.getElementById('roleMenuPanel');
  if (!toggle || !panel) return;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.classList.toggle('role-menu__toggle--open', open);
  panel.hidden = !open;

  if (open) {
    panel.style.left = '0';
    // Выравниваем панель, чтобы она не вылезала за правый край экрана телефона
    requestAnimationFrame(() => {
      if (typeof window !== 'undefined' && panel.getBoundingClientRect) {
        const rect = panel.getBoundingClientRect();
        if (rect.right > window.innerWidth - 12) {
          const diff = rect.right - (window.innerWidth - 12);
          panel.style.left = `-${diff}px`;
        }
      }
    });
  }
}

// Клик мимо меню закрывает его. isConnected — цель могли уже перерисовать
document.addEventListener('click', (e) => {
  if (!roleMenuOpen || !e.target.isConnected) return;
  if (e.target.closest('.role-menu')) return;
  setRoleMenuOpen(false);
});

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
    searchInput.closest('.search-box')?.classList.toggle('search-box--has-value', Boolean(searchQuery));
    applyFilters();
  });
}

if (searchClearBtn) {
  searchClearBtn.addEventListener('click', () => {
    searchQuery = '';
    searchInput.value = '';
    searchClearBtn.hidden = true;
    searchInput.closest('.search-box')?.classList.remove('search-box--has-value');
    applyFilters();
    searchInput.focus();
  });
}

if (resetFiltersBtn) {
  resetFiltersBtn.addEventListener('click', () => {
    activeTag = 'all';
    searchQuery = '';
    roleMenuOpen = false;
    if (searchInput) {
      searchInput.value = '';
      searchInput.closest('.search-box')?.classList.remove('search-box--has-value');
    }
    if (searchClearBtn) searchClearBtn.hidden = true;
    renderFilterChips();
    applyFilters();
  });
}

function renderCards(list = people) {
  cardsGrid.innerHTML = '';
  list.forEach((emp, i) => cardsGrid.appendChild(createEmployeeCard(emp, i)));
}

const VIEWS = [homeView, compareView, portfolioView];

/**
 * Вид, который показан или вот-вот будет показан. По `hidden` судить нельзя:
 * во время перехода старый вид ещё виден, а новый уже выбран.
 */
let currentView = homeView;
let viewTimer = null;

/**
 * Показывает один из видов, гася остальные. Адрес — на вызывающем.
 * Новый вызов отменяет незавершённый переход: иначе быстрый клик «Назад»
 * сразу после открытия профиля оставлял на экране профиль при адресе «/».
 */
function showView(target) {
  setRoleMenuOpen(false);
  clearTimeout(viewTimer);
  viewTimer = null;
  currentView = target;
  backBtn.style.display = target === homeView ? 'none' : 'inline-flex';
  updateDocumentTitle();

  const others = VIEWS.filter((v) => v !== target);

  // Цель уже на экране — просто добиваем то, что не успело уйти
  if (!target.hidden && !target.classList.contains('view--leaving')) {
    for (const view of others) {
      view.hidden = true;
      view.classList.remove('view--active', 'view--leaving');
    }
    return;
  }

  target.hidden = true;
  target.classList.remove('view--active', 'view--leaving');
  for (const view of others) {
    if (view.hidden) continue;
    view.classList.remove('view--active');
    view.classList.add('view--leaving');
  }

  viewTimer = setTimeout(() => {
    viewTimer = null;
    for (const view of others) {
      view.hidden = true;
      view.classList.remove('view--leaving');
    }
    target.hidden = false;
    requestAnimationFrame(() => {
      // За кадр могли успеть уйти на другой вид
      if (currentView === target) target.classList.add('view--active');
    });
  }, viewTransitionMs());
}

/** Возврат к списку команды. push=false — когда сюда привёл сам браузер */
function goHome({ push = true } = {}) {
  currentEmployeeId = null;
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
  if (currentView === compareView) {
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
// Лупа только для мыши: на ноутбуке с сенсорным экраном мышь тоже работает,
// а касание пальцем — нет, иначе лупа мешала бы свайпу
lightboxImg.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const rect = lightboxImg.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  lightboxLens.style.display = 'block';
  lightboxLens.style.left = `${x - 75}px`;
  lightboxLens.style.top = `${y - 75}px`;

  const zoom = 2;
  lightboxLens.style.backgroundImage = `url(${lightboxImg.src})`;
  lightboxLens.style.backgroundSize = `${rect.width * zoom}px ${rect.height * zoom}px`;
  // Знак ставим числом, а не приклеиваем «-» к строке: у краёв картинки
  // смещение отрицательное и получалось невалидное «--20px»
  lightboxLens.style.backgroundPosition = `${75 - x * zoom}px ${75 - y * zoom}px`;
});

lightboxImg.addEventListener('pointerleave', () => {
  lightboxLens.style.display = 'none';
});

// Global Keyboard Navigation
document.addEventListener('keydown', (e) => {
  // Ignore keyboard shortcuts when typing in search input (except Escape)
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    if (e.key === 'Escape') {
      if (searchInput) {
        if (searchInput.value || searchQuery) {
          searchQuery = '';
          searchInput.value = '';
          if (searchClearBtn) searchClearBtn.hidden = true;
          searchInput.closest('.search-box')?.classList.remove('search-box--has-value');
          applyFilters();
        }
        searchInput.blur();
      }
    }
    return;
  }

  // '/' shortcut: Focus into search input from anywhere
  if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    if (currentView !== homeView) {
      goHome({ push: true });
    }
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
    return;
  }

  // Alt+← / Cmd+← — «Назад» в браузере; перехватывать стрелки с модификаторами
  // нельзя, иначе одновременно срабатывали и браузер, и сайт
  const isArrow = (e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
    !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;

  // 0. QR Modal active
  if (qrModal && !qrModal.hidden) {
    if (e.key === 'Escape') {
      closeQrModal();
      return;
    }
  }

  // 1. Role menu open
  if (roleMenuOpen) {
    if (e.key === 'Escape') {
      setRoleMenuOpen(false);
      document.getElementById('roleMenuToggle')?.focus();
      return;
    }
  }

  // 2. Lightbox active
  if (!lightbox.hidden) {
    if (e.key === 'Escape') closeLightbox();
    if (isArrow) navigateLightbox(e.key === 'ArrowLeft' ? -1 : 1);
    if (e.key === 'Tab') trapLightboxFocus(e);
    return;
  }

  // 3. Comparison view active
  if (currentView === compareView) {
    if (e.key === 'Escape') {
      goHome();
      return;
    }
    if (isArrow) {
      const scrollContainer = document.querySelector('.compare__scroll');
      if (scrollContainer) {
        const scrollAmount = 288;
        scrollContainer.scrollBy({
          left: e.key === 'ArrowLeft' ? -scrollAmount : scrollAmount,
          behavior: scrollBehavior(),
        });
      }
      return;
    }
    return;
  }

  // 4. Portfolio view active
  if (currentView === portfolioView) {
    if (e.key === 'Escape') {
      goHome();
      return;
    }

    if (isArrow) {
      const idx = people.findIndex((emp) => emp.id === currentEmployeeId);
      if (idx !== -1) {
        const step = e.key === 'ArrowLeft' ? -1 : 1;
        const nextIdx = (idx + step + people.length) % people.length;
        openPortfolio(people[nextIdx].id);
      }
      return;
    }
  }

  // 5. Home view: Escape resets active search
  if (currentView === homeView && e.key === 'Escape') {
    if (searchQuery || (searchInput && searchInput.value)) {
      searchQuery = '';
      if (searchInput) {
        searchInput.value = '';
        searchInput.closest('.search-box')?.classList.remove('search-box--has-value');
      }
      if (searchClearBtn) searchClearBtn.hidden = true;
      applyFilters();
    }
  }
});

window.addEventListener('popstate', () => {
  if (qrModal && !qrModal.hidden) closeQrModal();

  // Окно сертификата не должно висеть поверх другой страницы
  if (!lightbox.hidden) closeLightbox();

  const id = employeeIdFromUrl();
  const employee = id ? people.find((e) => e.id === id) : null;
  if (employee) {
    currentEmployeeId = employee.id;
    renderPortfolio(employee);
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
  clearTimeout(viewTimer);
  viewTimer = null;
  currentView = target;
  for (const view of VIEWS) {
    view.hidden = view !== target;
    view.classList.toggle('view--active', view === target);
    view.classList.remove('view--leaving');
  }
  backBtn.style.display = target === homeView ? 'none' : 'inline-flex';
  updateDocumentTitle();
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

// ----- Fullscreen Toggle Button -----
const fullscreenBtn = document.getElementById('fullscreenBtn');
const fullscreenTooltip = document.getElementById('fullscreenTooltip');
const iconExpand = fullscreenBtn?.querySelector('.icon-expand');
const iconCompress = fullscreenBtn?.querySelector('.icon-compress');

if (fullscreenBtn) {
  const syncFullscreenState = () => {
    const isFullscreen = !!document.fullscreenElement;
    if (iconExpand && iconCompress) {
      iconExpand.style.display = isFullscreen ? 'none' : 'block';
      iconCompress.style.display = isFullscreen ? 'block' : 'none';
    }
    const key = isFullscreen ? 'fullscreen.exit' : 'fullscreen.enter';
    const label = t(key);
    fullscreenBtn.setAttribute('data-i18n-aria', key);
    fullscreenBtn.setAttribute('data-i18n-title', key);
    fullscreenBtn.setAttribute('aria-label', label);
    fullscreenBtn.setAttribute('title', label);
    if (fullscreenTooltip) {
      fullscreenTooltip.setAttribute('data-i18n', key);
      fullscreenTooltip.textContent = label;
    }
  };

  document.addEventListener('fullscreenchange', syncFullscreenState);

  fullscreenBtn.addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  });
  
  // Set initial string based on default language
  syncFullscreenState();
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

// Register Service Worker for offline PWA support
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  (window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
