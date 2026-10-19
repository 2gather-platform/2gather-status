// Construit la page de statut en trois langues, français, anglais et allemand.
//
// Reprend la séquence du `Static Site CI` d'Upptime, qui installe le paquet
// @upptime/status-page puis l'exporte, en y intercalant ce que ce paquet ne
// sait pas faire : servir plusieurs langues. Upptime n'en connaît qu'une, celle
// du bloc `i18n` de .upptimerc.yml, figée dans le code au moment de l'export.
//
// La page reste un seul site, à une seule adresse. La langue est choisie au
// chargement, dans le navigateur, et la configuration traduite en place avant
// le démarrage de l'application : voir overlay/src/i18n.js.
//
// Le français reste la langue de .upptimerc.yml, que le README généré relit
// aussi. Les autres vivent dans locales/, une clé manquante ou en trop y fait
// échouer la construction plutôt que d'afficher un libellé français au milieu
// d'une page allemande.
//
// Usage, depuis la racine du dépôt : node status-page/build.mjs
// Le site est écrit dans site/__sapper__/export.

import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Version épinglée : les retouches plus bas visent des passages exacts de ses
// sources. La monter, c'est relancer la construction et laisser ces retouches
// signaler ce qui a bougé.
const STATUS_PAGE_VERSION = "1.17.0";

// Ordre du sélecteur. La première est la langue de .upptimerc.yml.
const LANGUAGES = ["fr", "en", "de"];

// Langue servie à un navigateur qui n'en demande aucune des trois.
const FALLBACK_LANGUAGE = "en";

const STORAGE_KEY = "2gather-status-language";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const site = join(root, "site");

const run = (command, args, options = {}) =>
  execFileSync(command, args, { cwd: site, stdio: "inherit", ...options });

const fail = (message) => {
  throw new Error(message);
};

// Remplace un passage exact des sources amont, et échoue s'il a disparu : une
// retouche qui ne s'applique plus doit arrêter la construction, pas publier une
// page à moitié traduite.
const edit = async (file, from, to) => {
  const path = join(site, file);
  const source = await readFile(path, "utf8");
  if (!source.includes(from))
    fail(`${file} : passage introuvable dans @upptime/status-page ${STATUS_PAGE_VERSION}\n${from}`);
  await writeFile(path, source.replace(from, to));
};

// Une traduction doit porter exactement les clés attendues, ni plus ni moins.
const sameKeys = (label, actual, expected) => {
  const missing = expected.filter((key) => !(key in actual));
  const unknown = Object.keys(actual).filter((key) => !expected.includes(key));
  if (missing.length) fail(`${label} : clés manquantes, ${missing.join(", ")}`);
  if (unknown.length) fail(`${label} : clés inconnues, ${unknown.join(", ")}`);
};

await rm(site, { recursive: true, force: true });
await mkdir(site);

const packs = await mkdtemp(join(tmpdir(), "status-page-"));
const tarball = execFileSync(
  "npm",
  ["pack", `@upptime/status-page@${STATUS_PAGE_VERSION}`, "--pack-destination", packs, "--silent"],
  { encoding: "utf8" }
).trim();
run("tar", ["-xzf", join(packs, tarball), "--strip-components=1", "-C", site]);
await rm(packs, { recursive: true, force: true });

await cp(join(here, "overlay"), site, { recursive: true });

// Le sélecteur de langue prend place au bout de la barre de navigation.
await edit(
  "src/components/Nav.svelte",
  `import config from "../data/config.json";`,
  `import config from "../data/config.json";
  import LanguageSwitcher from "./LanguageSwitcher.svelte";`
);
await edit(
  "src/components/Nav.svelte",
  `      {/if}
    </ul>`,
  `      {/if}
      <LanguageSwitcher />
    </ul>`
);
// Sur un écran étroit, la barre déborde et défile, le sélecteur restant collé à
// droite. Le nom du site lui laisse la place : il est repris en titre de page,
// et le logo reste le lien d'accueil.
await edit(
  "src/components/Nav.svelte",
  `</style>`,
  `  @media (max-width: 600px) {
    .logo div {
      display: none;
    }
    .logo {
      margin-right: 1rem;
    }
    a {
      padding: 1.5rem 0.75rem;
    }
  }
</style>`
);
// Le lien d'accueil vaut `./` et non `/`, voir .upptimerc.yml. Nav.svelte ne
// reconnaît que `/` comme accueil et ne soulignait plus la page courante.
await edit(
  "src/components/Nav.svelte",
  `segment === (item.href === "/" ? undefined : item.href)`,
  `segment === (["/", "./"].includes(item.href) ? undefined : item.href)`
);

