<script>
/* =========================
   THEME TOGGLE SYSTEM
   ========================= */
(function() {
  const themeToggle = document.getElementById('themeToggle');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  
  // Check for saved theme preference or respect OS preference
  const currentTheme = localStorage.getItem('reedleads-theme');
  if (currentTheme === 'dark' || (!currentTheme && prefersDarkScheme.matches)) {
    document.body.classList.add('dark-theme');
  }
  
  // Toggle theme function
  function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('reedleads-theme', isDark ? 'dark' : 'light');
  }
  
  // Add click event to theme toggle button
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Listen for OS theme changes (optional)
  prefersDarkScheme.addEventListener('change', (e) => {
    if (!localStorage.getItem('reedleads-theme')) {
      if (e.matches) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    }
  });
})();

/* =========================
   MOBILE MENU & DROPDOWN SYSTEM
   ========================= */
(function() {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
  const navCenter = document.querySelector('.nav-center');

  // Mobile menu toggle
  if (mobileMenuToggle && mobileMenuOverlay) {
    mobileMenuToggle.addEventListener('click', () => {
      const isOpen = mobileMenuOverlay.classList.contains('active');
      
      if (isOpen) {
        mobileMenuOverlay.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileMenuToggle.setAttribute('aria-label', 'Open menu');
      } else {
        mobileMenuOverlay.classList.add('active');
        mobileMenuToggle.classList.add('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'true');
        mobileMenuToggle.setAttribute('aria-label', 'Close menu');
      }
    });

    // Close mobile menu when clicking on a link
    mobileMenuOverlay.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenuOverlay.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileMenuToggle.setAttribute('aria-label', 'Open menu');
      });
    });

    // Close mobile menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenuOverlay.classList.contains('active')) {
        mobileMenuOverlay.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileMenuToggle.setAttribute('aria-label', 'Open menu');
        mobileMenuToggle.focus();
      }
    });
  }

  // Dropdown support for both hover (desktop) and click (mobile)
  const dropdowns = document.querySelectorAll('.nav-dropdown');
  
  dropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.nav-dropdown-trigger, .nav-products-trigger');
    const menu = dropdown.querySelector('.mega-menu, .products-menu');
    
    if (!trigger || !menu) return;

    // Check if mobile (touch device or small screen)
    const isMobile = window.innerWidth <= 960 || ('ontouchstart' in window);
    
    if (isMobile) {
      // Click/touch behavior for mobile
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const isOpen = dropdown.classList.contains('open');
        
        // Close all other dropdowns
        document.querySelectorAll('.nav-dropdown.open').forEach(d => {
          if (d !== dropdown) {
            d.classList.remove('open');
            const otherTrigger = d.querySelector('.nav-dropdown-trigger, .nav-products-trigger');
            if (otherTrigger) {
              otherTrigger.setAttribute('aria-expanded', 'false');
            }
          }
        });
        
        if (isOpen) {
          dropdown.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        } else {
          dropdown.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });

      // Close dropdowns when clicking outside
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });

      // Close on escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          dropdown.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
          trigger.focus();
        }
      });
    }
    // Hover behavior is already handled by CSS for desktop
  });
})();

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('nav');

  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
});

/* =========================
   NAV SCROLL STATE
========================= */
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('nav');

  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
});

/* =========================
   SCROLL REVEAL SYSTEM
========================= */
const revealElements = document.querySelectorAll('.reveal');

if (revealElements.length) {
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObs.observe(el));
}

/* =========================
   FAQ ACCORDION
========================= */
const faqButtons = document.querySelectorAll('.faq-question');

if (faqButtons.length) {
  faqButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if (!item) return;

      const isOpen = item.classList.contains('open');

      document.querySelectorAll('.faq-item.open')
        .forEach(i => i.classList.remove('open'));

      if (!isOpen) item.classList.add('open');
    });
  });
}

/* =========================
   CUSTOM CURSOR SYSTEM
========================= */
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');

if (cursor && ring) {
  let mx = -100, my = -100, rx = -100, ry = -100;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
  }, { passive: true });

  (function loop() {
    cursor.style.left = mx + 'px';
    cursor.style.top = my + 'px';

    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;

    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';

    requestAnimationFrame(loop);
  })();

  const hoverTargets = document.querySelectorAll(
    'a, button, .cap-item, .work-card, .audience-card, .value-card'
  );

  hoverTargets.forEach(el => {
    el.addEventListener('mouseenter', () =>
      document.body.classList.add('cursor-hover')
    );

    el.addEventListener('mouseleave', () =>
      document.body.classList.remove('cursor-hover')
    );
  });
}

/* =========================
   SMOOTH SCROLL
========================= */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;

    e.preventDefault();

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  });
});

/* =========================
   PILL TOGGLES
========================= */
const pills = document.querySelectorAll('.bwc-pill');

if (pills.length) {
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      const group = pill.dataset.group;
      if (!group) return;

      if (group === 'budget') {
        document.querySelectorAll('.bwc-pill[data-group="budget"]')
          .forEach(p => p.classList.remove('active'));

        pill.classList.add('active');
      } else {
        pill.classList.toggle('active');
      }
    });
  });
}

