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
              <button type="button" class="hs-collapse-toggle flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50" id="hs-kovpay-collapse" aria-expanded="false" aria-controls="hs-kovpay-nav" aria-label="Abrir navegación" data-hs-collapse="#hs-kovpay-nav">
                <svg class="hs-collapse-open:hidden size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
                <svg class="hs-collapse-open:block hidden size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          </div>

          <div id="hs-kovpay-nav" class="hs-collapse hidden basis-full grow overflow-hidden transition-all duration-300 md:block" aria-labelledby="hs-kovpay-collapse" role="region">
            <div class="max-h-[75vh] overflow-hidden overflow-y-auto [&::-webkit-scrollbar]:w-0">
              <div class="flex flex-col gap-y-3 pt-6 pb-2 md:flex-row md:items-center md:justify-end md:gap-y-0 md:py-0 md:ps-7">
                <a class="text-sm font-medium text-slate-300 hover:text-white focus:text-white focus:outline-none md:px-3 md:py-4" href="#inicio">Inicio</a>

                <div class="hs-dropdown [--strategy:static] [--adaptive:none] [--auto-close:inside] md:inline-block md:[--strategy:absolute] md:[--trigger:hover]">
                  <button id="hs-kovpay-product" type="button" class="hs-dropdown-toggle flex w-full items-center text-sm font-medium text-slate-300 hover:text-white focus:text-white focus:outline-none md:w-auto md:px-3 md:py-4" aria-haspopup="menu" aria-expanded="false" aria-label="Producto">
                    Producto
                    <svg class="hs-dropdown-open:-rotate-180 ms-auto size-3.5 shrink-0 duration-300 md:ms-1 md:hs-dropdown-open:rotate-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  <div class="hs-dropdown-menu relative top-full z-20 mt-2 hidden w-full rounded-2xl border-4 border-slate-200 bg-white opacity-0 shadow-xl transition-[opacity,margin] duration-150 hs-dropdown-open:opacity-100 md:absolute md:mt-0 md:w-72" role="menu" aria-orientation="vertical" aria-labelledby="hs-kovpay-product">
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

  if (window.HSStaticMethods?.autoInit) window.HSStaticMethods.autoInit();
});