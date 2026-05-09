/**
 * savvion-auth.js
 * Authentication logic for Savvion Bookings
 * Handles: Phone/Email input → OTP → Dashboard redirect
 *
 * To connect to a real backend, replace the three API stub functions:
 *   requestOtp(mode, value)  →  POST /api/auth/request-otp
 *   verifyOtp(mode, value, code)  →  POST /api/auth/verify-otp
 *   resendOtp(mode, value)  →  POST /api/auth/resend-otp
 *
 * On success the module writes to sessionStorage and redirects to DASHBOARD_URL.
 */

(function () {
  "use strict";

  /* ── Config ─────────────────────────────────────────────────────────── */
  const DASHBOARD_URL   = "./client-dashboard.html"; // ← update to your dashboard path
  const RESEND_SECONDS  = 60;
  const REDIRECT_DELAY  = 3;  // seconds before auto-redirect on success

  /* ── Validation ─────────────────────────────────────────────────────── */
  const Validate = {
    /** Accepts 07xx xxxxxxx, 01xx xxxxxxx, or +2547xx / +2541xx */
    phone(raw) {
      const v = raw.replace(/\s/g, "");
      return /^(07|01)\d{8}$/.test(v)
          || /^\+2547\d{8}$/.test(v)
          || /^\+2541\d{8}$/.test(v);
    },
    email(v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
    },
  };

  /** Normalize a raw Kenyan phone string to +254 format */
  function normalizePhone(raw) {
    const d = raw.replace(/\D/g, "");
    if (d.startsWith("254")) return "+" + d;
    if (d.startsWith("0"))   return "+254" + d.slice(1);
    return raw;
  }

  /** Mask identifier for display in step 2 */
  function maskIdentifier(value, mode) {
    if (mode === "phone") {
      const n = normalizePhone(value);
      return n.slice(0, 7) + "×××" + n.slice(-3);
    }
    const [user, domain] = value.split("@");
    const hidden = user.slice(0, 2) + "×".repeat(Math.max(2, user.length - 2));
    return hidden + "@" + domain;
  }

   /* ── API — configure endpoint URLs below ───────────────────────────── */
   const API = {
     /**
      * Request OTP
      * POST /api/auth/request-otp
      * Body: { mode, value, delivery? }
      */
     async requestOtp({ mode, value, delivery }) {
       try {
         const res = await fetch("/api/auth/request-otp", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ mode, value, delivery }),
         });
         return await res.json();
       } catch (err) {
         console.error("requestOtp error:", err);
         return { ok: false, message: "Network error — check connection and retry." };
       }
     },

     /**
      * Verify OTP
      * POST /api/auth/verify-otp
      * Body: { mode, value, code }
      */
     async verifyOtp(mode, value, code) {
       try {
         const res = await fetch("/api/auth/verify-otp", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ mode, value, code }),
         });
         return await res.json();
       } catch (err) {
         console.error("verifyOtp error:", err);
         return { ok: false, message: "Network error — check connection and retry." };
       }
     },

     /**
      * Resend OTP
      * POST /api/auth/resend-otp
      * Body: { mode, value, delivery? }
      */
     async resendOtp({ mode, value, delivery }) {
       try {
         const res = await fetch("/api/auth/resend-otp", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ mode, value, delivery }),
         });
         return await res.json();
       } catch (err) {
         console.error("resendOtp error:", err);
         return { ok: false, message: "Network error — check connection and retry." };
       }
     },
   };

   /* ── DOM refs ────────────────────────────────────────────────────────── */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

   const dom = {
     // Steps
     steps: $$(".step"),
     dots:  $$(".brand-dot"),

     // Step 1
     tabPhone:    $("#tab-phone"),
     tabEmail:    $("#tab-email"),
     panelPhone:  $("#panel-phone"),
     panelEmail:  $("#panel-email"),
     inputPhone:  $("#input-phone"),
     inputEmail:  $("#input-email"),
     errorPhone:  $("#error-phone"),
     errorEmail:  $("#error-email"),
     btnSend:     $("#btn-send"),
     deliveryOptions: $$(".delivery-option"),
     phoneHint:    $("#phone-hint"),

     // Step 2
     otpDest:     $("#otp-destination"),
     otpBoxes:    $$("#otp-group .otp-box"),
     otpError:    $("#otp-error"),
     otpErrorMsg: $("#otp-error-msg"),
     resendTimer: $("#resend-timer"),
     resendCount: $("#resend-count"),
     btnResend:   $("#btn-resend"),
     btnVerify:   $("#btn-verify"),
     btnBack:     $("#btn-back"),

     // Step 3
     redirectCount: $("#redirect-count"),
     successId:     $("#success-id"),
     successMethod: $("#success-method"),
     btnDashboard:  $("#btn-dashboard"),
   };

   /* ── State ───────────────────────────────────────────────────────────── */
   const state = {
     mode:  "phone",   // "phone" | "email"
     value: "",        // normalized phone or email
     deliveryMethod: "sms", // "sms" | "whatsapp" (phone only)
     resendInterval: null,
     redirectInterval: null,
   };

  /* ══════════════════════════════════════════════════════════════════════
     STEP MANAGEMENT
  ══════════════════════════════════════════════════════════════════════ */
  function goToStep(n) {
    dom.steps.forEach((el, i) => el.classList.toggle("is-active", i === n - 1));
    dom.dots.forEach((el, i) => el.classList.toggle("is-active", i === n - 1));
  }

  /* ══════════════════════════════════════════════════════════════════════
     STEP 1 — Identifier
  ══════════════════════════════════════════════════════════════════════ */

   /** Switch between phone/email tabs */
   function setMode(mode) {
     state.mode = mode;

     dom.tabPhone.classList.toggle("is-active", mode === "phone");
     dom.tabEmail.classList.toggle("is-active", mode === "email");
     dom.tabPhone.setAttribute("aria-selected", mode === "phone");
     dom.tabEmail.setAttribute("aria-selected", mode === "email");

     dom.panelPhone.classList.toggle("is-active", mode === "phone");
     dom.panelEmail.classList.toggle("is-active", mode === "email");

      clearErrors();
      updateSendButton();

      // Update hint text based on mode and delivery method
      updateHintText();

      // When entering phone mode, ensure delivery options reflect current state
      if (mode === "phone") {
        setDeliveryMethod(state.deliveryMethod);
      }

      // Focus the active input
      setTimeout(() => {
        (mode === "phone" ? dom.inputPhone : dom.inputEmail).focus();
      }, 60);
   }

   /** Switch delivery method (SMS / WhatsApp) — phone mode only */
   function setDeliveryMethod(method) {
     if (state.mode !== "phone") return;
     state.deliveryMethod = method;

     dom.deliveryOptions.forEach((opt) => {
       const isActive = opt.dataset.method === method;
       opt.classList.toggle("is-active", isActive);
       const radio = opt.querySelector("input[type=radio]");
       if (radio) radio.checked = isActive;
     });

     updateHintText();
   }

   function updateHintText() {
     if (state.mode === "phone") {
       const method = state.deliveryMethod;
       if (method === "sms") {
         dom.phoneHint.textContent = "We'll send a 6-digit code via SMS. Standard rates may apply.";
       } else {
         dom.phoneHint.textContent = "We'll send a 6-digit code via WhatsApp. Free and instant.";
       }
     } else {
       dom.phoneHint.textContent = "We'll email a 6-digit code. Check spam if it doesn't arrive within 60 seconds.";
     }
   }

  function clearErrors() {
    dom.errorPhone.classList.remove("is-visible");
    dom.errorEmail.classList.remove("is-visible");
    dom.inputPhone.classList.remove("is-error");
    dom.inputEmail.classList.remove("is-error");
  }

  function getInputValue() {
    return state.mode === "phone"
      ? dom.inputPhone.value.trim()
      : dom.inputEmail.value.trim();
  }

  function isInputValid() {
    const val = getInputValue();
    return state.mode === "phone" ? Validate.phone(val) : Validate.email(val);
  }

  function updateSendButton() {
    dom.btnSend.disabled = !isInputValid();
  }

  function showIdentifierError() {
    if (state.mode === "phone") {
      dom.errorPhone.classList.add("is-visible");
      dom.inputPhone.classList.add("is-error");
      dom.inputPhone.focus();
    } else {
      dom.errorEmail.classList.add("is-visible");
      dom.inputEmail.classList.add("is-error");
      dom.inputEmail.focus();
    }
  }

   async function handleSendCode() {
     if (!isInputValid()) { showIdentifierError(); return; }
     clearErrors();

     const raw = getInputValue();
     state.value = state.mode === "phone" ? normalizePhone(raw) : raw.toLowerCase();

     // Loading state
     dom.btnSend.disabled = true;
     dom.btnSend.innerHTML = '<span class="spinner"></span> Sending…';

     try {
       const params = state.mode === "phone"
         ? { mode: state.mode, value: state.value, delivery: state.deliveryMethod }
         : { mode: state.mode, value: state.value };
       const result = await API.requestOtp(params);
       if (!result.ok) throw new Error(result.message || "Failed to send code.");

      // Transition to step 2
      dom.otpDest.textContent = maskIdentifier(state.value, state.mode);
      goToStep(2);
      resetOtpBoxes();
      startResendTimer();
      dom.otpBoxes[0].focus();

    } catch (err) {
      // Show generic error in the field area
      if (state.mode === "phone") {
        dom.errorPhone.classList.add("is-visible");
        dom.errorPhone.querySelector("span") || null;
        dom.errorPhone.lastChild.textContent = err.message;
      } else {
        dom.errorEmail.classList.add("is-visible");
        dom.errorEmail.lastChild.textContent = err.message;
      }
    } finally {
      dom.btnSend.disabled = false;
      dom.btnSend.innerHTML = 'Send code <i class="ti ti-arrow-right" aria-hidden="true"></i>';
      updateSendButton();
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     STEP 2 — OTP
  ══════════════════════════════════════════════════════════════════════ */

  function getOtpValue() {
    return dom.otpBoxes.map((b) => b.value).join("");
  }

  function resetOtpBoxes() {
    dom.otpBoxes.forEach((b) => {
      b.value = "";
      b.classList.remove("is-filled", "is-error");
    });
    dom.otpError.classList.remove("is-visible");
    dom.btnVerify.disabled = true;
  }

  function clearOtpErrors() {
    dom.otpBoxes.forEach((b) => b.classList.remove("is-error"));
    dom.otpError.classList.remove("is-visible");
  }

  function showOtpError(msg) {
    dom.otpErrorMsg.textContent = msg || "That code is incorrect. Try again.";
    dom.otpError.classList.add("is-visible");
    dom.otpBoxes.forEach((b) => b.classList.add("is-error"));
    dom.otpBoxes[0].focus();
  }

  /** Attach keyboard / input / paste behaviour to each OTP box */
  function initOtpBoxes() {
    dom.otpBoxes.forEach((box, i) => {
      box.addEventListener("input", (e) => {
        const char = e.target.value.replace(/\D/g, "").slice(-1);
        box.value = char;
        box.classList.toggle("is-filled", !!char);
        clearOtpErrors();

        if (char && i < dom.otpBoxes.length - 1) {
          dom.otpBoxes[i + 1].focus();
        }

        dom.btnVerify.disabled = getOtpValue().length < 6;
      });

      box.addEventListener("keydown", (e) => {
        if (e.key === "Backspace") {
          if (!box.value && i > 0) {
            dom.otpBoxes[i - 1].value = "";
            dom.otpBoxes[i - 1].classList.remove("is-filled");
            dom.otpBoxes[i - 1].focus();
          }
          box.classList.remove("is-filled");
          dom.btnVerify.disabled = true;
        }
        if (e.key === "ArrowLeft"  && i > 0) dom.otpBoxes[i - 1].focus();
        if (e.key === "ArrowRight" && i < dom.otpBoxes.length - 1) dom.otpBoxes[i + 1].focus();
        if (e.key === "Enter" && getOtpValue().length === 6) handleVerify();
      });

      box.addEventListener("paste", (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData)
          .getData("text")
          .replace(/\D/g, "")
          .slice(0, 6);

        dom.otpBoxes.forEach((b, j) => {
          b.value = pasted[j] || "";
          b.classList.toggle("is-filled", !!pasted[j]);
        });

        const focusIdx = Math.min(pasted.length, dom.otpBoxes.length - 1);
        dom.otpBoxes[focusIdx].focus();
        dom.btnVerify.disabled = pasted.length < 6;
        clearOtpErrors();
      });

      box.addEventListener("focus", (e) => e.target.select());
    });
  }

  async function handleVerify() {
    const code = getOtpValue();
    if (code.length < 6) return;
    clearOtpErrors();

    dom.btnVerify.disabled = true;
    dom.btnVerify.innerHTML = '<span class="spinner"></span> Verifying…';
    dom.otpBoxes.forEach((b) => (b.disabled = true));

    try {
      const result = await API.verifyOtp(state.mode, state.value, code);

      if (!result.ok) {
        showOtpError(result.message);
        return;
      }

      // Persist session for both auth systems
      sessionStorage.setItem("savvion_token",      result.token || "demo-token");
      sessionStorage.setItem("savvion_identifier", state.value);
      sessionStorage.setItem("savvion_method",     state.mode);

       // Also set client-dashboard compatible keys
       sessionStorage.setItem("clientLoggedIn", "true");
       sessionStorage.setItem("clientEmail", state.mode === "phone"
         ? state.value.replace(/^\+254/, "0") + "@savvion.ke"
         : state.value);
       // Set a fallback name for client dashboard (not required but available)
       sessionStorage.setItem("clientName", state.mode === "phone"
         ? "Client"
         : state.value.split("@")[0]);

      transitionToSuccess();

    } catch (err) {
      showOtpError("Something went wrong. Please try again.");
    } finally {
      dom.btnVerify.disabled = false;
      dom.btnVerify.innerHTML = 'Verify &amp; sign in <i class="ti ti-arrow-right" aria-hidden="true"></i>';
      dom.otpBoxes.forEach((b) => (b.disabled = false));
    }
  }

  /* ── Resend timer ────────────────────────────────────────────────────── */
  function startResendTimer(seconds = RESEND_SECONDS) {
    clearInterval(state.resendInterval);

    dom.resendTimer.style.display = "";
    dom.btnResend.classList.remove("is-visible");
    dom.btnResend.disabled = true;

    let remaining = seconds;
    updateResendDisplay(remaining);

    state.resendInterval = setInterval(() => {
      remaining -= 1;
      updateResendDisplay(remaining);

      if (remaining <= 0) {
        clearInterval(state.resendInterval);
        dom.resendTimer.style.display = "none";
        dom.btnResend.classList.add("is-visible");
        dom.btnResend.disabled = false;
      }
    }, 1000);
  }

  function updateResendDisplay(secs) {
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    dom.resendCount.textContent = mm + ":" + ss;
  }

   async function handleResend() {
     dom.btnResend.disabled = true;
     dom.btnResend.innerHTML = '<span class="spinner" style="border-top-color:var(--green);border-color:rgba(45,168,105,.3)"></span> Sending…';

     try {
       const params = state.mode === "phone"
         ? { mode: state.mode, value: state.value, delivery: state.deliveryMethod }
         : { mode: state.mode, value: state.value };
       const result = await API.resendOtp(params);
       if (!result.ok) throw new Error("Failed to resend.");
       resetOtpBoxes();
       startResendTimer();
       dom.otpBoxes[0].focus();
     } catch {
       dom.btnResend.disabled = false;
     } finally {
       dom.btnResend.classList.add("is-visible");
       dom.btnResend.innerHTML = '<i class="ti ti-refresh" aria-hidden="true"></i> Resend code';
     }
   }

  /* ── Back ────────────────────────────────────────────────────────────── */
  function handleBack() {
    clearInterval(state.resendInterval);
    resetOtpBoxes();
    goToStep(1);

    // Restore send button
    dom.btnSend.disabled = !isInputValid();
    dom.btnSend.innerHTML = 'Send code <i class="ti ti-arrow-right" aria-hidden="true"></i>';
  }

  /* ══════════════════════════════════════════════════════════════════════
     STEP 3 — Success + redirect
  ══════════════════════════════════════════════════════════════════════ */
  function transitionToSuccess() {
    dom.successId.textContent     = state.value;
    dom.successMethod.textContent = state.mode === "phone" ? "SMS" : "Email";

    goToStep(3);
    startRedirectCountdown();
  }

  function startRedirectCountdown(seconds = REDIRECT_DELAY) {
    clearInterval(state.redirectInterval);
    let remaining = seconds;
    dom.redirectCount.textContent = remaining;

    state.redirectInterval = setInterval(() => {
      remaining -= 1;
      dom.redirectCount.textContent = remaining;

      if (remaining <= 0) {
        clearInterval(state.redirectInterval);
        navigateToDashboard();
      }
    }, 1000);
  }

  function navigateToDashboard() {
    window.location.href = DASHBOARD_URL;
  }

  /* ══════════════════════════════════════════════════════════════════════
     EVENT WIRING
  ══════════════════════════════════════════════════════════════════════ */
   function init() {
     // Mode tabs
     dom.tabPhone.addEventListener("click", () => setMode("phone"));
     dom.tabEmail.addEventListener("click", () => setMode("email"));

     // Delivery method options (phone mode only)
     dom.deliveryOptions.forEach((opt) => {
       opt.addEventListener("click", () => {
         const method = opt.dataset.method;
         setDeliveryMethod(method);
       });
     });

     // Live validation for send-button enable/disable
     dom.inputPhone.addEventListener("input", () => { clearErrors(); updateSendButton(); });
     dom.inputEmail.addEventListener("input", () => { clearErrors(); updateSendButton(); });

     // Enter-key shortcut on identifier inputs
     dom.inputPhone.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSendCode(); });
     dom.inputEmail.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSendCode(); });

     // Send code
     dom.btnSend.addEventListener("click", handleSendCode);

     // OTP boxes
     initOtpBoxes();

     // Verify
     dom.btnVerify.addEventListener("click", handleVerify);

     // Resend
     dom.btnResend.addEventListener("click", handleResend);

     // Back
     dom.btnBack.addEventListener("click", handleBack);

     // Dashboard button (manual click bypasses countdown)
     dom.btnDashboard.addEventListener("click", () => {
       clearInterval(state.redirectInterval);
       navigateToDashboard();
     });

     // Initial hint text & delivery selection
     updateHintText();
     setDeliveryMethod(state.deliveryMethod); // ensure classes & radios are in sync

     // Autofocus phone input on load
     dom.inputPhone.focus();
   }

  /* ── Boot ───────────────────────────────────────────────────────────── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();