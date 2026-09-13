document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('header');

  if (header) {
    header.outerHTML = `
      <header class="fixed inset-x-0 top-4 z-50 w-full px-3 sm:px-5">
        <nav class="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between rounded-[26px] border border-white/10 bg-[#08111c]/92 px-2 py-2 shadow-[0_18px_55px_rgba(0,0,0,.26)] backdrop-blur-2xl md:flex-nowrap md:px-3" aria-label="Navegación principal">
          <div class="flex items-center ps-3 sm:ps-4">
            <a href="#inicio" class="flex-none rounded-md text-white focus:outline-none focus:opacity-80" aria-label="KOVPAY inicio">
              <span class="text-[17px] font-black tracking-[0.10em]">KOVPAY</span>
            </a>
          </div>

          <div class="flex items-center gap-x-2 md:order-3">
            <a href="#contacto" class="hidden items-center gap-x-2 rounded-[22px] border border-white bg-white px-4 py-2.5 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-sky-50 sm:inline-flex">
              Solicitar demo
            </a>

            <button type="button" class="hs-collapse-toggle flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white md:hidden" id="hs-kovpay-collapse" aria-expanded="false" aria-controls="hs-kovpay-nav" aria-label="Abrir navegación" data-hs-collapse="#hs-kovpay-nav">
              <svg class="hs-collapse-open:hidden size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
              <svg class="hs-collapse-open:block hidden size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <div id="hs-kovpay-nav" class="hs-collapse hidden basis-full grow overflow-hidden transition-all duration-300 md:block" aria-labelledby="hs-kovpay-collapse">
            <div class="flex max-h-[75vh] flex-col gap-y-1 overflow-y-auto pb-2 pt-5 md:flex-row md:items-center md:justify-end md:gap-x-1 md:py-0 md:ps-7">
              <a class="rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.055] hover:text-white md:py-4" href="#inicio">Inicio</a>

              <div class="hs-dropdown [--adaptive:none] [--auto-close:inside] [--strategy:static] md:inline-block md:[--strategy:absolute] md:[--trigger:hover]">
                <button id="hs-kovpay-product" type="button" class="hs-dropdown-toggle flex w-full items-center rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.055] hover:text-white md:w-auto md:py-4" aria-haspopup="menu" aria-expanded="false">
                  Producto
                  <svg class="hs-dropdown-open:-rotate-180 ms-auto size-3.5 shrink-0 duration-300 md:ms-1 md:hs-dropdown-open:rotate-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>

                <div class="hs-dropdown-menu relative top-full z-20 mt-2 hidden w-full rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-2xl transition-[opacity,margin] duration-150 hs-dropdown-open:opacity-100 md:absolute md:mt-0 md:w-72" role="menu" aria-orientation="vertical" aria-labelledby="hs-kovpay-product">
                  <a href="#producto" class="group flex items-start gap-3 rounded-xl p-3 transition hover:bg-slate-50">
                    <span class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>
                    </span>
                    <span><strong class="block text-sm text-slate-950">Gestión comercial</strong><small class="mt-0.5 block leading-5 text-slate-500">Clientes, créditos, cuotas y pagos.</small></span>
                  </a>
                  <a href="#operacion" class="group flex items-start gap-3 rounded-xl p-3 transition hover:bg-slate-50">
                    <span class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                    </span>
                    <span><strong class="block text-sm text-slate-950">Cartera y seguimiento</strong><small class="mt-0.5 block leading-5 text-slate-500">Visualiza cobros y operación desde un solo lugar.</small></span>
                  </a>
                  <a href="#compatibilidad" class="group flex items-start gap-3 rounded-xl p-3 transition hover:bg-slate-50">
                    <span class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>
                    </span>
                    <span><strong class="block text-sm text-slate-950">Control de dispositivos</strong><small class="mt-0.5 block leading-5 text-slate-500">Seguimiento según compatibilidad técnica.</small></span>
                  </a>
                </div>
              </div>

              <a class="rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.055] hover:text-white md:py-4" href="#operacion">Operación</a>
              <a class="rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.055] hover:text-white md:py-4" href="#compatibilidad">Compatibilidad</a>
              <a class="rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.055] hover:text-white md:py-4" href="#planes">Planes</a>

              <a href="#contacto" class="mt-2 flex items-center justify-center rounded-[22px] bg-white px-4 py-3 text-sm font-extrabold text-slate-950 sm:hidden">Solicitar demo</a>
            </div>
          </div>
        </nav>
      </header>`;
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
