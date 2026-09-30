/* STACKLY — Authentication pages (login / signup) */
(function () {
  "use strict";

  var DASH_BY_ROLE = {
    admin: "admin-dashboard.html",
    client: "client-dashboard.html"
  };

  /* Email rules live in js/email-validate.js so every form on the site
     accepts and rejects exactly the same addresses. */
  var EMAIL_RE = window.StacklyEmail ? window.StacklyEmail.PATTERN : /^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*@[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*\.[A-Za-z]{2,}$/;

  /* Password rules live in js/password-validate.js so login and signup accept
     and reject exactly the same passwords. The copy below is only a stand-in
     for when that script fails to load - keep the two in step. */
  var PW_UPPER = /[A-Z]/;
  var PW_LOWER = /[a-z]/;
  var PW_DIGIT = /[0-9]/;
  var PW_SPECIAL = /[^A-Za-z0-9\s]/;

  function fallbackPasswordError(value) {
    var v = String(value == null ? "" : value);
    if (!v) return "Please enter your password.";

    var needs = [];
    if (v.length < 8) needs.push("at least 8 characters");
    if (!PW_UPPER.test(v)) needs.push("an uppercase letter (A-Z)");
    if (!PW_LOWER.test(v)) needs.push("a lowercase letter (a-z)");
    if (!PW_DIGIT.test(v)) needs.push("a number (0-9)");
    if (!PW_SPECIAL.test(v)) needs.push("a special character (e.g. @ # $ % !)");
    if (!needs.length) return "";

    var joined = needs.length < 2
      ? needs[0]
      : needs.slice(0, -1).join(", ") + " and " + needs[needs.length - 1];
    return "Password must contain " + joined + ".";
  }

  /* Signed-in identity, shared with js/dashboard.js. The dashboards read this to
     show whose account is open, so both files must agree on the key. */
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

  /* Login has no name field, so fall back to whatever the address implies:
     "jane.smith@acme.com" -> "Jane Smith". */
  function nameFromEmail(email) {
    var local = String(email).split("@")[0] || "";
    return local
      .split(/[._-]+/)
      .filter(Boolean)
      .map(function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

  function saveSession(session) {
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      /* Private mode or storage disabled. The dashboard keeps its fallback
         markup, so the flow still works. */
    }
  }

  /* Signup supplies the real full name. Login has no name field, so prefer a name
     this same address signed up with before guessing one from the address. */
  function resolveName(email, nameField) {
    var typed = nameField ? nameField.value.trim() : "";
    if (typed) return typed;

    var previous = readSession();
    if (previous && previous.email === email && previous.name) return previous.name;

    return nameFromEmail(email);
  }

  var form = document.querySelector(".auth-card form");
  if (!form) return;

  var successBox = document.getElementById("authSuccess");
  var errBox = document.getElementById("authErr");

  function fieldFor(input) {
    return input.closest(".auth-field");
  }

  function msgFor(input) {
    var field = fieldFor(input);
    return field ? field.querySelector(".field-msg") : null;
  }

  /* Email feedback goes through js/email-validate.js so the icon survives and
     the wording matches every other form; other fields fall back to the local
     textContent path. */
  function setError(input, message) {
    if (window.StacklyEmail) {
      window.StacklyEmail.applyError(input, message);
      return;
    }
    input.classList.add("is-invalid");
    var msg = msgFor(input);
    if (msg) msg.textContent = message;
    if (msg) msg.classList.add("is-visible");
    input.setAttribute("aria-invalid", "true");
  }

  function clearError(input) {
    if (window.StacklyEmail) {
      window.StacklyEmail.applyError(input, "");
      return;
    }
    input.classList.remove("is-invalid");
    var msg = msgFor(input);
    if (msg) msg.classList.remove("is-visible");
    input.removeAttribute("aria-invalid");
  }

  /* Password visibility toggles */
  document.querySelectorAll(".auth-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var input = document.getElementById(btn.getAttribute("data-target"));
      if (!input) return;
      var isText = input.type === "text";
      input.type = isText ? "password" : "text";
      btn.innerHTML = isText
        ? '<i class="bi bi-eye"></i>'
        : '<i class="bi bi-eye-slash"></i>';
      btn.setAttribute("aria-label", isText ? "Show password" : "Hide password");
    });
  });

  /* Validators */
  var rules = {
    email: function (input) {
      /* The shared module inspects the raw value so padding spaces are caught. */
      if (window.StacklyEmail) return window.StacklyEmail.validate(input.value);
      var v = input.value.trim();
      if (!v) return "Please enter your email address.";
      if (!EMAIL_RE.test(v)) return "That doesn't look like a valid email address.";
      return "";
    },
    password: function (input) {
      if (window.StacklyPassword) return window.StacklyPassword.validate(input.value);
      return fallbackPasswordError(input.value);
    },
    name: function (input) {
      /* Name rules live in js/name-validate.js so every name field on the site
         accepts and rejects exactly the same names. */
      if (window.StacklyName) return window.StacklyName.validate(input.value);
      if (!input.value.trim()) return "Please enter your full name.";
      return "";
    },
    confirmPassword: function (input) {
      var pw = form.querySelector('input[name="password"]');
      var v = input.value;
      if (!v) return "Please confirm your password.";
      if (pw && v !== pw.value) return "Passwords don't match.";
      return "";
    },
    company: function () {
      return "";
    }
  };

  /* Checkbox rules, keyed by name. Every one of these is an opt-in, so unticked
     means the form is not ready to send; a checkbox missing from this map is
     not required. */
  var targetables = {
    checkbox: {
      remember: "Please select Remember Me to continue.",
      terms: "Please accept the terms and conditions to continue."
    }
  };

  /* @returns {string} "" when the checkbox is ticked or is not required. */
  function checkboxError(input) {
    var message = targetables.checkbox[input.name];
    if (!message) return "";
    return input.checked ? "" : message;
  }

  function validate(input) {
    var fn = rules[input.name] || rules[input.type];
    if (!fn) return true;
    var error = fn(input);
    if (error) setError(input, error);
    else clearError(input);
    return error === "";
  }

  /* The primary password field is owned by js/password-validate.js: it keeps the
     requirement checklist in step with every keystroke and only shows its error
     once the field has been left or a submit was tried, so a half-typed password
     is not scolded. It is still checked in the submit pass below. */
  function isPasswordField(input) {
    return !!(window.StacklyPassword && window.StacklyPassword.owns(input));
  }

  /* Name fields are owned by js/name-validate.js, which names the offending
     character as soon as it is typed but leaves "please enter your name" until
     the field has been left or a submit was tried. Both are still checked in
     the submit pass below. */
  function isNameField(input) {
    return !!(window.StacklyName && window.StacklyName.owns(input));
  }

  /* Re-validate as the user edits */
  form.querySelectorAll("input").forEach(function (input) {
    input.addEventListener("input", function () {
      if (input.type === "checkbox") return;
      if (isPasswordField(input) || isNameField(input)) return;
      validate(input);
    });
    input.addEventListener("change", function () {
      if (input.type === "checkbox") return;
      if (isPasswordField(input) || isNameField(input)) return;
      clearError(input);
    });
  });

  function msgForCheckbox(input) {
    var wrapper = input.closest(".auth-meta");
    if (!wrapper) return null;
    var sibling = wrapper.nextElementSibling;
    if (sibling && sibling.classList && sibling.classList.contains("field-msg")) return sibling;
    return wrapper.querySelector(".field-msg");
  }

  /* Checkbox feedback, kept beside the email and password paths so the icon in
     .field-msg survives and only the text inside it is rewritten. */
  function setCheckboxError(input, message) {
    var msg = msgForCheckbox(input);

    if (message) {
      if (msg) {
        var text = msg.querySelector("span");
        if (text) text.textContent = message;
        else msg.textContent = message;
        msg.classList.add("is-visible");
      }
      input.classList.add("is-invalid");
      input.setAttribute("aria-invalid", "true");
    } else {
      if (msg) msg.classList.remove("is-visible");
      input.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
    }
  }

  form.querySelectorAll('input[type="checkbox"]').forEach(function (input) {
    input.addEventListener("change", function () {
      setCheckboxError(input, checkboxError(input));
      if (errBox) errBox.classList.remove("is-visible");
    });
  });

  /* Submit */
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (successBox) successBox.classList.remove("is-visible");
    if (errBox) errBox.classList.remove("is-visible");

    var firstInvalid = null;
    var invalid = false;

    form.querySelectorAll("input").forEach(function (input) {
      if (input.type === "checkbox") {
        var boxError = checkboxError(input);
        setCheckboxError(input, boxError);
        if (boxError) {
          invalid = true;
          if (!firstInvalid) firstInvalid = input;
        }
        return;
      }

      var ok = validate(input);
      if (!ok) {
        invalid = true;
        if (!firstInvalid) firstInvalid = input;
      }
    });

    var roleEl = form.querySelector('input[name="role"]:checked');
    var role = roleEl ? roleEl.value : "client";

    if (invalid) {
      if (errBox) errBox.classList.add("is-visible");
      if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
      return;
    }

    /* All good — record who is signing in, show success, then route to the
       matching dashboard so its header can greet the right person. */
    var emailField = form.querySelector('input[name="email"]');
    var email = emailField ? emailField.value.trim() : "";
    saveSession({
      name: resolveName(email, form.querySelector('input[name="name"]')),
      email: email,
      role: role
    });

    var btn = form.querySelector(".auth-btn");
    if (btn) btn.classList.add("is-busy");
    if (successBox) successBox.classList.add("is-visible");
    setTimeout(function () {
      window.location.href = DASH_BY_ROLE[role] || "client-dashboard.html";
    }, 900);
  });
})();