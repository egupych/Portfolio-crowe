/**
 * Двуязычность интерфейса (EN / RU). Язык по умолчанию — английский.
 * UI internationalisation (EN / RU). English is the default language.
 */

export const LANGS = ['en', 'ru'];
export const DEFAULT_LANG = 'en';

const LANG_KEY = 'crowe_lang';

const STRINGS = {
  en: {
    'html.lang': 'en',
    'meta.title': 'Crowe Uzbekistan — Team Portfolio',
    'meta.description': 'Portfolio and CVs of the Crowe Uzbekistan team.',

    'header.logoAria': 'Crowe Uzbekistan',
    'header.langAria': 'Switch language',
    'header.langTitle': 'Switch language',
    'header.langRu': 'RU',
    'header.langEn': 'EN',
    'header.themeAria': 'Switch theme',
    'header.themeTitle': 'Change theme',
    'header.compare': 'Compare',
    'header.back': 'Back to the team',

    'theme.crowe-light': 'Crowe Light',
    'theme.warm': 'Warm',

    'search.placeholder': 'Search by name, role or expertise…',
    'search.aria': 'Search specialists',
    'search.clear': 'Clear search',

    'results.empty': 'Nothing matched your search',
    'results.reset': 'Reset filters',

    'filter.all': 'All',
    'filter.bookmarks': 'Bookmarks',

    'portfolio.prev': 'Previous specialist',
    'portfolio.next': 'Next specialist',
    'portfolio.others': 'Other team members',
    'portfolio.download': 'Download CV as PDF',
    'portfolio.downloadFile': '{name} — CV.pdf',
    'portfolio.telegram': 'Message on Telegram',
    'portfolio.bookmarkAdd': 'Add to bookmarks',
    'portfolio.bookmarkAdded': 'Bookmarked',

    'certs.title': 'Certificates',
    'certs.zoom': 'Zoom in',
    'certs.alt': 'Certificate {n}',
    'certs.altGeneric': 'Certificate',

    'lightbox.close': 'Close',
    'lightbox.prev': 'Previous',
    'lightbox.next': 'Next',

    'scrollTop.aria': 'Back to top',
  },

  ru: {
    'html.lang': 'ru',
    'meta.title': 'Crowe Uzbekistan — Портфолио команды',
    'meta.description': 'Портфолио и резюме команды Crowe Uzbekistan.',

    'header.logoAria': 'Crowe Uzbekistan',
    'header.langAria': 'Переключить язык',
    'header.langTitle': 'Переключить язык',
    'header.langRu': 'RU',
    'header.langEn': 'EN',
    'header.themeAria': 'Переключить тему',
    'header.themeTitle': 'Сменить тему',
    'header.compare': 'Сравнить',
    'header.back': 'Назад к команде',

    'theme.crowe-light': 'Crowe Light',
    'theme.warm': 'Тёплая',

    'search.placeholder': 'Поиск по имени, роли или компетенциям…',
    'search.aria': 'Поиск специалистов',
    'search.clear': 'Очистить поиск',

    'results.empty': 'Ничего не найдено по вашему запросу',
    'results.reset': 'Сбросить фильтры',

    'filter.all': 'Все',
    'filter.bookmarks': 'Закладки',

    'portfolio.prev': 'Предыдущий специалист',
    'portfolio.next': 'Следующий специалист',
    'portfolio.others': 'Другие члены команды',
    'portfolio.download': 'Скачать резюме в PDF',
    'portfolio.downloadFile': '{name} — резюме.pdf',
    'portfolio.telegram': 'Написать в Telegram',
    'portfolio.bookmarkAdd': 'Добавить в закладки',
    'portfolio.bookmarkAdded': 'В закладках',

    'certs.title': 'Сертификаты',
    'certs.zoom': 'Увеличить',
    'certs.alt': 'Сертификат {n}',
    'certs.altGeneric': 'Сертификат',

    'lightbox.close': 'Закрыть',
    'lightbox.prev': 'Предыдущий',
    'lightbox.next': 'Следующий',

    'scrollTop.aria': 'Вернуться наверх',
  },
};

let currentLang = readStoredLang();

function readStoredLang() {
  try {
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
