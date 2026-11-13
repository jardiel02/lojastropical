(() => {
  const carousel = document.getElementById("inicio");
  const slides = Array.from(carousel.querySelectorAll(".banner-slide"));
  const dots = Array.from(carousel.querySelectorAll(".banner-dot"));
  const pauseButton = document.getElementById("bannerPause");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const interval = 6000;
  let current = 0;
  let timer;
  let paused = reducedMotion.matches;
  let hovered = false;
  let keyboardFocus = false;
  let inView = true;

  function schedule() {
    clearTimeout(timer);
    if (paused || hovered || keyboardFocus || document.hidden || !inView) return;
    timer = setTimeout(() => show(current + 1), interval);
  }

  function show(index, announce = false) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === current;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
      slide.inert = !active;
      dots[i].setAttribute("aria-pressed", String(active));
    });
    if (announce) {
      document.getElementById("bannerStatus").textContent = slides[current].getAttribute("aria-label");
    }
    schedule();
  }

  function updatePauseButton() {
    pauseButton.setAttribute("aria-label", paused ? "Retomar troca automática" : "Pausar troca automática");
    document.getElementById("bannerPauseText").textContent = paused ? "Retomar" : "Pausar";
    document.getElementById("bannerPauseIcon").toggleAttribute("hidden", paused);
    document.getElementById("bannerPlayIcon").toggleAttribute("hidden", !paused);
    schedule();
  }

  document.getElementById("bannerPrev").addEventListener("click", () => show(current - 1, true));
  document.getElementById("bannerNext").addEventListener("click", () => show(current + 1, true));
  dots.forEach((dot, i) => dot.addEventListener("click", () => show(i, true)));
  pauseButton.addEventListener("click", () => {
    paused = !paused;
    updatePauseButton();
  });

  // Give visitors time to read while using a mouse or keyboard.
  carousel.addEventListener("pointerenter", event => {
    if (event.pointerType !== "mouse") return;
    hovered = true;
    schedule();
  });
  carousel.addEventListener("pointerleave", event => {
    if (event.pointerType !== "mouse") return;
    hovered = false;
    schedule();
  });
  carousel.addEventListener("focusin", event => {
    keyboardFocus = event.target.matches(":focus-visible");
    schedule();
  });
  carousel.addEventListener("focusout", () => {
    queueMicrotask(() => {
      keyboardFocus = carousel.contains(document.activeElement) && document.activeElement.matches(":focus-visible");
      schedule();
    });
  });
  document.addEventListener("visibilitychange", schedule);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      schedule();
    }).observe(carousel);
  }
  reducedMotion.addEventListener("change", event => {
    paused = event.matches;
    updatePauseButton();
  });

  function showLinkedSlide() {
    const linked = slides.findIndex(slide => location.hash === "#" + slide.id);
    if (linked !== -1) show(linked);
  }
  window.addEventListener("hashchange", showLinkedSlide);
  showLinkedSlide();
  updatePauseButton();
})();
