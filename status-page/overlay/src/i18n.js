// Traduction de la page dans la langue choisie par template.html.
//
// Tous les composants importent le même objet config.json et le relisent à
// chaque rendu. Le traduire en place avant sapper.start() traduit donc la page
// entière, sans retoucher les composants un par un. Seuls les noms de service
// et les titres d'incident y échappent, parce qu'ils arrivent à l'exécution de
// history/summary.json et des issues GitHub : localizeSites() et
// localizeIncidentTitle() les traduisent à la lecture.
//
// Côté serveur, à l'export, rien n'est appliqué : le HTML exporté reste dans
// la langue par défaut.

import config from "./data/config.json";

// Chaque langue est nommée dans sa propre langue : qui ne lit pas la langue
// affichée doit pouvoir reconnaître la sienne.
const NAMES = { fr: "Français", en: "English", de: "Deutsch" };
const LABELS = { fr: "Langue", en: "Language", de: "Sprache" };

const { languages, translations } = config;

export const defaultLanguage = languages.default;

let current = defaultLanguage;

export const currentLanguage = () => current;

export const languageOptions = () =>
  languages.supported.map((code) => ({ code, name: NAMES[code] || code.toUpperCase() }));

export const languageLabel = () => LABELS[current] || LABELS[defaultLanguage];

export const applyLanguage = (code) => {
  const translation = translations[code];
  if (!translation) return;
  current = code;
  const website = config["status-website"];
  Object.assign(config.i18n, translation.i18n);
  website.name = translation.name;
  website.introTitle = translation.introTitle;
  website.introMessage = translation.introMessage;
  for (const item of website.navbar || []) item.title = translation.navbar[item.href];
};

export const siteName = (slug) =>
  ((translations[current] || {}).sites || {})[slug] ||
  (config.sites.find((site) => site.slug === slug) || {}).name;

export const localizeSites = (sites) =>
  sites.map((site) => ({ ...site, name: siteName(site.slug) || site.name }));

// Upptime titre ses issues d'incident en anglais, en dur, avec le nom du
// service au moment de la panne : « ⚠️ Administration, événements has degraded
// performance ». Chaque issue porte en label le slug du service, ce qui permet
// de réécrire le titre dans la langue de la page, avec le nom actuel du service.
// Seul l'affichage change : les composants déduisent la couleur de l'incident
// du titre d'origine.
const INCIDENT_TITLE = /^(🛑|⚠️)\s*.+ (is down|has degraded performance)$/u;

export const localizeIncidentTitle = (incident) => {
  const match = INCIDENT_TITLE.exec(incident.title || "");
  const slug = (incident.labels || [])
    .map((label) => label.name || label)
    .find((name) => config.sites.some((site) => site.slug === name));
  if (!match || !slug) return incident.title;
  const template = config.i18n[match[2] === "is down" ? "incidentTitleDown" : "incidentTitleDegraded"];
  return `${match[1]} ${template.replace("$NAME", siteName(slug))}`;
};

// Un choix fait au sélecteur prime ensuite sur la langue du navigateur. Pas de
// mémorisation si le stockage est refusé : la page reste utilisable, le choix
// ne tient alors que sur les pages ouvertes avec `?lang=` dans l'adresse.
export const rememberLanguage = (code) => {
  try {
    localStorage.setItem(languages.storageKey, code);
  } catch (error) {}
};
