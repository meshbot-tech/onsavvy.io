script>
document.querySelectorAll('.dropdown-toggle').forEach(button => {
  const dropdown = button.closest('.dropdown');
  const menu = dropdown.querySelector('.dropdown-menu');

  function closeDropdown() {
    dropdown.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
  }

  function openDropdown() {
    dropdown.classList.add('open');
    button.setAttribute('aria-expanded', 'true');
  }

  button.addEventListener('click', (e) => {
    e.stopPropagation();

    const isOpen = dropdown.classList.contains('open');

    document.querySelectorAll('.dropdown').forEach(d => {
      d.classList.remove('open');
      d.querySelector('.dropdown-toggle')
        .setAttribute('aria-expanded', 'false');
    });

    if (!isOpen) openDropdown();
  });

  // Keyboard support
  button.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
    if (e.key === 'ArrowDown') {
      openDropdown();
      menu.querySelector('a')?.focus();
    }
  });

  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDropdown();
      button.focus();
    }
  });
});

/* Close on outside click */
document.addEventListener('click', () => {
  document.querySelectorAll('.dropdown').forEach(d => {
    d.classList.remove('open');
    d.querySelector('.dropdown-toggle')
      .setAttribute('aria-expanded', 'false');
  });
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
   FORM SUBMIT STATE
========================= */
const submitBtn = document.getElementById('submitBtn');

if (submitBtn) {
  submitBtn.addEventListener('click', e => {
    e.preventDefault();

    submitBtn.textContent = "✓ Received — we'll be in touch shortly";
    submitBtn.style.background = '#0D7A4E';
    submitBtn.style.pointerEvents = 'none';
  });
}

/* =========================
   WORK CARD STAGGER
========================= */
document.querySelectorAll('.work-card').forEach((card, i) => {
  card.style.transitionDelay = `${i * 0.08}s`;
});