gsap.registerPlugin(ScrollTrigger);

const items = document.querySelectorAll(".cap-item");

gsap.set(items, {
  opacity: 0,
  y: 80,
  scale: 0.98
});

items.forEach((item) => {
  gsap.to(item, {
    opacity: 0.95,
    y: 50,
    scale: 1,
    duration: 0.7,
    ease: "power2.out",
    scrollTrigger: {
      trigger: item,
      start: "top 90%",
      end: "top 40%",
      toggleActions: "play none none reverse",
      invalidateOnRefresh: true
    }
  });
});   
 
// Note: IntersectionObserver removed - ScrollTrigger handles active state management
// This eliminates redundant scroll listeners and potential conflicts

items.forEach(item => {
  const img = item.querySelector(".cap-image");
  const cover = item.querySelector(".cap-cover");

  if (!img || img.getAttribute("src") === "") {
    item.classList.add("no-image");
    if (cover) cover.style.display = "none";
  }
});   
 
// Configuration constants for better maintainability
const SCROLL_CONFIG = {
  start: "top 60%",
  end: "bottom 60%",
  threshold: 0.6
};

/**
 * Sets the active class on the item at the specified index
 * @param {number} index - The index of the item to activate (-1 to remove all active)
 */
function setActive(index) {
  // Handle -1 to remove all active classes
  if (index < 0) {
    items.forEach(item => item.classList.remove("active"));
    return;
  }
  
  if (index >= items.length) return;
  
  items.forEach((item, i) => {
    item.classList.toggle("active", i === index);
  });
}

/**
 * Creates ScrollTrigger instances for all items
 * @returns {Array} Array of ScrollTrigger instances for cleanup if needed
 */
function createScrollTriggers() {
  if (!items || items.length === 0) {
    console.warn("No items found for ScrollTrigger initialization");
    return [];
  }

  const triggers = [];
  
  items.forEach((item, index) => {
    // Validate item exists
    if (!item) {
      console.warn(`Item at index ${index} is null or undefined`);
      return;
    }

    const trigger = ScrollTrigger.create({
      trigger: item,
      start: SCROLL_CONFIG.start,
      end: SCROLL_CONFIG.end,
      onEnter: () => setActive(index),
      onEnterBack: () => setActive(index),
      onLeave: () => setActive(-1),
      onLeaveBack: () => setActive(-1),
      // Add these for better performance and UX
      invalidateOnRefresh: true,
      // Prevent memory leaks
      onToggle: (self) => {
        // Optional: Add any additional toggle logic here
      }
    });
    
    triggers.push(trigger);
  });
  
  return triggers;
}

/**
 * Cleanup function to kill all ScrollTrigger instances
 * Call this when navigating away or unmounting components
 */
function cleanupScrollTriggers() {
  scrollTriggers.forEach(trigger => trigger.kill());
}

// Initialize ScrollTriggers
const scrollTriggers = createScrollTriggers();

gsap.registerPlugin(ScrollTrigger);

/* SECTION TITLE REVEAL */
gsap.from(".how .section-title", {
  opacity: 0,
  y: 30,
  duration: 1,
  ease: "power3.out",
  scrollTrigger: {
    trigger: ".how",
    start: "top 70%"
  }
});

/* HOW STEPS STAGGER REVEAL */
gsap.from(".how-step", {
  opacity: 0,
  y: 40,
  duration: 0.9,
  stagger: 0.15,
  ease: "power3.out",
  scrollTrigger: {
    trigger: ".how-track",
    start: "top 75%"
  }
});

/* STEP NUMBERS SLIDE IN */
gsap.from(".how-step-num", {
  opacity: 0,
  x: -20,
  duration: 0.6,
  stagger: 0.15,
  ease: "power3.out",
  scrollTrigger: {
    trigger: ".how-track",
    start: "top 75%"
  }
});

/* SUBTLE PARALLAX */
gsap.to(".how-track", {
  y: -20,
  ease: "none",
  scrollTrigger: {
    trigger: ".how",
    start: "top bottom",
    end: "bottom top",
    scrub: true
  }
});