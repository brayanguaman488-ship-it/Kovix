const layoutFix = document.createElement('link');
layoutFix.rel = 'stylesheet';
layoutFix.href = 'layout-v3.css?v=3';
document.head.appendChild(layoutFix);

const commercialCss = document.createElement('link');
commercialCss.rel = 'stylesheet';
commercialCss.href = 'commercial-v4.css?v=4';
document.head.appendChild(commercialCss);

const heroCss = document.createElement('link');
heroCss.rel = 'stylesheet';
heroCss.href = 'hero-v5.css?v=5';
document.head.appendChild(heroCss);

const hero = document.querySelector('.hero');
if (hero) {
  hero.innerHTML = `
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
      </div>

      <div class="device-stage hero-device-stage delay-1" aria-label="Vista conceptual premium de KOVPAY en MacBook Pro y Galaxy S26 Ultra">
        <div class="macbook-wrap">
          <div class="hero-float hero-float-left">
            <span>MacBook Pro</span>
            <strong>KOVPAY, listo para demostrar.</strong>
          </div>
          <div class="macbook-lid">
            <div class="macbook-camera"></div>
            <div class="macbook-display">
              <div class="dashboard-shell laptop-dashboard">
                <div class="dash-top">
                  <div class="dash-logo"><span class="brand-mark small">K</span><strong>KOVPAY</strong></div>
                  <div class="dash-search">Buscar cliente, crédito o equipo...</div>
                  <div class="avatar">BG</div>
                </div>
                <div class="dash-body">
                  <aside class="dash-side">
                    <span class="active">Resumen</span>
                    <span>Clientes</span>
                    <span>Créditos</span>
                    <span>Cartera</span>
                    <span>Dispositivos</span>
                    <span>Control</span>
                  </aside>
                  <div class="dash-main">
                    <div class="dash-heading">
                      <div><small>Buenos días</small><h3>Centro de control</h3></div>
                      <button>+ Nuevo crédito</button>
                    </div>
                    <div class="kpis">
                      <div class="kpi"><span>Créditos activos</span><strong>128</strong><small>Operación actual</small></div>
                      <div class="kpi"><span>Cobros próximos</span><strong>34</strong><small>Esta semana</small></div>
                      <div class="kpi"><span>Dispositivos</span><strong>96</strong><small>En seguimiento</small></div>
                    </div>
                    <div class="dash-grid">
                      <div class="panel chart-panel">
                        <div class="panel-title"><span>Comportamiento de cartera</span><span>Últimos 6 meses</span></div>
                        <div class="chart">
                          <i style="height:42%"></i><i style="height:55%"></i><i style="height:48%"></i><i style="height:67%"></i><i style="height:76%"></i><i style="height:88%"></i>
                        </div>
                        <div class="chart-labels"><span>Abr</span><span>May</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Sep</span></div>
                      </div>
                      <div class="panel activity-panel">
                        <div class="panel-title"><span>Actividad</span><span>Hoy</span></div>
                        <div class="activity"><b></b><div><strong>Pago registrado</strong><small>Cliente #0248 · $45</small></div></div>
                        <div class="activity"><b></b><div><strong>Equipo asociado</strong><small>Android · crédito #0312</small></div></div>
                        <div class="activity"><b></b><div><strong>Documento generado</strong><small>Contrato y cronograma</small></div></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="macbook-base"></div>
          <div class="macbook-shadow"></div>
          <div class="hero-float hero-float-right">
            <span>Galaxy S26 Ultra</span>
            <strong>KOVIX listo para Android.</strong>
          </div>
        </div>

        <div class="ultra-phone-back" aria-label="Vista trasera conceptual de Galaxy S26 Ultra">
          <div class="camera-island">
            <span class="lens lens-1"></span>
            <span class="lens lens-2"></span>
            <span class="lens lens-3"></span>
            <span class="lens lens-4"></span>
            <span class="sensor sensor-1"></span>
            <span class="sensor sensor-2"></span>
          </div>
          <div class="ultra-brand">S26 ULTRA • KOVIX READY</div>
          <div class="ultra-glint"></div>
        </div>
      </div>
    </div>
    <div class="hero-fade"></div>`;
}

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

const items = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
},{threshold:.12});
items.forEach(item=>observer.observe(item));

const nav = document.querySelector('.nav');
window.addEventListener('scroll',()=>{
  const y = window.scrollY;
  nav.style.background = y > 40 ? 'rgba(6,9,14,.9)' : 'rgba(6,9,14,.72)';
});
