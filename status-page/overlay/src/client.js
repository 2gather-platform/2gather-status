import * as sapper from '@sapper/app';
import { applyLanguage, defaultLanguage } from './i18n';

const root = document.documentElement;

const start = () => {
  const target = document.querySelector('#sapper');
  // <html lang> est posé par template.html avant le chargement de ce script.
  if (root.lang !== defaultLanguage) {
    applyLanguage(root.lang);
    // Le HTML exporté est dans la langue par défaut. L'hydrater ne suffirait
    // pas : Svelte reprend les blocs {@html} (introduction, pied de page) tels
    // qu'il les trouve, sans les comparer. On rend donc la page à neuf.
    target.textContent = '';
  }
  const reveal = () => root.classList.remove('i18n-pending');
  Promise.resolve(sapper.start({ target })).then(reveal, reveal);
};

//
// <https://github.com/upptime/upptime/issues/758>
// if we do not use this then we need to move sapper at end of <body>
// <https://caniuse.com/domcontentloaded>
//
if (document.readyState !== 'loading') {
  start();
} else {
  document.addEventListener('DOMContentLoaded', start);
}