// Les noms de service et les titres d'incident ne viennent pas de la
// configuration mais de history/summary.json et des issues GitHub, lus à
// l'exécution : ils se traduisent à la lecture, voir overlay/src/i18n.js.
for (const [file, helper, from, to] of [
  [
    "src/components/LiveStatus.svelte",
    "localizeSites",
    `sites = await res.json();`,
    `sites = localizeSites(await res.json());`,
  ],
  [
    "src/components/Summary.svelte",
    "localizeSites",
    `summary = (await res.json()).find(`,
    `summary = localizeSites(await res.json()).find(`,
  ],
  ...["ActiveIncidents", "Incidents", "History"].map((name) => [
    `src/components/${name}.svelte`,
    "localizeIncidentTitle",
    `{incident.title.replace(`,
    `{localizeIncidentTitle(incident).replace(`,
  ]),
  [
    "src/components/Incident.svelte",
    "localizeIncidentTitle",
    `{incident.title}`,
    `{localizeIncidentTitle(incident)}`,
  ],
]) {
  await edit(
    file,
    `import config from "../data/config.json";`,
    `import config from "../data/config.json";
  import { ${helper} } from "../i18n";`
  );
  await edit(file, from, to);
}

// La page d'historique d'un service ne pose pas de titre, et l'onglet n'affichait
// que l'adresse.
await edit(
  "src/routes/history/[number].svelte",
  `  export let slug;
</script>`,
  `  import config from "../../data/config.json";
  import { siteName } from "../../i18n";
  export let slug;
</script>

<svelte:head>
  <title>{siteName(slug) || slug} · {config["status-website"].name}</title>
</svelte:head>`
);

run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], {
  env: { ...process.env, CYPRESS_INSTALL_BINARY: "0" },
});

const { load } = createRequire(join(site, "package.json"))("js-yaml");
const readYaml = async (path) => load(await readFile(path, "utf8"));

const upptime = await readYaml(join(root, ".upptimerc.yml"));
const defaultLanguage = upptime.i18n.locale.split("-")[0];
if (defaultLanguage !== LANGUAGES[0])
  fail(`La langue de .upptimerc.yml est ${defaultLanguage}, LANGUAGES commence par ${LANGUAGES[0]}`);

// Clés propres à cette surcouche, en plus de celles d'Upptime. Le français les
// porte aussi, dans le bloc `i18n` de .upptimerc.yml.
const OVERLAY_KEYS = ["incidentTitleDown", "incidentTitleDegraded"];
const missing = OVERLAY_KEYS.filter((key) => !(key in upptime.i18n));
if (missing.length) fail(`.upptimerc.yml, i18n : clés manquantes, ${missing.join(", ")}`);

const pageKeys = [...Object.keys(await readYaml(join(site, "i18n.yml"))), ...OVERLAY_KEYS];
const navbarHrefs = upptime["status-website"].navbar.map((item) => item.href);
const slugs = upptime.sites.map((item) => item.slug);

const translations = {};
for (const code of LANGUAGES.slice(1)) {
  const file = `locales/${code}.yml`;
  const translation = await readYaml(join(here, file));
  sameKeys(file, translation, ["name", "introTitle", "introMessage", "navbar", "sites", "i18n"]);
  sameKeys(`${file}, navbar`, translation.navbar, navbarHrefs);
  sameKeys(`${file}, sites`, translation.sites, slugs);
  sameKeys(`${file}, i18n`, translation.i18n, pageKeys);
  translations[code] = translation;
}

run("npm", ["run", "pre-process", "--silent"]);

const configPath = join(site, "src/data/config.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const languages = {
  default: defaultLanguage,
  supported: LANGUAGES,
  fallback: FALLBACK_LANGUAGE,
  storageKey: STORAGE_KEY,
};
await writeFile(configPath, JSON.stringify({ ...config, languages, translations }));

const templatePath = join(site, "src/template.html");
const template = await readFile(templatePath, "utf8");
await writeFile(
  templatePath,
  template
    .replace("%status.lang%", defaultLanguage)
    .replace("%status.languages%", JSON.stringify(languages))
);

run("npm", ["run", "post-process", "--silent"]);

// L'export crawle son propre serveur sur localhost:3000, ou sur $PORT. Si un
// autre service tient déjà ce port, c'est lui qui répond, l'export ne récolte
// que des 404 et se termine quand même sans erreur : publier ce résultat
// remplacerait la page par un site vide.
const exported = join(site, "__sapper__/export");
await readFile(join(exported, "index.html")).catch(() =>
  fail("L'export n'a pas produit index.html. Port 3000 occupé ? Relancer avec PORT=<port libre>.")
);

await cp(join(root, "assets"), exported, { recursive: true });
