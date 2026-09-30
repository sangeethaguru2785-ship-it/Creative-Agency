/* ------------------------------------------------------------------
   Shared email validation - one rule for every email field on the site.

   Accepted characters: letters (A-Z, a-z), numbers (0-9), "@" and ".".
   Anything else - spaces, + - _ % ! # $ & ' " ( ) [ ] { } < > , ; : / \ ? = ~ ` | ^ and
   every other symbol - is rejected.

   On top of the character rule the value must be a real address shape:
   local part, "@", domain, "." and an alphabetic top level domain, with no
   leading, trailing or doubled dots (name@example.com, jane.smith@team.co.uk).
------------------------------------------------------------------- */
(function (global) {
  "use strict";

  /* Characters allowed anywhere in the address. */
  var ALLOWED = /^[A-Za-z0-9@.]+$/;

  /* Full address shape, built only from the allowed characters. */
  var PATTERN = /^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*@[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*\.[A-Za-z]{2,}$/;

  var MESSAGES = {
    empty: "Please enter your email address.",
    charset: "Email can only contain letters, numbers, @ and .",
    format: "Enter a valid email address, for example name@example.com"
  };

  /**
   * @returns {string} "" when valid, otherwise the reason it is not.
   */
  function validate(value) {
    /* The raw value is checked on purpose - it is never trimmed, so a stray
       leading or trailing space is rejected like any other forbidden character. */
    var v = String(value == null ? "" : value);

    if (!v) return MESSAGES.empty;
    if (!ALLOWED.test(v)) return MESSAGES.charset;
    if (!PATTERN.test(v)) return MESSAGES.format;
    return "";
  }

  function isValid(value) {
    return validate(value) === "";
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

  /**
   * Wire live validation onto one email input.
   *
   * Errors stay hidden while the field is untouched so typing is never
   * interrupted; they appear on blur or once a submit has been attempted.
   * The owning form is blocked in the capture phase, which runs before the
   * page's own submit handler, so an invalid address stops the submission.
   */
  function attach(input) {
    if (!input || input.dataset.emailBound === "1") return;
    input.dataset.emailBound = "1";

    var state = { touched: false, submitted: false };

    function run() {
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
    input.validateEmail = function () {
      state.submitted = true;
      state.touched = true;
      return run();
    };

    var form = input.form || input.closest("form");
    if (form) {
      /* Capture phase, so this runs before the page's own submit handler.
         Only the native submission is cancelled: the page handler still runs and
         gets to show its own summary banner, and every form handler here treats
         an invalid address as a reason not to proceed. */
      form.addEventListener(
        "submit",
        function (e) {
          if (input.validateEmail()) return;
          e.preventDefault();
          if (typeof input.focus === "function") input.focus();
        },
        true
      );
    }
  }

  function attachAll(root) {
    var scope = root || document;
    var found = scope.querySelectorAll('input[type="email"]');
    for (var i = 0; i < found.length; i++) attach(found[i]);
    return found.length;
  }

  global.StacklyEmail = {
    ALLOWED: ALLOWED,
    PATTERN: PATTERN,
    MESSAGES: MESSAGES,
    validate: validate,
    isValid: isValid,
    messageFor: messageFor,
    applyError: applyError,
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
