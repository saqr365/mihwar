/* home.js — home page only: reveal-on-scroll, stat counters, budget-tier tabs. */
(function () {
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- reveal on scroll ---- */
  var revealSel = '.card,.tile,.atile,.spec,.idewin,.row,.track,.stat,.cert,.refitem,.ccard,.xw';
  var els = Array.prototype.slice.call(document.querySelectorAll(revealSel));
  if (els.length && !reduced && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-reveal');
    var counters = new WeakMap();
    els.forEach(function (el) {
      var p = el.parentElement;
      var i = counters.get(p) || 0;
      counters.set(p, i + 1);
      el.style.transitionDelay = Math.min(i, 5) * 45 + 'ms'; /* max 225ms so the last cards of a grid don't lag behind the scroll */
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var t = e.target;
          t.classList.add('in');
          io.unobserve(t);
          /* once the reveal has finished, drop the stagger delay so it can't lag the tilt */
          setTimeout(function () {
            t.style.transitionDelay = '';
            t.classList.add('rdy');
          }, (parseFloat(t.style.transitionDelay) || 0) + 650);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) {
      el.classList.add('rdy');
      if (el.classList.contains('track')) el.classList.add('in');
    });
  }

  /* ---- animated stat counters (hero numbers, Latin digits) ---- */
    function toLatin(s) { return s; }
  function toArabic(n) { return String(Math.round(n)); } /* Latin digits site-wide (name kept for the callers below) */
  document.querySelectorAll('.stat b').forEach(function (el) {
    var target = parseInt(toLatin(el.textContent), 10);
    if (!target && target !== 0) return;
    if (reduced) return;
    var start = null, dur = 900;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = toArabic(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = toArabic(0);
    requestAnimationFrame(step);
  });

  /* ---- glossary count badge (visible items only) ---- */
  function updateGlossaryCount() {
    var b = document.querySelector('.subnav a[href="#glossary"] b');
    if (!b) return;
    var n = 0;
    document.querySelectorAll('#glossary .gitem').forEach(function (i) { if (i.style.display !== 'none') n++; });
    b.textContent = toArabic(n);
  }
  updateGlossaryCount();
  /* ---- device-type tabs (hardware specs) ---- */
  var deviceTabs = document.querySelectorAll('.device-tab');
  if (deviceTabs.length) {
    deviceTabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.classList.contains('on')) return;
        deviceTabs.forEach(function (b) { b.classList.toggle('on', b === btn); b.setAttribute('aria-selected', b === btn); });
        var device = btn.dataset.device;
        document.querySelectorAll('.specs[data-device]').forEach(function (grid) {
          grid.style.display = (grid.dataset.device === device) ? '' : 'none';
        });
        document.querySelectorAll('.glossary .gitem[data-device]').forEach(function (item) {
          item.style.display = (item.dataset.device === device) ? '' : 'none';
        });
        updateGlossaryCount();
      });
    });
  }
  /* ---- budget-tier tabs (hardware specs) ---- */
  var tabs = document.querySelectorAll('.tier-tab[data-tier]');
  if (tabs.length) {
    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.classList.contains('on')) return;
        tabs.forEach(function (b) { b.classList.toggle('on', b === btn); b.setAttribute('aria-selected', b === btn); });
        var tier = btn.dataset.tier;
        document.querySelectorAll('.specs .spec p[data-' + tier + ']').forEach(function (p) {
          var next = p.dataset[tier];
          clearTimeout(p._swap); /* rapid clicks: drop the pending swap so an older tier's text can't flash in */
          if (reduced) { p.textContent = next; p.classList.remove('fade'); return; }
          p.classList.add('fade');
          p._swap = setTimeout(function () { p.textContent = next; p.classList.remove('fade'); }, 160);
        });
      });
    });
  }
  /* ---- keyboard for the spec tab groups: arrows move between tabs (RTL-aware), only the selected tab is in the Tab order ---- */
  document.querySelectorAll('.tier-tabs[role="tablist"]').forEach(function (list) {
    var items = [].slice.call(list.querySelectorAll('[role="tab"]'));
    function sync() { items.forEach(function (t) { t.tabIndex = t.classList.contains('on') ? 0 : -1; }); }
    sync();
    list.addEventListener('click', sync);
    list.addEventListener('keydown', function (e) {
      var i = items.indexOf(document.activeElement);
      if (i < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
      var rtl = getComputedStyle(list).direction === 'rtl', n;
      if (e.key === 'ArrowRight') n = i + (rtl ? -1 : 1);
      else if (e.key === 'ArrowLeft') n = i + (rtl ? 1 : -1);
      else return;
      e.preventDefault();
      n = (n + items.length) % items.length;
      items[n].focus();
      items[n].click(); /* activate on focus, the same as a mouse click */
    });
  });
  /* ---- DNS setup tabs: same auto-tour idea as the editors above — starts once this block scrolls into
     view (and replays every re-entry), waits a few seconds on each platform, then moves to the next one
     in order (router → windows → android → iphone → router…); a manual click just restarts the tour
     from whichever tab was clicked. ---- */
  var st = document.querySelectorAll('.stab');
  var stPanels = document.querySelectorAll('.sp');
  function showStab(b) {
    st.forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
    stPanels.forEach(function (p) { p.hidden = p.dataset.m !== b.dataset.m; });
  }
  var stToken = null;
  /* the tour only runs while the "طريقة الضبط حسب جهازك" block is actually expanded — while it's folded
     shut nothing switches behind the scenes; opening it resumes, closing it pauses. */
  var stDetails = document.querySelector('.dns-setup details');
  function stCanRun() { return !stDetails || stDetails.open; }
  var stVisible = false;
  function stApplyState() {
    if (stVisible && stCanRun()) {
      if (stToken && !stToken.cancelled) {
        stToken.resume();
      } else {
        var onIdx = 0;
        st.forEach(function (b, i) { if (b.classList.contains('on')) onIdx = i; });
        startStabCycle(onIdx);
      }
    } else if (stToken && !stToken.cancelled) {
      stToken.pause();
    }
  }
  /* same pause/resume idea as the code-editor tour: leaving it mid-wait (hover, or scrolling the block out
     of view) freezes the countdown to the next platform exactly where it is, instead of cancelling it —
     coming back resumes that same wait rather than giving the current tab a fresh 4200ms from zero. */
  function startStabCycle(fromIndex) {
    if (reduced || !st.length || !stCanRun()) return;
    if (stToken) stToken.cancelled = true;
    var token = { cancelled: false, paused: false, waitTimer: null, waitStart: 0, waitRemaining: 0 };
    stToken = token;
    var idx = fromIndex;
    function scheduleNext(ms) {
      token.waitStart = Date.now();
      token.waitRemaining = ms;
      token.waitTimer = setTimeout(function () {
        if (token.cancelled) return;
        token.waitTimer = null;
        if (!stCanRun()) { token.paused = true; token.waitRemaining = 0; return; }
        idx = (idx + 1) % st.length;
        step();
      }, ms);
    }
    function step() {
      if (token.cancelled) return;
      showStab(st[idx]);
      scheduleNext(4200);
    }
    step();
    token.pause = function () {
      if (token.paused || !token.waitTimer) return;
      token.paused = true;
      token.waitRemaining -= Date.now() - token.waitStart;
      clearTimeout(token.waitTimer);
      token.waitTimer = null;
    };
    token.resume = function () {
      if (!token.paused) return;
      token.paused = false;
      scheduleNext(Math.max(token.waitRemaining, 0));
    };
  }
  st.forEach(function (b, i) {
    b.addEventListener('click', function () {
      showStab(b);
      startStabCycle(i);
    });
    /* hovering the currently-open tab's own title also pauses the auto-tour (not just hovering the
       content panel below it); moving off it resumes from the exact same wait, not from zero. */
    b.addEventListener('mouseenter', function () {
      if (b.classList.contains('on') && stToken && !stToken.cancelled) stToken.pause();
    });
    b.addEventListener('mouseleave', function () {
      if (!b.classList.contains('on')) return;
      if (stToken && !stToken.cancelled) {
        stToken.resume();
      } else {
        var onIdx = 0;
        st.forEach(function (x, ix) { if (x.classList.contains('on')) onIdx = ix; });
        startStabCycle(onIdx);
      }
    });
  });
  var stSection = document.querySelector('.dns-setup');
  if (stSection && !reduced && 'IntersectionObserver' in window) {
    var stIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { stVisible = e.isIntersecting; });
      stApplyState();
    }, { threshold: .3 });
    stIo.observe(stSection);
    if (stDetails) stDetails.addEventListener('toggle', stApplyState);
  }
  var stPanel = document.querySelector('.spanel');
  if (stPanel) {
    stPanel.addEventListener('mouseenter', function () {
      if (stToken && !stToken.cancelled) stToken.pause();
    });
    stPanel.addEventListener('mouseleave', function () {
      if (stToken && !stToken.cancelled) {
        stToken.resume();
      } else {
        var onIdx = 0;
        st.forEach(function (b, i) { if (b.classList.contains('on')) onIdx = i; });
        startStabCycle(onIdx);
      }
    });
  }
  /* ---- DNS provider cards: segmented tab switch per filtering mode ---- */
  document.querySelectorAll('.dnscard').forEach(function (card) {
    var tabs = card.querySelectorAll('.dtab');
    var panels = card.querySelectorAll('.dpanel');
    tabs.forEach(function (b) {
      b.addEventListener('click', function () {
        tabs.forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
        panels.forEach(function (p) { p.classList.toggle('on', p.dataset.v === b.dataset.v); });
      });
    });
  });
  /* ---- editors: sliding highlight behind the active platform tab ---- */
  /* true only while the editor window is actually on screen; every timer in the editors section (tab tour AND
     letter-by-letter typing) holds still while it's false and picks up exactly where it stopped when it's true */
  var edVisible = true;
  /* timestamp until which the visitor is considered mid-typing; hover-leave must not restart the tour before it */
  var edTypingUntil = 0;
  var edSh = document.querySelector('.ideshelf');
  if (edSh) {
    var edBg = edSh.querySelector('.idetab-bg');
    var edTabs = edSh.querySelector('.idetabs');
    var edWin = edSh.querySelector('.idewin');
    var edInputs = Array.prototype.slice.call(edSh.querySelectorAll('.edt'));
    var edSyncH = function () {}; /* replaced below once the per-tab heights are measured */
    var moveEdBg = function () {
      edSyncH();
      var on = edSh.querySelector('.edt:checked');
      if (!on || !edBg) return;
      var lb = edSh.querySelector('label[for="' + on.id + '"]');
      if (!lb) return;
      edBg.style.width = lb.offsetWidth + 'px';
      /* the highlight lives inside the scrolling tab strip, so it already scrolls with the labels:
         position it by offsetLeft alone (subtracting scrollLeft double-counted the scroll on narrow screens) */
      edBg.style.transform = 'translateX(' + lb.offsetLeft + 'px)';
      /* keep the active tab in view when the strip is scrollable (phones) — direction-agnostic, no page scroll */
      if (edTabs && edTabs.scrollWidth > edTabs.clientWidth + 1) {
        var lr = lb.getBoundingClientRect(), tr = edTabs.getBoundingClientRect();
        var delta = (lr.left + lr.width / 2) - (tr.left + tr.width / 2);
        if (Math.abs(delta) > 1) edTabs.scrollBy({ left: delta, behavior: reduced ? 'auto' : 'smooth' });
      }
      var tc = lb.style.getPropertyValue('--tc');
      if (tc) {
        edBg.style.setProperty('--tc', tc);
        if (edWin) edWin.style.setProperty('--c', tc);
      }
    };
    var paneFor = function (input) {
      return edSh.querySelector('.idepane[data-p="' + input.id.replace('edt-', '') + '"]');
    };
    if (!reduced) {
      /* once started (by scrolling the editor into view, or by clicking a tab), it keeps touring all four
         platforms on its own: type a pane out, pause a couple of seconds, switch to the next tab — online →
         windows → android → iphone — then loop back around to online again, on and on. */
      var autoToken = null;
      /* a token that can be genuinely paused mid-wait (not just cancelled): scheduleWait() behaves like
         setTimeout but if paused before it fires, it remembers the remaining time and resumes with exactly
         that much left, rather than losing the wait entirely. This only ever pauses the gap *between*
         platforms — while a line is actively being typed (token.waitTimer is unset, because scheduleWait()
         hasn't been called yet for that pane), pause()/resume() are deliberately no-ops: hovering must never
         freeze or restart the letter-by-letter typing itself, only hold off the next tab switch. */
      var makeToken = function () {
        var token = { cancelled: false, paused: false, waitTimer: null, waitStart: 0, waitRemaining: 0, waitFn: null };
        token.scheduleWait = function (ms, fn) {
          token.waitStart = Date.now();
          token.waitRemaining = ms;
          token.waitFn = fn;
          if (!edVisible) { token.paused = true; token.waitTimer = null; return; }
          token.waitTimer = setTimeout(function () {
            if (token.cancelled) return;
            token.waitTimer = null;
            fn();
          }, ms);
          /* the mouse may already be resting on the label/pane from before this wait even started (e.g. it
             was still typing when hover began) — mouseenter won't fire again while it just sits there, so
             without this check the wait would run out unpaused despite the pointer never having left. */
          if (edHoverCount > 0) token.pause();
        };
        token.pause = function () {
          if (token.paused || !token.waitTimer) return;
          token.paused = true;
          token.waitRemaining -= Date.now() - token.waitStart;
          clearTimeout(token.waitTimer);
          token.waitTimer = null;
        };
        token.resume = function () {
          if (!token.paused || !edVisible) return;
          token.paused = false;
          token.scheduleWait(Math.max(token.waitRemaining, 0), token.waitFn);
        };
        return token;
      };
      var startAutoCycle = function (fromIndex) {
        if (autoToken) autoToken.cancelled = true;
        var token = makeToken();
        autoToken = token;
        var idx = fromIndex;
        function step() {
          if (token.cancelled) return;
          var input = edInputs[idx];
          if (!input.checked) { input.checked = true; moveEdBg(); }
          /* switching tabs only cancels the *outer* tour token above — a still-typing previous pane keeps its
             own timer chain alive in the background otherwise (harmless once hidden, but wasted timers/CPU
             until it finishes on its own). Cancel every other pane's cascade explicitly before starting this one. */
          edInputs.forEach(function (otherInput) {
            if (otherInput === input) return;
            var otherPane = paneFor(otherInput);
            if (otherPane && otherPane._typeToken) otherPane._typeToken.cancelled = true;
          });
          typeCascade(paneFor(input), function () {
            if (token.cancelled) return;
            token.scheduleWait(3800, function () {
              idx = (idx + 1) % edInputs.length;
              step();
            });
          });
        }
        step();
      };
      var edHoverCount = 0;
      function edHoverEnter() {
        edHoverCount++;
        if (edHoverCount === 1 && autoToken && !autoToken.cancelled) autoToken.pause();
      }
      function edHoverLeave() {
        edHoverCount = Math.max(0, edHoverCount - 1);
        if (edHoverCount === 0 && autoToken && !autoToken.cancelled && Date.now() > edTypingUntil) autoToken.resume();
      }
      edInputs.forEach(function (inp, idx) {
        inp.addEventListener('change', function () { moveEdBg(); startAutoCycle(idx); });
        /* hovering the currently-open tab's own title also pauses the gap before the next tab switch (not
           hovering the pane below it, that's handled separately below); moving off it resumes with whatever
           time was left. Typing itself is untouched either way — see makeToken's comment above. */
        var lb = edSh.querySelector('label[for="' + inp.id + '"]');
        if (lb) {
          lb.addEventListener('mouseenter', function () { if (inp.checked) edHoverEnter(); });
          lb.addEventListener('mouseleave', function () {
            if (!inp.checked) return;
            edHoverLeave();
            /* no "else startAutoCycle" here: autoToken is only ever cancelled by manual typing in the
               trailing input line (see edTypeIdle below), and that already has its own dedicated restart
               timer — forcing a restart here would replay the whole cascade over the user's own typing
               the moment the mouse happens to leave the tab label mid-edit. */
          });
        }
      });
      /* scrolling the editor out of view pauses the gap before the next tab switch the same way hovering
         does (and for the same reason: never the typing itself) — scrolling back resumes it with whatever
         time was left, rather than restarting the tour from the top. */
      if (edWin && 'IntersectionObserver' in window) {
        var edIo = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            edVisible = e.isIntersecting;
            edInputs.forEach(function (inp) {
              var pt = paneFor(inp) && paneFor(inp)._typeToken;
              if (!pt || pt.cancelled || pt.finished || !pt.pause) return;
              if (e.isIntersecting) pt.resume(); else pt.pause();
            });
            if (e.isIntersecting) {
              if (autoToken && !autoToken.cancelled) {
                autoToken.resume();
              } else {
                var onIdx = 0;
                edInputs.forEach(function (inp, ix) { if (inp.checked) onIdx = ix; });
                startAutoCycle(onIdx);
              }
            } else if (autoToken && !autoToken.cancelled) {
              autoToken.pause();
            }
          });
        }, { threshold: .3 });
        edIo.observe(edWin);
      }
    } else {
      edInputs.forEach(function (inp) { inp.addEventListener('change', moveEdBg); });
    }
    window.addEventListener('resize', moveEdBg);
    moveEdBg();
    /* each tab keeps its OWN fixed height, sized to that pane's content (its lines + trailing input line). While a
       pane is being typed its lines don't exist yet (display:none), so the window used to grow line by line —
       pushing everything below it up and down. Each pane is measured from an off-screen clone with all its text in
       place; the result is stored per pane and applied as the body's min-height whenever that tab is active. */
    var edBody = edSh.querySelector('.idebody');
    var edHeights = {};
    edSyncH = function () {
      if (!edBody) return;
      var on = edSh.querySelector('.edt:checked');
      var h = on && edHeights[on.id.replace('edt-', '')];
      if (h) edBody.style.minHeight = h + 'px';
    };
    var reserveEdHeight = function () {
      if (!edBody) return;
      Array.prototype.forEach.call(edBody.querySelectorAll(':scope > .idepane'), function (pane) {
        var c = pane.cloneNode(true);
        c.style.cssText = 'display:flex;visibility:hidden;position:absolute;top:0;inset-inline:0;pointer-events:none';
        Array.prototype.forEach.call(c.querySelectorAll('.ideln'), function (l) {
          l.style.display = '';
          l.style.animation = 'none';
          var nm = l.querySelector('.nm');
          if (nm && nm.dataset.full !== undefined) nm.textContent = nm.dataset.full;
        });
        var cc = c.querySelector(':scope > .idecur');
        if (cc) cc.style.display = '';
        edBody.appendChild(c);
        edHeights[pane.getAttribute('data-p')] = c.offsetHeight;
        edBody.removeChild(c);
      });
      edSyncH();
    };
    reserveEdHeight();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reserveEdHeight);
    var edRW = window.innerWidth, edRT;
    window.addEventListener('resize', function () {
      if (window.innerWidth === edRW) return; /* ignore mobile URL-bar height changes */
      edRW = window.innerWidth;
      clearTimeout(edRT);
      edRT = setTimeout(reserveEdHeight, 150);
    });
    /* hover-pause only exists when the auto tour does (edHoverEnter/edHoverLeave are defined in the !reduced branch) */
    if (!reduced) edSh.querySelectorAll('.idepane').forEach(function (pane) {
      pane.addEventListener('mouseenter', edHoverEnter);
      pane.addEventListener('mouseleave', function () {
        edHoverLeave();
        /* same reasoning as the tab-label mouseleave above: never force-restart the cascade here. The only
           thing that cancels autoToken is the user typing into the trailing input line, and moving the mouse
           off the pane mid-edit (or right after) must not wipe that out and replay the preset lines again —
           edTypeIdle below is what's responsible for resuming the tour once typing has actually stopped. */
      });
    });
  }
  /* ---- editors: the preset lines in each pane are created one at a time and typed in letter by letter —
     line 2 doesn't even exist on screen until line 1 is fully typed, then it's created and typed, and so on;
     the trailing input line appears only once every preset line is done. Runs on scroll-into-view / tab switch,
     then hands off to the auto-tour above via its optional "done" callback. ---- */
  function typeCascade(pane, done) {
    if (!pane) return;
    /* every line in the pane is typed in DOM order: the preset lines, then any lines the visitor committed by
       hand (.idewritten), and finally the text sitting in the trailing input line (.idecur) — so when a tab
       comes around again, the visitor's own text is "typed" back in letter by letter exactly like the rest. */
    var cur = pane.querySelector(':scope > .idecur');
    var prev = pane._typeToken;
    /* coming back to a tab that holds text the visitor left in the trailing input line: that text becomes a
       committed line (as if they'd pressed Enter) and the input drops to a fresh empty numbered line below it.
       If the last cascade was cut short, cur._full is the real text, not what's half-typed on screen. */
    if (cur) {
      var cNo = cur.querySelector(':scope > .no'), cCaret = cur.querySelector(':scope > .caret');
      if (cNo && cCaret) {
        var pending = (prev && !prev.finished && cur._full !== undefined) ? cur._full : getTypedText(cur, cNo, cCaret);
        if (pending.trim().length) {
          pane.insertBefore(makeWrittenLine(cNo.textContent, pending), cur);
          var nn = (parseInt(cNo.textContent, 10) || 0) + 1;
          cNo.textContent = nn < 10 ? '0' + nn : String(nn);
          clearCurLine(cur, cNo, cCaret);
          cur.insertBefore(document.createTextNode(''), cCaret);
          cur._full = '';
        }
      }
    }
    var lines = Array.prototype.slice.call(pane.querySelectorAll(':scope > .ideln'));
    if (!lines.length) return;
    /* a cascade that was cut short (tab switched away mid-typing) leaves half-typed text in the DOM; in that
       case the full texts remembered from when it started are the truth, not what's currently on screen. */
    var interrupted = !!(prev && !prev.finished);
    if (prev) prev.cancelled = true;
    var token = { cancelled: false, paused: false, timer: null, pendingAction: null, finished: false };
    pane._typeToken = token;
    var curNo = cur && cur.querySelector(':scope > .no');
    var curCaret = cur && cur.querySelector(':scope > .caret');
    lines.forEach(function (line) {
      var nm = line.querySelector('.nm');
      if (!nm) return;
      var written = line.classList.contains('idewritten');
      if (nm.dataset.full === undefined || (written && !interrupted)) nm.dataset.full = nm.textContent;
    });
    if (cur && curNo && curCaret && (!interrupted || cur._full === undefined)) {
      cur._full = getTypedText(cur, curNo, curCaret);
    }
    if (reduced) {
      lines.forEach(function (line) {
        line.style.display = '';
        var nm = line.querySelector('.nm');
        if (nm) nm.textContent = nm.dataset.full;
      });
      if (cur) cur.style.display = '';
      token.finished = true;
      if (typeof done === 'function') done();
      return;
    }
    lines.forEach(function (line) {
      line.style.display = 'none';
      var nm = line.querySelector('.nm');
      if (nm) nm.textContent = '';
    });
    if (cur) {
      cur.style.display = 'none';
      if (curNo && curCaret) {
        clearCurLine(cur, curNo, curCaret);
        cur.insertBefore(document.createTextNode(''), curCaret);
      }
    }
    var i = 0;
    /* every stage below (a fresh line, or a char tick) records itself as token.pendingAction right when it
       schedules its own next timer. token.pause() clears that live timer without losing track of it; resume()
       just calls pendingAction again — so typing picks back up on the exact same character of the exact same
       line, instead of the line (or the whole cascade) restarting from its beginning. */
    function finish() {
      token.timer = null;
      token.finished = true;
      if (typeof done === 'function') done();
    }
    function typeCur() {
      if (token.cancelled) return;
      if (token.paused) { token.pendingAction = typeCur; return; }
      var full = cur ? (cur._full || '') : '';
      var slot = null;
      if (cur && curNo && curCaret) {
        Array.prototype.forEach.call(cur.childNodes, function (n) {
          if (!slot && n !== curNo && n !== curCaret && n.nodeType === 3) slot = n;
        });
      }
      if (!slot || !full) { finish(); return; }
      var c = 0;
      (function tick() {
        if (token.cancelled) return;
        if (token.paused) { token.pendingAction = tick; return; }
        c++;
        slot.data = full.slice(0, c);
        if (c < full.length) {
          token.timer = setTimeout(tick, 46 + Math.random() * 52);
          token.pendingAction = tick;
        } else {
          finish();
        }
      })();
    }
    function typeLine() {
      if (token.cancelled) return;
      if (token.paused) { token.pendingAction = typeLine; return; }
      if (i >= lines.length) {
        token.timer = null;
        if (cur) cur.style.display = '';
        if (cur && cur._full) {
          token.timer = setTimeout(typeCur, 240);
          token.pendingAction = typeCur;
        } else {
          finish();
        }
        return;
      }
      var line = lines[i];
      line.style.display = '';
      var nm = line.querySelector('.nm');
      if (!nm) { i++; typeLine(); return; }
      var full = nm.dataset.full || '';
      line.classList.add('typing');
      var c = 0;
      (function tick() {
        if (token.cancelled) return;
        if (token.paused) { token.pendingAction = tick; return; }
        c++;
        nm.textContent = full.slice(0, c);
        if (c < full.length) {
          token.timer = setTimeout(tick, 46 + Math.random() * 52);
          token.pendingAction = tick;
        } else {
          line.classList.remove('typing');
          i++;
          token.timer = setTimeout(typeLine, 320);
          token.pendingAction = typeLine;
        }
      })();
    }
    token.pendingAction = typeLine;
    typeLine();
    token.pause = function () {
      if (token.paused || !token.timer) return;
      token.paused = true;
      clearTimeout(token.timer);
      token.timer = null;
    };
    token.resume = function () {
      if (!token.paused || !edVisible) return;
      token.paused = false;
      var fn = token.pendingAction;
      if (fn) fn();
    };
  }
  /* ---- editors: Enter on the typing line commits it as a plain code line and opens a fresh numbered line below;
     Backspace on an already-empty line removes it and drops back into the previous line for editing; clicking any
     committed line lets you edit its text normally. The blinking cursor element is never removed/recreated so its
     animation keeps running without a restart. ---- */
  document.querySelectorAll('.idecur').forEach(function (cur) {
    ensureCaretSlot(cur);
    var edTypeIdle = null;
    cur.addEventListener('keydown', function (e) {
      if (typeof autoToken !== 'undefined' && autoToken && !autoToken.cancelled) autoToken.pause();
      edTypingUntil = Date.now() + 2600;
      if (edTypeIdle) clearTimeout(edTypeIdle);
      edTypeIdle = setTimeout(function () {
        if (typeof autoToken !== 'undefined' && autoToken && !autoToken.cancelled) autoToken.resume();
      }, 2600);
      var no = cur.querySelector(':scope > .no');
      var caret = cur.querySelector(':scope > .caret');
      if (!no || !caret) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        var pane = cur.closest('.idepane');
        if (!pane) return;
        var curNo = no.textContent;
        var typed = getTypedText(cur, no, caret);
        pane.insertBefore(makeWrittenLine(curNo, typed), cur);
        var nextNum = (parseInt(curNo, 10) || 0) + 1;
        no.textContent = nextNum < 10 ? '0' + nextNum : String(nextNum);
        clearCurLine(cur, no, caret);
        var freshTn = document.createTextNode('');
        cur.insertBefore(freshTn, caret);
        placeCaret(freshTn, 0);
      } else if (e.key === 'Backspace' && getTypedText(cur, no, caret).length === 0) {
        e.preventDefault();
        var prev = cur.previousElementSibling;
        if (prev && prev.classList.contains('idewritten')) {
          var prevNo = prev.querySelector('.no').textContent;
          var prevText = prev.querySelector('.nm').textContent;
          prev.remove();
          no.textContent = prevNo;
          clearCurLine(cur, no, caret);
          var tn = document.createTextNode(prevText);
          cur.insertBefore(tn, caret);
          placeCaret(tn, tn.length);
        }
      }
    });
  });
  /* Enter inside an already-committed line must not split it into nested blocks: it just jumps to the trailing
     input line of the same pane (Enter there is what commits a new line). */
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.key !== 'Enter' || !t || !t.classList || !t.classList.contains('idewritten')) return;
    e.preventDefault();
    var pane = t.closest('.idepane');
    var cur = pane && pane.querySelector(':scope > .idecur');
    if (!cur) return;
    ensureCaretSlot(cur);
    var slot = null;
    Array.prototype.forEach.call(cur.childNodes, function (n) { if (n.nodeType === 3) slot = n; });
    if (slot) placeCaret(slot, slot.length);
  });
  /* committed (already-typed) lines are created with contenteditable="true" below, so clicking one and typing
     edits its text normally, the same as any other input. */
  function makeWrittenLine(lineNo, text) {
    var line = document.createElement('div');
    line.className = 'ideln idewritten';
    line.setAttribute('contenteditable', 'true');
    line.setAttribute('spellcheck', 'false');
    var noEl = document.createElement('span');
    noEl.className = 'no'; noEl.setAttribute('contenteditable', 'false'); noEl.textContent = lineNo;
    var nmEl = document.createElement('span');
    nmEl.className = 'nm'; nmEl.textContent = text;
    line.appendChild(noEl); line.appendChild(nmEl);
    return line;
  }
  function clearCurLine(cur, no, caret) {
    Array.prototype.slice.call(cur.childNodes).forEach(function (n) {
      if (n !== no && n !== caret) cur.removeChild(n);
    });
  }
  function getTypedText(cur, no, caret) {
    var t = '';
    Array.prototype.forEach.call(cur.childNodes, function (n) {
      if (n !== no && n !== caret) t += n.textContent;
    });
    return t;
  }
  function ensureCaretSlot(cur) {
    var no = cur.querySelector(':scope > .no'), caret = cur.querySelector(':scope > .caret');
    if (!no || !caret) return;
    var hasSlot = false;
    Array.prototype.forEach.call(cur.childNodes, function (n) { if (n !== no && n !== caret) hasSlot = true; });
    if (!hasSlot) cur.insertBefore(document.createTextNode(''), caret);
  }
  function placeCaret(node, offset) {
    if (!node) return;
    var range = document.createRange();
    range.setStart(node, offset || 0);
    range.collapse(true);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    if (node.parentElement) node.parentElement.focus();
  }

  /* ---- pointer glow + tilt on cards (desktop / fine-pointer only) ---- */
  if (!reduced && matchMedia('(pointer: fine)').matches) {
    document.documentElement.classList.add('js-tilt');
    var tiltMax = 4.5; /* degrees */
    document.querySelectorAll('.card,.tile,.atile,.spec,.tc,.cert').forEach(function (el) {
      var raf = null, rx = 0, ry = 0;
      function apply() {
        if (el.classList.contains('open') || el.classList.contains('atile')) { raf = null; return; } /* AI-tool cards: no tilt, icon+text stay put */
        el.style.transform = 'perspective(800px) translateY(-4px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
        raf = null;
      }
      el.addEventListener('mousemove', function (e) {
        if (el.classList.contains('open')) return; /* no tilt while a lane is expanded */
        var r = el.getBoundingClientRect();
        var px = ((e.clientX - r.left) / r.width) * 100;
        var py = ((e.clientY - r.top) / r.height) * 100;
        el.style.setProperty('--mx', px + '%');
        el.style.setProperty('--my', py + '%');
        rx = ((py / 100) - .5) * -tiltMax;
        ry = ((px / 100) - .5) * tiltMax;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
        el.style.removeProperty('--mx');
        el.style.removeProperty('--my');
      });
    });
  }

  /* ---- AI-tool card descriptions: on card hover, clipped text loops in a seamless marquee ---- */
  if (!reduced) {
    var smalls = document.querySelectorAll('.atile small');
    smalls.forEach(function (el) { el.setAttribute('data-txt', el.textContent); });
    var buildMarquee = function () {
      smalls.forEach(function (el) {
        var text = el.getAttribute('data-txt');
        el.classList.remove('has-mq');
        el.textContent = text;
        if (el.scrollWidth <= el.clientWidth + 1) return; /* fits already, leave as plain text */
        el.textContent = '';
        var track = document.createElement('span');
        track.className = 'mtrack';
        for (var i = 0; i < 2; i++) {
          var seg = document.createElement('span');
          seg.className = 'mseg';
          seg.textContent = text;
          if (i === 1) seg.setAttribute('aria-hidden', 'true');
          track.appendChild(seg);
        }
        el.appendChild(track);
        el.classList.add('has-mq');
      });
    };
    buildMarquee();
    /* re-measure once the web font is in (widths change) and when the viewport width changes */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildMarquee);
    var mqW = window.innerWidth, mqT;
    window.addEventListener('resize', function () {
      if (window.innerWidth === mqW) return; /* ignore mobile URL-bar height changes */
      mqW = window.innerWidth;
      clearTimeout(mqT);
      mqT = setTimeout(buildMarquee, 200);
    });
  }
})();

