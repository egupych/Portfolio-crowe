import { employees, getCertificates, getFlag } from './data.js';

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
    bookmarkBtn.querySelector('span').textContent = isBookmarked ? 'В закладках' : 'Добавить в закладки';
  }
  
  // Re-render filters to update bookmark count
  renderFilterChips();
  updateCompareButton();
}

initBookmarks();
updateCompareButton();

// Compare button functionality
compareBtn?.addEventListener('click', () => {
  const bookmarkedEmployeesList = employees.filter(emp => bookmarkedEmployees.has(emp.id));
  if (bookmarkedEmployeesList.length > 0) {
    showComparison(bookmarkedEmployeesList);
  }
});

function showComparison(bookmarkedList) {
  // Switch to home view and filter by bookmarks
  activeTag = 'Закладки';
  searchQuery = '';
  if (searchInput) searchInput.value = '';
  if (searchClearBtn) searchClearBtn.hidden = true;
  applyFilters();
}

// Theme management
const THEMES = ['crowe-light', 'warm'];
const THEME_LABELS = {
  'crowe-light': 'Тема: Crowe Light',
  warm: 'Тема: Тёплая',
};

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
    themeToggleText.textContent = THEME_LABELS[theme];
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
    title.textContent = 'Сертификаты';
    block.appendChild(title);
  }

  const grid = document.createElement('div');
  grid.className = 'certificates__grid';

  certs.forEach((src, i) => {
    const card = document.createElement('div');
    card.className = 'cert-card';
    card.style.animationDelay = `${0.5 + i * 0.07}s`;
    card.innerHTML = `
      <img class="cert-card__img" src="${src}" alt="Сертификат ${i + 1}" loading="lazy">
      <div class="cert-card__overlay">
        <span class="cert-card__zoom">Увеличить</span>
      </div>
    `;
    card.addEventListener('click', () => openLightbox(certs, i));
    grid.appendChild(card);
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
      <div class="portfolio__languages">
        <div class="portfolio__flags">
          ${employee.languages.map((code) => `<img class="portfolio__flag" src="${getFlag(code)}" alt="">`).join('')}
        </div>
      </div>
    </div>
  `;
  resumeContent.appendChild(header);

  const tags = document.createElement('div');
  tags.className = 'portfolio__tags';
  employee.tags.forEach((t) => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = t;
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
    <a class="portfolio__download-btn" href="PDF/${encodeURIComponent(employee.name)}.pdf" download="${employee.name} — резюме.pdf">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2.5V12.5M10 12.5L6.25 8.75M10 12.5L13.75 8.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3.75 15.5H16.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span>Скачать резюме в PDF</span>
    </a>
    <a class="portfolio__contact-btn" href="https://t.me/crowe_uz" target="_blank" rel="noopener">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span>Написать в Telegram</span>
    </a>
    <button class="portfolio__bookmark-btn ${isBookmarked ? 'portfolio__bookmark-btn--active' : ''}" id="bookmarkBtn" type="button">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      <span>${isBookmarked ? 'В закладках' : 'Добавить в закладки'}</span>
    </button>
  `;
  portfolioContent.appendChild(actionsWrap);
  
  // Bookmark button functionality
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  bookmarkBtn.addEventListener('click', () => toggleBookmark(employee.id));

  // ----- Certificates -----
  const certsBlock = renderCertificates(employee.name);
  if (certsBlock) portfolioContent.appendChild(certsBlock);

  renderOtherEmployees(employee.id);
}

function renderOtherEmployees(currentId) {
  otherEmployeesGrid.innerHTML = '';
  const otherEmployees = employees.filter((e) => e.id !== currentId);
  
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

let activeTag = 'Все';
let searchQuery = '';

const POPULAR_TAGS = ['Все', 'Закладки', 'Аудит', 'МСФО', 'Контроль качества', 'Due Diligence', 'Консалтинг', 'IT General Controls', 'Налоги'];

function getEmployeesMatchingTagAndQuery(tag, query) {
  const q = query.trim().toLowerCase();
  return employees.filter((emp) => {
    const matchesTag =
      tag === 'Все' ||
      tag === 'Закладки' && bookmarkedEmployees.has(emp.id) ||
      emp.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase())) ||
      emp.role.toLowerCase().includes(tag.toLowerCase());

    const matchesQuery =
      !q ||
      emp.name.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q) ||
      emp.tags.some((t) => t.toLowerCase().includes(q));

    return matchesTag && matchesQuery;
  });
}

function renderFilterChips() {
  if (!filterChipsContainer) return;
  filterChipsContainer.innerHTML = '';

  const tagItems = POPULAR_TAGS.map((tag) => {
    const matchingList = getEmployeesMatchingTagAndQuery(tag, searchQuery);
    return { tag, count: matchingList.length };
  });

  // Sort so 'Все' is first, available tags (count > 0) are next, and disabled (count === 0) are moved to the end
  tagItems.sort((a, b) => {
    if (a.tag === 'Все') return -1;
    if (b.tag === 'Все') return 1;
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

    if (count === 0 && tag !== 'Все') {
      chip.classList.add('filter-chip--disabled');
      chip.disabled = true;
    }

    chip.innerHTML = `
      <span>${tag}</span>
      <span class="filter-chip__count">(${count})</span>
    `;

    chip.addEventListener('click', () => {
      if (chip.disabled) return;
      activeTag = tag;
      applyFilters();
    });

    filterChipsContainer.appendChild(chip);
  });
}

function applyFilters() {
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
    activeTag = 'Все';
    searchQuery = '';
    if (searchInput) searchInput.value = '';
    if (searchClearBtn) searchClearBtn.hidden = true;
    renderFilterChips();
    applyFilters();
  });
}

function renderCards(list = employees) {
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
  const employee = employees.find((e) => e.id === id);
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
      const idx = employees.findIndex((emp) => emp.id === currentEmployeeId);
      if (idx !== -1) {
        const step = e.key === 'ArrowLeft' ? -1 : 1;
        const nextIdx = (idx + step + employees.length) % employees.length;
        openPortfolio(employees[nextIdx].id);
      }
    }
  }
});

window.addEventListener('popstate', () => {
  const hash = location.hash.slice(1);
  if (hash) {
    const employee = employees.find((e) => e.id === hash);
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
    const employee = employees.find((e) => e.id === hash);
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
    const idx = employees.findIndex((e) => e.id === currentEmployeeId);
    if (idx !== -1) {
      const prevIdx = (idx - 1 + employees.length) % employees.length;
      openPortfolio(employees[prevIdx].id);
    }
  });
}

if (portfolioSideNext) {
  portfolioSideNext.addEventListener('click', () => {
    if (!currentEmployeeId) return;
    const idx = employees.findIndex((e) => e.id === currentEmployeeId);
    if (idx !== -1) {
      const nextIdx = (idx + 1) % employees.length;
      openPortfolio(employees[nextIdx].id);
    }
  });
}

renderFilterChips();
renderCards();
initFromHash();
