(() => {
  const carousel = document.querySelector('.brand-carousel');
  if (!carousel) return;
  const track = carousel.querySelector('.brand-carousel-track');
  const toggle = carousel.querySelector('.brand-carousel-toggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;

  // Duplicate only for the visual loop; assistive technology reads each brand once.
  for (const brand of [...track.children]) {
    const copy = brand.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.setAttribute('data-duplicate', '');
    copy.querySelector('img').alt = '';
    track.appendChild(copy);
  }
  const updateMotion = () => {
    carousel.toggleAttribute('data-animated', !reducedMotion.matches);
    toggle.hidden = reducedMotion.matches;
  };
  toggle.addEventListener('click', () => {
    paused = !paused;
    carousel.toggleAttribute('data-paused', paused);
    toggle.textContent = paused ? 'Reanudar carrusel' : 'Pausar carrusel';
  });
  reducedMotion.addEventListener('change', updateMotion);
  updateMotion();
})();
