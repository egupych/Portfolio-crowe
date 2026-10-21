/**
 * Трёхъязычность интерфейса (EN / RU / UZ). Язык по умолчанию — английский.
 * UI internationalisation (EN / RU / UZ). English is the default language.
 */

export const LANGS = ['en', 'ru', 'uz'];
export const DEFAULT_LANG = 'en';

const LANG_KEY = 'crowe_lang';

/** Словари экспортируются ради теста на паритет ключей между языками */
export const STRINGS = {
  en: {
    'html.lang': 'en',
    'meta.title': 'Crowe Uzbekistan — Team Portfolio',
    'meta.description': 'Portfolio and CVs of the Crowe Uzbekistan team.',
    'meta.notFound': 'Page not found',
    'meta.personTitle': '{name} — {role} | Crowe Uzbekistan',
    'meta.personDescription': '{name}, {role} at Crowe Uzbekistan. CV, expertise and certificates.',

    'header.logoAria': 'Crowe Uzbekistan',
    'header.langAria': 'Switch language',
    'header.langTitle': 'Switch language',
    'header.langRu': 'RU',
    'header.langEn': 'EN',
    'header.langUz': 'UZ',
    'header.themeAria': 'Switch theme',
    'header.themeTitle': 'Change theme',
    'header.compare': 'Compare',
    'header.back': 'Back to the team',

    'theme.crowe-light': 'Crowe Light',
    'theme.warm': 'Warm',

    'home.heading': 'Crowe Uzbekistan — Team Portfolio',

    'search.placeholder': 'Search by name, role or CV content…',
    'search.aria': 'Search specialists',
    'search.clear': 'Clear search',

    'results.empty': 'Nothing matched your search',
    'results.reset': 'Reset filters',

    'filter.all': 'All',
    'filter.bookmarks': 'Bookmarks',
    'filter.role': 'Role',

    'portfolio.prev': 'Previous specialist',
    'portfolio.next': 'Next specialist',
    'portfolio.others': 'Other team members',
    'portfolio.download': 'Download CV as PDF',
    'portfolio.downloadFile': '{name} — CV.pdf',
    'portfolio.telegram': 'Message on Telegram',
    'portfolio.bookmarkAdd': 'Add to bookmarks',
    'portfolio.bookmarkAdded': 'Bookmarked',
    'portfolio.share': 'Share profile',
    'portfolio.copied': 'Link copied to clipboard',
    'portfolio.qr': 'QR code',
    'portfolio.qrTitle': '{name} — QR Code',
    'portfolio.qrHint': 'Scan with phone camera to view profile',
    'portfolio.qrClose': 'Close',
    'portfolio.qrCopyLink': 'Copy link',
    'portfolio.vcard': 'Save contact',
    'portfolio.vcardSaved': 'Contact card downloaded',

    'compare.title': 'Comparison',
    'compare.onlyDiff': 'Differences only',
    'compare.role': 'Role',
    'compare.office': 'Office',
    'compare.languages': 'Languages',
    'compare.tags': 'Expertise',
    'compare.certificates': 'Certificates',
    'compare.remove': 'Remove {name} from comparison',
    'compare.open': 'Open profile',
    'compare.hintOne': 'Bookmark at least one more specialist — there is nothing to compare with a single one.',
    'compare.hintSame': 'The compared specialists match in every row — there are no differences.',
    'compare.nothing': 'Nothing is bookmarked yet.',
    'meta.compareTitle': 'Comparison | Crowe Uzbekistan',

    'certs.title': 'Certificates',
    'certs.zoom': 'Zoom in',
    'certs.download': 'Download as PDF',
    'certs.fileName': '{name} — certificate {n}',
    'certs.alt': 'Certificate {n}',
    'certs.altGeneric': 'Certificate',

    'lightbox.title': 'Certificate viewer',
    'lightbox.close': 'Close',
    'lightbox.prev': 'Previous',
    'lightbox.next': 'Next',

    'scrollTop.aria': 'Back to top',
    'fullscreen.enter': 'Enter fullscreen',
    'fullscreen.exit': 'Exit fullscreen',
  },

  ru: {
    'html.lang': 'ru',
    'meta.title': 'Crowe Uzbekistan — Портфолио команды',
    'meta.description': 'Портфолио и резюме команды Crowe Uzbekistan.',
    'meta.notFound': 'Страница не найдена',
    'meta.personTitle': '{name} — {role} | Crowe Uzbekistan',
    'meta.personDescription': '{name}, {role} в Crowe Uzbekistan. Резюме, компетенции и сертификаты.',

    'header.logoAria': 'Crowe Uzbekistan',
    'header.langAria': 'Переключить язык',
    'header.langTitle': 'Переключить язык',
    'header.langRu': 'RU',
    'header.langEn': 'EN',
    'header.langUz': 'UZ',
    'header.themeAria': 'Переключить тему',
    'header.themeTitle': 'Сменить тему',
    'header.compare': 'Сравнить',
    'header.back': 'Назад к команде',

    'theme.crowe-light': 'Crowe Light',
    'theme.warm': 'Тёплая',

    'home.heading': 'Crowe Uzbekistan — портфолио команды',

    'search.placeholder': 'Поиск по имени, роли и резюме…',
    'search.aria': 'Поиск специалистов',
    'search.clear': 'Очистить поиск',

    'results.empty': 'Ничего не найдено по вашему запросу',
    'results.reset': 'Сбросить фильтры',

    'filter.all': 'Все',
    'filter.bookmarks': 'Закладки',
    'filter.role': 'Должность',

    'portfolio.prev': 'Предыдущий специалист',
    'portfolio.next': 'Следующий специалист',
    'portfolio.others': 'Другие члены команды',
    'portfolio.download': 'Скачать резюме в PDF',
    'portfolio.downloadFile': '{name} — резюме.pdf',
    'portfolio.telegram': 'Написать в Telegram',
    'portfolio.bookmarkAdd': 'Добавить в закладки',
    'portfolio.bookmarkAdded': 'В закладках',
    'portfolio.share': 'Поделиться',
    'portfolio.copied': 'Ссылка скопирована',
    'portfolio.qr': 'QR-код',
    'portfolio.qrTitle': '{name} — QR-код',
    'portfolio.qrHint': 'Наведите камеру смартфона, чтобы открыть профиль',
    'portfolio.qrClose': 'Закрыть',
    'portfolio.qrCopyLink': 'Скопировать ссылку',
    'portfolio.vcard': 'Визитка vCard',
    'portfolio.vcardSaved': 'Контактная визитка скачана',

    'compare.title': 'Сравнение',
    'compare.onlyDiff': 'Только различия',
    'compare.role': 'Должность',
    'compare.office': 'Офис',
    'compare.languages': 'Языки',
    'compare.tags': 'Компетенции',
    'compare.certificates': 'Сертификаты',
    'compare.remove': 'Убрать {name} из сравнения',
    'compare.open': 'Открыть профиль',
    'compare.hintOne': 'Отметьте ещё хотя бы одного специалиста — одного сравнивать не с кем.',
    'compare.hintSame': 'У выбранных специалистов все строки совпадают — различий нет.',
    'compare.nothing': 'В закладках пока никого нет.',
    'meta.compareTitle': 'Сравнение | Crowe Uzbekistan',

    'certs.title': 'Сертификаты',
    'certs.zoom': 'Увеличить',
    'certs.download': 'Скачать в PDF',
    'certs.fileName': '{name} — сертификат {n}',
    'certs.alt': 'Сертификат {n}',
    'certs.altGeneric': 'Сертификат',

    'lightbox.title': 'Просмотр сертификата',
    'lightbox.close': 'Закрыть',
    'lightbox.prev': 'Предыдущий',
    'lightbox.next': 'Следующий',

    'scrollTop.aria': 'Вернуться наверх',
    'fullscreen.enter': 'На весь экран',
    'fullscreen.exit': 'Свернуть',
  },

  uz: {
    'html.lang': 'uz',
    'meta.title': 'Crowe Uzbekistan — Jamoa portfoliosi',
    'meta.description': 'Crowe Uzbekistan jamoasining portfoliosi va rezyumelari.',
    'meta.notFound': 'Sahifa topilmadi',
    'meta.personTitle': '{name} — {role} | Crowe Uzbekistan',
    'meta.personDescription': '{name}, Crowe Uzbekistanda {role}. Rezyume, malaka va sertifikatlar.',

    'header.logoAria': 'Crowe Uzbekistan',
    'header.langAria': 'Tilni almashtirish',
    'header.langTitle': 'Tilni almashtirish',
    'header.langRu': 'RU',
    'header.langEn': 'EN',
    'header.langUz': 'UZ',
    'header.themeAria': 'Mavzuni almashtirish',
    'header.themeTitle': 'Mavzuni o‘zgartirish',
    'header.compare': 'Taqqoslash',
    'header.back': 'Jamoaga qaytish',

    'theme.crowe-light': 'Crowe Light',
    'theme.warm': 'Iliq',

    'home.heading': 'Crowe Uzbekistan — jamoa portfoliosi',

    'search.placeholder': 'Ism, lavozim yoki rezyume bo‘yicha qidiruv…',
    'search.aria': 'Mutaxassislarni qidirish',
    'search.clear': 'Qidiruvni tozalash',

    'results.empty': 'So‘rovingiz bo‘yicha hech narsa topilmadi',
    'results.reset': 'Filtrlarni bekor qilish',

    'filter.all': 'Barchasi',
    'filter.bookmarks': 'Tanlanganlar',
    'filter.role': 'Lavozim',

    'portfolio.prev': 'Oldingi mutaxassis',
    'portfolio.next': 'Keyingi mutaxassis',
    'portfolio.others': 'Boshqa jamoa a’zolari',
    'portfolio.download': 'Rezyumeni PDF formatida yuklab olish',
    'portfolio.downloadFile': '{name} — rezyume.pdf',
    'portfolio.telegram': 'Telegram orqali bog‘lanish',
    'portfolio.bookmarkAdd': 'Tanlanganlarga qo‘shish',
    'portfolio.bookmarkAdded': 'Tanlanganlarda',
    'portfolio.share': 'Ulashish',
    'portfolio.copied': 'Havola nusxalandi',
    'portfolio.qr': 'QR-kod',
    'portfolio.qrTitle': '{name} — QR-kod',
    'portfolio.qrHint': 'Profilni ochish uchun telefon kamerasini qarating',
    'portfolio.qrClose': 'Yopish',
    'portfolio.qrCopyLink': 'Havolani nusxalash',
    'portfolio.vcard': 'vCard vizitka',
    'portfolio.vcardSaved': 'Kontakt vizitkasi yuklab olindi',

    'compare.title': 'Taqqoslash',
    'compare.onlyDiff': 'Faqat farqlar',
    'compare.role': 'Lavozim',
    'compare.office': 'Ofis',
    'compare.languages': 'Tillar',
    'compare.tags': 'Kompetensiyalar',
    'compare.certificates': 'Sertifikatlar',
    'compare.remove': '{name}ni taqqoslashdan olib tashlash',
    'compare.open': 'Profilni ochish',
    'compare.hintOne': 'Yana kamida bitta mutaxassisni tanlang — bitta mutaxassisni taqqoslab bo‘lmaydi.',
    'compare.hintSame': 'Tanlangan mutaxassislarda barcha qatorlar bir xil — farqlar yo‘q.',
    'compare.nothing': 'Tanlanganlarda hozircha hech kim yo‘q.',
    'meta.compareTitle': 'Taqqoslash | Crowe Uzbekistan',

    'certs.title': 'Sertifikatlar',
    'certs.zoom': 'Kattalashtirish',
    'certs.download': 'PDF formatida yuklab olish',
    'certs.fileName': '{name} — sertifikat {n}',
    'certs.alt': '{n}-raqamli sertifikat',
    'certs.altGeneric': 'Sertifikat',

    'lightbox.title': 'Sertifikatni ko‘rish',
    'lightbox.close': 'Yopish',
    'lightbox.prev': 'Oldingi',
    'lightbox.next': 'Keyingi',

    'scrollTop.aria': 'Yuqoriga qaytish',
    'fullscreen.enter': 'To‘liq ekran',
    'fullscreen.exit': 'Ekranni kichraytirish',
  },
};

let currentLang = readStoredLang();

function readStoredLang() {
  try {
    if (typeof window !== 'undefined' && window.location?.search) {
      const urlLang = new URLSearchParams(window.location.search).get('lang');
      if (LANGS.includes(urlLang)) return urlLang;
    }
    const saved = localStorage.getItem(LANG_KEY);
    return LANGS.includes(saved) ? saved : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (!LANGS.includes(lang)) lang = DEFAULT_LANG;
  currentLang = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* приватный режим — просто не сохраняем */
  }
  return currentLang;
}

/** Строка интерфейса на текущем языке; {placeholder} подставляются из vars */
export function t(key, vars) {
  const dict = STRINGS[currentLang] || STRINGS[DEFAULT_LANG];
  let value = dict[key] ?? STRINGS[DEFAULT_LANG][key] ?? key;
  if (vars) {
    value = value.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m));
  }
  return value;
}
