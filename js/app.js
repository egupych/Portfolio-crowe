import { employees, getCertificates, getFlag } from './data.js';

const homeView = document.getElementById('homeView');
const portfolioView = document.getElementById('portfolioView');
const cardsGrid = document.getElementById('cardsGrid');
const portfolioContent = document.getElementById('portfolioContent');
const otherEmployeesGrid = document.getElementById('otherEmployeesGrid');
const backBtn = document.getElementById('backBtn');
const headerBackBtn = document.getElementById('headerBackBtn');
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

  const certs = getCertificates(employee.name);
  const hasCerts = certs.length > 0;

  // ----- Tabs (only shown when there are certificates to switch to) -----
  if (hasCerts) {
    const tabs = document.createElement('div');
    tabs.className = 'portfolio__tabs';
    tabs.innerHTML = `
      <button class="portfolio__tab portfolio__tab--active" data-tab="resume" type="button">Резюме</button>
      <button class="portfolio__tab" data-tab="certificates" type="button">Сертификаты</button>
    `;
    portfolioContent.appendChild(tabs);
  }

  // ----- Resume pane -----
  const resumePane = document.createElement('div');
  resumePane.className = 'portfolio__pane portfolio__pane--active';
  resumePane.id = 'resumePane';

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
  resumePane.appendChild(header);

  const tags = document.createElement('div');
  tags.className = 'portfolio__tags';
  employee.tags.forEach((t) => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = t;
    tags.appendChild(span);
  });
  resumePane.appendChild(tags);

  const body = document.createElement('div');
  body.className = 'portfolio__body';

  const leftCol = document.createElement('div');
  employee.left.forEach((s, i) => leftCol.appendChild(renderSection(s, i)));
  body.appendChild(leftCol);

  const rightCol = document.createElement('div');
  employee.right.forEach((s, i) => rightCol.appendChild(renderSection(s, i + employee.left.length)));
  body.appendChild(rightCol);

  resumePane.appendChild(body);

  const downloadWrap = document.createElement('div');
  downloadWrap.className = 'portfolio__download-wrap';
  downloadWrap.innerHTML = `
    <button class="portfolio__download-btn" id="downloadPdfBtn" type="button">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2.5V12.5M10 12.5L6.25 8.75M10 12.5L13.75 8.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3.75 15.5H16.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span id="downloadPdfBtnLabel">Скачать резюме в PDF</span>
    </button>
  `;
  resumePane.appendChild(downloadWrap);

  portfolioContent.appendChild(resumePane);

  // ----- Certificates pane -----
  if (hasCerts) {
    const certPane = document.createElement('div');
    certPane.className = 'portfolio__pane';
    certPane.id = 'certPane';
    const certsBlock = renderCertificates(employee.name);
    if (certsBlock) certPane.appendChild(certsBlock);
    portfolioContent.appendChild(certPane);
  }

  // ----- Events -----
  document.getElementById('downloadPdfBtn').addEventListener('click', () => downloadResumePdf(employee));

  portfolioContent.querySelectorAll('.portfolio__tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  renderOtherEmployees(employee.id);
}

function switchTab(tab) {
  portfolioContent.querySelectorAll('.portfolio__tab').forEach((t) => {
    t.classList.toggle('portfolio__tab--active', t.dataset.tab === tab);
  });
  document.getElementById('resumePane')?.classList.toggle('portfolio__pane--active', tab === 'resume');
  document.getElementById('certPane')?.classList.toggle('portfolio__pane--active', tab === 'certificates');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ----- PDF export -----
function loadHtml2Pdf() {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) {
      resolve(window.html2pdf);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => resolve(window.html2pdf);
    script.onerror = () => reject(new Error('Не удалось загрузить библиотеку PDF'));
    document.head.appendChild(script);
  });
}

async function downloadResumePdf(employee) {
  const btn = document.getElementById('downloadPdfBtn');
  const label = document.getElementById('downloadPdfBtnLabel');
  const resumeEl = document.getElementById('resumePane');
  if (!btn || !resumeEl) return;

  const originalLabel = label.textContent;
  btn.disabled = true;
  label.textContent = 'Формируем PDF…';

  const clone = resumeEl.cloneNode(true);
  clone.querySelector('.portfolio__download-wrap')?.remove();
  clone.classList.add('pdf-export-clone');
  clone.style.position = 'fixed';
  clone.style.top = '0';
  clone.style.left = '-9999px';
  clone.style.width = `${resumeEl.offsetWidth}px`;
  clone.style.background = '#FFF1E5';
  clone.style.padding = '24px';
  // Cloned nodes replay CSS animations from their "from" state (opacity: 0),
  // which would capture as blank/faded content — freeze everything in its final state.
  clone.querySelectorAll('*').forEach((node) => {
    node.style.animation = 'none';
    node.style.opacity = '1';
    node.style.transform = 'none';
  });
  document.body.appendChild(clone);

  try {
    const html2pdf = await loadHtml2Pdf();
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${employee.name} — резюме.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#FFF1E5' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };
    await html2pdf().set(opt).from(clone).save();
  } catch (err) {
    console.error(err);
    alert('Не удалось сформировать PDF. Попробуйте ещё раз.');
  } finally {
    document.body.removeChild(clone);
    btn.disabled = false;
    label.textContent = originalLabel;
  }
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

renderCards();
initFromHash();
