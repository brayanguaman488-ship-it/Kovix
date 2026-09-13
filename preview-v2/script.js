const layoutFix = document.createElement('link');
layoutFix.rel = 'stylesheet';
layoutFix.href = 'layout-v3.css?v=3';
document.head.appendChild(layoutFix);

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