(() => {
  const hero = document.querySelector('.hero');
  const stage = hero?.querySelector('.device-stage');
  if (!stage) return;

  // Keep the current hero intact if the proposed product asset fails to load.
  const devices = new Image();
  devices.alt = 'Vista conceptual de KOVPAY en un iPhone y un equipo Android.';
  devices.className = 'premium-hero-devices';
  devices.decoding = 'async';
  devices.fetchPriority = 'high';
  devices.onload = () => {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'hero-premium.css?v=1';
    stylesheet.onload = () => {
      hero.classList.add('hero-proposal');
      stage.className = 'device-stage premium-hero-stage';
      stage.setAttribute('aria-label', 'Vista conceptual del sistema KOVPAY');
      stage.innerHTML = `
        <div class="premium-hero-halo" aria-hidden="true"></div>
        <div class="premium-hero-panel">
          <div class="premium-hero-panel-top"><span>KOVPAY</span><span>Centro de control</span><i aria-hidden="true"></i></div>
          <div class="premium-hero-panel-title">Tu operación, conectada.</div>
          <div class="premium-hero-metrics">
            <div><span>Cartera activa</span><strong>$24,580<span>.00</span></strong><small>Todo en una sola vista</small></div>
            <div><span>Créditos activos</span><strong>128</strong><small>Seguimiento en tiempo real</small></div>
            <div><span>Dispositivos</span><strong>96</strong><small>Vinculados a tu operación</small></div>
          </div>
          <div class="premium-hero-chart" aria-hidden="true"><i style="--bar:28%"></i><i style="--bar:42%"></i><i style="--bar:36%"></i><i style="--bar:58%"></i><i style="--bar:51%"></i><i style="--bar:72%"></i><i style="--bar:66%"></i><i style="--bar:88%"></i><i style="--bar:96%"></i></div>
        </div>
        <div class="premium-hero-device-wrap"></div>`;
      stage.querySelector('.premium-hero-device-wrap').appendChild(devices);
    };
    document.head.appendChild(stylesheet);
  };
  devices.src = 'assets/kovpay-premium-phones.png';
})();