/* extensions showcase: auto-rotate between the pinned extensions.
   Pauses on mouse hover / keyboard focus / hidden tab / off-screen,
   and is skipped entirely for reduced-motion users. */
(function () {
  var w = document.querySelector('.xw');
  if (!w) return;
  var r = [].slice.call(w.querySelectorAll('input[name="x"]'));
  if (r.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var TIME = 6000, timer = null, hover = false, focus = false,
      seen = !('IntersectionObserver' in window);
  function next() {
    var i = r.findIndex(function (x) { return x.checked; });
    r[(i + 1) % r.length].checked = true;
  }
  function go() {
    clearInterval(timer); timer = null;
    if (!hover && !focus && seen && !document.hidden) timer = setInterval(next, TIME);
  }
  w.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hover = true; go(); } });
  w.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hover = false; go(); } });
  w.addEventListener('focusin', function (e) {
    var kb = false;
    try { kb = e.target.matches(':focus-visible'); } catch (x) {}
    if (kb) { focus = true; go(); }
  });
  w.addEventListener('focusout', function () { focus = false; go(); });
  w.addEventListener('change', go); /* a manual pick restarts the countdown */
  document.addEventListener('visibilitychange', go);
  if ('IntersectionObserver' in window)
    new IntersectionObserver(function (e) { seen = e[0].isIntersecting; go(); }, { threshold: 0.4 }).observe(w);
  go();
})();


