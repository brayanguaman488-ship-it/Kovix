const baseCss=document.createElement('link');baseCss.rel='stylesheet';baseCss.href='commercial-v6.css?v=6';document.head.appendChild(baseCss);
const cleanCss=document.createElement('link');cleanCss.rel='stylesheet';cleanCss.href='clean-v8.css?v=8';document.head.appendChild(cleanCss);

const hero=document.querySelector('.hero');
if(hero){hero.innerHTML=`
  <div class="hero-glow glow-a"></div>
  <div class="hero-glow glow-b"></div>
  <div class="container hero-shell reveal">
    <div class="hero-inner">
      <p class="eyebrow">PLATAFORMA PARA VENTAS A CRÉDITO</p>
      <h1>Vende a crédito.<br><span>Mantén el control.</span></h1>
      <p class="hero-copy">Gestiona clientes, cuotas, cartera y dispositivos desde una sola plataforma. KOVPAY organiza tu operación y KOVIX potencia el control de equipos compatibles.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#contacto">Solicitar demostración</a>
        <a class="btn btn-ghost" href="#producto">Ver cómo funciona <span>↓</span></a>
      </div>
      <div class="hero-trust"><span>Clientes</span><span>Créditos</span><span>Cartera</span><span>Dispositivos</span></div>
    </div>

    <div class="hero-media reveal delay-1" aria-label="KOVPAY en MacBook Pro con indicador de menor riesgo y Galaxy S26 Ultra">
      <div class="hero-chip chip-top">MacBook Pro + KOVPAY</div>
      <div class="hero-macbook-card">
        <img class="hero-macbook-frame" src="assets/macbook-pro-space-gray.png" alt="MacBook Pro">
        <div class="hero-macbook-screen">
          <div class="risk-board">
            <div class="risk-topbar">
              <div class="risk-brand"><span class="brand-mark small" aria-hidden="true"></span><strong>KOVPAY</strong></div>
              <span class="risk-badge">Vista ejecutiva</span>
            </div>
            <div class="risk-content">
              <div class="risk-copy">
                <span class="risk-eyebrow">Indicador principal</span>
                <h3>Menos riesgo.</h3>
                <p>Visualiza la tendencia de cartera y toma decisiones con más claridad.</p>
              </div>
              <div class="risk-chart-card">
                <div class="risk-chart-head"><strong>Riesgo de cartera</strong><small>Últimos 6 meses</small></div>
                <div class="risk-chart"><i style="height:84%"></i><i style="height:74%"></i><i style="height:63%"></i><i style="height:52%"></i><i style="height:41%"></i><i style="height:30%"></i></div>
                <div class="risk-labels"><span>Abr</span><span>May</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Sep</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="hero-s26-card">
        <div class="hero-s26-badge">Galaxy S26 Ultra</div>
        <img class="hero-s26-phone" src="assets/galaxy-s26-ultra-black.jpg" alt="Galaxy S26 Ultra negro">
      </div>
    </div>
  </div>
  <div class="hero-fade"></div>`}

const previousPremium=document.querySelector('.commercial-premium');if(previousPremium)previousPremium.remove();
const statement=document.querySelector('.statement');
if(statement&&!document.querySelector('.premium-showcase')){
  const premium=document.createElement('section');
  premium.className='premium-showcase';
  premium.innerHTML=`
    <div class="premium-grid">
      <div class="premium-copy reveal">
        <p class="eyebrow dark">PRESENCIA COMERCIAL</p>
        <h2>Tu operación también debe verse a otro nivel.</h2>
        <p>KOVPAY combina gestión comercial, cartera y control de dispositivos con una presentación limpia, clara y mejor adaptada para mostrar a clientes y tiendas.</p>
        <div class="premium-points">
          <div class="premium-point"><strong>Más claridad</strong><span>Información esencial sin saturar la pantalla.</span></div>
          <div class="premium-point"><strong>Más presencia</strong><span>Producto visualmente sólido para mostrar a clientes y tiendas.</span></div>
          <div class="premium-point"><strong>Más confianza</strong><span>Una estética limpia transmite orden y respaldo.</span></div>
        </div>
        <div class="premium-actions"><a class="btn btn-primary" href="#contacto">Solicitar demostración</a><a class="btn-light" href="#ecosistema">Ver compatibilidad</a></div>
      </div>

      <div class="premium-gallery reveal delay-1">
        <article class="premium-device-card large">
          <div class="premium-tag">iPhone 18 Pro / Pro Max</div>
          <img src="assets/iphone-18-pro-burgundy.jpg" alt="iPhone 18 Pro y Pro Max">
        </article>
        <article class="premium-copy-card">
          <span>VITRINA PREMIUM</span>
          <h3>Producto claro.<br>Mensaje claro.</h3>
          <p>Una sección blanca con más aire, más presencia y un lenguaje visual más limpio.</p>
        </article>
        <article class="premium-device-card lineup"><img src="assets/iphone-18-pro-lineup.jpg" alt="Lineup iPhone 18 Pro"></article>
      </div>
    </div>`;
  statement.insertAdjacentElement('afterend',premium);
}

const items=document.querySelectorAll('.reveal');
const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}})},{threshold:.12});
items.forEach(item=>observer.observe(item));
const nav=document.querySelector('.nav');
window.addEventListener('scroll',()=>{nav.style.background=window.scrollY>40?'rgba(6,9,14,.9)':'rgba(6,9,14,.72)'});