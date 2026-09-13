document.addEventListener('DOMContentLoaded',()=>{
  const MAC='assets/user-macbook-cross.webp';
  const DEV='assets/user-device-collage.webp';

  const style=document.createElement('style');
  style.textContent=`
    .device-stage.kov-user-visual{height:560px;margin-top:34px;display:flex;align-items:center;justify-content:center;overflow:visible;position:relative}
    .kov-user-mac{width:min(900px,94%);height:auto;display:block;object-fit:contain;filter:drop-shadow(0 36px 48px rgba(0,0,0,.36));transform:translateY(8px)}
    .commercial-visual .flagship-phone,.commercial-visual>.device-collage-premium,.commercial-visual>.premium-device-wall-v18{display:none!important}
    .kov-user-devices{position:relative;z-index:3;width:min(680px,88%);height:auto;display:block;margin:0 auto;object-fit:contain;filter:drop-shadow(0 28px 38px rgba(20,35,58,.16));transform:translateY(18px)}
    @media(max-width:980px){.device-stage.kov-user-visual{height:460px}.kov-user-mac{width:min(760px,96%)}.kov-user-devices{width:min(600px,92%)}}
    @media(max-width:700px){.device-stage.kov-user-visual{height:300px;margin-top:24px}.kov-user-mac{width:110%;max-width:none}.kov-user-devices{width:105%;max-width:none;transform:translate(-2%,8px)}}
  `;
  document.head.appendChild(style);

  const stage=document.querySelector('.device-stage');
  if(stage){
    stage.classList.add('kov-user-visual');
    stage.innerHTML=`<img class="kov-user-mac" src="${MAC}" alt="MacBook Pro en composición premium">`;
  }

  const visual=document.querySelector('.commercial-visual');
  if(visual){
    visual.querySelectorAll('.device-collage-premium,.premium-device-wall-v18,.flagship-phone').forEach(el=>el.remove());
    const img=document.createElement('img');
    img.className='kov-user-devices';
    img.src=DEV;
    img.alt='Composición premium de dispositivos';
    const halo=visual.querySelector('.commercial-halo');
    if(halo) halo.insertAdjacentElement('afterend',img); else visual.prepend(img);
  }
});