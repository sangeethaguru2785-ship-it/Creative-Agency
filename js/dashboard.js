/* STACKLY — Dashboard interactions (shared by Admin & Client) */
(function () {
  "use strict";

  var shell = document.getElementById("dashShell");
  var overlay = document.getElementById("dashOverlay");
  var menuBtn = document.getElementById("dashMenuBtn");
  var crumb = document.getElementById("dashCrumb");
  var mq = window.matchMedia("(max-width: 991.98px)");

  function isMobile() {
    return mq.matches;
  }

  function closeDrawer() {
    if (shell) shell.classList.remove("is-open");
  }

  function toggleSidebar() {
    if (!shell) return;
    if (isMobile()) {
      shell.classList.toggle("is-open");
    } else {
      shell.classList.toggle("is-collapsed");
    }
  }

  if (menuBtn) menuBtn.addEventListener("click", toggleSidebar);
  if (overlay) overlay.addEventListener("click", closeDrawer);

  mq.addEventListener("change", closeDrawer);

  /* Section navigation */
  var links = Array.prototype.slice.call(document.querySelectorAll(".dash-link[data-target]"));
  var sections = Array.prototype.slice.call(document.querySelectorAll(".dash-section"));

  links.forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("data-target");
      if (id.charAt(0) !== "#") return;
      var section = document.getElementById(id.slice(1));
      if (!section) return;

      sections.forEach(function (s) {
        s.classList.toggle("active", s === section);
      });
      links.forEach(function (l) {
        l.classList.toggle("is-active", l === link);
      });

      if (crumb && link.getAttribute("data-title")) {
        crumb.innerHTML = "Stackly / <b>" + link.getAttribute("data-title") + "</b>";
      }
      closeDrawer();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  /* Initials avatars */
  document.querySelectorAll("[data-initials]").forEach(function (el) {
    el.textContent = el.getAttribute("data-initials");
  });

  /* ----------------------------------------------------------------
     Signed-in user

     js/auth.js writes the identity of whoever last logged in or signed
     up. Read it here and paint it into the header, the greeting and the
     profile fields. Every target already carries sensible fallback text
     in the markup, so with no session - or no storage - the dashboards
     still render the sample account rather than blanks.
  ---------------------------------------------------------------- */
  var SESSION_KEY = "stackly.session";

  function readSession() {
    try {
      var raw = window.localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      return data && typeof data === "object" ? data : null;
    } catch (e) {
      return null;
    }
  }

  function firstNameOf(name) {
    return String(name).trim().split(/\s+/)[0] || "";
  }

  function initialsOf(name) {
    var parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /* Hooks double as text nodes and as form values, so pick the right setter. */
  function fill(el, value) {
    if (!value) return;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.value = value;
    else el.textContent = value;
  }

  function initCurrentUser() {
    var session = readSession();
    if (!session) return;

    var email = String(session.email || "").trim();
    if (!email) return;

    var name = String(session.name || "").trim() || firstNameOf(email);

    document.querySelectorAll("[data-user-name]").forEach(function (el) {
      fill(el, name);
    });
    document.querySelectorAll("[data-user-email]").forEach(function (el) {
      fill(el, email);
    });
    document.querySelectorAll("[data-user-first]").forEach(function (el) {
      el.textContent = firstNameOf(name);
    });

    var avatar = document.querySelector("[data-user-avatar]");
    if (avatar) {
      var initials = initialsOf(name);
      if (initials) avatar.textContent = initials;
    }

    /* The whole pill carries both details, which is what mobile users get
       once the meta block collapses down to the name. */
    var chip = document.querySelector("[data-user-chip]");
    if (chip) chip.setAttribute("title", name + " — " + email);
  }

  initCurrentUser();

  /* The profile card has no <form> - "Save Changes" is a link - so the shared
     email validator has nothing to hook a submit to. Guard that control
     directly: an unusable address must not let the save go through. */
  if (window.StacklyEmail) {
    var emailField = document.querySelector('input[type="email"]');
    var saveBtn = Array.prototype.slice
      .call(document.querySelectorAll(".dash-btn"))
      .filter(function (btn) {
        return /save changes/i.test(btn.textContent);
      })[0];

    if (emailField && saveBtn) {
      var scope = emailField.closest(".dash-section") || document;
      if (!scope.contains(saveBtn)) scope = document;

      window.StacklyEmail.attach(emailField);

      saveBtn.addEventListener("click", function (e) {
        if (emailField.validateEmail()) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        emailField.focus();
      });
    }
  }

  /* Logout drops the stored identity so the next visitor is not greeted as
     whoever signed in before them. Navigation still proceeds normally. */
  document.querySelectorAll("[data-logout]").forEach(function (link) {
    link.addEventListener("click", function () {
      try {
        window.localStorage.removeItem(SESSION_KEY);
      } catch (e) {
        /* Nothing stored, or storage blocked - the link still navigates. */
      }
    });
  });

  /* Real <button> elements cannot carry an href, so the markup marks them
     with data-goto-404 and we navigate here. Anchors already point at the
     404 page directly and need no handler. */
  document.querySelectorAll("[data-goto-404]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      window.location.href = "404.html";
    });
  });

  /* Count-up numbers */
  function animateNum(el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var dec = (el.getAttribute("data-count").split(".")[1] || "").length;
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1100;
    var t0 = null;

    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      var txt = dec > 0 ? val.toFixed(dec) : Math.round(val).toLocaleString("en-US");
      el.textContent = prefix + txt + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window) {
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            animateNum(en.target);
            obs.unobserve(en.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    document.querySelectorAll(".dg-num").forEach(function (num) {
      obs.observe(num);
    });
  }

  /* Sparkline polylines */
  document.querySelectorAll("[data-spark]").forEach(function (el) {
    var pts = el.getAttribute("data-spark").split(",").map(Number);
    var min = Math.min.apply(null, pts);
    var max = Math.max.apply(null, pts);
    var W = 260;
    var H = 80;
    var stepX = W / (pts.length - 1);
    var coords = pts
      .map(function (v, i) {
        var y = H - ((v - min) / (max - min || 1)) * (H - 12) - 6;
        return i * stepX + "," + y.toFixed(1);
      })
      .join(" ");
    el.innerHTML =
      '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" class="spark-svg" aria-hidden="true"><polyline points="' +
      coords +
      '" fill="none" stroke="#ffd400" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  });
})();