/* =========================
   LEAD CAPTURE FORM
   ========================= */
(function() {
  const submitBtn = document.getElementById('submitBtn');

  if (!submitBtn) return;

  // API base - same origin
  const API_BASE = window.location.origin;

  submitBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    // Collect form values
    const name        = document.getElementById('leadName')?.value.trim();
    const email      = document.getElementById('leadEmail')?.value.trim();
    const phone      = document.getElementById('leadPhone')?.value.trim();
    const description= document.getElementById('leadDescription')?.value.trim();

    // Get selected services (pills with .active)
    const services = Array.from(document.querySelectorAll('.bwc-pill[data-group="services"].active'))
                          .map(p => p.textContent.trim());

    // Get selected budget
    const budgetEl = document.querySelector('.bwc-pill[data-group="budget"].active');
    const budget = budgetEl ? budgetEl.textContent.trim() : '';

    // Validate reCAPTCHA
    if (typeof grecaptcha === 'undefined' || !window.recaptchaVerified) {
      showSubmitError('Please complete the reCAPTCHA verification');
      return;
    }

    // Basic validation
    if (!name || !email) {
      showSubmitError('Please fill in required fields (name and email)');
      return;
    }

    if (!services.length) {
      showSubmitError('Please select at least one service');
      return;
    }

    // Build lead object
    const leadData = {
      clientName: name,
      clientEmail: email,
      clientPhone: phone || null,
      source: 'website',
      value: 0, // Will be determined by admin based on service
      stage: 'new',
      notes: [description, `Services: ${services.join(', ')}`, budget ? `Budget: ${budget}` : ''].filter(Boolean).join(' | ')
    };

    // Show loading state
    setSubmitLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit. Please try again.');
      }

        // Build detailed success message with user's selections
      const servicesList = services.join(', ');
      const successMsg = `✓ We've received your inquiry, ${name}! We'll get back within 2-5 hours. ` +
                        `For urgent needs, call +254 955 829 78, WhatsApp +254 713 082 563, or email us.` +
                        `\n\nServices: ${servicesList}${budget ? ' • Budget: ' + budget : ''}`;
      showSubmitSuccess(successMsg);

      // Show detailed confirmation message on the form
      const confirmationEl = document.getElementById('formConfirmation');
      const confirmationText = document.getElementById('confirmationText');
      if (confirmationEl && confirmationText) {
        confirmationText.innerHTML = `We've received your inquiry, <strong>${name}</strong>! We'll get back within <strong>2-5 hours</strong>.<br><br>` +
                                      `<strong>Services:</strong> ${servicesList}<br>` +
                                      `${budget ? '<strong>Budget:</strong> ' + budget + '<br>' : ''}` +
                                      `<strong>Contact us:</strong><br>` +
                                      `📞 +254 955 829 78 | 💬 WhatsApp +254 713 082 563 | ✉️ hello@savvion.co.ke`;
        confirmationEl.style.display = 'block';
        // Scroll to confirmation
        setTimeout(() => confirmationEl.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      }
       
       // Reset form
       document.getElementById('leadName').value = '';
       document.getElementById('leadEmail').value = '';
       document.getElementById('leadPhone').value = '';
       document.getElementById('leadDescription').value = '';
       document.querySelectorAll('.bwc-pill.active').forEach(p => p.classList.remove('active'));

       // Broadcast to other tabs (client portal listening)
      const leads = JSON.parse(localStorage.getItem('savvion_leads')) || [];
      leads.unshift({
        ...leadData,
        id: data.data?.id || Date.now(),
        timestamp: Date.now(),
        services,
        budget
      });
      localStorage.setItem('savvion_leads', JSON.stringify(leads));

      // Dispatch custom event for real-time updates
      window.dispatchEvent(new CustomEvent('leadCaptured', { detail: leadData }));

    } catch (err) {
      console.error('Lead submission failed:', err);
      showSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  });

  function showSubmitError(msg) {
    submitBtn.textContent = msg;
    submitBtn.style.background = '#B83030';
    setTimeout(() => {
      submitBtn.textContent = "Submit →";
      submitBtn.style.background = '';
    }, 3000);
  }

  function showSubmitSuccess(msg) {
    submitBtn.textContent = msg;
    submitBtn.style.background = '#0D7A4E';
    submitBtn.style.pointerEvents = 'none';
    setTimeout(() => {
      submitBtn.textContent = "Submit →";
      submitBtn.style.background = '';
      submitBtn.style.pointerEvents = '';
    }, 4000);
  }

  function setSubmitLoading(loading) {
    if (loading) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Sending…</span>';
    } else {
      submitBtn.disabled = false;
    }
  }

  // Add CSS for spinner
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; }
  `;
  document.head.appendChild(style);

  // Listen for reCAPTCHA ready
  window.recaptchaVerified = false;
  window.addEventListener('recaptchaLoaded', () => {
    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.enterprise.ready(() => {
        // reCAPTCHA ready
      });
    }
  });
})();

/* =========================
   WORK CARD STAGGER
========================= */
document.querySelectorAll('.work-card').forEach((card, i) => {
  card.style.transitionDelay = `${i * 0.08}s`;
});