/* copy.js — click a DNS address to copy it (home + dns.html). */
(function () {
  document.querySelectorAll('.addr').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.copy;
      if (b.dataset.label === undefined) b.dataset.label = b.textContent;
      var old = b.dataset.label;
      function ok() {
        b.classList.add('done'); b.textContent = 'تم النسخ ✓';
        clearTimeout(b._t);
        b._t = setTimeout(function () { b.classList.remove('done'); b.textContent = old; }, 1200);
      }
      function fallback() {
        var a = document.createElement('textarea');
        a.value = t; a.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(a); a.select();
        try { document.execCommand('copy'); ok(); } catch (e) {}
        document.body.removeChild(a);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, fallback);
      else fallback();
    });
  });
})();
