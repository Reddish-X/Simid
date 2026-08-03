/* ============================================================
   💖 Website for Shrestha — script.js 💖
   ============================================================ */

const btnYes = document.getElementById('btn-yes');
const btnNo = document.getElementById('btn-no');
const noCounter = document.getElementById('no-counter');
const questionScreen = document.getElementById('question-screen');
const endScreen = document.getElementById('end-screen');
const heartsBg = document.getElementById('hearts-bg');
const sparkleLayer = document.getElementById('sparkle-layer');

let noCount = 0;

/* Cute things she "says" when pressing No */
const NO_MESSAGES = [
  'Are you sure? 🥺',
  'Really really sure? 😢',
  'Think again, pookie! 💭',
  'Hmm… last chance! 😳',
  'You cannot do this to me 😭',
  'My heart is breaking 💔',
  'I am literally crying now 😭💔',
  'JUST SAY YES ALREADY! 😤💘'
];

/* The No button gets more dramatic too */
const NO_LABELS = ['No 🙈', 'No 🥺', 'No 😢', 'No 💔', 'no 🥲', 'NO!! 😭', 'no no no 🥹'];

const HEART_EMOJIS = ['💖', '💕', '💗', '🌸', '✨', '💘', '🌷', '🩷', '💞'];

/* ---------- floating hearts in the background ---------- */
function spawnBgHearts() {
  const count = window.innerWidth < 520 ? 14 : 22;
  for (let i = 0; i < count; i++) {
    const heart = document.createElement('div');
    heart.className = 'float-heart';
    heart.textContent = HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)];
    heart.style.left = Math.random() * 100 + 'vw';
    heart.style.fontSize = 14 + Math.random() * 22 + 'px';
    heart.style.animationDuration = 8 + Math.random() * 10 + 's';
    heart.style.animationDelay = Math.random() * 14 + 's';
    heartsBg.appendChild(heart);
  }
}

/* ---------- tiny hearts that follow the cursor / finger ---------- */
let lastSparkle = 0;

function spawnSparkle(x, y) {
  const heart = document.createElement('div');
  heart.className = 'trail-heart';
  heart.textContent = '💗';
  heart.style.left = x + 'px';
  heart.style.top = y + 'px';
  sparkleLayer.appendChild(heart);
  setTimeout(() => heart.remove(), 800);
}

document.addEventListener('mousemove', (e) => {
  const now = Date.now();
  if (now - lastSparkle < 60) return;
  lastSparkle = now;
  spawnSparkle(e.clientX, e.clientY);
});

document.addEventListener('touchmove', (e) => {
  const touch = e.touches[0];
  if (!touch) return;
  const now = Date.now();
  if (now - lastSparkle < 80) return;
  lastSparkle = now;
  spawnSparkle(touch.clientX, touch.clientY);
}, { passive: true });

/* ---------- tiny "pop" sound, no audio files needed ---------- */
let audioCtx = null;

function pop(freq = 620) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {
    /* audio not available — no problem */
  }
}

/* ---------- heart explosion when she says YES ---------- */
function burstHearts(count = 60) {
  for (let i = 0; i < count; i++) {
    const heart = document.createElement('div');
    heart.className = 'confetti-heart';
    heart.textContent = HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)];
    heart.style.left = window.innerWidth / 2 + (Math.random() - 0.5) * 140 + 'px';
    heart.style.top = window.innerHeight / 2 + (Math.random() - 0.5) * 140 + 'px';
    heart.style.setProperty('--dx', (Math.random() - 0.5) * window.innerWidth * 1.6 + 'px');
    heart.style.setProperty('--dy', -(Math.random() * window.innerHeight * 0.8) - 80 + 'px');
    heart.style.setProperty('--rot', (Math.random() - 0.5) * 720 + 'deg');
    heart.style.animationDelay = Math.random() * 0.2 + 's';
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 2100);
  }
}

/* ---------- buttons ---------- */
btnNo.addEventListener('click', () => {
  noCount++;
  pop(320 + noCount * 25);

  /* Yes grows bigger and bigger... */
  const yesScale = 1 + Math.min(noCount * 0.35, 1.8);
  btnYes.style.transform = 'scale(' + yesScale + ')';

  /* ...and No gets shy and shrinks */
  const noScale = Math.max(1 - noCount * 0.1, 0.35);
  btnNo.style.transform = 'scale(' + noScale + ')';
  btnNo.textContent = NO_LABELS[Math.min(noCount - 1, NO_LABELS.length - 1)];

  noCounter.textContent =
    NO_MESSAGES[Math.min(noCount - 1, NO_MESSAGES.length - 1)] + '  ·  pressed No ' + noCount + '× 🙈';
  noCounter.hidden = false;
});

btnYes.addEventListener('click', () => {
  pop(880);
  questionScreen.classList.add('hidden');
  endScreen.classList.remove('hidden');
  burstHearts(90);

  /* keep a little heart rain going after the big burst */
  let waves = 0;
  const rain = setInterval(() => {
    burstHearts(12);
    if (++waves >= 8) clearInterval(rain);
  }, 300);
});

/* ---------- start ---------- */
spawnBgHearts();
