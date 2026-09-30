/* editors.js — editors page only: reveal-on-scroll for the tool cards (same behaviour as learn.html). */
(function () {
  var cards = [].slice.call(document.querySelectorAll('.ide-card'));
  if (!cards.length || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.documentElement.classList.add('js-reveal');
  /* stagger inside each row of the grid (2 columns on desktop, 1 on mobile) */
  cards.forEach(function (c) {
    var i = cards.indexOf(c) - cards.indexOf(c.closest('.ide-grid').querySelector('.ide-card'));
    c.style.transitionDelay = Math.min(i % 2, 1) * 70 + 'ms';
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var t = e.target;
      t.classList.add('in');
      io.unobserve(t);
      /* after the reveal, drop the delay so hover/press never lag */
      setTimeout(function () { t.style.transitionDelay = ''; t.classList.add('rdy'); }, (parseFloat(t.style.transitionDelay) || 0) + 650);
    });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  cards.forEach(function (c) { io.observe(c); });
})();