/* ---- learning CTA pill: tinted highlight slides to the hovered / focused / touched button, then back home ---- */
(function () {
  var seg = document.getElementById('lseg');
  if (!seg) return;
  var bg = seg.querySelector('.lseg-bg');
  var items = Array.prototype.slice.call(seg.querySelectorAll('.lsb'));
  var home = items[0];
  function move(el) {
    var k = el.style.getPropertyValue('--k');
    bg.style.width = el.offsetWidth + 'px';
    bg.style.transform = 'translateX(' + el.offsetLeft + 'px)';
    bg.style.background = 'color-mix(in srgb,' + k + ' 16%,transparent)';
    bg.style.borderColor = 'color-mix(in srgb,' + k + ' 45%,transparent)';
    items.forEach(function (i) { i.classList.toggle('on', i === el); });
  }
  function settle() { seg.classList.add('ready'); }
  items.forEach(function (el) {
    ['mouseenter', 'focus', 'touchstart'].forEach(function (ev) {
      el.addEventListener(ev, function () { move(el); }, { passive: true });
    });
  });
  seg.addEventListener('mouseleave', function () { move(home); });
  seg.addEventListener('focusout', function () { move(home); });
  var relayout = function () { move(seg.querySelector('.lsb.on') || home); };
  window.addEventListener('resize', relayout);
  /* first placement without animating from width 0 */
  bg.style.transition = 'none';
  move(home);
  requestAnimationFrame(function () { requestAnimationFrame(function () { bg.style.transition = ''; settle(); }); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
})();
