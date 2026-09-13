document.addEventListener('DOMContentLoaded',()=>{
  const style=document.createElement('style');
  style.textContent=`
    .device-stage.kov-v18-stage{height:670px;margin-top:62px;display:flex;align-items:center;justify-content:center;perspective:none;overflow:visible;position:relative}
    .hero-macbooks-v18{position:relative;width:min(1120px,98%);height:620px;margin:auto}
    .hero-macbooks-v18 img{position:absolute;display:block;height:auto;object-fit:contain;filter:drop-shadow(0 38px 55px rgba(0,0,0,.42))}
    .hero-macbook-back-v18{width:74%;right:1%;top:54px;transform:rotate(5deg);opacity:.98}
    .hero-macbook-front-v18{width:79%;left:1%;bottom:28px;transform:rotate(-4deg);z-index:2}
    .hero-macbooks-v18:after{content:"";position:absolute;left:12%;right:10%;bottom:40px;height:90px;background:radial-gradient(ellipse,rgba(39,154,255,.22),rgba(39,154,255,0) 68%);filter:blur(18px)}

    .commercial-visual .flagship-phone,.commercial-visual>.device-collage-premium{display:none!important}
    .premium-device-wall-v18{position:relative;z-index:3;width:min(100%,780px);height:650px;margin:auto;display:flex;align-items:flex-end;justify-content:center;overflow:visible}
    .premium-device-wall-v18 img{position:absolute;display:block;height:auto;object-fit:contain;filter:drop-shadow(0 26px 36px rgba(20,35,58,.18))}
    .premium-device-wall-v18 .p1{width:31%;left:3%;bottom:88px;transform:rotate(-7deg)}
    .premium-device-wall-v18 .p2{width:32%;left:20%;bottom:45px;transform:rotate(-2deg);z-index:2}
    .premium-device-wall-v18 .p3{width:34%;left:39%;bottom:38px;transform:rotate(1deg);z-index:3}
    .premium-device-wall-v18 .p4{width:31%;right:14%;bottom:72px;transform:rotate(4deg);z-index:2}
    .premium-device-wall-v18 .p5{width:29%;right:0;bottom:98px;transform:rotate(7deg)}
    .premium-device-wall-v18:after{content:"";position:absolute;left:7%;right:7%;bottom:54px;height:90px;background:radial-gradient(ellipse,rgba(38,153,255,.20),rgba(38,153,255,0) 70%);filter:blur(20px);z-index:-1}

    @media(max-width:980px){
      .device-stage.kov-v18-stage{height:540px;margin-top:48px}
      .hero-macbooks-v18{height:500px;width:100%}
      .hero-macbook-back-v18{width:76%;right:0;top:40px}
      .hero-macbook-front-v18{width:82%;left:0;bottom:22px}
      .premium-device-wall-v18{height:560px}
    }
    @media(max-width:700px){
      .device-stage.kov-v18-stage{height:320px;margin-top:34px}
      .hero-macbooks-v18{height:290px;width:112%}
      .hero-macbook-back-v18{width:78%;right:-2%;top:28px}
      .hero-macbook-front-v18{width:85%;left:-3%;bottom:12px}
      .premium-device-wall-v18{height:340px;width:110%;left:-5%}
    }
  `;
  document.head.appendChild(style);

  const stage=document.querySelector('.device-stage');
  if(stage){
    stage.classList.add('kov-v18-stage');
    stage.innerHTML=`
      <div class="hero-macbooks-v18" aria-label="Composición premium de laptops">
        <img class="hero-macbook-back-v18" src="assets/macbook-pro-silver.png" alt="">
        <img class="hero-macbook-front-v18" src="assets/macbook-pro-space-gray.png" alt="MacBook mostrando la plataforma KOVPAY">
      </div>`;
  }

  const visual=document.querySelector('.commercial-visual');
  if(visual){
    visual.querySelectorAll('.device-collage-premium').forEach(el=>el.remove());
    const old=visual.querySelector('.flagship-phone');
    if(old) old.remove();
    const wall=document.createElement('div');
    wall.className='premium-device-wall-v18';
    wall.setAttribute('aria-label','Ecosistema de dispositivos compatibles');
    wall.innerHTML=`
      <img class="p1" src="assets/phone-android-transparent.png" alt="">
      <img class="p2" src="assets/phone-ios-transparent.png" alt="">
      <img class="p3" src="assets/phone-android-transparent.png" alt="Dispositivos compatibles con KOVPAY">
      <img class="p4" src="assets/phone-ios-transparent.png" alt="">
      <img class="p5" src="assets/phone-android-transparent.png" alt="">`;
    const halo=visual.querySelector('.commercial-halo');
    if(halo) halo.insertAdjacentElement('afterend',wall); else visual.prepend(wall);
  }
});