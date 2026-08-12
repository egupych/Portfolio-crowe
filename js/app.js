import { employees, getCertificates, getFlag } from './data.js';

const homeView = document.getElementById('homeView');
const portfolioView = document.getElementById('portfolioView');
const cardsGrid = document.getElementById('cardsGrid');
const portfolioContent = document.getElementById('portfolioContent');
const otherEmployeesGrid = document.getElementById('otherEmployeesGrid');
const backBtn = document.getElementById('backBtn');
const logoBtn = document.getElementById('logoBtn');

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

// Editing state
const EDIT_KEY = 'portfolio_edits_v1';
let savedEdits = { timestamp: 0, items: {} };
let originalContents = {}; // key -> original HTML
let autosaveTimer = null;
const AUTOSAVE_MS = 5 * 60 * 1000; // 5 minutes
let editMode = false;

function renderSection(section, delayIndex, employeeId) {
  const el = document.createElement('div');
  el.className = 'portfolio__section';
  el.style.animationDelay = `${0.35 + delayIndex * 0.08}s`;

  const title = document.createElement('h3');
  title.className = 'portfolio__section-title';
  title.textContent = section.title;
  title.dataset.editKey = `${employeeId}::section::${section.title}::title`;
  el.appendChild(title);

  if (section.type === 'paragraphs') {
    section.items.forEach((text, idx) => {
      const p = document.createElement('p');
      p.className = 'text';
      p.textContent = text;
      p.dataset.editKey = `${employeeId}::section::${section.title}::p${idx}`;
      el.appendChild(p);
    });
  } else if (section.type === 'list') {
    const ul = document.createElement('ul');
    ul.className = 'portfolio__list text';
    section.items.forEach((item, idx) => {
      const li = document.createElement('li');
      li.textContent = item;
      li.dataset.editKey = `${employeeId}::section::${section.title}::li${idx}`;
      ul.appendChild(li);
    });
    el.appendChild(ul);
  } else if (section.type === 'experience') {
    section.items.forEach((exp, idx) => {
      const item = document.createElement('div');
      item.className = 'portfolio__experience-item';
      item.innerHTML = `
        <div class="portfolio__experience-role" data-edit-key="${employeeId}::experience::${idx}::role">${exp.role}</div>
        <div class="portfolio__experience-meta" data-edit-key="${employeeId}::experience::${idx}::meta">${exp.period} / ${exp.company}</div>
      `;
      el.appendChild(item);
    });
  }

  return el;
}

