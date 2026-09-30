/* ------------------------------------------------------------------
   Shared name validation - one rule for every name field on the site
   (the full name on signup, the contact form's name).

   A name is accepted only when it is made of letters: A-Z and a-z, with
   single spaces allowed between the words. Numbers and every special
   character are rejected, and the message names the characters to remove so
   it is obvious what went wrong.

   The rules live here rather than in the pages so every name field accepts
   and rejects exactly the same names.
------------------------------------------------------------------- */
(function (global) {
  "use strict";

  /* One or more letters, then any number of " space letters" groups. */
  var PATTERN = /^[A-Za-z]+(?: +[A-Za-z]+)*$/;

  /* The same rule one character at a time, for naming the characters to remove.
     A lone space is allowed here, so it is never reported as the problem. */
  var ALLOWED_CHAR = /[A-Za-z ]/;

  /* Pasted rubbish can hold a dozen different symbols; naming them all
     would be noise, so the list is capped. */
  var MAX_LISTED = 6;

  var MESSAGES = {
    empty: "Please enter your name.",
    charset: "Name can only contain letters and spaces. Please remove: "
  };

  function asString(value) {
    return String(value == null ? "" : value);
  }

  /**
   * The characters in the value that are not a letter or a space, in the order
   * they first appear and without repeats.
   *
   * @returns {string} e.g. "3, @"
   */
  function offenders(value) {
    var v = asString(value);
    var found = [];

    for (var i = 0; i < v.length; i++) {
      var ch = v.charAt(i);
      if (ALLOWED_CHAR.test(ch)) continue;
      if (found.indexOf(ch) === -1) found.push(ch);
    }

    var listed = found.slice(0, MAX_LISTED).join(", ");
    return found.length > MAX_LISTED ? listed + " and more" : listed;
  }

  /**
   * @returns {string} "" when valid, otherwise the reason it is not.
   */
  function validate(value) {
    /* Any run of whitespace - a stray space, a tab or a newline from a paste -
       counts as the single space between two names, and the outer edges are
       trimmed, so padding never looks like an error. */
    var v = asString(value).replace(/\s+/g, " ").trim();

    if (!v) return MESSAGES.empty;
    if (PATTERN.test(v)) return "";

    var bad = offenders(v);
    if (!bad) return "";

    return MESSAGES.charset + bad + ".";
  }

  function isValid(value) {
    return validate(value) === "";
  }

  /* True for the inputs this module owns. The markup opts a field in with
     data-name-field, so the signup name and the contact name are covered
     whatever their name attribute happens to be. */
  function owns(input) {
    return !!input && input.hasAttribute && input.hasAttribute("data-name-field");
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
   * Wire live validation onto one name input.
   *
   * A character that is not allowed is called out the moment it is typed, which
   * is the whole point of the rule. "Please enter your name." is quieter: it
   * waits for blur or a submit, so emptying a field mid-edit is not scolded.
   * The owning form is blocked in the capture phase, which runs before the
   * page's own submit handler, so an invalid name stops the submission.
   */
  function attach(input) {
    if (!input || input.dataset.nameBound === "1") return;
    input.dataset.nameBound = "1";

    var state = { touched: false, submitted: false };

    function run() {
      var error = validate(input.value);
      var show = state.touched || state.submitted || (error && error !== MESSAGES.empty);
      applyError(input, show ? error : "");
      return error === "";
    }

    input.addEventListener("input", run);
    input.addEventListener("blur", function () {
      state.touched = true;
      run();
    });

    /* Expose the check so page code can ask without waiting for an event. */
    input.validateName = function () {
      state.submitted = true;
      state.touched = true;
      return run();
    };

    var form = input.form || input.closest("form");
    if (form) {
      /* Capture phase, so this runs before the page's own submit handler.
         Only the native submission is cancelled: the page handler still runs and
         gets to show its own success state, and it treats an invalid name as a
         reason not to proceed too. */
      form.addEventListener(
        "submit",
        function (e) {
          if (input.validateName()) return;
          e.preventDefault();
          if (typeof input.focus === "function") input.focus();
        },
        true
      );
    }
  }

  function attachAll(root) {
    var scope = root || document;
    var found = scope.querySelectorAll("[data-name-field]");
    for (var i = 0; i < found.length; i++) attach(found[i]);
    return found.length;
  }

  global.StacklyName = {
    PATTERN: PATTERN,
    ALLOWED_CHAR: ALLOWED_CHAR,
    MESSAGES: MESSAGES,
    validate: validate,
    isValid: isValid,
    offenders: offenders,
    owns: owns,
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
