/* Parte prima di tutto il resto (nel <head>): attiva le animazioni di comparsa e decide se mostrare l'intro.
   Sta in un file a parte (non scritto dentro la pagina) così il sito può vietare al browser gli script in linea. */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  // le pagine dei lavori caricano questo file senza data-home: lì serve solo la riga qui sopra
  if (!document.currentScript || !document.currentScript.hasAttribute('data-home')) return;
  // Intro con il logo: a ogni arrivo e a ogni ricarica, ma non tornando da un'altra pagina del sito (es. privacy, lavori)
  var fromSite = false;
  try {
    var ref = document.referrer ? new URL(document.referrer) : null;
    var home = function (p) { return p.replace(/index\.html$/, ''); };
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    var reload = nav ? nav.type === 'reload' : false;
    fromSite = !reload && !!ref && ref.origin === location.origin && home(ref.pathname) !== home(location.pathname);
    // tornando indietro (es. da una pagina dei lavori): niente intro, la pagina riparte dove eri
    if (nav && nav.type === 'back_forward') fromSite = true;
  } catch (e) {}
  if (!fromSite && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    d.classList.add('has-intro');
    // Con l'intro si riparte sempre dall'alto: se il browser riaprisse la pagina a metà,
    // le comparse di quella sezione partirebbero nascoste dietro lo schermo nero.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  }
})();
