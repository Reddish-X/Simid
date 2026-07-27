const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const $ = (s, p = document) => p.querySelector(s);

// Loading entrance
addEventListener('load', () => setTimeout(() => $('#loader').classList.add('done'), 650));

// Custom cursor + spark trail
const dot = $('.cursor-dot'), ring = $('.cursor-ring');
let mouseX = innerWidth / 2, mouseY = innerHeight / 2, ringX = mouseX, ringY = mouseY;
addEventListener('pointermove', e => { mouseX = e.clientX; mouseY = e.clientY; dot.style.left = mouseX + 'px'; dot.style.top = mouseY + 'px'; });
(function animateCursor(){ ringX += (mouseX - ringX) * .16; ringY += (mouseY - ringY) * .16; ring.style.left = ringX + 'px'; ring.style.top = ringY + 'px'; requestAnimationFrame(animateCursor); })();
$$('button,a').forEach(el => { el.addEventListener('mouseenter',()=>ring.classList.add('active'));el.addEventListener('mouseleave',()=>ring.classList.remove('active')); });
function burst(x,y,amount=9){ for(let i=0;i<amount;i++){ const bit=document.createElement('i'); bit.textContent=Math.random()>.35?'♡':'✦'; bit.className='burst'; bit.style.cssText=`position:fixed;z-index:99;left:${x}px;top:${y}px;color:${Math.random()>.5?'#f8d1be':'#eea9a5'};pointer-events:none;font:18px Italiana,serif;transition:transform .8s cubic-bezier(.1,.8,.3,1),opacity .8s;`; document.body.append(bit); requestAnimationFrame(()=>{const a=Math.random()*Math.PI*2,d=35+Math.random()*80;bit.style.transform=`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px) rotate(${Math.random()*180}deg)`;bit.style.opacity='0';});setTimeout(()=>bit.remove(),850); } }
addEventListener('click',e=>{if(!e.target.closest('.no'))burst(e.clientX,e.clientY,7)});

// Lofi music: starts only after an intentional gesture (browser-safe)
const audio = $('#lofi'), musicButton = $('#musicButton');
musicButton.addEventListener('click', async () => { try { if(audio.paused){await audio.play();musicButton.classList.add('playing');$('b',musicButton).textContent='LOFI ON';}else{audio.pause();musicButton.classList.remove('playing');$('b',musicButton).textContent='LOFI OFF';} }catch{ $('b',musicButton).textContent='ADD MUSIC.MP3'; } });

$('#enterStory').onclick=()=>$('#memories').scrollIntoView({behavior:'smooth'});

// A gentle, staggered entrance for every major beat of the story.
const revealGroups = [
  ['.section-title .kicker', '.section-title h2', '.section-title .body-copy'],
  ['.book-copy .kicker', '.book-copy h2', '.book-copy .body-copy', '.book-nav'],
  ['.finale .kicker', '.finale h2', '.finale .finale-note', '.answer-area', '.no-hint']
];
revealGroups.forEach(group => group.forEach((selector, index) => $$(selector).forEach(el => {
  el.classList.add('motion-item', `motion-delay-${Math.min(index, 3)}`);
})));
$$('.polaroid').forEach(el => el.classList.add('motion-card'));
$$('.book-scene').forEach(el => el.classList.add('motion-item', 'motion-delay-2'));
const smoothReveal = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('motion-in'); smoothReveal.unobserve(entry.target); }
}), { threshold: .16, rootMargin: '0px 0px -7% 0px' });
$$('.motion-item, .motion-card').forEach(el => smoothReveal.observe(el));

// Scene transitions: each chapter opens like a camera coming into focus.
const scenes = $$('.section');
scenes.forEach((scene, index) => {
  scene.classList.add('cinematic-section');
  if (index === 0) requestAnimationFrame(() => scene.classList.add('cinematic-in'));
});
const sceneObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (!entry.isIntersecting) return;
  entry.target.classList.add('cinematic-in');
  if (entry.target.id === 'memories') $('#memoryCloud').classList.add('motion-live');
  sceneObserver.unobserve(entry.target);
}), { threshold: .08, rootMargin: '0px 0px -4% 0px' });
scenes.slice(1).forEach(scene => sceneObserver.observe(scene));

