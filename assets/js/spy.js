/* spy.js — "you are here" highlighting.
   Home page: the header link of the section on screen.  Inner pages: the sticky sub-nav chips. */
(function () {
  var header = document.querySelector('header');

  /* home: header nav follows the section in view */
  if (document.body.dataset.page === 'home' && 'IntersectionObserver' in window) {
    var links = [].slice.call(document.querySelectorAll('nav.links a'));
    var active = null;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) active = en.target.id;
        else if (active === en.target.id) active = null;
      });
      links.forEach(function (a) { a.classList.toggle('on', a.dataset.sec === active); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { io.observe(s); });

    /* header tab of a section that also has its own page:
       first click scrolls to the section, and clicking it again while you're on it opens its page */
    var PAGES = { hardware: 'specs.html', extensions: 'extensions.html', platforms: 'learn.html', editors: 'editors.html' };
    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var page = PAGES[a.dataset.sec];
        if (!page || !a.classList.contains('on')) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
        e.preventDefault();
        location.href = page;
      });
    });
  }

  /* inner pages: sub-nav chips follow the scroll position */
  var sub = document.querySelector('.subnav');
  if (!sub) return;
  var chips, targets;
  function collect() {
    chips = [].slice.call(sub.querySelectorAll('a[href^="#"]'));
    targets = chips.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  }
  collect();
  var queued = false, last = -2;
  /* while a chip-click jump is scrolling, keep the highlight on the chip that was clicked
     instead of flashing through every chip in between (and re-centring the strip for each one) */
  var lock = -1, lockT = null;
  function armLock(ms) { clearTimeout(lockT); lockT = setTimeout(unlock, ms); }
  function unlock() { clearTimeout(lockT); if (lock >= 0) { lock = -1; queue(); } }

  /* centre the active chip inside the (horizontally scrollable) sub-nav.
     Deliberately not scrollIntoView(): it also scrolls the page and cancels an in-progress smooth jump. */
  function centre(a) {
    if (sub.scrollWidth <= sub.clientWidth) return;
    var c = a.getBoundingClientRect(), s = sub.getBoundingClientRect();
    sub.scrollTo({ left: sub.scrollLeft + (c.left + c.width / 2) - (s.left + s.width / 2), behavior: 'smooth' });
  }

  function update() {
    queued = false;
    var cur = -1;
    if (lock >= 0 && lock < targets.length) cur = lock;
    else {
      var line = header.offsetHeight + sub.offsetHeight + 24;
      targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= line) cur = i; });
      if (targets.length && targets[targets.length - 1] && innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = targets.length - 1;
    }
    if (cur === last) return;
    last = cur;
    chips.forEach(function (a, i) {
      var on = i === cur;
      a.classList.toggle('on', on);
      if (on) { a.setAttribute('aria-current', 'true'); centre(a); }
      else a.removeAttribute('aria-current');
    });
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  addEventListener('scroll', function () { if (lock >= 0) armLock(140); queue(); }, { passive: true });
  addEventListener('resize', queue);
  /* the browser still does the jump itself (hash, focus, smooth scroll); this only remembers which chip was asked for */
  sub.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    var a = e.target.closest('a[href^="#"]');
    var i = a ? chips.indexOf(a) : -1;
    if (i < 0) return;
    lock = i; armLock(220); queue(); /* 220ms: enough for the smooth scroll to start emitting scroll events */
  });
  /* the person takes over the scrolling: drop the lock at once */
  ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { addEventListener(ev, unlock, { passive: true }); });
  /* pages that rebuild their sub-nav (extensions store tabs) fire this after re-rendering */
  addEventListener('subnav:refresh', function () { collect(); last = -2; update(); });
  update();
})();
