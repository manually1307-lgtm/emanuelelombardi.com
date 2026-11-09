/* =========================================================
   Emanuele Lombardi — script del sito
   ========================================================= */

/* ---------- IMPOSTAZIONI ----------
   AVAILABLE_FROM: lascia null per mostrare sempre il mese corrente.
   Quando sei pieno di lavoro scrivi il primo mese libero, es. '2027-01'. */
const AVAILABLE_FROM = null;

const MONTHS = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];
const MONTHS_FULL = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/* ---------- Badge "Disponibile" ---------- */
(function badge() {
  const el = document.querySelector('[data-badge-date]');
  const link = document.querySelector('[data-badge]');
  if (!el) return;

  let date = new Date();
  if (AVAILABLE_FROM) {
    const [y, m] = AVAILABLE_FROM.split('-').map(Number);
    const from = new Date(y, m - 1, 1);
    if (from > date) date = from;
  }
  // "— NOV 2026"; su telefono l'anno si nasconde (css: .badge-year) così il badge non si allarga
  el.innerHTML = ` — ${MONTHS[date.getMonth()]}<span class="badge-year"> ${date.getFullYear()}</span>`;
  if (link) link.setAttribute('aria-label', `Disponibile da ${MONTHS_FULL[date.getMonth()]} ${date.getFullYear()}, vai ai contatti`);

  // Su telefono/tablet non c'è il passaggio del mouse: ogni 4 s il badge si alterna
  // da solo con "Sentiamoci subito!" sul gradiente (stile in css, blocco del badge).
  const touch = window.matchMedia('(hover: none), (max-width: 820px)');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer = null;
  const sync = () => {
    clearInterval(timer);
    link.classList.remove('is-alt');
    link.classList.toggle('has-alt', touch.matches && !still.matches);
    if (touch.matches && !still.matches) timer = setInterval(() => link.classList.toggle('is-alt'), 4000);
  };
  if (link) {
    sync();
    touch.addEventListener && touch.addEventListener('change', sync);
  }
})();

/* ---------- Anno nel footer ---------- */
document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

/* ---------- Header allo scorrimento ---------- */
(function header() {
  const el = document.querySelector('[data-header]');
  if (!el) return;
  const update = () => el.classList.toggle('is-scrolled', window.scrollY > 10);
  update();
  window.addEventListener('scroll', update, { passive: true });
})();

/* ---------- Menu mobile ---------- */
(function menu() {
  const menuEl = document.querySelector('[data-menu]');
  const openBtn = document.querySelector('[data-menu-open]');
  const closeBtn = document.querySelector('[data-menu-close]');
  if (!menuEl || !openBtn) return;

  // Menu a tendina: scende dall'alto quando si apre (e i link salgono uno alla volta),
  // risale quando si chiude. Si chiude anche tirandolo su col dito: segue il dito e,
  // se lo lasci prima di circa un quarto, torna giù. (Lo swipe per APRIRE non c'è di proposito:
  // su iPhone i bordi sono di Safari e lo swipe verso il basso fa scorrere la pagina.)
  const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE_OUT = 'cubic-bezier(.2, .8, .2, 1)';
  const items = () => [...menuEl.querySelectorAll('.menu-links a, .menu-bottom')];
  let anim = null;
  let shown = false;

  const slide = (from, to, duration, easing) => {
    if (anim) anim.cancel();
    anim = menuEl.animate([{ transform: `translateY(${from}px)` }, { transform: `translateY(${to}px)` }],
      { duration, easing, fill: 'forwards' });
    return anim.finished.catch(() => {});
  };

  const open = () => {
    if (shown) return;
    shown = true;
    menuEl.hidden = false;
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
    closeBtn && closeBtn.focus({ preventScroll: true });
    if (calm()) return;
    slide(-menuEl.offsetHeight, 0, 480, EASE_OUT);
    items().forEach((el, i) => el.animate(
      [{ transform: 'translateY(40%)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 520, delay: 160 + i * 50, easing: EASE_OUT, fill: 'backwards' }));
  };

  // from = da dove parte la tendina (serve quando la stai già tirando su col dito)
  const close = async (returnFocus = true, from = 0) => {
    if (!shown) return;
    shown = false;
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');   // subito: se hai toccato un link la pagina scorre già
    if (!calm()) {
      const left = (menuEl.offsetHeight + from) / menuEl.offsetHeight;   // quanta strada manca
      await slide(from, -menuEl.offsetHeight, Math.max(160, 380 * left), 'cubic-bezier(.5, 0, .75, 0)');
    }
    if (shown) return;                              // riaperto nel frattempo
    menuEl.hidden = true;
    if (anim) { anim.cancel(); anim = null; }
    if (returnFocus) openBtn.focus({ preventScroll: true });
  };

  // ---- swipe verso l'alto per chiudere ----
  let drag = null;
  let suppressClick = false;
  const onMove = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (drag.vertical === null && Math.hypot(dx, dy) > 8) {
      drag.vertical = Math.abs(dy) > Math.abs(dx);
      if (!drag.vertical) { endDrag(); return; }
      drag.moved = true;
      if (anim) { anim.cancel(); anim = null; }
    }
    if (!drag.moved) return;
    drag.dy = dy < 0 ? dy : dy * 0.15;              // verso il basso fa resistenza: la tendina è già giù
    menuEl.style.transform = `translateY(${drag.dy}px)`;
  };
  const onUp = e => {
    if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.id)) return;
    const { dy, moved, t0 } = drag;
    endDrag();
    if (!moved) return;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    menuEl.style.transform = '';
    const speed = -dy / Math.max(1, performance.now() - t0);   // colpo veloce verso l'alto = chiude anche se corto
    if (e.type === 'pointerup' && (-dy > menuEl.offsetHeight * 0.25 || (-dy > 30 && speed > 0.5))) close(true, dy);
    else slide(dy, 0, 380, EASE_OUT);                          // torna giù, ancorata
  };
  const endDrag = () => {
    drag = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  };
  menuEl.addEventListener('pointerdown', e => {
    if (!shown || !e.isPrimary || e.button !== 0) return;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dy: 0, t0: performance.now(), moved: false, vertical: null };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });
  menuEl.addEventListener('click', e => { if (suppressClick) { e.preventDefault(); e.stopPropagation(); } }, true);

  openBtn.addEventListener('click', open);
  closeBtn && closeBtn.addEventListener('click', () => close());
  menuEl.querySelectorAll('a').forEach(a => a.addEventListener('click', () => close(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && shown) close(); });
})();

