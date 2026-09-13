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
