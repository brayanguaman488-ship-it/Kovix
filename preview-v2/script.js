const baseCss=document.createElement('link');baseCss.rel='stylesheet';baseCss.href='commercial-v6.css?v=6';document.head.appendChild(baseCss);
const cleanCss=document.createElement('link');cleanCss.rel='stylesheet';cleanCss.href='clean-v8.css?v=10';document.head.appendChild(cleanCss);

const hero=document.querySelector('.hero');
if(hero){hero.innerHTML=`
  <div class="hero-glow glow-a"></div>
  <div class="hero-glow glow-b"></div>
  <div class="container hero-shell reveal">
    <div class="hero-inner">
      <p class="eyebrow">PLATAFORMA PARA VENTAS A CRÉDITO</p>
      <h1>Vende a crédito.<br><span>Mantén el control.</span></h1>
      <p class="hero-copy">Gestiona clientes, cuotas, cartera y dispositivos desde una sola plataforma. KOVPAY organiza tu operación para que puedas vender con más control y dar seguimiento a cada crédito.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#contacto">Solicitar demostración</a>
        <a class="btn btn-ghost" href="#producto">Ver cómo funciona <span>↓</span></a>
      </div>
      <div class="hero-trust"><span>Clientes</span><span>Créditos</span><span>Cartera</span><span>Control</span></div>
    </div>

    <div class="hero-media reveal delay-1" aria-label="Composición comercial de KOVPAY">
      <div class="hero-device-stage-clean">
        <div class="hero-macbook-card software-frame">
          <img class="hero-macbook-frame" src="assets/macbook-pro-space-gray.png" alt="Laptop con pantalla vacía">
          <div class="hero-macbook-screen hero-empty-screen"></div>
        </div>

        <div class="hero-phone phone-left-clean">
          <div class="phone-screen-fill phone-screen-blue"></div>
          <img src="assets/phone-ios-transparent.png" alt="Teléfono decorativo">
        </div>

        <div class="hero-phone phone-right-clean">
          <div class="phone-screen-fill phone-screen-cyan"></div>
          <img src="assets/phone-android-transparent.png" alt="Teléfono decorativo">
        </div>
      </div>
    </div>
  </div>
  <div class="hero-fade"></div>`}

const previousPremium=document.querySelector('.commercial-premium');if(previousPremium)previousPremium.remove();
const previousShowcase=document.querySelector('.premium-showcase');if(previousShowcase)previousShowcase.remove();
const statement=document.querySelector('.statement');
if(statement){
  const premium=document.createElement('section');
  premium.className='premium-showcase software-showcase';
  premium.innerHTML=`
    <div class="premium-grid">
      <div class="premium-copy reveal">
        <p class="eyebrow dark">SOFTWARE PARA TU OPERACIÓN</p>
        <h2>Todo lo importante, en una sola vista.</h2>
        <p>KOVPAY centraliza la información que tu equipo necesita para vender, cobrar y dar seguimiento sin saltar entre diferentes herramientas.</p>
        <div class="premium-points">
          <div class="premium-point"><strong>Clientes</strong><span>Información, documentos y créditos vinculados a cada persona.</span></div>
          <div class="premium-point"><strong>Cartera</strong><span>Cuotas próximas, vencidas y pagos registrados en un solo lugar.</span></div>
          <div class="premium-point"><strong>Control</strong><span>Seguimiento operativo de los dispositivos asociados a cada venta.</span></div>
        </div>
        <div class="premium-actions"><a class="btn btn-primary" href="#contacto">Solicitar demostración</a><a class="btn-light" href="#control">Ver el flujo</a></div>
      </div>

      <div class="software-product-visual reveal delay-1">
        <div class="software-window">
          <div class="software-window-top">
            <div class="software-wordmark">KOVPAY</div>
            <div class="software-search">Buscar cliente, crédito o equipo…</div>
            <div class="software-user">BG</div>
          </div>
          <div class="software-window-body">
            <aside class="software-sidebar">
              <span class="active">Resumen</span><span>Clientes</span><span>Créditos</span><span>Cartera</span><span>Control</span>
            </aside>
            <div class="software-main">
              <div class="software-heading"><div><small>Resumen de operación</small><h3>Centro de control</h3></div><button>+ Nuevo crédito</button></div>
              <div class="software-kpis">
                <div><span>Créditos activos</span><strong>128</strong><small>Operación actual</small></div>
                <div><span>Cobros próximos</span><strong>34</strong><small>Esta semana</small></div>
                <div><span>Cartera al día</span><strong>91%</strong><small>Seguimiento actual</small></div>
              </div>
              <div class="software-panels">
                <div class="software-chart-panel">
                  <div class="software-panel-head"><strong>Comportamiento de cartera</strong><small>Últimos 6 meses</small></div>
                  <div class="software-bars"><i style="height:48%"></i><i style="height:56%"></i><i style="height:63%"></i><i style="height:72%"></i><i style="height:79%"></i><i style="height:88%"></i></div>
                </div>
                <div class="software-activity-panel">
                  <strong>Actividad reciente</strong>
                  <div><b></b><span>Pago registrado<small>Cliente #0248 · $45</small></span></div>
                  <div><b></b><span>Crédito creado<small>Cliente #0312</small></span></div>
                  <div><b></b><span>Seguimiento actualizado<small>Hace 8 min</small></span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="software-floating-card sf-one"><span>Seguimiento</span><strong>34 cobros próximos</strong></div>
        <div class="software-floating-card sf-two"><span>Cartera</span><strong>91% al día</strong></div>
      </div>
    </div>`;
  statement.insertAdjacentElement('afterend',premium);
}

const brandMark=document.querySelector('.nav .brand-mark');if(brandMark)brandMark.remove();
const footerBrandMark=document.querySelector('footer .brand-mark');if(footerBrandMark)footerBrandMark.remove();

const items=document.querySelectorAll('.reveal');
const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}})},{threshold:.12});
items.forEach(item=>observer.observe(item));
const nav=document.querySelector('.nav');
window.addEventListener('scroll',()=>{nav.style.background=window.scrollY>40?'rgba(6,9,14,.9)':'rgba(6,9,14,.72)'});