function renderCertificates(name) {
  const certs = getCertificates(name);
  if (!certs.length) return null;

  const block = document.createElement('div');
  block.className = 'certificates';

  const title = document.createElement('h3');
  title.className = 'certificates__title';
  title.textContent = 'Сертификаты';
  block.appendChild(title);

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

  const header = document.createElement('header');
  header.className = 'portfolio__header';
  header.innerHTML = `
    <img class="portfolio__photo" src="${employee.photo}" alt="${employee.name}">
    <div class="portfolio__info">
      <h2 class="portfolio__name" data-edit-key="${employee.id}::name">${employee.name}</h2>
      <p class="portfolio__role role" data-edit-key="${employee.id}::role">${employee.role}</p>
      <div class="portfolio__languages">
        <div class="portfolio__flags">
          ${employee.languages.map((code) => `<img class="portfolio__flag" src="${getFlag(code)}" alt="">`).join('')}
        </div>
      </div>
    </div>
  `;
  portfolioContent.appendChild(header);

  const tags = document.createElement('div');
  tags.className = 'portfolio__tags';
  employee.tags.forEach((t, idx) => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = t;
    span.dataset.editKey = `${employee.id}::tag${idx}`;
    tags.appendChild(span);
  });
  portfolioContent.appendChild(tags);

  const body = document.createElement('div');
  body.className = 'portfolio__body';

  const leftCol = document.createElement('div');
  employee.left.forEach((s, i) => leftCol.appendChild(renderSection(s, i, employee.id)));
  body.appendChild(leftCol);

  const rightCol = document.createElement('div');
  employee.right.forEach((s, i) => rightCol.appendChild(renderSection(s, i + employee.left.length, employee.id)));
  body.appendChild(rightCol);

  portfolioContent.appendChild(body);

  const certsBlock = renderCertificates(employee.name);
  if (certsBlock) portfolioContent.appendChild(certsBlock);

  renderOtherEmployees(employee.id);

  // After rendering, apply editability/restore saved
  applyEditable();
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
      <h2 class="employee-card__name" data-edit-key="${emp.id}::card::name">${emp.name}</h2>
      <p class="employee-card__role" data-edit-key="${emp.id}::card::role">${emp.role}</p>
    `;
    card.addEventListener('click', () => openPortfolio(emp.id));
    otherEmployeesGrid.appendChild(card);
  });

  // Ensure cards are editable/restored too
  applyEditable();
}

function renderCards() {
  cardsGrid.innerHTML = '';
  employees.forEach((emp, i) => {
    const card = document.createElement('article');
    card.className = 'employee-card';
    if (viewedEmployees.has(emp.id)) {
      card.classList.add('employee-card--viewed');
    }
    card.style.animationDelay = `${0.08 * i}s`;
    card.innerHTML = `
      <div class="employee-card__photo-wrap">
        <img class="employee-card__photo" src="${emp.photo}" alt="${emp.name}" loading="lazy">
      </div>
      <h2 class="employee-card__name" data-edit-key="${emp.id}::card::name">${emp.name}</h2>
      <p class="employee-card__role" data-edit-key="${emp.id}::card::role">${emp.role}</p>
    `;
    card.addEventListener('click', () => openPortfolio(emp.id));
    cardsGrid.appendChild(card);
  });

  applyEditable();
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

function openPortfolio(id) {
  const employee = employees.find((e) => e.id === id);
  if (!employee) return;
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

document.addEventListener('keydown', (e) => {
  if (lightbox.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') navigateLightbox(-1);
  if (e.key === 'ArrowRight') navigateLightbox(1);
});

window.addEventListener('popstate', () => {
  const hash = location.hash.slice(1);
  if (hash) {
    const employee = employees.find((e) => e.id === hash);
    if (employee) {
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

// ----------------- Editing helpers -----------------

function loadSavedEdits() {
  try {
    const raw = localStorage.getItem(EDIT_KEY);
    if (raw) savedEdits = JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse saved edits', e);
  }
}

function saveNow() {
  const items = {};
  document.querySelectorAll('[data-edit-key]').forEach((el) => {
    const key = el.dataset.editKey;
    if (!key) return;
    const val = el.innerHTML;
    // only save when changed from original
    if (originalContents[key] && originalContents[key] !== val) {
      items[key] = val;
      el.classList.add('edited');
    } else if (savedEdits.items[key]) {
      // remove stale saved value
      // do nothing here; cleanup below
    }
  });

  // merge with existing to preserve any items outside current render
  savedEdits.items = Object.assign({}, savedEdits.items || {}, items);
  // cleanup: remove keys that are equal to originalContents
  Object.keys(savedEdits.items).forEach((k) => {
    if (originalContents[k] && originalContents[k] === savedEdits.items[k]) {
      delete savedEdits.items[k];
    }
  });

  savedEdits.timestamp = Date.now();
  localStorage.setItem(EDIT_KEY, JSON.stringify(savedEdits));
  const s = document.getElementById('autosaveStatus');
  if (s) {
    s.textContent = `Сохранено ${new Date(savedEdits.timestamp).toLocaleTimeString()}`;
  }
}

function startAutosave() {
  if (autosaveTimer) clearInterval(autosaveTimer);
  autosaveTimer = setInterval(saveNow, AUTOSAVE_MS);
}

function applyEditable() {
  // capture original contents for currently rendered editable elements
  document.querySelectorAll('[data-edit-key]').forEach((el) => {
    const key = el.dataset.editKey;
    if (!key) return;
    // store original if not already stored
    if (!(key in originalContents)) originalContents[key] = el.innerHTML;
    // restore saved if exists
    if (savedEdits.items && savedEdits.items[key]) {
      el.innerHTML = savedEdits.items[key];
      el.classList.add('edited');
    }
    // make editable attributes
    el.setAttribute('tabindex', '0');
    el.addEventListener('input', () => {
      const now = el.innerHTML;
      if (originalContents[key] !== now) el.classList.add('edited');
      else el.classList.remove('edited');
    });
    // allow keyboard paste/enter in editable elements
    el.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveNow();
      }
    });
    // toggle contentEditable based on editMode
    el.contentEditable = editMode ? 'true' : 'false';
    el.classList.toggle('editable', editMode);
  });
}

function toggleEditMode() {
  editMode = !editMode;
  document.querySelectorAll('[data-edit-key]').forEach((el) => {
    el.contentEditable = editMode ? 'true' : 'false';
    el.classList.toggle('editable', editMode);
  });
  const btn = document.getElementById('editToggle');
  if (btn) btn.textContent = editMode ? 'Выйти из ред.' : 'Редактировать';
}

function exportToHtml() {
  // Export entire portfolio view HTML including highlighting for .edited
  const docHtml = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Export — Portfolio</title>
<link rel="stylesheet" href="css/styles.css">
<style>
/* Highlight edited fields */
.edited { background: #fff59d !important; }
</style>
</head>
<body>
<div id="export-root">
${document.getElementById('app').outerHTML}
</div>
</body>
</html>`;

  const blob = new Blob([docHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portfolio-export-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Create simple controls in header
function createEditorControls() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const controls = document.createElement('div');
  controls.id = 'editorControls';
  controls.style.display = 'flex';
  controls.style.gap = '0.5rem';
  controls.style.alignItems = 'center';

  controls.innerHTML = `
    <button id="editToggle" type="button">Редактировать</button>
    <button id="saveNow" type="button">Сохранить сейчас</button>
    <button id="exportHtml" type="button">Экспорт HTML</button>
    <span id="autosaveStatus" style="font-size:0.9rem; opacity:0.7; margin-left:0.5rem"></span>
  `;
  header.appendChild(controls);
  document.getElementById('editToggle').addEventListener('click', () => toggleEditMode());
  document.getElementById('saveNow').addEventListener('click', () => saveNow());
  document.getElementById('exportHtml').addEventListener('click', () => exportToHtml());
}

// Init
loadSavedEdits();
createEditorControls();
startAutosave();

window.addEventListener('beforeunload', () => {
  saveNow();
});

function initFromHash() {
  const hash = location.hash.slice(1);
  if (hash) {
    const employee = employees.find((e) => e.id === hash);
    if (employee) {
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

renderCards();
initFromHash();
applyEditable();
