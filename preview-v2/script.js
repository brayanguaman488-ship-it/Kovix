document.addEventListener('DOMContentLoaded', () => {
  const layoutFix = document.createElement('link');
  layoutFix.rel = 'stylesheet';
  layoutFix.href = 'layout-v3.css?v=3';
  document.head.appendChild(layoutFix);

  const commercialCss = document.createElement('link');
  commercialCss.rel = 'stylesheet';
  commercialCss.href = 'commercial-v4.css?v=4';
  document.head.appendChild(commercialCss);

  const statement = document.querySelector('.statement');
  if (statement && !document.querySelector('.commercial-premium')) {
    const premium = document.createElement('section');
    premium.className = 'commercial-premium';
    premium.innerHTML = `
      <div class="commercial-grid">
        <div class="commercial-copy reveal">
          <p class="eyebrow">EXPERIENCIA PREMIUM</p>
          <h2>Tu operación también debe <span>verse a otro nivel.</span></h2>
          <p>KOVPAY combina gestión comercial, cartera y control de dispositivos con una presentación pensada para transmitir confianza desde el primer vistazo.</p>
          <div class="commercial-actions">
            <a class="commercial-btn primary" href="#contacto">Solicitar demostración</a>
            <a class="commercial-btn" href="#ecosistema">Ver compatibilidad</a>
          </div>
          <div class="commercial-benefits">
            <div class="commercial-benefit"><b>Más claridad</b><span>Información esencial sin saturar la pantalla.</span></div>
            <div class="commercial-benefit"><b>Más presencia</b><span>Producto visualmente sólido para mostrar a clientes y tiendas.</span></div>
            <div class="commercial-benefit"><b>Más control</b><span>Créditos, pagos y dispositivos dentro del mismo flujo.</span></div>
          </div>
        </div>

        <div class="commercial-visual reveal delay-1" aria-label="Vista conceptual premium de un smartphone administrado por KOVPAY">
          <div class="commercial-halo"></div>
          <div class="flagship-phone">
            <div class="flagship-inner">
              <div class="flagship-island"></div>
              <div class="flagship-screen">
                <span class="flagship-kicker">KOVPAY • Dispositivo administrado</span>
                <strong class="flagship-title">Control conectado.</strong>
                <p class="flagship-sub">Operación sincronizada con tu crédito.</p>
                <div class="flagship-status">
                  <div><span>Estado</span><strong>Activo</strong></div>
                  <div><span>Cuota</span><strong>$45</strong></div>
                  <div><span>Control</span><strong>OK</strong></div>
                </div>
              </div>
            </div>
          </div>
          <div class="commercial-float cf-one"><span>Créditos activos</span><strong>128</strong><small>Seguimiento operativo centralizado.</small></div>
          <div class="commercial-float cf-two"><span>Ecosistema</span><strong>Android + iPhone</strong><small>Flujos diferenciados según compatibilidad.</small></div>
          <div class="commercial-float cf-three"><span>Experiencia</span><strong>Premium</strong><small>Diseñada para transmitir más confianza.</small></div>
        </div>
      </div>

      <div class="retail-band">
        <article class="retail-tile reveal">
          <span class="tile-label">KOVPAY</span>
          <h3>Todo tu negocio, más visible.</h3>
          <p>Clientes, créditos, pagos y cartera organizados dentro de una misma experiencia.</p>
          <div class="tile-orb"></div>
        </article>
        <article class="retail-tile dark reveal delay-1">
          <span class="tile-label">KOVIX</span>
          <h3>Control para Android compatible.</h3>
          <p>Integra el seguimiento del dispositivo con la operación comercial de la venta a crédito.</p>
          <div class="tile-orb"></div>
        </article>
        <article class="retail-tile reveal delay-1">
          <span class="tile-label">IPHONE</span>
          <h3>Gestión dentro del ecosistema Apple.</h3>
          <p>Una presentación clara del flujo de administración para equipos Apple compatibles.</p>
          <div class="tile-orb"></div>
        </article>
      </div>`;
    statement.insertAdjacentElement('afterend', premium);
  }

  const header = document.querySelector('header');
  if (header) {
    header.outerHTML = `
      <header class="sticky top-4 inset-x-0 z-50 w-full px-2 lg:px-0">
        <nav class="relative mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between rounded-[26px] border border-white/10 bg-[#08111c]/92 px-2 py-2 shadow-[0_18px_55px_rgba(0,0,0,.26)] backdrop-blur-2xl md:flex-nowrap md:px-3" aria-label="Navegación principal">
          <div class="flex items-center ps-3 sm:ps-4">
            <a href="#inicio" class="flex-none rounded-md text-white focus:outline-none focus:opacity-80" aria-label="KOVPAY inicio">
              <span class="text-[17px] font-black tracking-[0.10em]">KOVPAY</span>
            </a>
          </div>

          <div class="flex items-center gap-x-2 md:order-3">
            <a href="#contacto" class="hidden items-center gap-x-2 whitespace-nowrap rounded-[22px] border border-white bg-white px-4 py-2.5 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-sky-50 sm:inline-flex">Solicitar demo</a>
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
                  <a href="#producto" class="block rounded-xl p-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">Gestión comercial</a>
                  <a href="#control" class="block rounded-xl p-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">Cartera y seguimiento</a>
                  <a href="#ecosistema" class="block rounded-xl p-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">Control de dispositivos</a>
                </div>
              </div>
              <a class="rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.055] hover:text-white md:py-4" href="#control">Operación</a>
              <a class="rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.055] hover:text-white md:py-4" href="#ecosistema">Compatibilidad</a>
              <a class="rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.055] hover:text-white md:py-4" href="#planes">Planes</a>
              <a href="#contacto" class="mt-2 flex items-center justify-center whitespace-nowrap rounded-[22px] bg-white px-4 py-3 text-sm font-extrabold text-slate-950 sm:hidden">Solicitar demo</a>
            </div>
          </div>
        </nav>
      </header>`;
  }

  const items = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  items.forEach(item => observer.observe(item));

  if (window.HSStaticMethods?.autoInit) {
    window.HSStaticMethods.autoInit();
  }
});