/* ---------- Caroselli ---------- */
document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const track = carousel.querySelector('[data-track]');
  const prev = carousel.querySelector('[data-prev]');
  const next = carousel.querySelector('[data-next]');
  const dotsEl = carousel.querySelector('[data-dots]');
  const counter = carousel.querySelector('[data-counter]');
  let items = [];

  // Si scorre una card alla volta (se ci sono pagine .page, una pagina alla volta).
  const getItems = () => {
    const pages = [...track.querySelectorAll(':scope > .page')];
    if (pages.length && getComputedStyle(pages[0]).display !== 'contents') return pages;
    return [...track.querySelectorAll('.tile')];
  };

  const pad = n => String(n).padStart(2, '0');

  const currentIndex = () => {
    const x = track.scrollLeft;
    let best = 0, dist = Infinity;
    items.forEach((it, i) => {
      const d = Math.abs(it.offsetLeft - x);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  };

  // Ricorda dove sta andando la fila, così click rapidi sulle frecce avanzano di più card
  let aim = null, aimTimer;
  const goTo = i => {
    i = Math.max(0, Math.min(items.length - 1, i));
    const target = items[i];
    if (!target) return;
    aim = i;
    clearTimeout(aimTimer);
    aimTimer = setTimeout(() => { aim = null; }, 900);
    track.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
  };
  const here = () => (aim !== null ? aim : currentIndex());

  const buildDots = () => {
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    items.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Vai alla pagina ${i + 1}`);
      b.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(b);
    });
  };

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const i = max > 2 && track.scrollLeft >= max - 2 ? items.length - 1 : currentIndex(); // in fondo: ultima card
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= max - 2;
    if (counter) counter.textContent = `${pad(i + 1)} / ${pad(items.length)}`;
    if (dotsEl) [...dotsEl.children].forEach((d, n) => d.setAttribute('aria-current', n === i ? 'true' : 'false'));
  };

  const setup = () => { items = getItems(); buildDots(); update(); };

  prev && prev.addEventListener('click', () => goTo(here() - 1));
  next && next.addEventListener('click', () => goTo(here() + 1));

  let raf;
  track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });

  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(setup, 150); });

  setup();
});



/* ---------- Scatti: scorrono da soli seguendo lo scroll della pagina ----------
   Mentre la sezione attraversa lo schermo, le foto scivolano verso sinistra.
   Se usi frecce, trascinamento o trackpad, il movimento automatico si ferma
   e riparte quando la sezione esce dallo schermo. */
(function scrollLinked() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('[data-scroll-linked]').forEach(carousel => {
    const track = carousel.querySelector('[data-track]');
    if (!track) return;
    let auto = true, current = track.scrollLeft, target = current, raf = null;

    const progress = () => {
      const r = carousel.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = (vh - r.top) / (vh + r.height);
      return Math.min(1, Math.max(0, p));
    };

    const tick = () => {
      if (!auto) { raf = null; return; }
      current += (target - current) * 0.12;
      if (Math.abs(target - current) < 0.5) current = target;
      track.scrollLeft = current;
      raf = current === target ? null : requestAnimationFrame(tick);
    };

    const onScroll = () => {
      const r = carousel.getBoundingClientRect();
      const out = r.bottom < 0 || r.top > window.innerHeight;
      if (!auto && out) {               // la sezione è uscita: riattiva l'automatico
        auto = true;
        current = track.scrollLeft;
        track.classList.add('is-linked');
      }
      if (!auto) return;
      target = progress() * (track.scrollWidth - track.clientWidth);
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const pause = () => {
      if (!auto) return;
      auto = false;
      track.classList.remove('is-linked');
    };

    carousel.querySelectorAll('[data-prev], [data-next], [data-dots] button').forEach(b => b.addEventListener('click', pause));
    track.addEventListener('pointerdown', pause, { passive: true });
    track.addEventListener('touchstart', pause, { passive: true });
    track.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) pause(); }, { passive: true });

    track.classList.add('is-linked');
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  });
})();

/* ---------- Anteprime video dei Lavori: sempre in riproduzione ----------
   Ogni card con data-preview="assets/lavori/nome.mp4" (clip breve, muta) gira in loop
   da sola, anche su telefono: parte quando la card entra nello schermo e si ferma
   quando esce. Finché il video non è pronto si vede il fotogramma (img). */
(function loopPreviews() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const tiles = [...document.querySelectorAll('.pile .tile--video[data-preview]')].filter(t => t.dataset.preview.trim());
  if (!tiles.length || !('IntersectionObserver' in window)) return;

  const make = tile => {
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.preload = 'auto';
    v.src = tile.dataset.preview.trim();
    v.addEventListener('playing', () => tile.classList.add('is-playing'));
    tile.appendChild(v);
    return v;
  };

  // Per non finire la memoria del telefono (Safari altrimenti ricarica la pagina):
  // il video parte solo se la card resta a schermo un attimo (non quando ci si passa
  // sopra scorrendo veloce, es. click su "Disponibile") e appena esce viene scaricato.
  const unload = tile => {
    clearTimeout(tile._t);
    if (!tile._v) return;
    tile.classList.remove('is-playing');
    tile._v.pause();
    tile._v.removeAttribute('src');
    tile._v.load();
    tile._v.remove();
    tile._v = null;
  };
  const io = new IntersectionObserver(entries => {
    entries.forEach(({ target: tile, isIntersecting }) => {
      if (isIntersecting) {
        clearTimeout(tile._t);
        tile._t = setTimeout(() => {
          const v = tile._v || (tile._v = make(tile));
          const p = v.play();
          if (p && p.catch) p.catch(() => {});
        }, 250);
      } else {
        unload(tile);
      }
    });
  }, { threshold: 0.1 });
  tiles.forEach(t => io.observe(t));
})();

/* ---------- Mazzo di showreel nell'apertura ----------
   - Ogni card ha una clip muta (data-preview) che gira sempre mentre l'apertura è a schermo
     (su telefono solo quella davanti, per non pesare).
   - Clic su una card dietro: passa davanti. Clic su quella davanti: si apre lo showreel (data-full).
   - Trascinando la card davanti (mouse tenuto premuto, o swipe col dito) si sposta con un
     effetto elastico, sempre ancorata al mazzo: se la lasci prima della soglia torna al suo posto;
     oltre la soglia verso sinistra va in fondo al mazzo e arriva la successiva, verso destra
     torna davanti quella in fondo. */
(function deck() {
  const deckEl = document.querySelector('[data-deck]');
  if (!deckEl) return;
  const cards = [...deckEl.querySelectorAll('.deck-card')];
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const phone = window.matchMedia('(max-width: 820px)');
  const n = cards.length;
  const pos = c => +c.dataset.pos;
  const front = () => cards.find(c => pos(c) === 0);

  // ---- clip in loop ----
  let visible = false;
  const ensureVideo = c => {
    if (c._v || !c.dataset.preview) return c._v;
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.preload = 'auto';
    v.src = c.dataset.preview;
    v.addEventListener('playing', () => {
      c.classList.add('is-playing');
      if (!frontReady) { frontReady = true; setTimeout(syncVideos, 1200); }
    });
    c.appendChild(v);
    return (c._v = v);
  };
  // Le clip delle card dietro si caricano solo dopo che è partita quella davanti:
  // la prima cosa che si vede arriva prima (e su telefono gira solo quella davanti).
  let frontReady = false;
  const syncVideos = () => {
    cards.forEach(c => {
      const on = visible && !calm.matches && (pos(c) === 0 || (!phone.matches && frontReady));
      if (on) {
        const p = ensureVideo(c).play();
        if (p && p.catch) p.catch(() => {});
      } else if (c._v) c._v.pause();
    });
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; syncVideos(); }, { threshold: 0.05 }).observe(deckEl);
  }

  // ---- ordine del mazzo ----
  const bringToFront = card => {
    const k = pos(card);
    if (!k) return;
    cards.forEach(c => { c.dataset.pos = (pos(c) - k + n) % n; });
    syncVideos();
  };
  const next = () => { cards.forEach(c => { c.dataset.pos = (pos(c) - 1 + n) % n; }); syncVideos(); }; // davanti → in fondo
  const prev = () => bringToFront(cards.find(c => pos(c) === n - 1));                                // in fondo → davanti

  const openFull = card => {
    const url = (card.dataset.full || '').trim();
    if (url && window.openLightboxVideo) window.openLightboxVideo(url);
  };

  // ---- trascinamento / swipe ----
  let drag = null;           // { card, x0, y0, dx, t0, moved, horizontal }
  let suppressClick = false;
  const LIMIT = () => (phone.matches ? 80 : 150);           // quanto può allontanarsi al massimo (px)
  const elastic = dx => LIMIT() * Math.tanh(dx / LIMIT()); // più tiri, più fa resistenza

  const setOffset = (card, dx) => {
    card.style.setProperty('--dx', dx.toFixed(1) + 'px');
    card.style.setProperty('--dr', (dx * 0.04).toFixed(2) + 'deg');
  };

  // Il gesto si segue su tutta la finestra (non solo sul mazzo), senza "agganciare" il puntatore:
  // sul telefono l'aggancio faceva finire lo swipe appena iniziato.
  const onMove = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const mx = e.clientX - drag.x0, my = e.clientY - drag.y0;
    if (drag.horizontal === null && Math.hypot(mx, my) > 6) {
      drag.horizontal = Math.abs(mx) > Math.abs(my);
      if (!drag.horizontal) { stop(); return; }           // gesto verticale: lascia scorrere la pagina
      drag.moved = true;
      deckEl.classList.add('is-dragging');
      drag.card.classList.add('is-dragging');
    }
    if (!drag.moved) return;
    drag.dx = elastic(mx);
    setOffset(drag.card, drag.dx);
  };

  const release = e => {
    if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.id)) return;
    const { card, dx, moved, t0 } = drag;
    stop();
    if (!moved) return;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    deckEl.classList.remove('is-dragging');
    card.classList.remove('is-dragging');
    const speed = Math.abs(dx) / Math.max(1, performance.now() - t0);  // colpo veloce = vale anche se corto
    const go = Math.abs(dx) > LIMIT() * 0.45 || (Math.abs(dx) > 25 && speed > 0.5);
    setOffset(card, 0);                                   // torna sempre ancorata al mazzo
    if (go && e.type === 'pointerup') (dx < 0 ? next : prev)();
  };

  const stop = () => {
    drag = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', release);
    window.removeEventListener('pointercancel', release);
  };

  deckEl.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !e.isPrimary) return;
    if (drag) release({ type: 'reset' });
    const card = front();
    if (!card) return;
    drag = { id: e.pointerId, card, x0: e.clientX, y0: e.clientY, dx: 0, t0: performance.now(), moved: false, horizontal: null };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', release);       // qualunque sia il modo in cui il gesto finisce,
    window.addEventListener('pointercancel', release);   // la card torna sempre al suo posto
  });
  window.addEventListener('blur', () => release({ type: 'blur' }));

  // iPhone: mentre lo swipe è orizzontale, la pagina non deve "rubare" il gesto
  deckEl.addEventListener('touchmove', e => {
    if (drag && drag.moved) e.preventDefault();
  }, { passive: false });

  // ---- clic / tastiera ----
  cards.forEach(c => c.addEventListener('click', e => {
    if (suppressClick) { e.preventDefault(); return; }
    if (pos(c) === 0) openFull(c);
    else bringToFront(c);
  }));
  deckEl.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { next(); front().focus(); }
    if (e.key === 'ArrowRight') { prev(); front().focus(); }
  });

  phone.addEventListener && phone.addEventListener('change', syncVideos);
})();

/* ---------- Lavori: griglia a mattoncini di foto e video ----------
   Le card stanno su 4 colonne (2 su mobile): video orizzontali larghi 2 colonne,
   verticali e foto larghi 1 (si cambia con data-span). Ogni card va nel punto più in alto
   libero, così si incastrano senza buchi grandi e senza sovrapporsi. */
(function pile() {
  const pileEl = document.querySelector('[data-pile]');
  if (!pileEl) return;
  const cards = [...pileEl.querySelectorAll('.tile')];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ratioOf = card => {
    const m = getComputedStyle(card).aspectRatio.match(/([\d.]+)\s*\/\s*([\d.]+)/);
    return m ? m[1] / m[2] : 16 / 9;
  };

  // Le proporzioni si leggono una volta sola, prima che la griglia cambi lo stile delle card.
  // La didascalia (p.tile-cap) è l'elemento subito dopo la card: si sposta insieme a lei.
  cards.forEach(c => {
    c._ratio = ratioOf(c);
    const n = c.nextElementSibling;
    c._cap = n && n.classList.contains('tile-cap') ? n : null;
  });
  pileEl.classList.add('is-piled');

  const layout = () => {
    const cols = window.matchMedia('(max-width: 820px)').matches ? 2 : 4;
    const gap = parseFloat(getComputedStyle(pileEl).getPropertyValue('--pile-gap')) || 24;
    const W = pileEl.clientWidth;
    const colW = (W - gap * (cols - 1)) / cols;
    const heights = new Array(cols).fill(0);
    const spanOf = c => Math.min(cols, +c.dataset.span || (c._ratio > 1 ? 2 : 1));
    // tra le posizioni possibili sceglie quella più in alto (a parità, la più a sinistra)
    const spot = span => {
      let best = 0, bestY = Infinity;
      for (let i = 0; i + span <= cols; i++) {
        const y = Math.max(...heights.slice(i, i + span));
        if (y < bestY - 1) { bestY = y; best = i; }
      }
      let hole = 0;
      for (let i = best; i < best + span; i++) hole += bestY - heights[i];
      return { best, bestY, hole };
    };
    // Se una card larga lascerebbe un buco (succede soprattutto su telefono, con 2 colonne),
    // prima mette una delle 3 card successive che ci sta senza buchi; senza buchi l'ordine resta quello del codice.
    const queue = cards.filter(c => !c.hidden);
    while (queue.length) {
      let k = queue.slice(0, 4).findIndex(c => spot(spanOf(c)).hole < 1);
      if (k < 0) k = 0;
      const c = queue.splice(k, 1)[0];
      const span = spanOf(c);
      const { best, bestY } = spot(span);
      const w = colW * span + gap * (span - 1), h = w / c._ratio;
      const x = best * (colW + gap);
      Object.assign(c.style, { left: x + 'px', top: bestY + 'px', width: w + 'px', height: h + 'px' });
      let capH = 0;
      if (c._cap) {
        Object.assign(c._cap.style, { left: x + 'px', top: (bestY + h) + 'px', width: w + 'px' });
        capH = c._cap.offsetHeight;
      }
      for (let i = best; i < best + span; i++) heights[i] = bestY + h + capH + gap;
    }
    pileEl.style.height = Math.max(0, Math.max(...heights) - gap) + 'px';
  };

  // Filtri Tutti / Video / Foto
  const filter = document.querySelector('.pile-filter');
  filter && filter.addEventListener('change', e => {
    const v = e.target.value;
    const apply = () => {
      cards.forEach(c => { c.hidden = v !== 'all' && !c.dataset.kind.split(' ').includes(v);   // data-kind="photo video": compare in tutti e due i filtri
       if (c._cap) c._cap.hidden = c.hidden; });
      layout();
      pileEl.style.opacity = '';
      if (reduce) return;
      cards.filter(c => !c.hidden).forEach((c, i) => {
        if (c._cap) c._cap.animate([{ opacity: 0, translate: '0 40px' }, { opacity: 1, translate: '0 0' }],
          { duration: 600, delay: i * 45, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
        c.animate([{ opacity: 0, translate: '0 40px' }, { opacity: 1, translate: '0 0' }],
          { duration: 600, delay: i * 45, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
      });
    };
    if (reduce) return apply();
    pileEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease' })
      .finished.then(() => { pileEl.style.opacity = '0'; requestAnimationFrame(apply); });
  });

  // Si ricalcola ogni volta che cambia la larghezza (finestra, barra di scorrimento…)
  let lastW = 0;
  new ResizeObserver(() => {
    if (pileEl.clientWidth !== lastW) { lastW = pileEl.clientWidth; layout(); }
  }).observe(pileEl);
  layout();
})();

/* ---------- Scatti: il mazzo di foto si apre allo scorrimento ----------
   Mentre scorri la sezione il palco resta fermo: le foto partono come un mazzo al centro
   (sfalsate e ruotate come il mazzo dell'apertura) e una dopo l'altra volano al loro posto.
   Intanto compare la frase: il corsivo sale e si accende, "CON ME" sale lettera per lettera
   con una piccola rotazione, come le parole grandi delle altre sezioni.
   Tutto segue lo scorrimento: tornando su, il mazzo si richiude. */
(function travel() {
  const track = document.querySelector('[data-travel-track]');
  const stage = document.querySelector('[data-travel]');
  if (!track || !stage) return;
  const photos = [...stage.querySelectorAll('.tile--travel')];
  const lead = stage.querySelector('.travel-title .lead');
  const word = stage.querySelector('.travel-title .word');
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const n = photos.length;

  const clamp01 = v => Math.min(1, Math.max(0, v));
  const ease = t => 1 - Math.pow(1 - t, 3);              // parte veloce, arriva morbida
  const local = (p, start, dur) => ease(clamp01((p - start) / dur));
  const lerp = (a, b, t) => a + (b - a) * t;

  let geo = [];
  const measure = () => {
    const mobile = window.matchMedia('(max-width: 820px)').matches;
    const u = Math.min(window.innerWidth, 1920) / 1440;
    const deckW = mobile ? 132 : 200 * u;                 // larghezza delle foto nel mazzo
    const step = mobile ? 4 : 5 * u;
    const W = stage.clientWidth, H = stage.clientHeight;
    geo = photos.map((ph, i) => {
      const k = n - 1 - i;                                // 0 = foto davanti (l'ultima nel codice)
      const w = ph.offsetWidth, h = ph.offsetHeight;
      const cx = ph.offsetLeft + w / 2, cy = ph.offsetTop + h / 2;
      const r = parseFloat(getComputedStyle(ph).getPropertyValue(mobile ? '--mr' : '--r')) || 0;
      return {
        dx: W / 2 + k * step - cx,                        // mazzo: dietro sfalsate in alto a destra
        dy: H / 2 - k * step * 0.8 - cy,
        rot0: k * 1.2,                                    // e un po' più ruotate
        sc0: deckW / w,
        rot1: r,
      };
    });
  };

  const chars = () => (word ? [...word.querySelectorAll('.ch')] : []);

  const render = p => {
    photos.forEach((ph, i) => {
      const g = geo[i];
      const order = n - 1 - i;                            // parte prima la foto davanti
      const t = local(p, 0.12 + order * 0.045, 0.36);
      ph.style.setProperty('--tx', (g.dx * (1 - t)).toFixed(1) + 'px');
      ph.style.setProperty('--ty', (g.dy * (1 - t)).toFixed(1) + 'px');
      ph.style.setProperty('--rot', lerp(g.rot0, g.rot1, t).toFixed(2) + 'deg');
      ph.style.setProperty('--sc', lerp(g.sc0, 1, t).toFixed(3));
    });
    stage.classList.toggle('is-open', p >= 0.12 + (n - 1) * 0.045 + 0.36); // appena l'ultima foto è arrivata

    if (lead) {
      const t = local(p, 0.36, 0.2);
      lead.style.opacity = t;
      lead.style.translate = `0 ${(20 * (1 - t)).toFixed(1)}px`;
    }
    chars().forEach((ch, i) => {
      const t = local(p, 0.48 + i * 0.035, 0.18);
      const turn = (i % 2 ? -1 : 1) * (5 + (i * 7) % 6);
      ch.style.opacity = t;
      ch.style.translate = `0 ${(60 * (1 - t)).toFixed(1)}%`;
      ch.style.rotate = `${(turn * (1 - t)).toFixed(2)}deg`;
    });
  };

  const progress = () => {
    // parte già mentre la sezione entra nello schermo (quando la sua cima è al 55% dell'altezza)
    const r = track.getBoundingClientRect();
    const early = window.innerHeight * 0.55;
    const run = r.height - stage.offsetHeight + early;
    return clamp01((early - r.top) / (run || 1));
  };

  // La frase la gestisce questa funzione, non le comparse generali
  [lead, word, ...photos].forEach(el => el && el.classList.add('is-in'));

  let raf = null;
  const update = () => { raf = null; render(calm ? 1 : progress()); };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  const relayout = () => { photos.forEach(ph => ['--tx', '--ty', '--rot', '--sc'].forEach(v => ph.style.removeProperty(v))); measure(); update(); };

  window.addEventListener('scroll', onScroll, { passive: true });
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(relayout, 120); });
  // aspetta che le parole siano divise in lettere (funzione "reveal")
  requestAnimationFrame(relayout);
})();

/* ---------- Finestra video (YouTube / Vimeo) ---------- */
(function lightbox() {
  const box = document.querySelector('[data-lightbox]');
  const frame = document.querySelector('[data-lightbox-frame]');
  const info = document.querySelector('[data-lightbox-info]');
  const closeBtn = document.querySelector('[data-lightbox-close]');
  if (!box || !frame) return;
  let lastFocus = null;
  // mouse o dito: alla chiusura niente contorno bianco sulla card (resta solo per chi usa la tastiera)
  let byPointer = false, openedByPointer = false;
  document.addEventListener('pointerdown', () => { byPointer = true; }, true);
  document.addEventListener('keydown', e => { if (e.key !== 'Escape') byPointer = false; }, true);

  const embedUrl = url => {
    let m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0`;
    m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return `https://player.vimeo.com/video/${m[1]}?autoplay=1&dnt=1`;
    return null;
  };

  // Scheda del lavoro: didascalia (nome / tipo) + .work-info che seguono la card nell'HTML
  let currentCard = null;
  const fillInfo = card => {
    const cap = card && card.nextElementSibling && card.nextElementSibling.classList.contains('tile-cap') ? card.nextElementSibling : null;
    const extra = cap && cap.nextElementSibling && cap.nextElementSibling.classList.contains('work-info') ? cap.nextElementSibling : null;
    if (!info) return;
    if (!extra) { info.hidden = true; info.innerHTML = ''; box.classList.remove('has-info'); frame.style.removeProperty('--info-h'); return; }
    info.innerHTML = `<p class="tile-cap is-in">${cap.innerHTML}</p>` + extra.innerHTML;   // is-in: già "comparsa", niente animazione
    info.hidden = false;
    box.classList.add('has-info');
    // il video si rimpicciolisce quanto serve perché video + scheda stiano nello schermo
    requestAnimationFrame(() => frame.style.setProperty('--info-h', Math.min(info.offsetHeight, window.innerHeight * 0.4) + 'px'));
  };

  const show = (html, mode, ratio) => {
    lastFocus = document.activeElement;
    fillInfo(currentCard);
    currentCard = null;
    if (ratio) frame.style.setProperty('--ar', ratio); else frame.style.removeProperty('--ar');
    openedByPointer = byPointer;
    frame.innerHTML = html;
    box.classList.toggle('is-vertical', mode === 'vertical');
    box.classList.toggle('is-photo', mode === 'photo');
    box.hidden = false;
    document.body.classList.add('no-scroll');
    closeBtn.focus();
    // il tasto "indietro" del browser/telefono chiude la finestra invece di uscire dal sito
    if (!(history.state && history.state.lightbox)) history.pushState({ lightbox: true }, '');
  };

  // Chiudi (pulsante, Esc, clic fuori): si torna indietro di un passo nella cronologia,
  // così la voce aggiunta all'apertura sparisce e "indietro" dopo funziona normalmente.
  const close = () => {
    if (history.state && history.state.lightbox) history.back();
    else hide();
  };
  window.addEventListener('popstate', () => { if (!box.hidden) hide(); });

  const hide = () => {
    box.hidden = true;
    track.querySelectorAll('.viewer-video').forEach(v => { v.innerHTML = ''; });   // ferma il video
    frame.innerHTML = '';
    if (info) { info.hidden = true; info.innerHTML = ''; }
    box.classList.remove('has-info');
    frame.style.removeProperty('--info-h');
    document.body.classList.remove('no-scroll');
    if (openedByPointer) document.activeElement && document.activeElement.blur();
    else if (lastFocus) lastFocus.focus();
  };

  // ratio: formato del video se non è 16:9 o 9:16 (es. "4 / 3"), preso dalla card
  const openVideo = (url, vertical, ratio) => {
    const mode = vertical ? 'vertical' : 'video';
    // video caricato nel sito (es. lo showreel): si apre col suo player, con l'audio
    if (/\.(mp4|webm|mov)(\?|#|$)/i.test(url)) {
      show(`<video src="${url}" controls autoplay playsinline></video>`, mode, ratio);
      return;
    }
    const src = embedUrl(url);
    if (src) show(`<iframe src="${src}" title="Video" allow="autoplay; fullscreen; picture-in-picture"></iframe>`, mode, ratio);
  };
  window.openLightboxVideo = openVideo;   // usata dal mazzo di showreel nell'apertura

  // le card video dei Lavori sono link alla pagina del lavoro: si aprono lì, non nella finestra
  document.querySelectorAll('[data-video]:not(a[href])').forEach(el => {
    el.addEventListener('click', () => {
      currentCard = el;
      const url = el.dataset.video.trim();
      if (url) openVideo(url, el.classList.contains('tile--vertical'), el.style.aspectRatio || null);
    });
  });

  // Foto dei lavori: si aprono grandi (data-full per una versione più grande, se c'è)
  document.querySelectorAll('[data-kind="photo"]:not(a[href])').forEach(el => {
    el.addEventListener('click', () => {
      const img = el.querySelector('img');
      const src = el.dataset.full || (img && (img.currentSrc || img.src));
      if (!src) return;
      currentCard = el;
      const im = document.createElement('img');
      im.src = src;
      im.alt = img ? img.alt : '';
      show('', 'photo');
      frame.appendChild(im);
    });
  });
  closeBtn.addEventListener('click', close);
  box.addEventListener('click', e => { if (e.target === box) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) close(); });
})();

