/* ==========================================================================
   STACKLY — Creative Agency Theme
   GSAP animations + interactions
   ========================================================================== */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

  gsap.registerPlugin(ScrollTrigger);

  /* Mobile browsers fire a resize every time the URL bar slides in or out.
     Left alone, ScrollTrigger reads each one as a genuine layout change and
     re-measures every trigger on the page. On a page this long that is a burst
     of layout work part-way through a scroll, which is exactly when the
     visitor is most likely to feel it. */
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* Everything added below is the Home-page animation pass. It lives in this
     file rather than a second one so the reveal vocabulary stays in one place,
     and it is gated on this flag so no other page changes behaviour. Drop the
     guard on any given function to extend that piece site-wide. */
  const isHome = document.body.dataset.page === "home";

  /* ----------------------------------------------------------------
     Hero intro
  ---------------------------------------------------------------- */
  let heroPlayed = false;

  function initHeroAnimation() {
    if (heroPlayed) return;
    heroPlayed = true;

    const lines = document.querySelectorAll("[data-hero-line] > span");
    const fades = document.querySelectorAll("[data-hero-fade]");
    const visual = document.querySelector("[data-hero-visual]");

    if (prefersReducedMotion) {
      gsap.set(fades, { autoAlpha: 1, y: 0 });
      if (visual) gsap.set(visual, { autoAlpha: 1, clipPath: "inset(0% 0% 0% 0%)" });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    gsap.set(lines, { yPercent: 120 });
    gsap.set([...fades, visual], { autoAlpha: 0 });
    gsap.set(fades, { y: 24 });
    if (visual) gsap.set(visual, { clipPath: "inset(0% 0% 0% 100%)" });

    tl.to(lines, { yPercent: 0, duration: 1.1, stagger: 0.12 }, "reveal");

    tl.to(fades, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 }, "reveal+=0.45");
    if (visual) {
      tl.to(visual, { autoAlpha: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "power3.inOut" }, "reveal+=0.55");
    }

    /* This entrance starts from autoAlpha 0, so if the ticker never gets a
       frame the entire above-the-fold hero stays blank. The nav entrance has
       the same guard for the same reason. Any interruption - a backgrounded
       tab, a paused devtools debugger, a device too slow to keep up - lands
       on the fully visible hero rather than an empty page. */
    window.setTimeout(() => {
      /* Plain DOM, same reasoning as the header guard: this is insurance
         against the ticker never running, so it must not call back into GSAP.
         Property-by-property rather than removeAttribute, so a transition the
         stylesheet expects is never thrown away with the inline style. */
      [...lines, ...fades, visual].filter(Boolean).forEach((el) => {
        ["transform", "opacity", "visibility", "clip-path", "translate", "scale", "rotate"].forEach(
          (prop) => el.style.removeProperty(prop)
        );
      });
    }, 3000);
  }

  /* ----------------------------------------------------------------
     Header entrance
     The nav previously had no entrance of its own: it was simply there at
     rest and only picked up .scrolled once the page had already moved. This
     settles it in from above on load, ahead of the hero.

     Every tween clears the transform it wrote. That is not tidiness - a
     transform left inline on the fixed header would pin .nav-cta's CSS
     :hover lift (translateY(-2px)) dead, because an inline transform beats
     any stylesheet rule. Same reason the brand and items are cleared.
  ---------------------------------------------------------------- */
  function initHeaderEntrance() {
    if (prefersReducedMotion || !isHome) return;

    const nav = document.getElementById("siteNav");
    if (!nav) return;

    const brand = nav.querySelector(".brand");
    const items = gsap.utils.toArray(".nav-item, .nav-cta");

    /* The nav, the CTA and the brand each carry `transition: all`. A blanket
       transition also animates transform and opacity, so leaving it in place
       makes the stylesheet fight GSAP for the same properties: the entrance
       crawls, and on a slow frame the two can disagree about the final value.
       Suppressing it for the duration of the entrance - and putting it back
       afterwards - is what keeps the two systems from overlapping. */
    const transitioned = [nav, brand, ...items].filter(Boolean);
    const restore = transitioned.map((el) => [el, el.style.transition]);
    transitioned.forEach((el) => (el.style.transition = "none"));

    /* autoAlpha writes opacity *and* visibility, so a start state of 0 makes
       these elements genuinely invisible until the tween runs. That is a bet
       on the ticker: if the animation is interrupted, the tab is backgrounded
       before the first frame, or the user is on a slow device, the navigation
       and the whole hero stay blank. reveal() below is the safety net that
       guarantees a painted page no matter what happens to the timeline. */
    gsap.set(nav, { autoAlpha: 0, y: -20 });
    if (brand) gsap.set(brand, { autoAlpha: 0, x: -14 });
    gsap.set(items, { autoAlpha: 0, y: 10 });

    const reveal = () => {
      /* Restore the stylesheet's own transition *after* the inline transform is
         gone, so the hand-off is never animated from a stale value. */
      [nav, brand, ...items].filter(Boolean).forEach((el) => {
        ["transform", "opacity", "visibility", "translate", "scale", "rotate"].forEach((prop) =>
          el.style.removeProperty(prop)
        );
      });
      restore.forEach(([el, value]) => (el.style.transition = value));
    };

    let done = false;
    const timeline = gsap
      .timeline({
        defaults: { ease: "power3.out" },
        delay: 0.1,
        onComplete: () => {
          if (done) return;
          done = true;
          reveal();
        },
      })
      .to(nav, { autoAlpha: 1, y: 0, duration: 0.6, clearProps: "transform,visibility" })
      .to(brand, { autoAlpha: 1, x: 0, duration: 0.55, clearProps: "transform,visibility" }, "-=0.35")
      .to(items, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.05, clearProps: "transform,visibility" }, "-=0.4");

    // The reveal must also survive the page being hidden mid-entrance, where
    // rAF stops and onComplete may never fire.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) timeline.pause();
      else if (!done) timeline.resume();
    });

    // Last-resort backstop. Comfortably longer than the ~1.3s entrance, so in
    // normal use the timeline has long since finished and this does nothing.
    window.setTimeout(() => {
      if (done) return;
      done = true;
      timeline.kill();
      reveal();
    }, 3000);
  }

  /* ----------------------------------------------------------------
     Navbar: active page link
   ---------------------------------------------------------------- */
  function initActivePage() {
    const page = document.body.dataset.page || "home";
    const activeHref = page === "home" ? "index.html" : page + ".html";

    document.querySelectorAll(".nav-link").forEach((link) => {
      const href = (link.getAttribute("href") || "").split("#")[0].split("?")[0];
      link.classList.toggle("active", href === activeHref);
    });
  }

  /* ----------------------------------------------------------------
     Navbar: scroll state + active links
  ---------------------------------------------------------------- */
  function initNavbar() {
    const nav = document.getElementById("siteNav");
    const toTop = document.getElementById("toTop");

    // Pages without the site header (404) have no navbar to initialise.
    if (!nav) return;

    // Coalesce the scroll-driven work below into a single animation frame,
    // so it can never run more than once per frame no matter how many
    // scroll events the browser fires while the user drags the scrollbar.
    const scrollHandlers = [];
    let scrollQueued = false;
    window.addEventListener(
      "scroll",
      () => {
        if (scrollQueued) return;
        scrollQueued = true;
        requestAnimationFrame(() => {
          scrollQueued = false;
          scrollHandlers.forEach((fn) => fn());
        });
      },
      { passive: true }
    );

    const updateNav = () => {
      if (window.scrollY > 40) {
        nav.classList.add("scrolled");
      } else {
        nav.classList.remove("scrolled");
      }

      if (window.scrollY > 600) {
        toTop.classList.add("show");
      } else {
        toTop.classList.remove("show");
      }
    };

    scrollHandlers.push(updateNav);
    updateNav();

    // Close mobile collapse on link click
    const collapseEl = document.getElementById("mainNav");

    /* Two classes, deliberately out of step with each other.
       .nav-open lets the fixed bar grow past --nav-h so the panel is not
       clipped, and .nav-links-in drives the per-link fade/slide.

       They are removed at different moments on purpose. Bootstrap animates the
       panel's own height, and the bar's height:auto tracks it, so .nav-open has
       to stay on for the whole collapse - dropping it on hide.bs.collapse
       snapped the bar back to 84px while the panel was still shrinking, which
       is the jump. It comes off at hidden, when the panel is already 0 tall.
       .nav-links-in goes on hide so the links fade while the panel closes. */
    if (collapseEl) {
      // Guards the deferred add in the rAF below against a fast double-toggle:
      // hide bumps the token, so a pending open can no longer reveal the links.
      let navSeq = 0;

      // Both classes live on the header, which is what the .site-nav.nav-open /
      // .site-nav.nav-links-in selectors in the stylesheet match against.
      collapseEl.addEventListener("show.bs.collapse", () => {
        nav.classList.add("nav-open");
        const seq = ++navSeq;

        /* The panel is still display:none when this event fires, so the browser
           has no previous opacity to animate from. Adding .nav-links-in in the
           same tick therefore snaps the links to visible and the fade/stagger
           never runs. Wait one frame - Bootstrap has set display by then - then
           force a reflow so the opacity:0 start state is committed before the
           class flips, which is what lets the transition actually play. */
        requestAnimationFrame(() => {
          if (seq !== navSeq) return;
          void collapseEl.offsetHeight;
          nav.classList.add("nav-links-in");
        });
      });
      collapseEl.addEventListener("hide.bs.collapse", () => {
        navSeq++;
        nav.classList.remove("nav-links-in");
      });
      collapseEl.addEventListener("hidden.bs.collapse", () => {
        nav.classList.remove("nav-open");
      });

      // A page loaded with the panel already showing would otherwise never
      // receive those events.
      if (collapseEl.classList.contains("show")) {
        nav.classList.add("nav-open", "nav-links-in");
      }
    }

    document.querySelectorAll("#mainNav .nav-link, .nav-cta").forEach((link) => {
      link.addEventListener("click", () => {
        const collapse = bootstrap.Collapse.getInstance(collapseEl);
        if (collapse && collapseEl.classList.contains("show")) collapse.hide();
      });
    });

    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    // Scrollspy (hash-style links only; page links keep their active state)
    const sections = document.querySelectorAll("section[id]");
    const anchorLinks = document.querySelectorAll('.nav-link[href^="#"]');

    const spy = () => {
      const pos = window.scrollY + 120;
      let currentId = "";
      sections.forEach((sec) => {
        if (pos >= sec.offsetTop && pos < sec.offsetTop + sec.offsetHeight) {
          currentId = sec.id;
        }
      });
      anchorLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === "#" + currentId);
      });
    };

    scrollHandlers.push(spy);
    spy();

    // Mark the nav link matching the current page as active. The scrollspy
    // above only handles hash links, so page links (index.html, about.html...)
    // would otherwise never get the .active state.
    const currentPage = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    document.querySelectorAll(".nav-link[href]").forEach((link) => {
      const target = (link.getAttribute("href") || "").split("#")[0].split("/").pop().toLowerCase();
      if (target && target === currentPage) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  /* ----------------------------------------------------------------
     Reveal-on-scroll helper
  ---------------------------------------------------------------- */
  function initReveals() {
    if (prefersReducedMotion) return;

    gsap.utils.toArray("[data-reveal]").forEach((el) => {
      gsap.from(el, {
        y: 48,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: {
          trigger: el,
          start: "top 86%",
          once: true,
        },
      });
    });

    // Parallax for hero + about + case images / video
    gsap.utils.toArray(".about-media-main img, .case-hero img, .case-hero video").forEach((el) => {
      gsap.fromTo(
        el,
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: "none",
          scrollTrigger: {
            trigger: el.closest(".about-media-wrap, .case-hero"),
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    });

    /* Home parallax, on the two media images that have no hover transform of
       their own. Both wrappers are overflow:hidden and their images fill the
       frame exactly, so the travel needs constant scale headroom - scale 1.12
       buys 6% above and below, which is precisely the yPercent range. Without
       it the <img> slides bodily out of its frame and the wrapper background
       shows as a band at the trailing edge.

       Deliberately not applied to .work-media or .post-media: those images
       carry a CSS :hover scale, and an inline GSAP transform would outrank it
       permanently, silently killing the hover zoom. */
    if (isHome) {
      gsap.utils.toArray(".intro-media img, .service-img-wrap img").forEach((el) => {
        gsap.fromTo(
          el,
          { yPercent: -6, scale: 1.12 },
          {
            yPercent: 6,
            scale: 1.12,
            ease: "none",
            scrollTrigger: {
              trigger: el.closest(".intro-media, .service-img-wrap"),
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      });
    }
  }

  /* ----------------------------------------------------------------
     Media clip reveals
     The image wrappers already clip to their own radius, so the entrance is a
     one-axis clip wipe on the wrapper rather than a transform on the <img>.
     Keeping the animation off the image itself is what lets the parallax
     above and the card hover zooms keep working on the same element.
  ---------------------------------------------------------------- */
  function initMediaReveals() {
    if (prefersReducedMotion || !isHome) return;

    gsap.utils.toArray(".intro-media, .service-img-wrap, .post-media").forEach((wrap) => {
      gsap.from(wrap, {
        clipPath: "inset(0% 0% 100% 0%)",
        duration: 1.1,
        ease: "power3.inOut",
        // Left false deliberately: an element that never reaches its trigger
        // should be painted in its natural state, not stuck collapsed.
        immediateRender: false,
        scrollTrigger: {
          trigger: wrap,
          start: "top 88%",
          once: true,
        },
      });
    });
  }

  /* ----------------------------------------------------------------
     Button arrow reveals
     The buttons themselves already rise and fade through [data-reveal], so
     only the arrow is animated here - that way the two effects never write to
     the same transform. clearProps hands the icon back to the stylesheet's own
     .btn-solid:hover i nudge the moment the entrance finishes.
  ---------------------------------------------------------------- */
  function initButtonReveals() {
    if (prefersReducedMotion || !isHome) return;

    gsap.utils.toArray(".section-head .btn-solid, .cta-inner .btn-solid").forEach((btn) => {
      const icon = btn.querySelector("i");
      if (!icon) return;

      /* .btn-solid also carries `transition: all`, which covers the icon's
         transform and opacity. Suppressed for the entrance so the stylesheet
         and GSAP are not both animating the same icon at once. */
      const previous = icon.style.transition;
      icon.style.transition = "none";

      gsap.from(icon, {
        x: -8,
        autoAlpha: 0,
        duration: 0.5,
        ease: "power2.out",
        clearProps: "transform,opacity,visibility",
        immediateRender: false,
        scrollTrigger: {
          trigger: btn,
          start: "top 90%",
          once: true,
          onLeave: () => (icon.style.transition = previous),
        },
      });
    });
  }

  /* ----------------------------------------------------------------
     Footer reveal
     The footer was the one part of the page still arriving fully formed.
     Driven from JS rather than data attributes on the shared partial: the
     markup is expanded into six pages by build.js, so tagging it there would
     either opt every page in or have to be undone on five of them. Selecting
     .site-footer children directly keeps this Home-only for free.

     The columns rise in reading order, and the social row gets its own
     trigger so the icons do not arrive before their own links have settled.
   ---------------------------------------------------------------- */
  function initFooterReveal() {
    if (prefersReducedMotion || !isHome) return;

    const footer = document.querySelector(".site-footer");
    if (!footer) return;

    const columns = gsap.utils.toArray(".site-footer .row > [class*='col']");
    const bottom = footer.querySelector(".footer-bottom");

    if (columns.length) {
      gsap.from(columns, {
        y: 26,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.09,
        clearProps: "transform,opacity,visibility",
        // Left false: below-the-fold markup that never reaches its trigger
        // paints naturally instead of staying invisible.
        immediateRender: false,
        scrollTrigger: {
          trigger: footer,
          start: "top 88%",
          once: true,
        },
      });
    }

    if (bottom) {
      gsap.from(bottom.children, {
        y: 14,
        autoAlpha: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.08,
        clearProps: "transform,opacity,visibility",
        immediateRender: false,
        scrollTrigger: {
          trigger: bottom,
          start: "top 94%",
          once: true,
        },
      });
    }
  }

  /* ----------------------------------------------------------------
     Staggered reveals
     A group animates its own children under a single ScrollTrigger.
     Two wins over data-reveal per element: siblings cascade instead of
     firing in the same frame, and a row of cards costs one trigger
     instead of one per card. Optional value sets the stagger step.
   ---------------------------------------------------------------- */
  function initStaggerReveals() {
    if (prefersReducedMotion) return;

    gsap.utils.toArray("[data-reveal-stagger]").forEach((group) => {
      const step = parseFloat(group.dataset.revealStagger) || 0.09;
      const children = gsap.utils.toArray(group.children);
      if (!children.length) return;

      gsap.from(children, {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: step,
        // Cards and list rows carry their own hover transforms. Clearing
        // hands control back to the stylesheet once the entrance is done,
        // otherwise the inline transform would pin them down.
        clearProps: "transform,opacity",
        immediateRender: false,
        scrollTrigger: {
          trigger: group,
          start: "top 88%",
          once: true,
        },
      });
    });
  }

  /* ----------------------------------------------------------------
     Accordion height changes
     Opening or closing an FAQ item resizes the page, which leaves every
     trigger below it pointing at stale positions. One debounced refresh
     once the expand finishes keeps those triggers honest.
   ---------------------------------------------------------------- */
  function initCollapseRefresh() {
    let timer;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => ScrollTrigger.refresh(), 180);
    };

    document.querySelectorAll(".accordion-collapse").forEach((el) => {
      el.addEventListener("shown.bs.collapse", refresh);
      el.addEventListener("hidden.bs.collapse", refresh);
    });
  }

  /* ----------------------------------------------------------------
     Process steps: line draw + stagger
   ---------------------------------------------------------------- */
  function initProcess() {
    if (prefersReducedMotion) return;

    // Services "How We Work" — 3D rotate-in reveal
    if (document.querySelector(".process-grid--modern")) {
      gsap.from(".process-grid--modern .process-step", {
        y: 48,
        opacity: 0,
        rotationY: -55,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.14,
        immediateRender: false,
        scrollTrigger: {
          trigger: ".process-grid--modern",
          start: "top 84%",
          once: true,
        },
      });
    }

    // Index process section — existing fade/slide reveal
    if (document.querySelector(".process-grid:not(.process-grid--modern)")) {
      gsap.from(".process-grid:not(.process-grid--modern) .process-step", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.12,
        immediateRender: false,
        scrollTrigger: {
          trigger: ".process-grid:not(.process-grid--modern)",
          start: "top 84%",
          once: true,
        },
      });
    }
  }

  function initProcessTilt() {
    if (!document.querySelector(".process-grid--modern")) return;
    if (prefersReducedMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    gsap.utils.toArray(".process-grid--modern .process-step").forEach((card) => {
      const rotateY = gsap.quickTo(card, "rotationY", { duration: 0.7, ease: "power3.out" });
      const rotateX = gsap.quickTo(card, "rotationX", { duration: 0.7, ease: "power3.out" });
      const y = gsap.quickTo(card, "y", { duration: 0.7, ease: "power3.out" });

      card.addEventListener("pointerenter", () => y(-10));
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        rotateY(px * 10);
        rotateX(-py * 10);
      });
      card.addEventListener("pointerleave", () => {
        rotateY(0);
        rotateX(0);
        y(0);
      });
    });
  }

  /* ----------------------------------------------------------------
     Stat counters (hero + results use data-count)
  ---------------------------------------------------------------- */
  function initCounters() {
    const counters = document.querySelectorAll(".result-num");
    if (!counters.length) return;

    const animate = (el) => {
      const raw = el.textContent.trim();
      const match = raw.match(/^(\D*?)(\d+(?:\.\d+)?)(\D*)$/);
      if (!match) return;

      const prefix = match[1];
      const suffix = match[3];
      const target = el.dataset.count != null ? parseFloat(el.dataset.count) : parseFloat(match[2]);
      if (prefersReducedMotion) {
        el.textContent = raw;
        return;
      }

      const display = (n) => prefix + (n % 1 ? n.toFixed(1) : Math.round(n)) + suffix;
      const state = { value: 0 };

      gsap.to(state, {
        value: target,
        duration: 2,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = display(state.value);
        },
      });
    };

    counters.forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () => animate(el),
      });
    });
  }

  /* ----------------------------------------------------------------
     Deferred video loading
     Case-study videos autoplay and sit far below the fold, so they used
     to download in full during page load. The source is held in data-src
     and only attached once the element nears the viewport; playback is
     paused again when it scrolls away so an off-screen video is not
     still being decoded. The poster shows in the meantime, and if the
     browser lacks IntersectionObserver the sources are attached at once.
  ---------------------------------------------------------------- */
  function initVideoLazyLoad() {
    const videos = document.querySelectorAll("video[data-src]");
    if (!videos.length) return;

    const attach = (video) => {
      if (video.src) return;
      video.src = video.dataset.src;
      video.removeAttribute("data-src");
    };

    if (!("IntersectionObserver" in window)) {
      videos.forEach(attach);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting) {
            attach(video);
            const playing = video.play();
            if (playing) playing.catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { rootMargin: "200px 0px" }
    );

    videos.forEach((video) => observer.observe(video));
  }

  /* ----------------------------------------------------------------
     Portfolio filtering
  ---------------------------------------------------------------- */
  function initWorkFilter() {
    const filters = document.querySelectorAll(".work-filters li");
    const items = document.querySelectorAll(".work-grid [data-category]");

    if (!filters.length || !items.length) return;

    let refreshQueued = false;

    filters.forEach((filter) => {
      filter.addEventListener("click", () => {
        filters.forEach((f) => f.classList.remove("active"));
        filter.classList.add("active");

        const value = filter.dataset.filter;

        // Pass 1: toggle visibility only. Measuring straight after this
        // would read collapsed rects for anything just unhidden.
        items.forEach((item) => {
          const match = value === "all" || item.dataset.category === value;
          item.classList.toggle("hidden", !match);
        });

        // Pass 2: run the entrance only on cards near the viewport. On
        // "All" this is 12 tweens, and the majority belong to cards the
        // visitor cannot see, so they were being animated for nothing.
        const viewport = window.innerHeight + 200;
        items.forEach((item) => {
          if (item.classList.contains("hidden")) return;

          const rect = item.getBoundingClientRect();
          if (rect.bottom < -200 || rect.top > viewport) return;

          gsap.fromTo(
            item,
            { opacity: 0, scale: 0.95, y: 24 },
            {
              opacity: 1,
              scale: 1,
              y: 0,
              duration: 0.6,
              ease: "power3.out",
              // Cleared so the card's own data-reveal trigger can run again.
              clearProps: "transform,opacity",
            }
          );
        });

        // Hiding cards changes the page height, so the triggers do need
        // recalculating. Refresh re-measures every trigger on the page, so
        // it is deferred out of the click handler instead of blocking it.
        if (!refreshQueued) {
          refreshQueued = true;
          requestAnimationFrame(() => {
            refreshQueued = false;
            ScrollTrigger.refresh();
          });
        }
      });
    });
  }

  /* ----------------------------------------------------------------
     Testimonials slider
  ---------------------------------------------------------------- */
  function initTestimonials() {
    const slides = document.querySelectorAll("[data-slide]");
    const prev = document.querySelector("[data-prev]");
    const next = document.querySelector("[data-next]");
    if (!slides.length || !prev || !next) return;

    let current = 0;

    const show = (index) => {
      slides[current].classList.remove("active");
      current = (index + slides.length) % slides.length;
      slides[current].classList.add("active");
    };

    next.addEventListener("click", () => show(current + 1));
    prev.addEventListener("click", () => show(current - 1));

    let autoTimer = setInterval(() => show(current + 1), 7000);
    const resetTimer = () => {
      clearInterval(autoTimer);
      autoTimer = setInterval(() => show(current + 1), 7000);
    };
    [next, prev].forEach((btn) => btn.addEventListener("click", resetTimer));
  }

  /* ----------------------------------------------------------------
     Contact form (client-side validation)
     A valid submission sends the visitor to the 404 page: there is no
     mail endpoint behind this form yet, so the 404 stands in for the
     destination. Any empty or malformed field stops the send, names the
     reason and keeps the visitor on the page with their input intact.
  ---------------------------------------------------------------- */
  function initForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;

    /* The project details textarea has no shared validator of its own, so it
       reports into the same .field-msg slot the other fields already use. */
    const DETAILS_REQUIRED = "Please tell us about your project.";

    function setMessage(field, error) {
      const slot = field.parentElement.querySelector(".field-msg");
      if (!slot) return;

      if (error) {
        const text = slot.querySelector("span");
        if (text) text.textContent = error;
        else slot.textContent = error;
        slot.classList.add("is-visible");
      } else {
        slot.classList.remove("is-visible");
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const fields = form.querySelectorAll("input, textarea");
      let valid = true;

      fields.forEach((field) => {
        /* Email and name are owned by js/email-validate.js and
           js/name-validate.js. Their capture-phase handlers have already shown
           the message, so here we only ask for the verdict. */
        if (typeof field.validateEmail === "function") {
          if (!field.validateEmail()) valid = false;
          return;
        }

        if (typeof field.validateName === "function") {
          if (!field.validateName()) valid = false;
          return;
        }

        const error = field.value.trim() ? "" : DETAILS_REQUIRED;
        field.classList.toggle("is-invalid", !!error);

        if (error) {
          field.setAttribute("aria-invalid", "true");
          valid = false;
        } else {
          field.removeAttribute("aria-invalid");
        }

        setMessage(field, error);
      });

      if (!valid) return;

      window.location.href = "404.html";
    });
  }

  /* ----------------------------------------------------------------
     Newsletter form
     A valid address sends the visitor to the 404 page: there is no list
     behind this form yet, so the 404 stands in for the destination.
     An empty or malformed address never navigates - the shared email
     validator states the reason (empty / characters / shape) and the
     visitor stays on the page.
  ---------------------------------------------------------------- */
  function initNewsletter() {
    const form = document.getElementById("newsletterForm");
    if (!form) return;

    const input = document.getElementById("nlEmail");
    const note = document.getElementById("newsletterNote");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!input) return;

      /* email-validate.js paints the reason onto the .field-msg beside the
         field. If that script is ever missing, fall back to a plain shape
         test so a broken include can never let a bad address reach the
         redirect. */
      const valid =
        typeof input.validateEmail === "function"
          ? input.validateEmail()
          : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(input.value || "").trim());

      if (!valid) return;

      if (note) note.classList.remove("d-none");
      window.location.href = "404.html";
    });
  }

  /* ----------------------------------------------------------------
     Smooth anchor scrolling
  ---------------------------------------------------------------- */
  function initAnchors() {
    const nav = document.getElementById("siteNav");

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (e) => {
        const targetId = anchor.getAttribute("href");
        if (targetId && targetId.length > 1) {
          const target = document.querySelector(targetId);
          if (target) {
            e.preventDefault();
            const headerOffset = nav ? nav.offsetHeight : 0;
            const y = target.getBoundingClientRect().top + window.scrollY - headerOffset;
            window.scrollTo({ top: Math.max(y, 0), behavior: "smooth" });
          }
        }
      });
    });
  }

  /* ----------------------------------------------------------------
     Error page "Go Back" — returns to previous page, falls back to href
  ---------------------------------------------------------------- */
  function initBackButton() {
    const back = document.querySelector("[data-back]");
    if (!back) return;
    back.addEventListener("click", (e) => {
      if (window.history.length > 1) {
        e.preventDefault();
        window.history.back();
      }
    });
  }

  /* ----------------------------------------------------------------
     Work card hover enrichments
  ---------------------------------------------------------------- */
  function initWorkImages() {
    if (prefersReducedMotion) return;

    gsap.utils.toArray(".work-card").forEach((card) => {
      const img = card.querySelector(".work-media img");
      const tag = card.querySelector(".work-tag");
      const expand = card.querySelector(".work-expand");
      if (!img) return;

      card.addEventListener("mouseenter", () => {
        gsap.to(img, { scale: 1.08, duration: 1, ease: "power3.out", overwrite: "auto" });
        if (tag) gsap.to(tag, { y: 0, duration: 0.45, ease: "back.out(1.6)", overwrite: "auto" });
        if (expand) gsap.to(expand, { y: 0, duration: 0.45, ease: "back.out(1.6)", overwrite: "auto" });
      });
      card.addEventListener("mouseleave", () => {
        gsap.to(img, { scale: 1, duration: 0.8, ease: "power2.out", overwrite: "auto" });
        if (tag) gsap.to(tag, { y: -10, duration: 0.4, ease: "power2.in", overwrite: "auto" });
        if (expand) gsap.to(expand, { y: 10, duration: 0.4, ease: "power2.in", overwrite: "auto" });
      });
    });
  }

  /* ----------------------------------------------------------------
     Case study hero parallax / scrub
  ---------------------------------------------------------------- */
  function initCaseStudy() {
    if (prefersReducedMotion) return;

    gsap.utils.toArray(".case-card").forEach((card, i) => {
      gsap.from(card, {
        y: 56,
        opacity: 0,
        duration: 0.9,
        delay: i * 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".case-cols",
          start: "top 80%",
          once: true,
        },
      });
    });
  }

  /* ----------------------------------------------------------------
     Journey timeline: line draw + staggered item reveals
  ---------------------------------------------------------------- */
  function initTimeline() {
    const timeline = document.querySelector(".timeline");
    if (!timeline) return;

    const bar = timeline.querySelector(".timeline-bar");

    if (bar && !prefersReducedMotion) {
      gsap.fromTo(
        bar,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: timeline,
            start: "top 75%",
            end: "bottom 55%",
            scrub: true,
            toggleActions: "play none none none",
          },
        }
      );
    }

    if (prefersReducedMotion) return;

    gsap.utils.toArray(".timeline-item").forEach((item, index) => {
      const parts = item.querySelectorAll(".timeline-icon, .timeline-year, h3, p");
      if (!parts.length) return;

      gsap.from(parts, {
        x: index % 2 === 0 ? -56 : 56,
        y: 24,
        opacity: 0,
        scale: 0.98,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
        immediateRender: false,
        scrollTrigger: {
          trigger: item,
          start: "top 85%",
          once: true,
        },
      });
    });
  }

  /* ----------------------------------------------------------------
     Bootstrap trigger refresh (fixes ScrollTrigger offsets after grid loads)
  ---------------------------------------------------------------- */
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
  });

  window.addEventListener("load", () => {
    ScrollTrigger.refresh();
  });

  document.addEventListener("DOMContentLoaded", () => {
    initActivePage();
    initHeaderEntrance();
    initNavbar();
    initReveals();
    initStaggerReveals();
    initMediaReveals();
  initButtonReveals();
  initFooterReveal();
  initCollapseRefresh();
    initProcess();
    initProcessTilt();
    initTimeline();
    initCounters();
    initWorkFilter();
    initVideoLazyLoad();
    initTestimonials();
    initForm();
    initNewsletter();
    initAnchors();
    initBackButton();
    initWorkImages();
    initCaseStudy();
    initHeroAnimation();
  });
})();