// Typing animation — hero h1
(function(){
  var el = document.getElementById('hero-h1');
  if(!el) return;

  // Two segments: plain text + gradient em text
  var plain = 'Streamlined Records & ';
  var fancy = 'Document Services';
  var full  = plain + fancy;
  var chars = Array.from(full);
  var i = 0;
  var cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  cursor.textContent = '|';

  function tick(){
    i++;
    var typed = chars.slice(0, i).join('');
    var plainPart  = typed.slice(0, Math.min(i, plain.length));
    var fancyPart  = typed.length > plain.length ? typed.slice(plain.length) : '';

    el.innerHTML = '';
    el.appendChild(document.createTextNode(plainPart));
    if(fancyPart){
      var em = document.createElement('em');
      em.textContent = fancyPart;
      el.appendChild(em);
    }
    el.appendChild(cursor);

    if(i < chars.length){
      setTimeout(tick, 120);
    } else {
      // Remove cursor after done
      setTimeout(function(){ cursor.remove(); }, 3500);
    }
  }

  // Start after fadeUp delay (0.35s + a little buffer)
  setTimeout(tick, 600);
})();

// Nav scroll state
(function(){
  var nav = document.querySelector('nav');
  var hero = document.querySelector('.hero');
  function update(){
    var heroBottom = hero ? hero.getBoundingClientRect().bottom : 0;
    nav.classList.toggle('nav-scrolled', heroBottom <= 60);
  }
  window.addEventListener('scroll', update, {passive:true});
  update();
})();

// Scroll reveal
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Contact form (demo)
function handleSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-send');
  btn.textContent = 'Message Sent!';
  btn.style.background = '#22c55e';
  btn.style.color = '#fff';
  setTimeout(() => {
    btn.textContent = 'Send Message';
    btn.style.background = '';
    btn.style.color = '';
    e.target.reset();
  }, 3000);
}

// Animated list — hero card
(function(){
  var items=[
    {icon:'📋',label:'Document Requests',val:'Barangay Clearance, Certificates',badge:'Active'},
    {icon:'👥',label:'Resident Records',val:'Profiles, Households & History',badge:'Active'},
    {icon:'🔐',label:'Access Control',val:'Role-Based Staff Access',badge:'Secure'},
    {icon:'📊',label:'Reports & Analytics',val:'Population & Service Reports',badge:'Active'},
    {icon:'🏠',label:'Household Mapping',val:'Community Structure & Data',badge:'Active'},
    {icon:'📝',label:'Blotter Records',val:'Incident Logs & Case Tracking',badge:'Active'},
  ];
  var list=document.querySelector('.stat-list');
  if(!list)return;
  var MAX=4,idx=0;
  list.innerHTML='';

  function make(d){
    var el=document.createElement('div');
    el.className='stat-item stat-item-anim';
    el.innerHTML=
      '<div class="stat-icon">'+d.icon+'</div>'+
      '<div class="stat-info">'+
        '<div class="stat-label">'+d.label+'</div>'+
        '<div class="stat-val">'+d.val+'</div>'+
      '</div>'+
      '<span class="stat-badge">'+d.badge+'</span>';
    return el;
  }

  function push(){
    var el=make(items[idx%items.length]);
    idx++;
    list.insertBefore(el,list.firstChild);
    var overflow=list.children[MAX];
    if(overflow){
      overflow.style.maxHeight=overflow.offsetHeight+'px';
      overflow.classList.add('stat-item-exit');
      void overflow.offsetHeight;
      overflow.style.opacity='0';
      overflow.style.maxHeight='0';
      overflow.style.marginBottom='0';
      overflow.style.paddingTop='0';
      overflow.style.paddingBottom='0';
      setTimeout((function(o){return function(){if(o.parentNode)o.parentNode.removeChild(o);};})(overflow),320);
    }
  }

  for(var i=0;i<MAX;i++)(function(i){setTimeout(push,900+i*520);})(i);
  setTimeout(function(){setInterval(push,1600);},900+MAX*520+300);
})();
