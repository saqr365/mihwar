/* core.js — theme toggle, mobile drawer, header metrics, back-to-top. Loaded on every page. */
(function () {
  var root = document.documentElement;

  /* keep --hh / --sh (header and sub-nav heights) in sync, so sticky bars and anchor jumps line up */
  var header = document.querySelector('header');
  function measure() {
    var s = document.querySelector('.subnav');
    root.style.setProperty('--hh', header.offsetHeight + 'px');
    root.style.setProperty('--sh', (s ? s.offsetHeight : 0) + 'px');
  }
  measure();
  addEventListener('resize', measure);
  addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  /* theme (the saved value is applied early by the inline snippet in <head>) */
  var themeBtn = document.getElementById('themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var t = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = t;
    try { localStorage.setItem('mihwar-theme', t); } catch (e) {}
    var m = document.querySelector('meta[name=theme-color]');
    if (m) m.content = t === 'light' ? '#F5F1E8' : '#0B0F16';
  });

  /* mobile drawer */
  var d = document.getElementById('drawer'), b = document.getElementById('menuBtn'), lockY = 0;
  function set(open) {
    if (open === d.classList.contains('open')) return; /* Escape / breakpoint change while already closed must not touch scroll */
    d.classList.toggle('open', open);
    b.setAttribute('aria-expanded', open);
    b.querySelector('use').setAttribute('href', open ? '#x' : '#menu');
    var s = document.body.style;
    if (open) {
      lockY = window.scrollY || document.documentElement.scrollTop || 0;
      s.position = 'fixed'; s.top = (-lockY) + 'px'; s.left = '0'; s.right = '0'; s.width = '100%';
    } else {
      s.position = ''; s.top = ''; s.left = ''; s.right = ''; s.width = '';
      /* html has scroll-behavior:smooth: restore the position instantly, otherwise the page visibly scrolls up from 0 */
      var de = document.documentElement, prev = de.style.scrollBehavior;
      de.style.scrollBehavior = 'auto';
      window.scrollTo(0, lockY);
      de.style.scrollBehavior = prev;
    }
  }
  b.addEventListener('click', function () { set(!d.classList.contains('open')); });
  d.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  matchMedia('(min-width:1101px)').addEventListener('change', function (e) { if (e.matches) set(false); });

  /* smart tooltip placement: flip below the icon when there isn't enough room above it */
  var tips = document.querySelectorAll('[data-tip]');
  function placeTip() {
    var r = this.getBoundingClientRect();
    this.classList.toggle('tip-below', r.top < 60);
  }
  for (var ti = 0; ti < tips.length; ti++) {
    tips[ti].addEventListener('mouseenter', placeTip);
    tips[ti].addEventListener('focus', placeTip);
  }

  /* back-to-top */
  var topBtn = document.getElementById('topBtn'), topT = null;
  function onScroll() {
    topBtn.classList.remove('show');
    clearTimeout(topT);
    topT = setTimeout(function () { if (window.scrollY > 150) topBtn.classList.add('show'); }, 350);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  topBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
})();
