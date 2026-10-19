<script>
  import { stores } from "@sapper/app";
  import config from "../data/config.json";
  import { currentLanguage, languageLabel, languageOptions, rememberLanguage } from "../i18n";

  const { page } = stores();
  const current = currentLanguage();
  const options = languageOptions();
  const base = ((config["status-website"] || {}).baseUrl || "").replace(/\/$/, "");

  // Le HTML exporté sous /service-worker-index.html sert aussi de page 404 à
  // GitHub Pages, renvoyée pour tout lien profond. Cette adresse-là n'a pas
  // d'équivalent à annoncer : les alternates de la page réelle sont posés au
  // démarrage, dans le navigateur.
  $: shell = $page.path === "/service-worker-index.html";
</script>

<svelte:head>
  {#if !shell}
    {#each options as option}
      <link rel="alternate" hreflang={option.code} href={`${config.path}${$page.path}?lang=${option.code}`} />
    {/each}
    <link rel="alternate" hreflang="x-default" href={`${config.path}${$page.path}`} />
  {/if}
</svelte:head>

<!--
  De vrais liens, `?lang=` sur la page courante : ils se copient et se
  partagent dans une langue donnée. `rel="external"` les soustrait au routeur
  de Sapper, qui sinon changerait d'adresse sans recharger, donc sans traduire.
-->
<li class="languages">
  <ul aria-label={languageLabel()}>
    {#each options as option}
      <li>
        <a
          href={`${base}${$page.path}?lang=${option.code}`}
          hreflang={option.code}
          lang={option.code}
          title={option.name}
          aria-label={option.name}
          aria-current={option.code === current ? "true" : undefined}
          rel="external"
          on:click={() => rememberLanguage(option.code)}>{option.code.toUpperCase()}</a>
      </li>
    {/each}
  </ul>
</li>

<style>
  /* Sur un écran étroit, la barre de navigation d'Upptime défile à
   * l'horizontale et ce qui la termine sort de l'écran. Le sélecteur reste
   * collé au bord droit, les liens passant dessous, estompés par le halo.
   * L'ombre pleine à droite couvre la marge intérieure de la barre, où les
   * liens resteraient sinon visibles. */
  .languages {
    position: sticky;
    right: 0;
    background: var(--nav-background-color);
    box-shadow:
      -1rem 0 1rem var(--nav-background-color),
      1em 0 0 var(--nav-background-color);
  }

  ul {
    display: flex;
    align-items: center;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* Filet vertical qui sépare les langues des liens de navigation, à la
   * hauteur du texte plutôt que de toute la barre. */
  ul::before {
    content: "";
    width: 1px;
    height: 1.25rem;
    margin: 0 0.75rem 0 0.5rem;
    background: var(--nav-border-bottom-color);
  }

  /* Même hauteur que les liens de la barre, pour que le soulignement de la
   * langue courante tombe sur le même trait que celui de la page courante. */
  a {
    display: block;
    padding: 1.5rem 0.5rem;
    font-size: 0.875em;
    letter-spacing: 0.06em;
    text-decoration: none;
    opacity: 0.7;
  }

  a:hover,
  a[aria-current] {
    opacity: 1;
  }

  a[aria-current] {
    font-weight: 600;
  }
</style>
