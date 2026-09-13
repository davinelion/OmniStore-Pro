/**
 * main.js — OmniStore-Pro website behaviour.
 * Vanilla JS, no dependencies. Catalog data comes from js/catalog.js
 * (generated from the real feed — see scripts/build-catalog.mjs).
 */

(function () {
  "use strict";

  var catalog = window.OMNI_CATALOG || {
    stats: {},
    marquee: [],
    featured: [],
    categories: [],
    platforms: [],
    collections: [],
    generatedAt: "",
  };

  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function formatNum(n) {
    return (n == null ? 0 : n).toLocaleString("en-US");
  }

  /** Deterministic hue from a string, for monogram fallback icons. */
  function hueFor(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
  }

  /**
   * App icon with graceful monogram fallback: if the upstream avatar fails
   * to load, the tile becomes a coloured initial — nothing is invented,
   * the app's name is still there.
   */
  function makeIcon(app, className) {
    if (app.icon) {
      var img = document.createElement("img");
      img.className = className;
      img.src = app.icon;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.width = 64;
      img.height = 64;
      img.addEventListener("error", function () {
        var mono = el("span", className + " mono-fallback", app.name.charAt(0).toUpperCase());
        mono.style.background =
          "linear-gradient(135deg, hsl(" + hueFor(app.name) + " 70% 45%), hsl(" +
          ((hueFor(app.name) + 60) % 360) + " 70% 35%))";
        mono.title = app.name;
        img.replaceWith(mono);
      });
      return img;
    }
    var mono = el("span", className + " mono-fallback", app.name.charAt(0).toUpperCase());
    mono.style.background =
      "linear-gradient(135deg, hsl(" + hueFor(app.name) + " 70% 45%), hsl(" +
      ((hueFor(app.name) + 60) % 360) + " 70% 35%))";
    return mono;
  }

  /* ------------------------------------------------------------------ */
  /* Theme (already applied by the inline head script before paint)      */
  /* ------------------------------------------------------------------ */

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("omnistore-theme", theme);
    } catch (e) {
      /* private mode */
    }
    var sun = $("#theme-icon-sun");
    var moon = $("#theme-icon-moon");
    if (theme === "dark") {
      if (moon) moon.hidden = false;
      if (sun) sun.hidden = true;
    } else {
      if (sun) sun.hidden = false;
      if (moon) moon.hidden = true;
    }
  }

  function initTheme() {
    var btn = $("#theme-toggle");
    if (!btn) return;
    setTheme(currentTheme());
    btn.addEventListener("click", function () {
      setTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  /* ------------------------------------------------------------------ */
  /* Header                                                              */
  /* ------------------------------------------------------------------ */

  function initHeader() {
    var header = $("#site-header");
    if (!header) return;

    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var menuBtn = $("#menu-toggle");
    var mobileNav = $("#mobile-nav");
    if (menuBtn && mobileNav) {
      menuBtn.addEventListener("click", function () {
        var open = mobileNav.classList.toggle("open");
        menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      $all("a", mobileNav).forEach(function (a) {
        a.addEventListener("click", function () {
          mobileNav.classList.remove("open");
          menuBtn.setAttribute("aria-expanded", "false");
        });
      });
    }

    // Highlight the nav link of the section in view.
    var links = $all(".nav a[href^='#'], .mobile-nav a[href^='#']");
    var sections = links
      .map(function (a) {
        var id = a.getAttribute("href").slice(1);
        return document.getElementById(id);
      })
      .filter(Boolean);

    if ("IntersectionObserver" in window && sections.length) {
      var visible = new Map();
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
          });
          var best = null;
          var bestRatio = 0;
          visible.forEach(function (ratio, id) {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              best = id;
            }
          });
          links.forEach(function (a) {
            a.setAttribute(
              "aria-current",
              a.getAttribute("href") === "#" + best ? "true" : "false",
            );
          });
        },
        { rootMargin: "-35% 0px -50% 0px", threshold: [0, 0.2, 0.5, 1] },
      );
      sections.forEach(function (s) {
        io.observe(s);
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Hero                                                                */
  /* ------------------------------------------------------------------ */

  function countUp(node, target, duration) {
    if (prefersReducedMotion || !target) {
      node.textContent = formatNum(target);
      return;
    }
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      node.textContent = formatNum(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initStats() {
    var stats = catalog.stats || {};
    var grid = $("#stats-grid");
    if (!grid) return;

    var defs = [
      { key: "apps", label: "Apps indexed" },
      { key: "releases", label: "Releases" },
      { key: "assets", label: "Validated assets" },
      { key: "developers", label: "Developers" },
      { key: "categories", label: "Categories" },
      { key: "platforms", label: "Platforms" },
    ];

    defs.forEach(function (d) {
      var value = stats[d.key];
      if (value == null) return;
      var cell = el("div", "stat");
      cell.setAttribute("role", "listitem");
      cell.appendChild(el("div", "stat-num", "0"));
      cell.appendChild(el("div", "stat-label", d.label));
      grid.appendChild(cell);
    });

    var nums = $all(".stat-num", grid);
    function runCounters() {
      nums.forEach(function (node, i) {
        countUp(node, stats[defs[i].key] || 0, 1400 + i * 120);
      });
    }
    if ("IntersectionObserver" in window && !prefersReducedMotion) {
      var done = false;
      var io = new IntersectionObserver(
        function (entries) {
          if (done || !entries[0].isIntersecting) return;
          done = true;
          runCounters();
          io.disconnect();
        },
        { threshold: 0.3 },
      );
      io.observe(grid);
    } else {
      runCounters();
    }
  }

  function initStorefront() {
    var appsEl = $("#storefront-apps");
    if (!appsEl) return;

    var apps = (catalog.featured || []).slice(0, 8);
    apps.forEach(function (app) {
      var tile = el("div", "sf-app");
      if (app.url) {
        var link = document.createElement("a");
        link.href = app.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.title = "View " + app.name + " on GitHub";
        link.appendChild(makeIcon(app, "sf-app-icon"));
        var name = el("span", "sf-app-name", app.name);
        link.appendChild(name);
        if (app.trust != null) {
          var trust = el("span", "sf-trust", "trust " + app.trust);
          trust.title = "Trust score computed from public signals";
          link.appendChild(trust);
        }
        tile.appendChild(link);
      } else {
        tile.appendChild(makeIcon(app, "sf-app-icon"));
        tile.appendChild(el("span", "sf-app-name", app.name));
      }
      appsEl.appendChild(tile);
    });

    // Update-inbox toast: the two most-trusted featured apps, labelled
    // generically — no invented versions.
    var rowsEl = $("#storefront-toast-rows");
    var countEl = $("#toast-count");
    var toastApps = (catalog.featured || []).slice(0, 2);
    if (rowsEl && toastApps.length) {
      if (countEl) countEl.textContent = toastApps.length + " apps";
      toastApps.forEach(function (app) {
        var row = el("div", "sf-toast-row");
        row.appendChild(makeIcon(app, ""));
        row.appendChild(el("span", "", app.name));
        row.appendChild(el("span", "ver", "new release"));
        rowsEl.appendChild(row);
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Marquee                                                             */
  /* ------------------------------------------------------------------ */

  function buildMarqueeRow(viewport, apps, reverse) {
    var track = el("div", "marquee-track" + (reverse ? " reverse" : ""));
    track.setAttribute("aria-hidden", "true");

    function chip(app) {
      var chipNode = document.createElement(app.url ? "a" : "span");
      chipNode.className = "app-chip";
      if (app.url) {
        chipNode.href = app.url;
        chipNode.target = "_blank";
        chipNode.rel = "noopener noreferrer";
      }
      chipNode.title = app.name + (app.license ? " · " + app.license : "");
      chipNode.appendChild(makeIcon(app, ""));
      chipNode.appendChild(el("span", "", app.name));
      if (app.license) chipNode.appendChild(el("span", "lic", app.license));
      return chipNode;
    }

    // Two identical halves so the -50% translate loops seamlessly.
    for (var half = 0; half < 2; half++) {
      apps.forEach(function (app) {
        track.appendChild(chip(app));
      });
    }
    viewport.appendChild(track);
  }

  function initMarquee() {
    var apps = catalog.marquee || [];
    if (!apps.length) return;
    var mid = Math.ceil(apps.length / 2);
    var row1 = $("#marquee-row-1");
    var row2 = $("#marquee-row-2");
    if (row1) buildMarqueeRow(row1, apps.slice(0, mid), false);
    if (row2) buildMarqueeRow(row2, apps.slice(mid), true);
  }

  /* ------------------------------------------------------------------ */
  /* Catalog section                                                     */
  /* ------------------------------------------------------------------ */

  function initCategories() {
    var list = $("#cat-list");
    if (!list) return;
    var cats = catalog.categories || [];
    if (!cats.length) return;
    var total = $("#cat-total");
    if (total) total.textContent = formatNum(cats.reduce(function (a, c) {
      return a + c.count;
    }, 0)) + " apps";
    var max = Math.max.apply(null, cats.map(function (c) {
      return c.count;
    }));

    cats.forEach(function (c, i) {
      var row = el("div", "cat-row");
      var name = el("span", "name", c.name);
      name.title = c.description || c.name;
      var bar = el("div", "cat-bar");
      var fill = el("i");
      fill.style.setProperty("--bar-w", Math.max(4, Math.round((c.count / max) * 100)) + "%");
      fill.style.setProperty("--bar-delay", i * 60 + "ms");
      bar.appendChild(fill);
      row.appendChild(name);
      row.appendChild(bar);
      row.appendChild(el("span", "num", String(c.count)));
      list.appendChild(row);
    });

    var panel = $("#panel-categories");
    if (panel && "IntersectionObserver" in window && !prefersReducedMotion) {
      var io = new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) {
            panel.classList.add("in");
            io.disconnect();
          }
        },
        { threshold: 0.25 },
      );
      io.observe(panel);
    } else if (panel) {
      panel.classList.add("in");
    }
  }

  var PLATFORM_ICONS = {
    iOS:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    iPadOS:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    Android:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="7" width="14" height="13" rx="2"/><path d="M12 7V4M8.5 4h7M9 11l-1.2 1.2M15 11l1.2 1.2"/></svg>',
    Windows:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5.5 10.5 4.5v7H3zM12 4.3 21 3v8.5h-9zM3 12.5h7.5v7L3 18.5zM12 12.5h9V21l-9-1.3z"/></svg>',
    macOS:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M2 20h20"/></svg>',
    Linux:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  };

  function initPlatforms() {
    var grid = $("#platform-grid");
    if (!grid) return;
    var plats = catalog.platforms || [];
    var total = $("#plat-total");
    if (total) total.textContent = plats.length + " platforms";
    plats.forEach(function (p) {
      var node = el("div", "plat");
      node.innerHTML = PLATFORM_ICONS[p.name] || "";
      node.appendChild(el("span", "name", p.name));
      node.appendChild(el("span", "count", formatNum(p.count) + " apps"));
      grid.appendChild(node);
    });
  }

  function initCollections() {
    var grid = $("#collection-grid");
    if (!grid) return;
    var sparkle =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>';
    (catalog.collections || []).forEach(function (c) {
      var card = el("div", "collection-card");
      var top = el("div", "top");
      top.innerHTML = sparkle;
      top.appendChild(el("h4", "", c.name));
      top.appendChild(el("span", "count-pill", String(c.count) + " apps"));
      card.appendChild(top);
      if (c.description) card.appendChild(el("p", "", c.description));
      grid.appendChild(card);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Getting started                                                     */
  /* ------------------------------------------------------------------ */

  function initTabs() {
    var tabs = $all(".tab");
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var group = tab.closest("[data-tab-group]");
        if (!group) return;
        $all(".tab", group).forEach(function (t) {
          t.setAttribute("aria-selected", t === tab ? "true" : "false");
        });
        var selected = tab.getAttribute("data-panel");
        $all(".tab-panel", group).forEach(function (p) {
          p.hidden = p.id !== selected;
        });
        // Re-run copy wiring for newly visible code blocks is unnecessary:
        // all blocks are wired once at init.
      });
    });
  }

  function initCopy() {
    $all(".code-copy").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var code = btn.getAttribute("data-target");
        var text = code ? ($("#" + code) || {}).textContent : null;
        if (text == null) return;
        function done() {
          var original = btn.textContent;
          btn.textContent = "Copied";
          btn.classList.add("copied");
          setTimeout(function () {
            btn.textContent = original;
            btn.classList.remove("copied");
          }, 1600);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () {
            fallbackCopy(text, done);
          });
        } else {
          fallbackCopy(text, done);
        }
      });
    });

    function fallbackCopy(text, done) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        done();
      } catch (e) {
        /* ignore */
      }
      ta.remove();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Reveal on scroll                                                    */
  /* ------------------------------------------------------------------ */

  function initReveal() {
    var items = $all(".reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      items.forEach(function (node) {
        node.classList.add("in");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    items.forEach(function (node) {
      io.observe(node);
    });
  }

  /* ------------------------------------------------------------------ */
  /* GitHub star count (graceful fallback: keep the "Star" label)         */
  /* ------------------------------------------------------------------ */

  function initStarCount() {
    var node = $("#gh-stars");
    if (!node || !window.fetch) return;
    fetch("https://api.github.com/repos/iamsmmh/OmniStore-Pro", {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        if (data && typeof data.stargazers_count === "number") {
          node.textContent = data.stargazers_count;
        }
      })
      .catch(function () {
        /* offline / rate-limited — the label stays "Star" */
      });
  }

  /* ------------------------------------------------------------------ */
  /* Footer stamp                                                        */
  /* ------------------------------------------------------------------ */

  function initGeneratedStamp() {
    var node = $("#generated-stamp");
    if (!node || !catalog.generatedAt) return;
    try {
      var date = new Date(catalog.generatedAt);
      node.textContent = "catalog snapshot " + date.toISOString().slice(0, 10);
    } catch (e) {
      node.textContent = "";
    }
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  var booted = false;

  function boot() {
    if (booted) return; // idempotent — DOMContentLoaded must not double-init
    booted = true;
    initTheme();
    initHeader();
    initStats();
    initStorefront();
    initMarquee();
    initCategories();
    initPlatforms();
    initCollections();
    initTabs();
    initCopy();
    initReveal();
    initStarCount();
    initGeneratedStamp();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
