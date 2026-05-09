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

  submitBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    // Collect form values
    const name       = document.getElementById('leadName')?.value.trim();
    const email      = document.getElementById('leadEmail')?.value.trim();
    const phone      = document.getElementById('leadPhone')?.value.trim();
    const description= document.getElementById('leadDescription')?.value.trim();

    // Get selected services (pills with .active)
    const services = Array.from(document.querySelectorAll('.bwc-pill[data-group="services"].active'))
                          .map(p => p.textContent.trim());

    // Get selected budget
    const budgetEl = document.querySelector('.bwc-pill[data-group="budget"].active');
    const budget = budgetEl ? budgetEl.textContent.trim() : '';

    // Basic validation
    if (!name || !email) {
      submitBtn.textContent = "Please fill in required fields";
      submitBtn.style.background = '#B83030';
      setTimeout(() => {
        submitBtn.textContent = "Submit →";
        submitBtn.style.background = '';
      }, 2000);
      return;
    }

    // Build lead object
    const lead = {
      id: Date.now(),
      name,
      email,
      phone,
      services,
      budget,
      description,
      timestamp: Date.now(),
      status: 'new'
    };

    // Save to localStorage
    try {
      const leads = JSON.parse(localStorage.getItem('savvion_leads')) || [];
      leads.unshift(lead); // newest first
      localStorage.setItem('savvion_leads', JSON.stringify(leads));

      // Also broadcast to other tabs/windows via storage event (automatically fired)
      // No need for custom event; other tabs listening to storage will get update.

      // Success feedback
      submitBtn.textContent = "✓ Received — we'll be in touch shortly";
      submitBtn.style.background = '#0D7A4E';
      submitBtn.style.pointerEvents = 'none';

      // Reset form
      document.getElementById('leadName').value = '';
      document.getElementById('leadEmail').value = '';
      document.getElementById('leadPhone').value = '';
      document.getElementById('leadDescription').value = '';
      document.querySelectorAll('.bwc-pill.active').forEach(p => p.classList.remove('active'));

    } catch (err) {
      console.error('Failed to save lead:', err);
      submitBtn.textContent = "Error — try again";
      submitBtn.style.background = '#B8720A';
      setTimeout(() => {
        submitBtn.textContent = "Submit →";
        submitBtn.style.background = '';
      }, 2000);
    }
  });
})();

/* =========================
   WORK CARD STAGGER
========================= */
document.querySelectorAll('.work-card').forEach((card, i) => {
  card.style.transitionDelay = `${i * 0.08}s`;
});