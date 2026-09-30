/* ------------------------------------------------------------------
   Shared password validation - one rule for the login and signup pages.

   A password is accepted only when it is at least 8 characters long and
   holds an uppercase letter (A-Z), a lowercase letter (a-z), a digit (0-9)
   and at least one special character. A special character is anything that
   is not a letter, a digit or whitespace, so @ # $ % ! _ - ? and friends
   all count.

   Every unmet rule is named in a single message, and the same list is
   rendered as a live checklist below the field so each requirement can be
   seen tick off while the password is typed.

   The rules live here rather than in the pages so the two pages can never
   drift apart and accept different passwords.
------------------------------------------------------------------- */
(function (global) {
  "use strict";

  var MIN_LENGTH = 8;

  /* Any character that is not a letter, a digit or whitespace. */
  var SPECIAL = /[^A-Za-z0-9\s]/;

  /* `needs` is the wording used inside the error message, `label` the short
     wording used on the checklist. Order here is the order shown to the user. */
  var RULES = [
    {
      id: "length",
      needs: "at least " + MIN_LENGTH + " characters",
      label: MIN_LENGTH + "+ characters",
      test: function (v) {
        return v.length >= MIN_LENGTH;
      }
    },
    {
      id: "upper",
      needs: "an uppercase letter (A-Z)",
      label: "Uppercase letter",
      test: function (v) {
        return /[A-Z]/.test(v);
      }
    },
    {
      id: "lower",
      needs: "a lowercase letter (a-z)",
      label: "Lowercase letter",
      test: function (v) {
        return /[a-z]/.test(v);
      }
    },
    {
      id: "digit",
      needs: "a number (0-9)",
      label: "Number",
      test: function (v) {
        return /[0-9]/.test(v);
      }
    },
    {
      id: "special",
      needs: "a special character (e.g. @ # $ % !)",
      label: "Special character",
      test: function (v) {
        return SPECIAL.test(v);
      }
    }
  ];

  var MESSAGES = {
    empty: "Please enter your password."
  };

  function asString(value) {
    return String(value == null ? "" : value);
  }

  /* "a", "a and b", "a, b and c" */
  function join(items) {
    if (items.length < 2) return items.join("");
    return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
  }

  /**
   * @returns {Array} the rules the value does not satisfy, in display order.
   */
  function unmet(value) {
    var v = asString(value);
    var missing = [];
    for (var i = 0; i < RULES.length; i++) {
      if (!RULES[i].test(v)) missing.push(RULES[i]);
    }
    return missing;
  }

  /**
   * @returns {string} "" when valid, otherwise the reason it is not.
   */
  function validate(value) {
    var v = asString(value);
    if (!v) return MESSAGES.empty;

    var missing = unmet(v);
    if (!missing.length) return "";

    var needs = [];
    for (var i = 0; i < missing.length; i++) needs.push(missing[i].needs);
    return "Password must contain " + join(needs) + ".";
  }

  function isValid(value) {
    return validate(value) === "";
  }

  /* True for the inputs this module owns: the primary password of a form. The
     "confirm password" field is a match check, not a strength check. */
  function owns(input) {
    return !!input && input.name === "password" && input.type === "password";
  }

  /* The .field-msg node belonging to an input, if the markup provides one. */
  function messageFor(input) {
    var scope = input.closest(".auth-field") || input.parentElement;
    return scope ? scope.querySelector(".field-msg") : null;
  }

  function applyError(input, error) {
    var msg = messageFor(input);

    if (error) {
      input.classList.add("is-invalid");
      input.setAttribute("aria-invalid", "true");
      if (msg) {
        var text = msg.querySelector("span");
        if (text) text.textContent = error;
        else msg.textContent = error;
        msg.classList.add("is-visible");
      }
    } else {
      input.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
      if (msg) msg.classList.remove("is-visible");
    }

    /* Keep the native constraint API in step with the visible state. */
    if (typeof input.setCustomValidity === "function") {
      input.setCustomValidity(error || "");
    }
  }

  /* The checklist container declared next to the input, e.g.
     <div class="pw-hint" data-pw-rules-for="signupPassword"></div>.
     The list itself is built from RULES so both pages stay identical. */
  function checklistFor(input) {
    if (!input || !input.id) return null;

    var host = document.querySelector('[data-pw-rules-for="' + input.id + '"]');
    if (!host) return null;

    var list = host.querySelector(".pw-rules");
    if (list) return list;

    list = document.createElement("ul");
    list.className = "pw-rules";
    /* The error message already carries the same information to screen
       readers, and this list changes on every keystroke. */
    list.setAttribute("aria-hidden", "true");

    for (var i = 0; i < RULES.length; i++) {
      var li = document.createElement("li");
      li.setAttribute("data-pw-rule", RULES[i].id);

      var icon = document.createElement("i");
      icon.className = "bi bi-circle";

      var text = document.createElement("span");
      text.textContent = RULES[i].label;

      li.appendChild(icon);
      li.appendChild(text);
      list.appendChild(li);
    }

    host.appendChild(list);
    return list;
  }

  function paint(list, value) {
    var v = asString(value);

    for (var i = 0; i < list.children.length; i++) {
      var rule = RULES[i];
      var ok = rule.test(v);
      var li = list.children[i];
      li.classList.toggle("is-ok", ok);
      var icon = li.querySelector("i");
      if (icon) icon.className = ok ? "bi bi-check-circle-fill" : "bi bi-circle";
    }

    list.classList.toggle("is-active", v.length > 0);
  }

  /**
   * Wire live validation onto one password input.
   *
   * The checklist follows every keystroke, but the error message stays hidden
   * while the field is untouched so typing is never interrupted; it appears on
   * blur or once a submit has been attempted. The owning form is blocked in the
   * capture phase, which runs before the page's own submit handler, so a weak
   * password stops the submission.
   */
  function attach(input) {
    if (!input || input.dataset.passwordBound === "1") return;
    input.dataset.passwordBound = "1";

    var list = checklistFor(input);
    var state = { touched: false, submitted: false };

    function run() {
      if (list) paint(list, input.value);

      var error = validate(input.value);
      if (error && !(state.touched || state.submitted)) error = "";
      applyError(input, error);
      return error === "";
    }

    input.addEventListener("input", run);
    input.addEventListener("blur", function () {
      state.touched = true;
      run();
    });

    /* Expose the check so page code can ask without waiting for an event. */
    input.validatePassword = function () {
      state.submitted = true;
      state.touched = true;
      return run();
    };

    var form = input.form || input.closest("form");
    if (form) {
      /* Capture phase, so this runs before the page's own submit handler.
         Only the native submission is cancelled: the page handler still runs and
         gets to show its own summary banner, and it treats an invalid password
         as a reason not to proceed too. */
      form.addEventListener(
        "submit",
        function (e) {
          if (input.validatePassword()) return;
          e.preventDefault();
          if (typeof input.focus === "function") input.focus();
        },
        true
      );
    }

    if (list) paint(list, input.value);
  }

  function attachAll(root) {
    var scope = root || document;
    var found = scope.querySelectorAll('input[type="password"]');
    for (var i = 0; i < found.length; i++) {
      if (owns(found[i])) attach(found[i]);
    }
  }

  global.StacklyPassword = {
    MIN_LENGTH: MIN_LENGTH,
    SPECIAL: SPECIAL,
    RULES: RULES,
    MESSAGES: MESSAGES,
    validate: validate,
    isValid: isValid,
    unmet: unmet,
    owns: owns,
    messageFor: messageFor,
    applyError: applyError,
    checklistFor: checklistFor,
    attach: attach,
    attachAll: attachAll
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      attachAll();
    });
  } else {
    attachAll();
  }
})(window);
