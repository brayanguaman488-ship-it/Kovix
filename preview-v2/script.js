document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const opening = menu.classList.contains('hidden');
      menu.classList.toggle('hidden');
      toggle.setAttribute('aria-expanded', String(opening));
    });

    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const revealItems = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealItems.forEach(item => observer.observe(item));

  if (window.HSStaticMethods?.autoInit) {
    window.HSStaticMethods.autoInit();
  }
});
