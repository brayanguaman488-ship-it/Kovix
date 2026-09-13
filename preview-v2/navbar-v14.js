document.addEventListener('DOMContentLoaded', () => {
  const currentHeader = document.querySelector('header');
  if (!currentHeader) return;

  currentHeader.outerHTML = `
    <header class="sticky top-4 inset-x-0 z-50 flex w-full flex-wrap md:flex-nowrap md:justify-start before:absolute before:inset-0 before:mx-2 before:rounded-[26px] before:border before:border-white/10 before:bg-[#0a141f]/95 before:shadow-[0_16px_45px_rgba(0,0,0,.22)] before:backdrop-blur-xl lg:before:mx-auto lg:before:max-w-5xl before:content-['']">
      <nav class="relative mx-2 flex w-full max-w-5xl basis-full flex-wrap items-center justify-between py-2 ps-5 pe-2 md:flex-nowrap md:py-0 lg:mx-auto" aria-label="Navegación principal">
        <div class="flex items-center">
          <a class="flex-none rounded-md text-xl font-black tracking-[0.10em] text-white focus:outline-none focus:opacity-80" href="#inicio" aria-label="KOVPAY inicio">KOVPAY</a>
        </div>

        <div class="md:order-3 flex items-center gap-x-3">
          <div class="md:ps-3">
            <a class="group inline-flex items-center gap-x-2 whitespace-nowrap rounded-[26px] border border-blue-400/70 bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(22,135,255,.22)] transition hover:bg-blue-400 focus:outline-none" href="#contacto">Solicitar demo</a>
          </div>

          <div class="md:hidden">
            <button type="button" class="hs-collapse-toggle flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50" id="hs-kovpay-collapse-fixed" aria-expanded="false" aria-controls="hs-kovpay-nav-fixed" aria-label="Abrir navegación" data-hs-collapse="#hs-kovpay-nav-fixed">
              <svg class="hs-collapse-open:hidden size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
              <svg class="hs-collapse-open:block hidden size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        <div id="hs-kovpay-nav-fixed" class="hs-collapse hidden basis-full grow overflow-hidden transition-all duration-300 md:block" aria-labelledby="hs-kovpay-collapse-fixed" role="region">
          <div class="max-h-[75vh] overflow-hidden overflow-y-auto [&::-webkit-scrollbar]:w-0">
            <div class="flex flex-col gap-y-3 pt-6 pb-2 md:flex-row md:items-center md:justify-end md:gap-y-0 md:py-0 md:ps-7">
              <a class="text-sm font-medium text-slate-300 hover:text-white focus:text-white focus:outline-none md:px-3 md:py-4" href="#inicio">Inicio</a>

              <div class="hs-dropdown [--strategy:static] [--adaptive:none] [--auto-close:inside] md:inline-block md:[--strategy:absolute] md:[--trigger:hover]">
                <button id="hs-kovpay-product-fixed" type="button" class="hs-dropdown-toggle flex w-full items-center text-sm font-medium text-slate-300 hover:text-white focus:text-white focus:outline-none md:w-auto md:px-3 md:py-4" aria-haspopup="menu" aria-expanded="false" aria-label="Producto">
                  Producto
                  <svg class="hs-dropdown-open:-rotate-180 ms-auto size-3.5 shrink-0 duration-300 md:ms-1 md:hs-dropdown-open:rotate-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>

                <div class="hs-dropdown-menu relative top-full z-20 mt-2 hidden w-full rounded-2xl border-4 border-slate-200 bg-white opacity-0 shadow-xl transition-[opacity,margin] duration-150 hs-dropdown-open:opacity-100 md:absolute md:mt-0 md:w-72" role="menu" aria-orientation="vertical" aria-labelledby="hs-kovpay-product-fixed">
                  <div class="flex flex-col gap-y-3 p-5">
                    <a class="text-sm font-medium text-slate-700 hover:text-blue-600 focus:text-blue-600 focus:outline-none" href="#producto">Gestión comercial</a>
                    <a class="text-sm font-medium text-slate-700 hover:text-blue-600 focus:text-blue-600 focus:outline-none" href="#control">Cartera y seguimiento</a>
                    <a class="text-sm font-medium text-slate-700 hover:text-blue-600 focus:text-blue-600 focus:outline-none" href="#ecosistema">Control de dispositivos</a>
                  </div>
                </div>
              </div>

              <a class="text-sm font-medium text-slate-300 hover:text-white focus:text-white focus:outline-none md:px-3 md:py-4" href="#control">Operación</a>
              <a class="text-sm font-medium text-slate-300 hover:text-white focus:text-white focus:outline-none md:px-3 md:py-4" href="#ecosistema">Compatibilidad</a>
              <a class="text-sm font-medium text-slate-300 hover:text-white focus:text-white focus:outline-none md:px-3 md:py-4" href="#planes">Planes</a>
            </div>
          </div>
        </div>
      </nav>
    </header>`;

  if (window.HSStaticMethods?.autoInit) window.HSStaticMethods.autoInit();
});