// Slow depth drift gives the scroll a film-like, layered feel instead of hard stops.
const depthLayers = [
  [$('.hero-copy'), .085],
  [$('#memoryCloud'), -.045],
  [$('.book-copy'), -.055],
  [$('#bookScene'), .045],
  [$('#loveLetter'), -.026],
  [$('.finale h2'), -.06],
  [$('.finale-note'), .04]
].filter(([el]) => el);
depthLayers.forEach(([el]) => el.classList.add('float-layer'));
let easedScroll = scrollY;
function cinematicMotion(){
  easedScroll += (scrollY - easedScroll) * .085;
  depthLayers.forEach(([el, depth]) => {
    const rect = el.getBoundingClientRect();
    const offset = Math.max(-38, Math.min(38, (rect.top + rect.height * .5 - innerHeight * .5) * depth));
    el.style.setProperty('--cinematic-y', `${offset.toFixed(2)}px`);
  });
  requestAnimationFrame(cinematicMotion);
}
requestAnimationFrame(cinematicMotion);

// 3D cube reacts to the pointer
const cubeWrap = $('#cubeWrap');
addEventListener('pointermove', e => { const x=(e.clientX/innerWidth-.5)*12,y=(e.clientY/innerHeight-.5)*-12;cubeWrap.style.transform=`translate(46vw,-21vh) rotateX(${y}deg) rotateY(${x}deg)`; });

// Photo cards have a private little message
const cardWords=['You were tiny. The charm was already enormous.','Cute was never even a phase for you — it was destiny.','Somebody please explain how one person can be this adorable.','And then you grew up and somehow got even prettier.'];
$$('.polaroid').forEach(card=>card.addEventListener('click',()=>{const pop=document.createElement('div');pop.className='photo-message';pop.innerHTML=`<b>${cardWords[+card.dataset.card-1]}</b><span>tap anywhere to continue ♡</span>`;document.body.append(pop);requestAnimationFrame(()=>pop.classList.add('show'));setTimeout(()=>addEventListener('click',()=>{pop.remove()}, {once:true}),0)}));

// 3D book controls
let currentPage=0; const bookPages=$('#bookPages'), bookNumber=$('#bookNumber');
function setBook(next){currentPage=(next+4)%4;bookPages.className='book-pages'+(currentPage?` p${currentPage}`:'');bookNumber.textContent=`${String(currentPage+1).padStart(2,'0')} / 04`;}
$('#bookNext').onclick=()=>setBook(currentPage+1);$('#bookPrev').onclick=()=>setBook(currentPage-1);
let bookTouch=0;$('#bookScene').addEventListener('touchstart',e=>bookTouch=e.touches[0].clientX,{passive:true});$('#bookScene').addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-bookTouch;if(Math.abs(dx)>30)setBook(currentPage+(dx<0?1:-1));},{passive:true});

// Letter reveal
const letter=$('#loveLetter');new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)letter.classList.add('in')}),{threshold:.25}).observe(letter);

// The intentionally impossible No
const no=$('#noButton'), area=$('#answerArea'), yes=$('#yesButton'), reveal=$('#answerReveal');
function flee(){ const bounds=area.getBoundingClientRect(),w=no.offsetWidth,h=no.offsetHeight; const maxX=Math.max(20,bounds.width-w-10),maxY=Math.max(18,bounds.height-h); no.style.position='absolute'; no.style.left=(Math.random()*maxX)+'px'; no.style.top=(Math.random()*maxY)+'px'; no.style.transform=`rotate(${(Math.random()-.5)*20}deg)`; const messages=['nope','too slow','not today','try again','hehe']; no.textContent=messages[Math.floor(Math.random()*messages.length)]; }
['mouseenter','pointerdown','focus'].forEach(event=>no.addEventListener(event,flee));
yes.addEventListener('click',()=>{area.style.display='none';$('.no-hint').style.display='none';reveal.classList.add('show');burst(innerWidth/2,innerHeight/2,30);});

// Ambient floating heart-and-star field
const canvas=$('#world'),ctx=canvas.getContext('2d');let specks=[];
function resize(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);specks=Array.from({length:Math.min(100,Math.floor(innerWidth/12))},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.6+.25,a:Math.random()*.6+.08,s:Math.random()*.27+.04,drift:(Math.random()-.5)*.12}));}
function world(){ctx.clearRect(0,0,innerWidth,innerHeight);specks.forEach(p=>{p.y-=p.s;p.x+=p.drift;if(p.y<0){p.y=innerHeight;p.x=Math.random()*innerWidth;}ctx.beginPath();ctx.fillStyle=`rgba(255,${175+Math.floor(p.a*50)},${170+Math.floor(p.a*40)},${p.a})`;ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});requestAnimationFrame(world)}resize();world();addEventListener('resize',resize);