/* ---------- Pagine dei lavori: video ----------
   Si vede la copertina con la clip muta in loop; al clic al suo posto parte il video completo
   (Vimeo/YouTube si collegano solo a quel punto, come dice la privacy). */
(function player() {
  const box = document.querySelector('[data-player]');
  if (!box) return;
  const preview = box.dataset.preview;
  if (preview && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.src = preview;
    v.addEventListener('playing', () => box.classList.add('is-playing'));
    box.insertBefore(v, box.querySelector('.play'));
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }
  const start = () => {
    const src = box.dataset.player;
    if (!src || box.classList.contains('is-on')) return;
    const sep = src.includes('?') ? '&' : '?';
    const extra = src.includes('vimeo') ? 'autoplay=1&dnt=1' : 'autoplay=1&rel=0';
    box.classList.add('is-on');
    box.innerHTML = `<iframe src="${src}${sep}${extra}" title="Video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  };
  box.addEventListener('click', start);
})();

/* ---------- Pagine dei lavori foto: mazzo sfogliabile + carosello ----------
   Le foto sono un mazzo (come nell'apertura e negli Scatti). La foto davanti si sfoglia
   trascinandola (su telefono con lo swipe: elastica, resta ancorata) o con le frecce sotto:
   a sinistra va in fondo e arriva la successiva, a destra torna davanti quella in fondo.
   Clic sulla foto davanti = carosello a schermo intero da quella foto; chiudendolo il mazzo
   resta sull'ultima foto vista. "Indietro" ed Esc chiudono il carosello. */
(function gallery() {
  const grid = document.querySelector('[data-gallery]');
  if (!grid) return;
  const items = [...grid.querySelectorAll('.g-item')];
  const n = items.length;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.2, .8, .2, 1)';
  const TURN = [-3, 4, -6, 2, -4, 5, -2, 6, -5, 3];   // rotazione di ogni foto nel mazzo
  const SHOW = 5;                                      // foto visibili dietro quella davanti
  const ARROW = '<svg viewBox="0 0 13 10" aria-hidden="true"><path d="M.5 5H12M8 .8L12.2 5 8 9.2" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';
  const pad = k => String(k).padStart(2, '0');
  let front = 0, step = 12, sizes = [];

  // contatore e frecce sotto il mazzo
  const bar = document.createElement('div');
  bar.className = 'gallery-bar';
  bar.innerHTML = `<span class="counter"></span><div class="arrows">
    <button class="arrow arrow--prev" type="button" aria-label="Foto precedente">${ARROW}</button>
    <button class="arrow" type="button" aria-label="Foto successiva">${ARROW}</button></div>`;
  grid.after(bar);
  const counter = bar.querySelector('.counter');
  const [btnPrev, btnNext] = bar.querySelectorAll('.arrow');

  // misure: tutte le foto alte uguali; quelle larghe si stringono per stare nello schermo
  const measure = () => {
    const mob = window.matchMedia('(max-width: 820px)').matches;
    step = mob ? 8 : 12;
    const W = grid.clientWidth;
    const top = grid.getBoundingClientRect().top + window.scrollY;   // spazio sotto il titolo (che può andare su due righe)
    const H = mob ? Math.max(300, Math.min(440, window.innerHeight - top - 130)) : Math.max(340, Math.min(580, window.innerHeight - top - 90));   // il mazzo sta tutto nello schermo
    const ratios = items.map(el => el.style.aspectRatio.split('/').map(Number));
    const mixed = ratios.some(([w, h]) => w > h) && ratios.some(([w, h]) => w <= h);
    sizes = items.map(el => {
      const [aw, ah] = el.style.aspectRatio.split('/').map(Number);
      let w = H * aw / ah, h = H;
      const maxW = W - step * SHOW - 8 - (mob ? 0 : 2 * 170);   // su computer resta spazio ai lati per contatore e frecce
      if (aw > ah && mixed) w = H * 1.1;            // tra foto verticali, quelle orizzontali più piccole: non coprono il mazzo
      if (w > maxW) w = maxW;
      h = w * ah / aw;
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      return { w, h };
    });
    grid.style.height = Math.max(...sizes.map(z => z.h)) + step * SHOW + 24 + 'px';   // alto quanto la foto più alta (+ margine per le rotazioni)
    grid.style.setProperty('--deck-shift', step * SHOW / 2 + 'px');                   // il mazzo sale verso destra: si ricentra
  };

  const depthOf = i => (i - front + n) % n;
  const pose = (i, d = depthOf(i)) =>
    `translate(-50%, -50%) translate(${Math.min(d, SHOW) * step}px, ${-Math.min(d, SHOW) * step}px) rotate(${d === 0 ? TURN[i % TURN.length] * .3 : TURN[i % TURN.length]}deg)`;

  const place = (animate = true) => {
    items.forEach((el, i) => {
      const d = depthOf(i);
      if (!animate) el.style.transition = 'none';
      el.style.transform = pose(i, d);
      el.style.zIndex = String(n - d);
      el.style.opacity = d <= SHOW ? '1' : '0';
      el.classList.toggle('is-front', d === 0);
      el.tabIndex = d === 0 ? 0 : -1;
      el.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
      if (!animate) { el.offsetWidth; el.style.transition = ''; }
    });
    counter.textContent = `${pad(front + 1)} / ${pad(n)}`;
  };

  // la foto davanti vola via a sinistra e va in fondo (avanti), o torna dal fondo (indietro)
  const away = (i, from) => `${from || pose(i, 0)} translateX(${-Math.min(sizes[i].w * 1.05, grid.clientWidth * .55)}px) rotate(-10deg)`;
  const deckNext = () => {
    const old = front;
    const startT = items[old].style.transform;
    front = (front + 1) % n;
    place();
    if (calm) return;
    const el = items[old];
    el.style.transition = 'none';
    el.animate([
      { transform: startT, zIndex: n + 1, opacity: 1 },
      { transform: away(old), zIndex: n + 1, opacity: 1, offset: .45 },
      { transform: pose(old), zIndex: 0, opacity: depthOf(old) <= SHOW ? 1 : 0 },
    ], { duration: 750, easing: EASE }).finished.then(() => { el.style.transition = ''; }).catch(() => {});
  };
  const deckPrev = (startT) => {
    front = (front - 1 + n) % n;
    const el = items[front];
    place();
    if (calm) return;
    el.style.transition = 'none';
    el.animate([
      { transform: startT ? `${startT}` : pose(front, n - 1), zIndex: startT ? n + 1 : 0, opacity: startT ? 1 : 0 },
      { transform: away(front), zIndex: n + 1, opacity: 1, offset: .45 },
      { transform: pose(front, 0), zIndex: n + 1, opacity: 1 },
    ], { duration: 750, easing: EASE }).finished.then(() => { el.style.transition = ''; }).catch(() => {});
  };

  // carta video: clip muta in loop sopra la copertina
  items.filter(el => el.dataset.preview).forEach(el => {
    if (calm) return;
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.src = el.dataset.preview;
    v.addEventListener('playing', () => el.classList.add('is-playing'));
    el.insertBefore(v, el.querySelector('.play-icon'));
    const p = v.play(); if (p && p.catch) p.catch(() => {});
  });

  measure();
  place(false);
  grid.classList.add('is-ready');
  if (!calm) grid.animate([{ opacity: 0, translate: '0 40px' }, { opacity: 1, translate: '0 0' }], { duration: 1000, delay: 300, easing: EASE, fill: 'backwards' });
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); place(false); }, 120); });
  // quando arrivano i font il titolo può andare a capo: si rimisura lo spazio
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); place(false); });

  btnNext.addEventListener('click', deckNext);
  btnPrev.addEventListener('click', () => deckPrev());

  // Trascinare la foto davanti (elastica: si allontana al massimo di 150 px, 80 su telefono)
  let drag = null;
  items.forEach((el, i) => el.addEventListener('pointerdown', e => {
    if (e.button !== 0 || i !== front) return;
    drag = { i, x: e.clientX, t: performance.now(), moved: false, dx: 0 };
  }));
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    drag.moved = true;
    const max = window.matchMedia('(max-width: 820px)').matches ? 80 : 150;
    const off = max * Math.tanh(dx / max / 1.2);
    drag.dx = dx;
    const el = items[drag.i];
    el.style.transition = 'none';
    el.style.transform = `${pose(drag.i, 0)} translateX(${off}px) rotate(${off * .04}deg)`;
  });
  const dropCard = () => {
    if (!drag) return;
    const { i, dx, moved, t } = drag;
    drag = null;
    const el = items[i];
    if (!moved) return;                                   // semplice clic: lo gestisce "click"
    el.dataset.dragged = '1';
    const fast = Math.abs(dx) / Math.max(1, performance.now() - t) > .6;
    if (dx < -60 || (fast && dx < -20)) deckNext();
    else if (dx > 60 || (fast && dx > 20)) deckPrev(el.style.transform);
    else { el.style.transition = ''; el.style.transform = pose(i, 0); }
  };
  window.addEventListener('pointerup', dropCard);
  window.addEventListener('pointercancel', dropCard);

  // ---- Carosello ----
  const box = document.querySelector('[data-viewer]');
  if (!box) return;
  const track = box.querySelector('[data-viewer-track]');
  const count = box.querySelector('[data-viewer-count]');
  const prev = box.querySelector('[data-viewer-prev]');
  const next = box.querySelector('[data-viewer-next]');
  const closeBtn = box.querySelector('[data-viewer-close]');
  track.innerHTML = items.map(el => {
    const img = el.querySelector('img');
    if (el.dataset.embed) return `<figure class="viewer-slide viewer-slide--video"><div class="viewer-video" data-embed="${el.dataset.embed}"></div></figure>`;
    return `<figure class="viewer-slide"><img src="${el.dataset.full}" alt="${img.alt.replace(/"/g, '&quot;')}" loading="lazy" decoding="async" draggable="false"></figure>`;
  }).join('');
  const slides = [...track.children];
  let index = 0, lastFocus = null;

  const go = (i, animate = true) => {
    index = Math.max(0, Math.min(items.length - 1, i));
    track.style.transition = animate && !calm ? 'transform .6s cubic-bezier(.2, .8, .2, 1)' : 'none';
    track.style.transform = `translateX(${-index * 100}%)`;
    count.textContent = `${pad(index + 1)} / ${pad(items.length)}`;
    prev.disabled = index === 0;
    next.disabled = index === items.length - 1;
    // carica subito la foto aperta e le vicine
    [index - 1, index, index + 1].forEach(n => { const im = slides[n] && slides[n].querySelector('img'); if (im) im.setAttribute('loading', 'eager'); });
    // video: parte quando la sua slide è quella aperta, si ferma (e si scarica) quando si cambia
    slides.forEach((sl, n) => {
      const box = sl.querySelector('.viewer-video');
      if (!box) return;
      if (n === index && !box.firstChild) box.innerHTML = `<iframe src="${box.dataset.embed}?autoplay=1&dnt=1" title="Video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
      if (n !== index) box.innerHTML = '';
    });
  };
  const open = i => {
    lastFocus = document.activeElement;
    box.hidden = false;
    document.body.classList.add('no-scroll');
    go(i, false);
    if (!calm) box.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
    closeBtn.focus();
    if (!(history.state && history.state.viewer)) history.pushState({ viewer: true }, '');
  };
  const hide = () => {
    box.hidden = true;
    track.querySelectorAll('.viewer-video').forEach(v => { v.innerHTML = ''; });   // ferma il video
    document.body.classList.remove('no-scroll');
    if (front !== index) { front = index; place(false); }   // il mazzo resta sull'ultima foto vista
    lastFocus = items[front];
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };
  const close = () => { if (history.state && history.state.viewer) history.back(); else hide(); };
  window.addEventListener('popstate', () => { if (!box.hidden) hide(); });

  // clic sulla foto davanti (non dopo un trascinamento) = carosello da quella foto
  items.forEach((el, i) => el.addEventListener('click', () => {
    if (el.dataset.dragged) { delete el.dataset.dragged; return; }
    if (i === front) open(i);
  }));
  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') go(index - 1);
    else if (e.key === 'ArrowRight') go(index + 1);
  });

  // Swipe / trascinamento: la foto segue il dito; oltre il 18% o con un colpo veloce si passa alla successiva
  let start = null;
  const stage = box.querySelector('.viewer-stage');
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    start = { x: e.clientX, y: e.clientY, t: performance.now(), w: stage.clientWidth, moved: false };
  });
  window.addEventListener('pointermove', e => {
    if (!start || box.hidden) return;
    const dx = e.clientX - start.x;
    if (!start.moved && Math.abs(dx) < 6) return;
    start.moved = true;
    const edge = (index === 0 && dx > 0) || (index === items.length - 1 && dx < 0);
    const off = edge ? dx / 3 : dx;                              // ai bordi fa resistenza
    track.style.transition = 'none';
    track.style.transform = `translateX(calc(${-index * 100}% + ${off}px))`;
  });
  const release = e => {
    if (!start) return;
    const dx = (e && e.clientX != null ? e.clientX : start.x) - start.x;
    const fast = Math.abs(dx) / Math.max(1, performance.now() - start.t) > .5;
    const moved = start.moved;
    const w = start.w;
    start = null;
    if (!moved) { if (e && stage.contains(e.target) && e.target.tagName !== 'IMG') close(); return; } // clic sul nero attorno = chiudi
    if (Math.abs(dx) > w * .18 || fast) go(index + (dx < 0 ? 1 : -1)); else go(index);
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', () => release(null));
})();

/* ---------- Form contatti (Formspree) ---------- */
(function form() {
  const formEl = document.querySelector('[data-form]');
  if (!formEl) return;
  const status = formEl.querySelector('[data-form-status]');
  const button = formEl.querySelector('button[type="submit"]');
  const buttonLabel = button.querySelector('[data-button-label]') || button;
  const privacy = formEl.querySelector('input[name="privacy"]');

  const setStatus = (msg, isError = false) => {
    status.textContent = msg;
    status.classList.toggle('is-error', isError);
  };

  formEl.addEventListener('submit', async e => {
    e.preventDefault();

    let valid = true;
    formEl.querySelectorAll('input[required], textarea[required]').forEach(f => {
      const ok = f.type === 'checkbox' ? f.checked : f.checkValidity();
      if (f.type === 'checkbox') {
        const check = f.closest('.check');
        check.classList.remove('is-invalid');
        if (!ok) { void check.offsetWidth; check.classList.add('is-invalid'); } // fa ripartire il "tremolio"
      }
      else f.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok) valid = false;
    });

    if (!valid) {
      setStatus(privacy.checked
        ? 'Controlla i campi evidenziati: nome, email valida e messaggio sono obbligatori.'
        : 'Per inviare la richiesta compila i campi obbligatori e accetta la privacy policy.', true);
      return;
    }

    if (formEl.action.includes('TUO_ID')) {
      setStatus('Il form non è ancora collegato: inserisci l’ID Formspree in index.html.', true);
      return;
    }

    const label = buttonLabel.textContent;
    button.disabled = true;
    buttonLabel.textContent = 'Invio in corso…';
    setStatus('');

    try {
      const res = await fetch(formEl.action, {
        method: 'POST',
        body: new FormData(formEl),
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) throw new Error('send');
      formEl.reset();
      setStatus('Richiesta inviata. Ti rispondo il prima possibile.');
    } catch {
      setStatus('Invio non riuscito. Riprova, oppure scrivimi a manu.ally1307@gmail.com.', true);
    } finally {
      button.disabled = false;
      buttonLabel.textContent = label;
    }
  });

  // Casella messaggio: cresce con il testo, così la scritta resta sempre appoggiata alla linea
  const msg = formEl.querySelector('textarea');
  const fitMsg = () => {
    if (!msg) return;
    msg.style.height = 'auto';
    msg.style.height = msg.scrollHeight + (msg.offsetHeight - msg.clientHeight) + 'px';
  };
  msg?.addEventListener('input', fitMsg);
  formEl.addEventListener('reset', () => requestAnimationFrame(fitMsg));
  window.addEventListener('resize', fitMsg);

  formEl.querySelectorAll('input, textarea').forEach(f => {
    f.addEventListener('input', () => {
      if (f.type === 'checkbox') f.closest('.check')?.classList.remove('is-invalid');
      else f.removeAttribute('aria-invalid');
    });
  });
})();

/* ---------- Nome nell'apertura: click = MANU ----------
   Al click le lettere che non servono cadono, restano M-A-N-U, e poi lettere e corsivi
   ("Hi, I'm" e "Videomaker and Photographer") scivolano nella nuova composizione.
   Al secondo click i testi tornano al loro posto e le lettere rientrano dall'alto.
   Su desktop il blocco si ricentra sul punto in cui stava il nome completo. */
(function nameSwap() {
  const block = document.querySelector('[data-name]');
  if (!block) return;
  const name = block.querySelector('.hero-name');
  const first = block.querySelector('.hero-first');
  const last = block.querySelector('.hero-last');
  const hi = block.querySelector('.hero-hi');
  const role = block.querySelector('.hero-role');
  const btn = block.querySelector('[data-name-toggle]');
  const desktop = window.matchMedia('(min-width: 821px)');
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const unit = () => Math.min(Math.min(window.innerWidth, 1920) / 1440, window.innerHeight / 900);   // = --h nel css
  const LABEL_FULL = 'Emanuele Lombardi, Videomaker and Photographer';
  const LABEL_SHORT = 'Manu, Videomaker and Photographer';

  // Ogni lettera diventa un elemento a sé, così può cadere o spostarsi
  const split = el => {
    const text = el.textContent.trim();
    el.textContent = '';
    return [...text].map(ch => {
      const s = document.createElement('span');
      s.className = ch === ' ' ? 'ch sp' : 'ch';
      s.textContent = ch;
      el.appendChild(s);
      return s;
    });
  };
  const firstText = first.textContent.trim().toLowerCase();
  const keepFrom = firstText.indexOf('manu');
  const firstChars = split(first);
  const lastChars = split(last);
  firstChars.forEach((c, i) => { if (i < keepFrom || i >= keepFrom + 4) c.classList.add('drop'); });
  lastChars.forEach(c => c.classList.add('drop'));
  const drops = [...firstChars, ...lastChars].filter(c => c.classList.contains('drop'));
  const kept = firstChars.filter(c => !c.classList.contains('drop'));
  const movers = [hi, role, ...kept];
  name.setAttribute('aria-label', LABEL_FULL);

  let short = false;
  let busy = false;

  const center = () => {
    const r = block.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  // Su desktop sposta il blocco corto in modo che il suo centro coincida con quello del nome completo
  const recenter = () => {
    block.style.setProperty('--dx', 0);
    block.style.setProperty('--dy', 0);
    // Su telefono il blocco tiene l'altezza del nome completo: MANU resta in alto con
    // spazio vuoto sotto e la parte di giù (barra, Lavori…) non risale.
    block.style.minHeight = '';
    if (short && !desktop.matches) {
      block.classList.remove('is-short');
      const h = block.offsetHeight;
      block.classList.add('is-short');
      block.style.minHeight = h + 'px';
    }
    if (!short || !desktop.matches) return;
    block.classList.remove('is-short');
    const [fx, fy] = center();
    block.classList.add('is-short');
    const [sx, sy] = center();
    block.style.setProperty('--dx', (fx - sx) / unit());
    block.style.setProperty('--dy', (fy - sy) / unit());
  };

  const apply = () => {
    block.classList.toggle('is-short', short);
    recenter();
    btn.setAttribute('aria-pressed', String(short));
    btn.textContent = short ? 'Mostra il nome completo' : 'Chiamami Manu';
    name.setAttribute('aria-label', short ? LABEL_SHORT : LABEL_FULL);
  };

  const rects = els => els.map(el => el.getBoundingClientRect());
  // Tecnica FLIP: ogni testo parte da dov'era e scivola dove si trova ora
  const glide = (before, opts) => {
    const scale = new DOMMatrix(getComputedStyle(block).transform).a || 1;
    const after = rects(movers);
    return movers.map((el, i) => {
      const x = (before[i].left - after[i].left) / scale;
      const y = (before[i].top - after[i].top) / scale;
      if (Math.abs(x) < .5 && Math.abs(y) < .5) return Promise.resolve();
      return el.animate(
        [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'none' }],
        { duration: 480, easing: 'cubic-bezier(.2, .8, .2, 1)', ...opts }
      ).finished;
    });
  };
  // Il blocco si sposta di colpo (il movimento lo fanno i singoli testi)
  const instant = fn => {
    block.style.transition = 'none';
    fn();
    block.offsetWidth;
    block.style.transition = '';
  };

  const toShort = async () => {
    const before = rects(movers);
    const falls = drops.map((el, i) => el.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: `translateY(${110 + Math.random() * 60}%) rotate(${(Math.random() * 36 - 18).toFixed(1)}deg)`, opacity: 0 }
      ],
      { duration: 340, delay: i * 14, easing: 'cubic-bezier(.55, 0, .8, .2)', fill: 'forwards' }
    ));
    await Promise.all(falls.map(a => a.finished));
    instant(() => { short = true; apply(); });
    falls.forEach(a => a.cancel());
    await Promise.all(glide(before));
  };

  const toFull = async () => {
    const before = rects(movers);
    instant(() => { short = false; apply(); });
    const moves = glide(before);
    const rises = drops.map((el, i) => el.animate(
      [
        { transform: 'translateY(-45%)', opacity: 0 },
        { transform: 'none', opacity: 1 }
      ],
      { duration: 380, delay: 180 + i * 14, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'backwards' }
    ).finished);
    await Promise.all([...moves, ...rises]);
  };

  const toggle = async () => {
    if (busy) return;
    busy = true;
    try {
      if (calm.matches) { short = !short; instant(apply); }
      else if (short) await toFull();
      else await toShort();
    } finally {
      busy = false;
    }
  };

  name.addEventListener('click', toggle);
  btn.addEventListener('click', toggle);
  window.addEventListener('resize', () => { if (short) instant(recenter); });
})();

/* ---------- Comparse allo scorrimento ----------
   Ogni elemento compare quando entra nello schermo: sale di poco e si accende.
   Le parole grandi delle sezioni salgono lettera per lettera, con una piccola rotazione
   (lo stesso linguaggio della caduta delle lettere nel nome). L'apertura entra al caricamento. */
(function reveal() {
  if (!document.documentElement.classList.contains('js')) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.2, .8, .2, 1)';

  // Divide le parole grandi in lettere
  document.querySelectorAll('.word').forEach(word => {
    const text = word.textContent.trim();
    word.setAttribute('aria-label', text);
    word.textContent = '';
    // ogni parola tiene unite le sue lettere (.wd): i titoli lunghi vanno a capo tra le parole, mai a met\u00e0
    text.split(/\s+/).forEach((part, n) => {
      if (n) {
        const sp = document.createElement('span');
        sp.className = 'ch sp';
        sp.setAttribute('aria-hidden', 'true');
        sp.textContent = '\u00a0'; // lo spazio tra due parole non deve sparire
        word.appendChild(sp);
        word.appendChild(document.createTextNode('\u200b')); // punto in cui si pu\u00f2 andare a capo
      }
      const wd = document.createElement('span');
      wd.className = 'wd';
      [...part].forEach(ch => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.setAttribute('aria-hidden', 'true');
        s.textContent = ch;
        wd.appendChild(s);
      });
      word.appendChild(wd);
    });
  });

  const show = el => el.classList.add('is-in');

  if (calm) {
    document.querySelectorAll('.section-head, .word, .tile, .tile-cap, .controls, .pills li, .bio-lead, .bio-text, .services li, .sectors .label, .form .field, .form-end, .big-mail, .footer-top > *, .footer-legal, .site-header, .reel-stack, .hero-hi, .hero-first, .hero-last, .hero-role, .hero-bar, .section-head .lead').forEach(show);
    return;
  }

  // Sale e si accende
  const rise = (el, delay = 0, dist = 28, duration = 900) => {
    show(el);
    return el.animate(
      [{ opacity: 0, translate: `0 ${dist}px` }, { opacity: 1, translate: '0 0' }],
      { duration, delay, easing: EASE, fill: 'backwards' }
    );
  };
  // Lettere che salgono dal basso, una dopo l'altra
  const letters = (chars, delay = 0, step = 35) => chars.forEach((ch, i) => {
    const turn = (i % 2 ? -1 : 1) * (5 + (i * 7) % 6);
    ch.animate(
      [{ opacity: 0, translate: '0 60%', rotate: `${turn}deg` }, { opacity: 1, translate: '0 0', rotate: '0deg' }],
      { duration: 750, delay: delay + i * step, easing: EASE, fill: 'backwards' }
    );
  });

  // ---- Apertura, al caricamento (dopo l'intro col logo, se c'è) ----
  const intro = document.documentElement.classList.contains('has-intro');
  const T = intro ? 1000 : 0;   // l'apertura parte mentre il logo vola nell'header
  const header = document.querySelector('.site-header');
  if (header) {
    show(header);
    header.animate(
      intro ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, translate: '0 -12px' }, { opacity: 1, translate: '0 0' }],
      { duration: intro ? 450 : 800, delay: intro ? 960 : 100, easing: EASE, fill: 'backwards' });
  }
  const deck = document.querySelector('.reel-stack');
  if (deck) rise(deck, T + 150, 40, 1000);
  const hi = document.querySelector('.hero-hi');
  if (hi) rise(hi, T + 350, 16);
  const heroFirst = document.querySelector('.hero-first');
  const heroLast = document.querySelector('.hero-last');
  [heroFirst, heroLast].forEach(el => el && show(el));
  if (heroFirst) letters([...heroFirst.querySelectorAll('.ch')], T + 400, 40);
  if (heroLast) letters([...heroLast.querySelectorAll('.ch')], T + 600, 40);
  const role = document.querySelector('.hero-role');
  if (role) rise(role, T + 900, 16);
  const bar = document.querySelector('.hero-bar');
  if (bar) rise(bar, T + 1100, 12);

  // ---- Resto della pagina, allo scorrimento ----
  const heads = [...document.querySelectorAll('.section-head')];
  const items = [...document.querySelectorAll('.tile, .tile-cap, .controls, .pills li, .bio-lead, .bio-text, .services li, .sectors .label, .form .field, .form-end, .big-mail, .footer-top > *, .footer-legal')]
    .filter(el => !el.closest('.hero') && !el.closest('[data-travel]')); // gli Scatti si animano da soli (travel)

  const io = new IntersectionObserver(entries => {
    const visible = entries.filter(e => e.isIntersecting).map(e => e.target);
    // In ordine di pagina, così la cascata va dall'alto in basso e da sinistra a destra
    visible.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    let n = 0;
    visible.forEach(el => {
      io.unobserve(el);
      if (el.classList.contains('section-head')) {
        show(el);
        // corsivi e parole grandi, uno dopo l'altro (nelle intestazioni normali sono solo due)
        let d = 100;
        el.querySelectorAll('.lead, .word').forEach(part => {
          if (part.classList.contains('lead')) { rise(part, d + 50, 20); d += 200; }
          else {
            show(part);
            const chs = [...part.querySelectorAll('.ch')];
            letters(chs, d, 40);
            d += Math.min(chs.length * 40, 400);
          }
        });
      } else {
        rise(el, Math.min(n, 8) * 80);
        n++;
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

  [...heads, ...items].forEach(el => io.observe(el));
})();

/* ---------- Intro: logo al centro ----------
   1) il logo compare a scatti (0,25 s)  2) batte le ali come uno sprite retrò (0,72 s)
   3) rimpicciolisce e vola al suo posto nell'header mentre lo sfondo nero svanisce (0,5 s)
   4) il sito parte: intanto l'apertura entra (vedi "reveal"). Totale circa 1,5 s. */
(function intro() {
  const root = document.documentElement;
  const screen = document.querySelector('[data-intro]');
  if (!screen) return;
  if (!root.classList.contains('has-intro')) { screen.remove(); return; }
  const logo = screen.querySelector('svg');
  const target = document.querySelector('.site-header .logo svg');

  logo.animate(
    [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'scale(1)' }],
    { duration: 250, easing: 'steps(3, end)', fill: 'backwards' }
  );
  setTimeout(() => screen.classList.add('is-flapping'), 220);

  setTimeout(() => {
    screen.classList.remove('is-flapping');
    if (target) {
      const a = logo.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      const x = (b.left + b.width / 2) - (a.left + a.width / 2);
      const y = (b.top + b.height / 2) - (a.top + a.height / 2);
      logo.animate(
        [{ transform: 'none' }, { transform: `translate(${x}px, ${y}px) scale(${b.width / a.width})` }],
        { duration: 520, easing: 'cubic-bezier(.7, 0, .2, 1)', fill: 'forwards' }
      );
    }
    screen.animate(
      [{ backgroundColor: 'rgb(0, 0, 0)' }, { backgroundColor: 'rgba(0, 0, 0, 0)' }],
      { duration: 520, easing: 'ease-in-out', fill: 'forwards' }
    );
  }, 960);

  setTimeout(() => {
    root.classList.remove('has-intro');
    screen.remove();
  }, 1500);
})();


/* ---------- Tornando indietro si riparte dove eri ----------
   Es. home → pagina di un lavoro → "indietro": la home torna allo stesso punto dei Lavori.
   (Il browser da solo non ci riesce: la griglia si compone dopo il caricamento.) */
(function keepScroll() {
  const key = 'y:' + location.pathname;
  window.addEventListener('pagehide', () => {
    try { sessionStorage.setItem(key, String(Math.round(window.scrollY))); } catch (e) {}
  });
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (!nav || nav.type !== 'back_forward') return;
  let y = null;
  try { y = sessionStorage.getItem(key); } catch (e) {}
  if (y === null) return;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const go = () => requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: +y, behavior: 'instant' })));
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
})();
