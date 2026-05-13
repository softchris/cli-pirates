// =============================================================================
// PIRATE KNOWLEDGE WORLD - Main Game Engine
// Three.js 3D pirate world using Kenney Pirate Kit GLB models
// with ship wake trail, foam, and water disturbance effects
// =============================================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ISLAND_DATA } from './questions.js';

// ---- Sound System (file-based + Web Audio synthesis fallbacks) ----
let audioCtx;
let sfxVolume = 0.5; // 0-1, controlled by settings
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// Pre-load audio buffers from files
const soundBuffers = {};
async function loadSound(name, url) {
  try {
    const resp = await fetch(url);
    const arr = await resp.arrayBuffer();
    soundBuffers[name] = await getAudioCtx().decodeAudioData(arr);
  } catch (e) { console.warn(`Could not load sound: ${name}`, e); }
}

function playSoundBuffer(name, volume = 0.5) {
  const buf = soundBuffers[name];
  if (!buf) return;
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = volume * sfxVolume;
  src.connect(gain).connect(ctx.destination);
  src.start(0);
}

async function loadAllSounds() {
  getAudioCtx(); // init context
  await Promise.all([
    loadSound('cannon1', 'sounds/sfx_cannon_fire_01.wav'),
    loadSound('cannon2', 'sounds/sfx_cannon_fire_02.wav'),
    loadSound('cannon3', 'sounds/sfx_cannon_fire_03.wav'),
    loadSound('splash1', 'sounds/sfx_splash_01.wav'),
    loadSound('splash2', 'sounds/sfx_splash_02.wav'),
    loadSound('chest', 'sounds/sfx_chest_open.wav'),
    loadSound('coins', 'sounds/sfx_coin_spill_01.wav'),
    loadSound('theme', 'sounds/pirate_theme.wav'),
  ]);
}

let bgMusicGain = null;
function startBackgroundMusic() {
  const buf = soundBuffers['theme'];
  if (!buf) return;
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  bgMusicGain = ctx.createGain();
  bgMusicGain.gain.value = 1.0;
  src.connect(bgMusicGain).connect(ctx.destination);
  src.start(0);
}

function playCannonFire() {
  const pick = ['cannon1', 'cannon2', 'cannon3'][Math.floor(Math.random() * 3)];
  playSoundBuffer(pick, 0.4);
}

function playSplash() {
  const pick = Math.random() < 0.5 ? 'splash1' : 'splash2';
  playSoundBuffer(pick, 0.3);
}

function playExplosion() {
  // Synthesized deep boom for explosions
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.3 * sfxVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.connect(gain).connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.5);
}

function playHit() {
  playSoundBuffer('coins', 0.4); // metallic impact from coin clink
}

function playSink() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(100, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(15, ctx.currentTime + 1.0);
  gain.gain.setValueAtTime(0.25 * sfxVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
  osc.connect(gain).connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 1.0);
}

function playVictory() {
  playSoundBuffer('chest', 0.5);
  // Plus a little fanfare
  const ctx = getAudioCtx();
  [261, 329, 392, 523].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
    gain.gain.linearRampToValueAtTime(0.15 * sfxVolume, ctx.currentTime + i * 0.15 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.15);
    osc.stop(ctx.currentTime + i * 0.15 + 0.3);
  });
}

function playPickupSound() {
  playSoundBuffer('chest', 0.4);
  // Short bright chime
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.2 * sfxVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(gain).connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.25);
}

function playPowerupSound() {
  playSoundBuffer('chest', 0.3);
  // Rising arpeggio
  const ctx = getAudioCtx();
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.07);
    gain.gain.linearRampToValueAtTime(0.18 * sfxVolume, ctx.currentTime + i * 0.07 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.07);
    osc.stop(ctx.currentTime + i * 0.07 + 0.2);
  });
}

// ---- Constants ----
const OCEAN_SIZE = 600;
const ISLAND_RADIUS = 120;
const DOCK_DISTANCE = 35;
let SHIP_SPEED = 0.8;
const CAMERA_HEIGHT = 30;
const CAMERA_DISTANCE = 45;
const MODEL_PATH = 'models/';
const CANNON_COOLDOWN = 3;

// ---- Captains (Microsoft Developer Advocates with pirate names) ----
const IMG = 'https://developer.microsoft.com/en-us/advocates/media/profiles/';
const CAPTAINS = [
  // ---- A ----
  { id:'aaron-p',  name:'Aaron "Cannonpowder" Powell', realName:'Aaron Powell',       img:IMG+'aaron-powell.png',     specialty:'.NET / JavaScript',      hp:6, speed:1.0, damage:1.0, fireRate:1.0 },
  { id:'aaron-w',  name:'Aaron "The Wind" Wislang',    realName:'Aaron Wislang',       img:IMG+'aaron-wislang.jpg',    specialty:'Cloud Native / Linux',   hp:5, speed:1.2, damage:0.9, fireRate:1.1 },
  { id:'alfredo',  name:'Alfredo "El Tiburón"',        realName:'Alfredo Deza',        img:IMG+'alfredo-deza.png',     specialty:'Python / MLOps',         hp:6, speed:1.0, damage:1.1, fireRate:1.0 },
  { id:'alvaro',   name:'Alvaro "Old Sound" Videla',   realName:'Alvaro Videla',       img:IMG+'alvaro-videla.png',    specialty:'Architecture',           hp:7, speed:0.85,damage:1.1, fireRate:0.9 },
  { id:'amy',      name:'Amy "Stormborn" Boyd',        realName:'Amy Boyd',            img:IMG+'amy-boyd.png',         specialty:'AI / ML',                hp:5, speed:1.0, damage:1.2, fireRate:1.1 },
  { id:'anthony-b',name:'Anthony "Wireless" Bartolo',  realName:'Anthony Bartolo',     img:IMG+'anthony-bartolo.png',  specialty:'DevTools / AI / Security',hp:7,speed:0.8, damage:1.2, fireRate:0.9 },
  { id:'anthony-s',name:'Anthony "The Python" Shaw',   realName:'Anthony Shaw',        img:IMG+'anthony-shaw.png',     specialty:'Python',                 hp:5, speed:1.1, damage:1.0, fireRate:1.2 },
  { id:'april-d',  name:'Dread Pirate Dunnam',         realName:'April Dunnam',        img:IMG+'april-dunnam.png',     specialty:'Power Platform',         hp:5, speed:0.9, damage:1.3, fireRate:0.9 },
  { id:'april-g',  name:'April "Ironside" Gittens',    realName:'April Gittens',       img:IMG+'april-gittens.png',    specialty:'AI / Responsible AI',    hp:6, speed:1.0, damage:1.0, fireRate:1.0 },
  { id:'ayca',     name:'Ayca "The Graph" Bas',        realName:'Ayca Bas',            img:IMG+'ayca-bas.png',         specialty:'Microsoft Graph',        hp:5, speed:1.1, damage:1.0, fireRate:1.2 },
  // ---- B ----
  { id:'barnam',   name:'Barnam "Broadside" Bora',     realName:'Barnam Bora',         img:IMG+'barnam-bora.png',      specialty:'AI / ML / Teams',        hp:6, speed:0.9, damage:1.2, fireRate:1.0 },
  { id:'bethany',  name:'Bethany Bonecrusher',          realName:'Bethany Cheum',       img:IMG+'bethany-cheum.png',    specialty:'Python / Data Science',  hp:6, speed:1.0, damage:1.0, fireRate:1.0 },
  { id:'brian',    name:'Brian "Benz the Bold"',        realName:'Brian Benz',          img:IMG+'brian-benz.png',       specialty:'Java / AI / DevOps',     hp:7, speed:0.85,damage:1.1, fireRate:0.9 },
  { id:'bruno',    name:'Bruno "El Corsario"',          realName:'Bruno Capuano',       img:IMG+'bruno-capuano.png',    specialty:'AI / ML / .NET',         hp:7, speed:0.85,damage:1.2, fireRate:0.9 },
  { id:'burke',    name:'Blackbeard Burke',             realName:'Burke Holland',       img:IMG+'burke-holland.png',    specialty:'JavaScript / VS Code',   hp:7, speed:0.8, damage:1.1, fireRate:1.0 },
  // ---- C ----
  { id:'carlotta', name:'Carlotta "La Corsara"',        realName:'Carlotta Castelluccio',img:IMG+'carlotta-castelluccio.jpeg',specialty:'Data Science / AI',hp:5,speed:1.1, damage:1.0, fireRate:1.1 },
  { id:'cedric',   name:'Cedric "Vidal the Viper"',    realName:'Cedric Vidal',        img:IMG+'cedric-vidal.png',     specialty:'AI',                     hp:6, speed:1.0, damage:1.1, fireRate:1.0 },
  { id:'chris',    name:'Captain Noring the Navigator', realName:'Chris Noring',        img:IMG+'chris-noring.png',     specialty:'Web / Azure / JS',       hp:6, speed:1.0, damage:1.0, fireRate:1.0 },
  { id:'christopher',name:'Christopher "Le Corsaire"',  realName:'Christopher Maneu',   img:IMG+'christopher-maneu.png',specialty:'Data Engineering',       hp:6, speed:0.9, damage:1.1, fireRate:1.0 },
  { id:'cynthia',  name:'Cynthia "Zanoni the Zealous"', realName:'Cynthia Zanoni',     img:IMG+'cynthia-zanoni.png',   specialty:'JavaScript / GitHub',    hp:5, speed:1.1, damage:1.0, fireRate:1.2 },
  // ---- D ----
  { id:'dan',      name:'Dan "The Kraken" Wahlin',     realName:'Dan Wahlin',          img:IMG+'dan-wahlin.jpg',       specialty:'AI / Azure / JS',        hp:8, speed:0.7, damage:1.2, fireRate:0.8 },
  { id:'daniel',   name:'Daniel "Laskewitz the Lucky"', realName:'Daniel Laskewitz',   img:IMG+'daniel-laskewitz.png', specialty:'Power Platform',         hp:5, speed:1.0, damage:1.0, fireRate:1.2 },
  { id:'dave',     name:'Dave "Glover the Gunner"',    realName:'Dave Glover',         img:IMG+'dave-glover.png',      specialty:'IoT / Cloud',            hp:6, speed:0.9, damage:1.3, fireRate:0.8 },
  { id:'david',    name:'David "Revo" Smith',          realName:'David Smith',         img:IMG+'david-smith.png',      specialty:'AI / ML / Data Science', hp:6, speed:1.0, damage:1.0, fireRate:1.0 },
  // ---- E ----
  { id:'elaiza',   name:'Elaiza "Benitez the Brave"',  realName:'Elaiza Benitez',     img:IMG+'elaiza-benitez.jpg',   specialty:'Power Platform',         hp:5, speed:1.1, damage:1.0, fireRate:1.1 },
  { id:'em',       name:'Em "Lazerbeam" Walker',       realName:'Em Lazer-Walker',     img:IMG+'em-lazerwalker.png',   specialty:'Games / Mixed Reality',  hp:5, speed:1.0, damage:1.4, fireRate:0.8 },
  // ---- G ----
  { id:'garry',    name:'Garry "Trinder the Terrible"', realName:'Garry Trinder',      img:IMG+'garry-trinder.jpeg',   specialty:'Microsoft 365',          hp:6, speed:0.9, damage:1.1, fireRate:1.0 },
  { id:'gustavo',  name:'Gustavo "The Ghost"',         realName:'Gustavo Cordido',     img:IMG+'gustavo-cordido.jpg',  specialty:'Spatial / Mixed Reality',hp:5, speed:1.2, damage:0.9, fireRate:1.2 },
  { id:'gwyneth',  name:'Gwyneth Stormcaller',         realName:'Gwyneth Peña-Siguenza',img:IMG+'gwyneth-penasiguenza.jpg',specialty:'Cloud Engineering',  hp:5, speed:1.2, damage:0.9, fireRate:1.3 },
  // ---- H-I ----
  { id:'henk',     name:'Henk "Boelman the Buccaneer"',realName:'Henk Boelman',        img:IMG+'henk-boelman.png',     specialty:'AI / ML / Azure',        hp:6, speed:1.0, damage:1.1, fireRate:1.0 },
  { id:'ismael',   name:'Ismaël "El Mejía"',           realName:'Ismaël Mejía',        img:IMG+'ismael-mejia.png',     specialty:'Big Data',               hp:7, speed:0.85,damage:1.0, fireRate:1.0 },
  // ---- J ----
  { id:'jasmine',  name:'Jade Jasmine of the Deep',    realName:'Jasmine Greenaway',   img:IMG+'jasmine-greenaway.jpg',specialty:'AI / Data',              hp:5, speed:1.1, damage:1.0, fireRate:1.2 },
  { id:'john',     name:'Papa Pegleg',                 realName:'John Papa',           img:IMG+'john-papa.png',        specialty:'Web / DevRel',           hp:6, speed:0.9, damage:1.1, fireRate:1.1 },
  { id:'jorge',    name:'Jorge "Arteiro the Anchor"',  realName:'Jorge Arteiro',       img:IMG+'jorge-arteiro.png',    specialty:'Containers / K8s',       hp:7, speed:0.8, damage:1.1, fireRate:0.9 },
  { id:'josh',     name:'Josh "Ndemenge the Navigator"',realName:'Josh Ndemenge',      img:IMG+'josh-ndemenge.jpg',    specialty:'Data & Analytics',       hp:6, speed:1.0, damage:1.0, fireRate:1.0 },
  { id:'joshua',   name:'Joshua "Duffney the Daring"', realName:'Joshua Duffney',      img:IMG+'joshua-duffney.jpg',   specialty:'Secure Supply Chain',    hp:6, speed:0.9, damage:1.2, fireRate:1.0 },
  { id:'julia',    name:'Julia "Muiruri the Mystic"',  realName:'Julia Muiruri',       img:IMG+'julia-muiruri.jpg',    specialty:'Students / VS Code',     hp:5, speed:1.1, damage:1.0, fireRate:1.2 },
  { id:'julien',   name:'Julien "Dubois the Duelist"', realName:'Julien Dubois',       img:IMG+'julien-dubois.jpg',    specialty:'Java',                   hp:6, speed:1.0, damage:1.1, fireRate:1.0 },
  { id:'justin',   name:'Justin "Chronicle" Yoo',      realName:'Justin Yoo',          img:IMG+'justin-yoo.png',       specialty:'.NET / Power Platform',  hp:6, speed:0.9, damage:1.0, fireRate:1.1 },
  // ---- K-L ----
  { id:'kamal',    name:'Kamal "The Coder"',           realName:'Kamal Shree',         img:IMG+'kamalshree-soundirapandian.jpg',specialty:'M365 / Flutter', hp:5, speed:1.1, damage:1.0, fireRate:1.1 },
  { id:'kinfey',   name:'Kinfey "Lo the Legend"',      realName:'Kinfey Lo',           img:IMG+'kinfey-lo.jpg',        specialty:'Azure OpenAI / GitHub',  hp:6, speed:1.0, damage:1.1, fireRate:1.0 },
  { id:'korey',    name:'Korey "Spacefarer"',          realName:'Korey Stegared-Pace', img:IMG+'korey-stegared-pace.png',specialty:'Data Science / AI',    hp:6, speed:1.0, damage:1.0, fireRate:1.0 },
  { id:'laurent',  name:'Laurent "Bugnion the Bold"',  realName:'Laurent Bugnion',     img:IMG+'laurent-bugnion.png',  specialty:'.NET / Azure / AI',      hp:7, speed:0.85,damage:1.1, fireRate:0.9 },
  { id:'lee',      name:'Lee "Stott the Stalwart"',    realName:'Lee Stott',           img:IMG+'lee-stott.png',        specialty:'AI / ML',                hp:6, speed:1.0, damage:1.0, fireRate:1.0 },
  { id:'liam',     name:'Liam "Hampton the Hammer"',   realName:'Liam Hampton',        img:IMG+'liam-hampton.jpg',     specialty:'Go / DevOps',            hp:6, speed:1.0, damage:1.2, fireRate:0.9 },
  // ---- M ----
  { id:'madoka',   name:'Madoka "Chomado" Chiyoda',    realName:'Madoka Chiyoda',      img:IMG+'madoka-chiyoda.jpg',   specialty:'Mixed Reality / C#',     hp:5, speed:1.1, damage:1.0, fireRate:1.2 },
  { id:'marlene',  name:'Marlene "Mhangami the Mighty"',realName:'Marlene Mhangami',   img:IMG+'marlene-mhangami.jpeg',specialty:'Python',                hp:5, speed:1.1, damage:1.0, fireRate:1.1 },
  { id:'matthew',  name:'Matthew "Codemill" Soucoup',  realName:'Matthew Soucoup',     img:IMG+'matthew-soucoup.png',  specialty:'.NET / Xamarin',         hp:6, speed:0.9, damage:1.1, fireRate:1.0 },
  // ---- N-O ----
  { id:'nitya',    name:'Nitya "The Tempest"',         realName:'Nitya Narasimhan',    img:IMG+'nitya-narasimhan.png', specialty:'Mobile / Azure / PWA',   hp:5, speed:1.2, damage:0.9, fireRate:1.3 },
  { id:'olivia',   name:'Olivia "Guzzardo the Great"', realName:'Olivia Guzzardo',     img:IMG+'olivia-guzzardo.png',  specialty:'VS Code / Azure',        hp:5, speed:1.1, damage:1.0, fireRate:1.1 },
  { id:'orin',     name:'Orin "Thomas the Thunder"',   realName:'Orin Thomas',         img:IMG+'orin-thomas.png',      specialty:'IT Infrastructure',      hp:8, speed:0.7, damage:1.2, fireRate:0.8 },
  // ---- P ----
  { id:'pablo',    name:'Pablo "Lopes the Legendary"', realName:'Pablo Lopes',         img:IMG+'pablo-lopes.jpg',      specialty:'Azure / .NET / AI',      hp:6, speed:1.0, damage:1.0, fireRate:1.0 },
  { id:'pamela',   name:'Pamela "Fox the Fearless"',   realName:'Pamela Fox',          img:IMG+'pamela-fox.png',       specialty:'Python',                 hp:5, speed:1.1, damage:1.1, fireRate:1.1 },
  { id:'patrick',  name:'Patrick "Chanezon the Pirate"',realName:'Patrick Chanezon',   img:IMG+'patrick-chanezon.png', specialty:'Containers',             hp:7, speed:0.85,damage:1.0, fireRate:1.0 },
  { id:'paul-d',   name:'Paul "DeCarlo the Dread"',    realName:'Paul DeCarlo',        img:IMG+'paul-decarlo.png',     specialty:'AI / ML / IoT',          hp:6, speed:1.0, damage:1.1, fireRate:1.0 },
  { id:'paul-y',   name:'Paul "Yu the Unyielding"',    realName:'Paul Yu',             img:IMG+'paul-yu.jpg',          specialty:'Cloud',                  hp:6, speed:1.0, damage:1.0, fireRate:1.0 },
  { id:'pierre',   name:'Pierre "Roman the Ruthless"', realName:'Pierre Roman',        img:IMG+'pierre-roman.png',     specialty:'Infrastructure / Azure', hp:7, speed:0.8, damage:1.2, fireRate:0.9 },
  // ---- R ----
  { id:'rabia',    name:'Rabia "Williams the Wraith"', realName:'Rabia Williams',      img:IMG+'rabia-williams.png',   specialty:'Microsoft 365',          hp:5, speed:1.1, damage:1.0, fireRate:1.1 },
  { id:'renee',    name:'Renee "Noble the Notorious"', realName:'Renee Noble',         img:IMG+'renee-noble.png',      specialty:'Python / AI / ML',       hp:5, speed:1.0, damage:1.1, fireRate:1.1 },
  { id:'rick',     name:'Rick "Claus the Cannon"',     realName:'Rick Claus',          img:IMG+'rick-claus.png',       specialty:'Azure / IT Pro',         hp:7, speed:0.8, damage:1.3, fireRate:0.8 },
  { id:'rory',     name:'Rory "Preddy the Plunderer"', realName:'Rory Preddy',         img:IMG+'rory-preddy.png',      specialty:'Java',                   hp:6, speed:1.0, damage:1.0, fireRate:1.0 },
  // ---- S ----
  { id:'sandra',   name:'Sandra "Skriemhild"',         realName:'Sandra Ahlgrimm',     img:IMG+'sandra-ahlgrimm.png',  specialty:'Container / Java',       hp:6, speed:1.0, damage:1.1, fireRate:1.0 },
  { id:'sarah',    name:'Sarah "Kaiser the Quantum"',  realName:'Sarah Kaiser',        img:IMG+'sarah-kaiser.png',     specialty:'Python',                 hp:5, speed:1.1, damage:1.0, fireRate:1.2 },
  { id:'scott',    name:'Scott "Durow the Destroyer"', realName:'Scott Durow',         img:IMG+'scott-durow.png',      specialty:'Power Platform',         hp:6, speed:0.9, damage:1.2, fireRate:1.0 },
  { id:'someleze', name:'Someleze "Diko the Dragon"',  realName:'Someleze Diko',       img:IMG+'someleze-diko.png',    specialty:'Data & AI',              hp:6, speed:1.0, damage:1.0, fireRate:1.0 },
  { id:'sonia',    name:'Sonia "Cuff the Corsair"',    realName:'Sonia Cuff',          img:IMG+'sonia-cuff.png',       specialty:'IT / FinOps / Azure',    hp:7, speed:0.85,damage:1.0, fireRate:1.0 },
  { id:'steven',   name:'Steven "Murawski the Marauder"',realName:'Steven Murawski',   img:IMG+'steven-murawski.png',  specialty:'Cloud Native',           hp:7, speed:0.8, damage:1.1, fireRate:0.9 },
  // ---- T ----
  { id:'todd',     name:'Todd "Anglin the Admiral"',   realName:'Todd Anglin',         img:IMG+'todd-anglin.png',      specialty:'Web / Mobile',           hp:6, speed:1.0, damage:1.0, fireRate:1.0 },
  { id:'tomomi',   name:'Tomomi "Girlie Mac" Imura',   realName:'Tomomi Imura',        img:IMG+'tomomi-imura.jpg',     specialty:'JavaScript / UX',        hp:5, speed:1.2, damage:0.9, fireRate:1.3 },
  // ---- V-W ----
  { id:'vinicius', name:'Vinicius "Apolinario the Anchor"',realName:'Vinicius Apolinario',img:IMG+'vinicius-apolinario.png',specialty:'Azure / Containers',hp:7, speed:0.8, damage:1.1, fireRate:0.9 },
  { id:'waldek',   name:'Waldek "Mastykarz the Mad"',  realName:'Waldek Mastykarz',    img:IMG+'waldek-mastykarz.png', specialty:'Microsoft 365',          hp:6, speed:1.0, damage:1.0, fireRate:1.0 },
  { id:'wassim',   name:'Wassim "The Manekinekko"',    realName:'Wassim Chegham',      img:IMG+'wassim-chegham.jpeg',  specialty:'Node.js / JavaScript',   hp:5, speed:1.1, damage:1.0, fireRate:1.2 },
  // ---- Y ----
  { id:'yohan',    name:'Yohan "Sinedied" Lasorsa',    realName:'Yohan Lasorsa',       img:IMG+'yohan-lasorsa.png',    specialty:'JavaScript / Node.js',   hp:5, speed:1.1, damage:1.0, fireRate:1.2 },
  { id:'yoshio',   name:'Yoshio "Terada the Typhoon"', realName:'Yoshio Terada',       img:IMG+'yoshio-terada.png',    specialty:'Java',                   hp:7, speed:0.8, damage:1.2, fireRate:0.9 },
  { id:'yoshua',   name:'Yoshua "Wuyts the Rust Pirate"',realName:'Yoshua Wuyts',      img:IMG+'yoshua-wuyts.jpg',     specialty:'Rust',                   hp:5, speed:1.2, damage:1.1, fireRate:1.0 },
  // ---- GitHub Legends ----
  { id:'cassidy',  name:'Cassidy "The Codebreaker"',    realName:'Cassidy Williams',    img:'https://github.com/cassidoo.png',   specialty:'React / Frontend / DevEx',   hp:5, speed:1.3, damage:1.0, fireRate:1.3 },
  { id:'martin',   name:'Martin "Woodward the Wise"',   realName:'Martin Woodward',     img:'https://github.com/martinwoodward.png', specialty:'DevRel / Open Source / .NET', hp:8, speed:0.8, damage:1.0, fireRate:0.9 },
  { id:'ari',      name:'Ari "The Continuous Geek"',    realName:'Ari LiVigni',         img:'https://github.com/arilivigni.png', specialty:'DevSecOps / CI-CD / Cloud',  hp:7, speed:0.9, damage:1.2, fireRate:1.0 },
  { id:'kyle',     name:'Kyle "Daigle the Dreadnought"',realName:'Kyle Daigle',         img:'https://github.com/kdaigle.png',    specialty:'AI / Ecosystem / Operations',hp:7, speed:0.9, damage:1.1, fireRate:1.1 },
  { id:'sherry',   name:'Sherry "The Viking Queen"',    realName:'Sherry List',         img:'https://github.com/sazimi.png',     specialty:'Angular / AI / Community',   hp:6, speed:1.1, damage:1.0, fireRate:1.2 },
  { id:'maxime',   name:'Maxime "Rouiller the Relentless"',realName:'Maxime Rouiller',  img:'https://github.com/MaximRouiller.png',specialty:'.NET / Azure / Cloud',     hp:7, speed:0.9, damage:1.1, fireRate:1.0 },
  { id:'james-m', name:'James "Montemagno the Mobile"',  realName:'James Montemagno',  img:'https://github.com/jamesmontemagno.png', specialty:'.NET MAUI / C# / Mobile',   hp:6, speed:1.1, damage:1.0, fireRate:1.1 },
  { id:'ashley',  name:'Ashley "The Gopher Queen"',      realName:'Ashley McNamara',   img:'https://github.com/ashleymcnamara.png',  specialty:'Open Source / DevRel / Go',  hp:7, speed:0.9, damage:1.0, fireRate:1.0 },
  { id:'christina',name:'Christina "Film Girl"',          realName:'Christina Warren',  img:'https://github.com/filmgirl.png',        specialty:'Copilot / Web Dev / AI',     hp:5, speed:1.2, damage:1.1, fireRate:1.2 },
  { id:'andrea',  name:'Andrea "La Colombiana"',          realName:'Andrea Griffiths',  img:'https://github.com/andreagriffiths11.png',specialty:'GitHub / DevEx / Community',hp:6, speed:1.0, damage:1.0, fireRate:1.1 },
  { id:'damian',  name:'Damian "The Octopus" Brady',      realName:'Damian Brady',      img:'https://github.com/damovisa.png',        specialty:'DevOps / MLOps / CI-CD',    hp:7, speed:0.85,damage:1.2, fireRate:0.9 },
  { id:'jeramiah',name:'Jeramiah "Enterprise" Dooley',    realName:'Jeramiah Dooley',   img:'https://github.com/jdooley-clt.png',    specialty:'Enterprise / Cloud / DevEx', hp:8, speed:0.8, damage:1.0, fireRate:0.9 },
  { id:'geektrainer',name:'Christopher "GeekTrainer"',    realName:'Christopher Harrison',img:'https://github.com/GeekTrainer.png',   specialty:'Python / TypeScript / Education',hp:5,speed:1.1,damage:1.0, fireRate:1.2 },
  // ---- GitHub Legends (Mascots) ----
  { id:'mona',     name:'Mona "The Octocat"',             realName:'Mona the Octocat',    img:'https://octodex.github.com/images/original.png',       specialty:'Open Source / Community',    hp:8, speed:1.0, damage:1.0, fireRate:1.0, locked:true, questId:'quest-mona' },
  { id:'ducky',    name:'Ducky "The Debugger"',            realName:'Rubber Duck',         img:'https://github.githubassets.com/assets/copilot-e4ba23e3eaa2.png', specialty:'Debugging / Pair Programming',hp:4, speed:1.4, damage:0.9, fireRate:1.4, locked:true, questId:'quest-ducky' },
  { id:'copilot',  name:'Copilot "The AI Corsair"',        realName:'GitHub Copilot',      img:'https://github.githubassets.com/assets/copilot-e4ba23e3eaa2.png', specialty:'AI / Code Generation',       hp:6, speed:1.1, damage:1.3, fireRate:1.1, locked:true, questId:'quest-copilot' },
  { id:'monacorn', name:'Monacorn "The Mythical"',         realName:'Monacorn',            img:'https://octodex.github.com/images/saint_nictocat.jpg', specialty:'Magic / Unicorn Power',      hp:5, speed:1.3, damage:1.1, fireRate:1.2, locked:true, questId:'quest-monacorn' },
  { id:'surftocat',name:'Surftocat "Wave Rider"',          realName:'Surftocat',           img:'https://octodex.github.com/images/surftocat.png',      specialty:'Ocean / Adventure',          hp:5, speed:1.4, damage:0.8, fireRate:1.3, locked:true, questId:'quest-surftocat' },
  { id:'scottocat',name:'Scottocat "The Brave"',           realName:'Scottocat',           img:'https://octodex.github.com/images/scottocat.jpg',      specialty:'Courage / Bagpipes',         hp:9, speed:0.7, damage:1.2, fireRate:0.8, locked:true, questId:'quest-scottocat' },
  { id:'steroidtocat',name:'Steroidtocat "The Mighty"',    realName:'Steroidtocat',        img:'https://octodex.github.com/images/steroidtocat.png',   specialty:'Strength / Power',           hp:10,speed:0.6, damage:1.5, fireRate:0.7, locked:true, questId:'quest-steroidtocat' },
  { id:'nyantocat',name:'Nyantocat "Rainbow Terror"',      realName:'Nyantocat',           img:'https://octodex.github.com/images/nyantocat.gif',      specialty:'Speed / Rainbows',           hp:3, speed:1.5, damage:0.7, fireRate:1.5, locked:true, questId:'quest-nyantocat' },
];

// ---- Drop / Loot Types ----
const DROP_TYPES = [
  { type: 'health',  icon: '❤️', label: 'Health Potion',     color: 0xff4444, chance: 0.35 },
  { type: 'armor',   icon: '🛡️', label: 'Armor Plating',    color: 0x4488ff, chance: 0.25 },
  { type: 'weapon',  icon: '⚔️', label: 'Weapon Upgrade',   color: 0xff8800, chance: 0.20 },
  { type: 'speed',   icon: '💨', label: 'Speed Boost',       color: 0x44ff88, chance: 0.10 },
  { type: 'gold',    icon: '💰', label: 'Treasure Chest',    color: 0xffd700, chance: 0.10 },
];

const BADGES = [
  { id:'first-blood',      name:'First Blood',         icon:'🩸', desc:'Sink your first enemy ship',                          tier:'bronze', check:(s, stats) => stats.shipsSunk >= 1 },
  { id:'ship-hunter',      name:'Ship Hunter',         icon:'⚔️', desc:'Sink 5 enemy ships',                                 tier:'bronze', check:(s, stats) => stats.shipsSunk >= 5 },
  { id:'sea-wolf',         name:'Sea Wolf',            icon:'🐺', desc:'Sink 15 enemy ships',                                tier:'silver', check:(s, stats) => stats.shipsSunk >= 15 },
  { id:'kraken-slayer',    name:'Kraken Slayer',       icon:'🦑', desc:'Sink 30 enemy ships',                                tier:'gold',   check:(s, stats) => stats.shipsSunk >= 30 },
  { id:'broadside-master', name:'Broadside Master',    icon:'💥', desc:'Fire 100 broadsides',                                tier:'silver', check:(s, stats) => stats.broadsidesFired >= 100 },
  { id:'sharpshooter',     name:'Sharpshooter',        icon:'🎯', desc:'Hit 50 cannonball shots',                            tier:'silver', check:(s, stats) => stats.cannonHits >= 50 },
  { id:'untouchable',      name:'Untouchable',         icon:'👻', desc:'Sink 5 ships without taking damage',                  tier:'gold',   check:(s, stats) => stats.killsWithoutDamage >= 5 },
  { id:'first-dock',       name:'First Dock',          icon:'⚓', desc:'Dock at your first island',                           tier:'bronze', check:(s, stats) => stats.islandsVisited.size >= 1 },
  { id:'explorer',         name:'Explorer',            icon:'🗺️', desc:'Visit all 7 islands',                                tier:'silver', check:(s, stats) => stats.islandsVisited.size >= 7 },
  { id:'sea-legs',         name:'Sea Legs',            icon:'🦿', desc:'Sail for 10 minutes total',                           tier:'bronze', check:(s, stats) => stats.timeSailing >= 600 },
  { id:'world-sailor',     name:'World Sailor',        icon:'🌊', desc:'Sail for 30 minutes total',                           tier:'silver', check:(s, stats) => stats.timeSailing >= 1800 },
  { id:'first-conquest',   name:'First Conquest',      icon:'🏝️', desc:'Conquer your first island',                           tier:'bronze', check:(s) => s.conquered.size >= 1 },
  { id:'scholar',          name:'Scholar',             icon:'📚', desc:'Answer 10 questions correctly',                       tier:'silver', check:(s, stats) => stats.questionsCorrect >= 10 },
  { id:'pirate-professor', name:'Pirate Professor',    icon:'🎓', desc:'Answer all questions correctly in one island',        tier:'silver', check:(s, stats) => stats.perfectIslands >= 1 },
  { id:'island-chain',     name:'Island Chain',        icon:'⛓️', desc:'Conquer 3 islands',                                   tier:'silver', check:(s) => s.conquered.size >= 3 },
  { id:'pirate-king',      name:'Pirate King',         icon:'👑', desc:'Conquer all 7 islands',                              tier:'gold',   check:(s) => s.conquered.size >= 7 },
  { id:'level-5',          name:'Rising Tide',         icon:'📈', desc:'Reach level 5',                                       tier:'bronze', check:(s) => s.level >= 5 },
  { id:'level-10',         name:'Storm Chaser',        icon:'⛈️', desc:'Reach level 10',                                      tier:'silver', check:(s) => s.level >= 10 },
  { id:'level-20',         name:'Legend of the Seas',  icon:'🌟', desc:'Reach level 20',                                      tier:'gold',   check:(s) => s.level >= 20 },
  { id:'skill-master',     name:'Skill Master',        icon:'⭐', desc:'Max out any skill',                                   tier:'silver', check:(s) => Object.values(s.skills).some(v => v >= 3) },
  { id:'full-arsenal',     name:'Full Arsenal',        icon:'🏴‍☠️', desc:'Max out ALL skills',                                 tier:'gold',   check:(s) => Object.values(s.skills).every(v => v >= 3) },
  { id:'treasure-hunter',  name:'Treasure Hunter',     icon:'💎', desc:'Collect 1000 gold total',                             tier:'bronze', check:(s, stats) => stats.totalGoldEarned >= 1000 },
  { id:'pirate-tycoon',    name:'Pirate Tycoon',       icon:'🤑', desc:'Collect 5000 gold total',                             tier:'silver', check:(s, stats) => stats.totalGoldEarned >= 5000 },
  { id:'loot-goblin',      name:'Loot Goblin',         icon:'👺', desc:'Pick up 20 loot drops',                               tier:'bronze', check:(s, stats) => stats.dropsCollected >= 20 },
  { id:'survivor',         name:'Survivor',            icon:'💀', desc:'Die and respawn',                                     tier:'bronze', check:(s, stats) => stats.deaths >= 1 },
  { id:'terminal-hacker',  name:'Terminal Hacker',     icon:'💻', desc:'Use 5 different CLI commands',                        tier:'silver', check:(s, stats) => stats.cliCommandsUsed.size >= 5 },
  { id:'fleet-admiral',    name:'Fleet Admiral',       icon:'⚓', desc:'Summon the fleet',                                     tier:'bronze', check:(s, stats) => stats.fleetSummons >= 1 },
];

const QUESTS = [
  { id: 'quest-mona', name: "Mona's Open Source Spirit", icon: '🐙', desc: 'Conquer 3 islands to prove your community spirit', unlocks: 'mona', check: (s) => s.conquered.size >= 3 },
  { id: 'quest-ducky', name: 'Debug the Seven Seas', icon: '🦆', desc: 'Answer 15 quiz questions correctly', unlocks: 'ducky', check: (s) => s.stats.questionsCorrect >= 15 },
  { id: 'quest-copilot', name: 'AI Awakening', icon: '🤖', desc: 'Use 8 different CLI terminal commands', unlocks: 'copilot', check: (s) => s.stats.cliCommandsUsed.size >= 8 },
  { id: 'quest-monacorn', name: 'Mythical Achievement', icon: '🦄', desc: 'Reach level 10 and max out a skill', unlocks: 'monacorn', check: (s) => s.level >= 10 && Object.values(s.skills).some(v => v >= 3) },
  { id: 'quest-surftocat', name: 'Ride the Waves', icon: '🏄', desc: 'Sail for 20 minutes total', unlocks: 'surftocat', check: (s) => s.stats.timeSailing >= 1200 },
  { id: 'quest-scottocat', name: 'Braveheart', icon: '🏴', desc: 'Sink 20 enemy ships', unlocks: 'scottocat', check: (s) => s.stats.shipsSunk >= 20 },
  { id: 'quest-steroidtocat', name: 'Ultimate Power', icon: '💪', desc: 'Reach level 15 and conquer 5 islands', unlocks: 'steroidtocat', check: (s) => s.level >= 15 && s.conquered.size >= 5 },
  { id: 'quest-nyantocat', name: 'Rainbow Rush', icon: '🌈', desc: 'Conquer all 7 islands (become Pirate King!)', unlocks: 'nyantocat', check: (s) => s.conquered.size >= 7 },
];

// ---- State ----
const state = {
  conquered: new Set(),
  currentIsland: null,
  currentQuestion: 0,
  correctInQuiz: 0,
  score: 0,
  battles: 0,
  nearIsland: null,
  inQuiz: false,
  inBattle: false,
  keys: {},
  enemyShips: [],
  roamingShips: [],
  cannonballs: [],
  particles: [],
  wakeTrail: [],
  wakeSplashes: [],
  started: false,
  modelsLoaded: false,
  cannonCooldown: 0,
  cannonReady: true,
  badges: new Set(),
  questsCompleted: new Set(),
  badgePanelTab: 'badges',
  _progressCheckTimer: 0,
  // Captain & RPG
  captain: null,
  weaponLevel: 1,
  armor: 0,
  maxArmor: 5,
  drops: [],  // floating loot items in the scene
  stats: {
    shipsSunk: 0,
    broadsidesFired: 0,
    cannonHits: 0,
    questionsCorrect: 0,
    questionsAnswered: 0,
    totalGoldEarned: 0,
    dropsCollected: 0,
    deaths: 0,
    timeSailing: 0,
    islandsVisited: new Set(),
    cliCommandsUsed: new Set(),
    damageTakenSinceLastKill: 0,
    killsWithoutDamage: 0,
    perfectIslands: 0,
    fleetSummons: 0,
  },
  // Level & Skills
  level: 1,
  xp: 0,
  skillPoints: 0,
  skills: {
    chainShot:   0, // max 3 — extra cannonballs per broadside
    ironHull:    0, // max 3 — % damage reduction
    swiftSails:  0, // max 3 — speed bonus
    grapeShot:   0, // max 3 — splash damage
    plunder:     0, // max 3 — extra gold per kill
    seaDog:      0, // max 3 — faster cannon reload
  },
};

// XP needed per level: 200, 500, 1000, 1800, 3000, 5000, 8000 …
function xpForLevel(lvl) { return Math.floor(200 * Math.pow(lvl, 1.5)); }

const SKILL_DEFS = [
  { key:'chainShot', name:'Chain Shot',   icon:'⛓️',  desc:'+1 cannonball per broadside', max:3 },
  { key:'ironHull',  name:'Iron Hull',    icon:'🛡️',  desc:'+10% damage reduction',       max:3 },
  { key:'swiftSails',name:'Swift Sails',  icon:'💨',  desc:'+8% speed',                   max:3 },
  { key:'grapeShot', name:'Grape Shot',   icon:'💥',  desc:'Cannonballs explode on impact',max:3 },
  { key:'plunder',   name:'Plunder',      icon:'💰',  desc:'+25% gold from kills',         max:3 },
  { key:'seaDog',    name:'Sea Dog',      icon:'🔄',  desc:'-15% cannon cooldown',         max:3 },
];

const LEGENDARY_CAPTAIN_IDS = new Set(QUESTS.map(q => q.unlocks));
const BADGE_TIER_COLORS = {
  bronze: '#cd7f32',
  silver: '#c0c7d1',
  gold: '#ffd700',
};

function getCaptainById(captainId) {
  return CAPTAINS.find(cap => cap.id === captainId);
}

function getQuestByCaptainId(captainId) {
  return QUESTS.find(quest => quest.unlocks === captainId);
}

function addGold(amount) {
  state.score += amount;
  state.stats.totalGoldEarned += amount;
}

function trackDamageTaken(amount) {
  if (amount > 0) state.stats.damageTakenSinceLastKill += amount;
}

function recordShipSunk() {
  state.stats.shipsSunk++;
  if (state.stats.damageTakenSinceLastKill <= 0.001) state.stats.killsWithoutDamage++;
  else state.stats.killsWithoutDamage = 0;
  state.stats.damageTakenSinceLastKill = 0;
}

// ---- Save/Load Progress (localStorage) ----
const SAVE_KEY = 'copilot-cli-pirates-save';

function saveProgress() {
  try {
    const data = {
      badges: [...state.badges],
      questsCompleted: [...state.questsCompleted],
      stats: {
        ...state.stats,
        islandsVisited: [...state.stats.islandsVisited],
        cliCommandsUsed: [...state.stats.cliCommandsUsed],
      },
      level: state.level,
      xp: state.xp,
      skills: { ...state.skills },
      highScore: Math.max(state.score, state._highScore || 0),
      conquered: [...state.conquered],
      // Track best run stats
      bestStats: {
        maxLevel: Math.max(state.level, (state._bestStats?.maxLevel || 0)),
        totalShipsSunk: state.stats.shipsSunk,
        totalTimeSailing: state.stats.timeSailing,
        totalQuestionsCorrect: state.stats.questionsCorrect,
        totalIslandsConquered: state.conquered.size,
      },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { console.warn('Could not save progress:', e); }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    // Restore badges
    if (data.badges) data.badges.forEach(b => state.badges.add(b));

    // Restore quests & unlock captains
    if (data.questsCompleted) {
      data.questsCompleted.forEach(qId => {
        state.questsCompleted.add(qId);
        const quest = QUESTS.find(q => q.id === qId);
        if (quest) {
          const cap = getCaptainById(quest.unlocks);
          if (cap) cap.locked = false;
        }
      });
    }

    // Restore cumulative stats (these persist across runs)
    if (data.stats) {
      state.stats.shipsSunk = data.stats.shipsSunk || 0;
      state.stats.broadsidesFired = data.stats.broadsidesFired || 0;
      state.stats.cannonHits = data.stats.cannonHits || 0;
      state.stats.questionsCorrect = data.stats.questionsCorrect || 0;
      state.stats.questionsAnswered = data.stats.questionsAnswered || 0;
      state.stats.totalGoldEarned = data.stats.totalGoldEarned || 0;
      state.stats.dropsCollected = data.stats.dropsCollected || 0;
      state.stats.deaths = data.stats.deaths || 0;
      state.stats.timeSailing = data.stats.timeSailing || 0;
      state.stats.perfectIslands = data.stats.perfectIslands || 0;
      state.stats.fleetSummons = data.stats.fleetSummons || 0;
      if (data.stats.islandsVisited) data.stats.islandsVisited.forEach(v => state.stats.islandsVisited.add(v));
      if (data.stats.cliCommandsUsed) data.stats.cliCommandsUsed.forEach(v => state.stats.cliCommandsUsed.add(v));
    }

    // Restore best records
    state._highScore = data.highScore || 0;
    state._bestStats = data.bestStats || {};

    console.log(`🏴‍☠️ Progress loaded: ${state.badges.size} badges, ${state.questsCompleted.size} quests, level ${data.level || 1} best`);
  } catch (e) { console.warn('Could not load progress:', e); }
}

// Auto-save every 30 seconds and on key events
let _saveTimer = 0;
function autoSave(dt) {
  _saveTimer += dt;
  if (_saveTimer >= 30) {
    _saveTimer = 0;
    saveProgress();
  }
}

function formatSailingTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

function refreshBadgePanel() {
  const panel = document.getElementById('badge-panel');
  if (panel && panel.classList.contains('active')) renderBadgePanel();
}

function showToast(message, extraClass = '') {
  const host = document.getElementById('loot-notifications');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `loot-notification ${extraClass}`.trim();
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function showBadgeNotification(badge) {
  const host = document.getElementById('badge-notifications');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'badge-notification';
  el.style.setProperty('--tier-color', BADGE_TIER_COLORS[badge.tier] || '#ffd700');
  el.innerHTML = `
    <div class="badge-notification-icon">${badge.icon}</div>
    <div>
      <div class="badge-notification-title">${badge.name}</div>
      <div class="badge-notification-text">Badge earned · ${badge.desc}</div>
    </div>`;
  host.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function showQuestNotification(quest, captain) {
  const host = document.getElementById('badge-notifications');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'badge-notification quest-notification';
  el.style.setProperty('--tier-color', '#58a6ff');
  el.innerHTML = `
    <div class="badge-notification-icon">🎉</div>
    <div>
      <div class="badge-notification-title">QUEST COMPLETE: ${quest.name}</div>
      <div class="badge-notification-text">${captain ? `${captain.realName} is now unlocked!` : 'A legendary captain is now unlocked!'}</div>
    </div>`;
  host.appendChild(el);
  setTimeout(() => el.remove(), 5200);
}

function getQuestProgress(quest) {
  const maxSkill = Math.max(...Object.values(state.skills));
  switch (quest.id) {
    case 'quest-mona': {
      const value = Math.min(state.conquered.size, 3);
      return { pct: (value / 3) * 100, text: `${value}/3 islands conquered` };
    }
    case 'quest-ducky': {
      const value = Math.min(state.stats.questionsCorrect, 15);
      return { pct: (value / 15) * 100, text: `${value}/15 correct answers` };
    }
    case 'quest-copilot': {
      const value = Math.min(state.stats.cliCommandsUsed.size, 8);
      return { pct: (value / 8) * 100, text: `${value}/8 CLI commands used` };
    }
    case 'quest-monacorn': {
      const levelPct = Math.min(state.level, 10) / 10;
      const skillPct = Math.min(maxSkill, 3) / 3;
      return { pct: ((levelPct + skillPct) / 2) * 100, text: `Level ${Math.min(state.level, 10)}/10 · Max skill ${Math.min(maxSkill, 3)}/3` };
    }
    case 'quest-surftocat': {
      const value = Math.min(state.stats.timeSailing, 1200);
      return { pct: (value / 1200) * 100, text: `${formatSailingTime(value)} / 20m sailed` };
    }
    case 'quest-scottocat': {
      const value = Math.min(state.stats.shipsSunk, 20);
      return { pct: (value / 20) * 100, text: `${value}/20 enemy ships sunk` };
    }
    case 'quest-steroidtocat': {
      const levelPct = Math.min(state.level, 15) / 15;
      const islandPct = Math.min(state.conquered.size, 5) / 5;
      return { pct: ((levelPct + islandPct) / 2) * 100, text: `Level ${Math.min(state.level, 15)}/15 · Islands ${Math.min(state.conquered.size, 5)}/5` };
    }
    case 'quest-nyantocat': {
      const value = Math.min(state.conquered.size, 7);
      return { pct: (value / 7) * 100, text: `${value}/7 islands conquered` };
    }
    default:
      return { pct: 0, text: quest.desc };
  }
}

function checkBadges() {
  let earnedAny = false;
  BADGES.forEach(badge => {
    if (state.badges.has(badge.id) || !badge.check(state, state.stats)) return;
    state.badges.add(badge.id);
    showBadgeNotification(badge);
    playPowerupSound();
    earnedAny = true;
  });
  if (earnedAny) { updateHUD(); saveProgress(); }
  refreshBadgePanel();
}

function checkQuests() {
  let unlockedAny = false;
  QUESTS.forEach(quest => {
    if (state.questsCompleted.has(quest.id) || !quest.check(state)) return;
    state.questsCompleted.add(quest.id);
    const captain = getCaptainById(quest.unlocks);
    if (captain) captain.locked = false;
    showQuestNotification(quest, captain);
    playVictory();
    unlockedAny = true;
  });
  if (unlockedAny) { buildCaptainSelection(); saveProgress(); }
  refreshBadgePanel();
}

function renderBadgePanel() {
  const summary = document.getElementById('badge-panel-summary');
  const body = document.getElementById('badge-panel-body');
  const title = document.getElementById('badge-panel-title');
  if (!summary || !body || !title) return;

  title.textContent = state.badgePanelTab === 'quests' ? '🗺️ Quests' : '🏆 Badges';
  summary.textContent = `Badges ${state.badges.size}/${BADGES.length} · Quests ${state.questsCompleted.size}/${QUESTS.length}`;
  document.querySelectorAll('#badge-panel .badge-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === state.badgePanelTab);
  });

  if (state.badgePanelTab === 'quests') {
    body.innerHTML = QUESTS.map(quest => {
      const complete = state.questsCompleted.has(quest.id);
      const captain = getCaptainById(quest.unlocks);
      const progress = getQuestProgress(quest);
      return `
        <div class="quest-card ${complete ? 'complete' : ''}">
          <div class="quest-details">
            <div class="quest-title-row">
              <span class="quest-icon">${quest.icon}</span>
              <div>
                <h3>${quest.name}</h3>
                <p>${quest.desc}</p>
              </div>
              <span class="quest-status">${complete ? '✅' : '🔒'}</span>
            </div>
            <div class="quest-progress-text">${complete ? 'Complete!' : progress.text}</div>
            <div class="quest-progress"><div class="quest-progress-fill" style="width:${complete ? 100 : progress.pct}%"></div></div>
          </div>
          <div class="quest-captain ${complete ? 'unlocked' : 'locked'}">
            <img src="${captain?.img || ''}" alt="${captain?.realName || quest.unlocks}">
            <div class="quest-captain-name">${captain?.realName || quest.unlocks}</div>
          </div>
        </div>`;
    }).join('');
    return;
  }

  body.innerHTML = `<div class="badge-grid">${BADGES.map(badge => {
    const earned = state.badges.has(badge.id);
    return `
      <div class="badge-card ${earned ? 'earned' : 'locked'} ${badge.tier}">
        <div class="badge-card-top">
          <span class="badge-icon">${earned ? badge.icon : '🔒'}</span>
          <span class="badge-tier">${badge.tier}</span>
        </div>
        <h3>${badge.name}</h3>
        <p>${badge.desc}</p>
      </div>`;
  }).join('')}</div>`;
}

function openBadgePanel(tab = state.badgePanelTab) {
  state.badgePanelTab = tab || 'badges';
  const panel = document.getElementById('badge-panel');
  if (!panel) return;
  panel.classList.add('active');
  renderBadgePanel();
}

function closeBadgePanel() {
  const panel = document.getElementById('badge-panel');
  if (panel) panel.classList.remove('active');
}

// ---- Model Cache ----
const modelCache = {};
const loader = new GLTFLoader();

function loadModel(name) {
  return new Promise((resolve) => {
    if (modelCache[name]) { resolve(modelCache[name].clone()); return; }
    loader.load(
      `${MODEL_PATH}${name}`,
      (gltf) => { modelCache[name] = gltf.scene; resolve(gltf.scene.clone()); },
      undefined,
      () => { console.warn(`Could not load ${name}`); resolve(null); }
    );
  });
}

function cloneModel(name) {
  return modelCache[name] ? modelCache[name].clone() : null;
}

async function loadAllModels() {
  const needed = [
    'ship-pirate-large.glb', 'ship-pirate-medium.glb', 'ship-ghost.glb',
    'palm-detailed-bend.glb', 'palm-detailed-straight.glb',
    'flag-pirate-high.glb', 'flag-pirate.glb', 'flag-high.glb',
    'cannon.glb', 'cannon-ball.glb', 'cannon-mobile.glb',
    'barrel.glb', 'crate.glb', 'chest.glb',
    'rocks-a.glb', 'rocks-b.glb', 'rocks-c.glb',
    'rocks-sand-a.glb', 'rocks-sand-b.glb',
    'structure-platform-dock.glb',
    'tower-complete-large.glb', 'tower-complete-small.glb', 'tower-watch.glb',
    'castle-gate.glb', 'castle-wall.glb',
    'patch-sand.glb', 'patch-sand-foliage.glb',
    'ship-wreck.glb',
  ];
  const loadingText = document.getElementById('loading-text');
  let loaded = 0;
  await Promise.all(needed.map(n =>
    loadModel(n).then(() => {
      loaded++;
      if (loadingText) loadingText.textContent = `Loading pirate assets… ${Math.round((loaded / needed.length) * 100)}%`;
    })
  ));
  state.modelsLoaded = true;
  if (loadingText) loadingText.textContent = 'All hands on deck!';
}

// ---- Captain cheers on sinking enemy ships ----
const CAPTAIN_CHEERS = [
  "Take that, ye salty sea dog! 🏴‍☠️",
  "To Davy Jones with ye! ⚓",
  "That'll teach ye to cross me bow! 💀",
  "Another one feeds the fishes! 🐟",
  "Arr, ye landlubber! The sea claims ye! 🌊",
  "Swim home, ye bilge rat! 🐀",
  "Not so tough now, are ye? ☠️",
  "The ocean's a bit fuller now! Ha! 🦈",
  "Ye picked the wrong captain, matey! ⚔️",
  "Fire in the hole! And in yer hull! 💥",
  "Tell the kraken I said hello! 🐙",
  "That's what ye get for crossin' me! 🏴‍☠️",
];

function showCaptainCheer() {
  const cheer = CAPTAIN_CHEERS[Math.floor(Math.random() * CAPTAIN_CHEERS.length)];
  const el = document.createElement('div');
  el.textContent = cheer;
  el.style.cssText = `position:fixed;top:25%;left:50%;transform:translate(-50%,-50%);
    font-size:28px;font-weight:900;color:#ffd700;text-shadow:0 0 10px #ff8800,0 0 20px #ff4400,2px 2px 4px #000;
    font-family:'Pirata One','Inter',sans-serif;z-index:200;pointer-events:none;
    animation:cheerPop 2.5s ease-out forwards;white-space:nowrap;`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// Inject cheer animation CSS
const cheerStyle = document.createElement('style');
cheerStyle.textContent = `@keyframes cheerPop{0%{opacity:0;transform:translate(-50%,-50%) scale(0.5)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.2)}30%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1;transform:translate(-50%,-80%) scale(1)}100%{opacity:0;transform:translate(-50%,-120%) scale(0.8)}}`;
document.head.appendChild(cheerStyle);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x87ceeb, 0.0012);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.55;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ---- Lighting (bright daytime) ----
const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xfffaf0, 2.6);
sunLight.position.set(100, 120, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.far = 300;
sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -80;
sunLight.shadow.camera.right = sunLight.shadow.camera.top = 80;
scene.add(sunLight);
const fillLight = new THREE.DirectionalLight(0xaaccff, 0.85);
fillLight.position.set(-60, 40, -80);
scene.add(fillLight);
const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x886633, 1.0);
scene.add(hemiLight);

// ---- Time of Day Presets ----
let skyMaterial = null; // set in createSky
const TOD_PRESETS = {
  morning: {
    exposure: 1.3, fogColor: 0xffccaa, fogDensity: 0.0014,
    ambient: { color: 0xffeedd, intensity: 1.0 },
    sun: { color: 0xffaa66, intensity: 2.2, pos: [80, 40, 100] },
    fill: { color: 0x8899bb, intensity: 0.5 },
    hemi: { sky: 0xffcc88, ground: 0x664422, intensity: 0.9 },
    skyTop: 0xff8844, skyBottom: 0xffcc88,
    oceanDeep: 0x0a4466, oceanShallow: 0x2a7799,
  },
  day: {
    exposure: 1.55, fogColor: 0x87ceeb, fogDensity: 0.0012,
    ambient: { color: 0xffffff, intensity: 1.3 },
    sun: { color: 0xfffaf0, intensity: 2.6, pos: [100, 120, 50] },
    fill: { color: 0xaaccff, intensity: 0.85 },
    hemi: { sky: 0x88ccff, ground: 0x886633, intensity: 1.0 },
    skyTop: 0x4a90d9, skyBottom: 0x87ceeb,
    oceanDeep: 0x0077be, oceanShallow: 0x40a4df,
  },
  night: {
    exposure: 0.7, fogColor: 0x0a1628, fogDensity: 0.002,
    ambient: { color: 0x334466, intensity: 0.4 },
    sun: { color: 0x8899cc, intensity: 0.6, pos: [50, 60, 80] },
    fill: { color: 0x223355, intensity: 0.3 },
    hemi: { sky: 0x223355, ground: 0x111122, intensity: 0.3 },
    skyTop: 0x0a1628, skyBottom: 0x162a50,
    oceanDeep: 0x050e1a, oceanShallow: 0x0a2040,
  },
};

function applyTimeOfDay(tod) {
  const p = TOD_PRESETS[tod]; if (!p) return;
  renderer.toneMappingExposure = p.exposure;
  scene.fog.color.set(p.fogColor); scene.fog.density = p.fogDensity;
  ambientLight.color.set(p.ambient.color); ambientLight.intensity = p.ambient.intensity;
  sunLight.color.set(p.sun.color); sunLight.intensity = p.sun.intensity;
  sunLight.position.set(...p.sun.pos);
  fillLight.color.set(p.fill.color); fillLight.intensity = p.fill.intensity;
  hemiLight.color.set(p.hemi.sky); hemiLight.groundColor.set(p.hemi.ground);
  hemiLight.intensity = p.hemi.intensity;
  if (skyMaterial) {
    skyMaterial.uniforms.topColor.value.set(p.skyTop);
    skyMaterial.uniforms.bottomColor.value.set(p.skyBottom);
  }
  if (ocean && ocean.material.uniforms) {
    ocean.material.uniforms.uDeepColor.value.set(p.oceanDeep);
    ocean.material.uniforms.uShallowColor.value.set(p.oceanShallow);
  }
}

// ---- Sky & Stars ----
function createSky() {
  const geo = new THREE.SphereGeometry(400, 32, 32);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x4a90d9) },
      bottomColor: { value: new THREE.Color(0x87ceeb) },
    },
    vertexShader: `varying vec3 vWP; void main(){vec4 wp=modelMatrix*vec4(position,1.0);vWP=wp.xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform vec3 topColor;uniform vec3 bottomColor;varying vec3 vWP;void main(){float h=normalize(vWP+20.0).y;gl_FragColor=vec4(mix(bottomColor,topColor,max(pow(max(h,0.0),0.4),0.0)),1.0);}`,
    side: THREE.BackSide,
  });
  scene.add(new THREE.Mesh(geo, mat));
  skyMaterial = mat;
}

function createStars() {
  const pos = [];
  for (let i = 0; i < 2000; i++) {
    const t = Math.random() * Math.PI * 2, p = Math.acos(Math.random() * 0.8 + 0.2), r = 350;
    pos.push(r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.7 })));
}

// ---- Ocean with wake-aware shader ----
let ocean;
// We'll store ship wake positions to distort the ocean around the trail
const WAKE_POINT_COUNT = 120;
const wakePositions = new Float32Array(WAKE_POINT_COUNT * 2); // x,z pairs
let wakeIndex = 0;

function createOcean() {
  const geo = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, 200, 200);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x0077be) },
      uShallowColor: { value: new THREE.Color(0x40a4df) },
      uFoamColor: { value: new THREE.Color(0x85c1e9) },
      uWakePositions: { value: wakePositions },
      uWakeCount: { value: 0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uWakePositions[${WAKE_POINT_COUNT * 2}];
      uniform int uWakeCount;
      varying vec2 vUv;
      varying float vElevation;
      varying float vWakeIntensity;

      void main() {
        vUv = uv;
        vec3 pos = position;

        // Base ocean waves
        float wave1 = sin(pos.x * 0.05 + uTime * 0.8) * 1.5;
        float wave2 = sin(pos.y * 0.07 + uTime * 0.6) * 1.2;
        float wave3 = sin((pos.x + pos.y) * 0.03 + uTime * 1.1) * 0.8;
        pos.z = wave1 + wave2 + wave3;

        // Ship wake disturbance — ripples near trail points
        float wakeEffect = 0.0;
        for (int i = 0; i < ${WAKE_POINT_COUNT}; i++) {
          if (i >= uWakeCount) break;
          float wx = uWakePositions[i * 2];
          float wz = uWakePositions[i * 2 + 1];
          float d = distance(pos.xy, vec2(wx, wz));
          if (d < 12.0) {
            float age = float(i) / float(max(uWakeCount, 1));
            float strength = (1.0 - age) * smoothstep(12.0, 1.0, d) * 0.6;
            // Subtle concentric ripples
            wakeEffect += strength * sin(d * 3.5 - uTime * 3.0) * 0.5;
            wakeEffect += strength * sin(d * 6.0 - uTime * 5.0) * 0.15;
          }
        }
        pos.z += wakeEffect;
        vWakeIntensity = min(abs(wakeEffect) / 1.5, 1.0);
        vElevation = pos.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uFoamColor;
      varying vec2 vUv;
      varying float vElevation;
      varying float vWakeIntensity;

      void main() {
        float depth = smoothstep(-2.0, 2.0, vElevation);
        vec3 color = mix(uDeepColor, uShallowColor, depth);

        // Natural wave foam
        float foam = smoothstep(1.5, 2.5, vElevation);
        color = mix(color, uFoamColor, foam * 0.3);

        // Wake foam — subtle light trail
        vec3 wakeFoam = vec3(0.65, 0.8, 0.95);
        color = mix(color, wakeFoam, vWakeIntensity * 0.4);

        gl_FragColor = vec4(color, 0.92);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });
  ocean = new THREE.Mesh(geo, mat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -1;
  scene.add(ocean);
}

// ---- Islands (Kenney models) ----
const islandMeshes = [];
const islandGlows = [];

function createIsland(data, angle) {
  const group = new THREE.Group();
  const x = Math.cos(angle) * ISLAND_RADIUS;
  const z = Math.sin(angle) * ISLAND_RADIUS;
  group.position.set(x, 0, z);

  // Sandy base
  const base = new THREE.Mesh(
    new THREE.ConeGeometry(18, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0xc4a24e, roughness: 0.95, flatShading: true })
  );
  base.position.y = 1; base.receiveShadow = true;
  group.add(base);

  // Flat top
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(16, 17, 1.5, 12),
    new THREE.MeshStandardMaterial({ color: 0xe8d174, roughness: 1, flatShading: true })
  );
  top.position.y = 4; top.receiveShadow = true;
  group.add(top);

  // Vegetation cap
  const veg = new THREE.Mesh(
    new THREE.CylinderGeometry(10, 14, 1, 10),
    new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.9, flatShading: true })
  );
  veg.position.y = 5;
  group.add(veg);

  // ---- Kenney models on island ----
  const palmCount = 2 + (data.id % 2);
  for (let i = 0; i < palmCount; i++) {
    const palm = cloneModel(i % 2 === 0 ? 'palm-detailed-bend.glb' : 'palm-detailed-straight.glb');
    if (palm) {
      const pa = (i / palmCount) * Math.PI * 2 + data.id * 0.7;
      palm.position.set(Math.cos(pa) * (5 + Math.random() * 5), 4.5, Math.sin(pa) * (5 + Math.random() * 5));
      palm.rotation.y = Math.random() * Math.PI * 2;
      palm.scale.setScalar(3 + Math.random());
      group.add(palm);
    }
  }

  // Rocks
  ['rocks-a.glb', 'rocks-sand-a.glb'].forEach((rn, i) => {
    const rock = cloneModel(rn);
    if (rock) {
      const ra = (i + data.id) * 1.3;
      rock.position.set(Math.cos(ra) * 12, 3.5, Math.sin(ra) * 12);
      rock.rotation.y = Math.random() * Math.PI * 2;
      rock.scale.setScalar(2 + Math.random() * 2);
      group.add(rock);
    }
  });

  // Pirate flag
  const flag = cloneModel('flag-pirate-high.glb') || cloneModel('flag-pirate.glb');
  if (flag) { flag.position.set(0, 5, 0); flag.scale.setScalar(4); group.add(flag); }

  // Per-island unique structure
  const structures = {
    1: 'tower-complete-large.glb', 2: 'tower-watch.glb', 3: 'cannon.glb',
    4: 'tower-complete-small.glb', 5: 'cannon-mobile.glb', 6: 'tower-watch.glb',
    7: 'castle-gate.glb'
  };
  const struct = cloneModel(structures[data.id]);
  if (struct) {
    struct.position.set(data.id % 2 ? -4 : 4, 4.5, -4);
    struct.scale.setScalar(3);
    group.add(struct);
  }

  // Dock
  const dock = cloneModel('structure-platform-dock.glb');
  if (dock) { dock.position.set(0, 3.5, 16); dock.scale.setScalar(4); dock.rotation.y = Math.PI; group.add(dock); }

  // Props near dock
  const barrel = cloneModel('barrel.glb');
  if (barrel) { barrel.position.set(3, 5, 13); barrel.scale.setScalar(3); group.add(barrel); }
  const crate = cloneModel('crate.glb');
  if (crate) { crate.position.set(-3, 5, 12); crate.scale.setScalar(3); group.add(crate); }

  // Treasure chest (hidden until conquered)
  const chest = cloneModel('chest.glb');
  if (chest) { chest.position.set(0, 5.2, 3); chest.scale.setScalar(3); chest.visible = false; chest.name = 'treasure-chest'; group.add(chest); }

  // Glow ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(17, 19, 32),
    new THREE.MeshBasicMaterial({ color: data.color, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.5;
  group.add(ring);
  islandGlows.push(ring);

  // Light
  const light = new THREE.PointLight(new THREE.Color(data.color), 2, 40);
  light.position.set(0, 14, 0);
  group.add(light);

  group.userData = { islandData: data, angle };
  scene.add(group);
  islandMeshes.push(group);
}

// ---- Player Ship (Kenney GLB) ----
let ship;
const shipDirection = new THREE.Vector3(0, 0, 1);
let shipAngle = 0;

function createShip() {
  const model = cloneModel('ship-pirate-large.glb');
  ship = new THREE.Group();

  if (model) {
    model.scale.setScalar(2);
    model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    ship.add(model);
  } else {
    // Fallback procedural
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 8), new THREE.MeshStandardMaterial({ color: 0x6b3a2a, flatShading: true }));
    hull.position.y = 2; ship.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 10, 8), new THREE.MeshStandardMaterial({ color: 0x8B5E3C }));
    mast.position.set(0, 7, 0); ship.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(5, 6), new THREE.MeshStandardMaterial({ color: 0xf5f5dc, side: THREE.DoubleSide }));
    sail.position.set(0, 8, 0.3); ship.add(sail);
  }

  ship.add(new THREE.PointLight(0xffaa44, 3, 25).translateY(8).translateZ(2));

  // Player health bar
  const barBg = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
  );
  barBg.position.y = 28; barBg.name = 'healthBarBg';
  ship.add(barBg);

  const barFill = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  barFill.position.y = 28; barFill.position.z = 0.01; barFill.name = 'healthBarFill';
  ship.add(barFill);

  const capHP = state.captain ? state.captain.hp : 5;
  ship.userData = { health: capHP, maxHealth: capHP };
  scene.add(ship);
}

// ---- Enemy Ships ----
function createEnemyShip(targetIsland) {
  const enemy = new THREE.Group();
  const model = cloneModel('ship-ghost.glb') || cloneModel('ship-pirate-medium.glb');
  if (model) {
    model.scale.setScalar(3);
    model.traverse(c => {
      if (c.isMesh) { c.material = c.material.clone(); c.material.color.set(0x551111); c.material.emissive = new THREE.Color(0x330000); c.material.emissiveIntensity = 0.5; }
    });
    enemy.add(model);
  } else {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 6), new THREE.MeshStandardMaterial({ color: 0x2c1810, flatShading: true }));
    hull.position.y = 2; enemy.add(hull);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), new THREE.MeshStandardMaterial({ color: 0x8b0000, side: THREE.DoubleSide }));
    sail.position.set(0, 6, 0.3); enemy.add(sail);
  }
  enemy.add(new THREE.PointLight(0xff3300, 4, 30).translateY(5));

  const island = islandMeshes[targetIsland];
  const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 15;
  enemy.position.set(island.position.x + Math.cos(a) * d, 0, island.position.z + Math.sin(a) * d);
  enemy.userData = { orbitAngle: a, orbitSpeed: 0.005 + Math.random() * 0.005, targetIsland, health: 3 };
  scene.add(enemy);
  state.enemyShips.push(enemy);
  return enemy;
}

function clearEnemyShips() {
  state.enemyShips.forEach(e => scene.remove(e));
  state.enemyShips = [];
}

const ROAMING_SHIP_COUNT = 5;
const MAX_PARTICLES = 200;
const AGGRO_RADIUS = 60;        // detection radius
const AGGRO_SHOOT_COOLDOWN = 4; // seconds between enemy shots
const AGGRO_DEAGGRO_RADIUS = 75; // slightly larger to avoid flickering

// ---- Shared geometries for cannon effects ----
const _cannonBallGeo = new THREE.SphereGeometry(0.6, 8, 8);
const _cannonBallMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.8 });
const _shadowGeo = new THREE.CircleGeometry(1.2, 8);
const _shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
const _flashGeo = new THREE.SphereGeometry(0.2, 4, 4);
const _smokeGeo = new THREE.SphereGeometry(0.4, 4, 4);
const _explosionGeo = new THREE.SphereGeometry(0.25, 4, 4);

// Pre-create a few materials to reuse (avoids creating new ones each particle)
const _fireMats = [0xff6600, 0xff8800, 0xffaa00, 0xff4400].map(c =>
  new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 })
);
const _smokeMats = [0x666666, 0x888888, 0x999999, 0xaaaaaa].map(c =>
  new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5 })
);
const _explosionMats = [0xff4400, 0xff6600, 0xffaa00, 0xff2200, 0xffcc00].map(c =>
  new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 })
);

// ---- Cannonball (simple shared geometry) ----
function fireCannonball(from, to, isPlayerShot = false) {
  const ball = new THREE.Mesh(_cannonBallGeo, _cannonBallMat);
  ball.position.copy(from);
  const dir = new THREE.Vector3().subVectors(to, from).normalize();
  // Shadow on water surface
  const shadow = new THREE.Mesh(_shadowGeo, _shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(from.x, 0.3, from.z);
  scene.add(shadow);
  ball.userData = { velocity: dir.multiplyScalar(2.5), life: 80, isPlayerShot, shadow };
  scene.add(ball);
  state.cannonballs.push(ball);
}

// ---- Explosion (reduced count, shared geo) ----
function createExplosion(pos) {
  const count = Math.min(10, MAX_PARTICLES - state.particles.length);
  for (let i = 0; i < count; i++) {
    const mat = _explosionMats[i % _explosionMats.length].clone();
    const p = new THREE.Mesh(_explosionGeo, mat);
    p.position.copy(pos);
    p.userData = { velocity: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3 + 1, (Math.random() - 0.5) * 3), life: 25 + Math.random() * 15, type: 'explosion' };
    scene.add(p);
    state.particles.push(p);
  }
}

function createVictoryParticles(pos) {
  const count = Math.min(30, MAX_PARTICLES - state.particles.length);
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(
      _explosionGeo,
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.12 + Math.random() * 0.15, 1, 0.6), transparent: true })
    );
    p.position.copy(pos);
    p.userData = { velocity: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 6 + 3, (Math.random() - 0.5) * 4), life: 60 + Math.random() * 30, type: 'victory' };
    scene.add(p);
    state.particles.push(p);
  }
}

// ---- Cannon Fire & Smoke VFX (lightweight) ----
function createCannonFlash(pos) {
  if (state.particles.length >= MAX_PARTICLES) return;
  // 3 small fire sparks instead of 8
  for (let i = 0; i < 3; i++) {
    const mat = _fireMats[i % _fireMats.length].clone();
    const p = new THREE.Mesh(_flashGeo, mat);
    p.position.copy(pos);
    p.userData = {
      velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 1 + 0.5, (Math.random() - 0.5) * 1.5),
      life: 8 + Math.random() * 6,
      type: 'fire',
    };
    scene.add(p);
    state.particles.push(p);
  }
}

function createCannonSmoke(pos) {
  if (state.particles.length >= MAX_PARTICLES) return;
  // 4 smoke puffs instead of 12
  for (let i = 0; i < 4; i++) {
    const mat = _smokeMats[i % _smokeMats.length].clone();
    const p = new THREE.Mesh(_smokeGeo, mat);
    p.position.copy(pos).add(new THREE.Vector3(
      (Math.random() - 0.5) * 1,
      Math.random() * 0.3,
      (Math.random() - 0.5) * 1
    ));
    p.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        0.2 + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.4
      ),
      life: 30 + Math.random() * 20,
      maxLife: 50,
      type: 'smoke',
    };
    scene.add(p);
    state.particles.push(p);
  }
}

// ---- Broadside Cannon Fire ----
// ---- Persistent fire effect on damaged ships ----
const _fireGeo = new THREE.SphereGeometry(0.25, 4, 4);
const _fireSmallGeo = new THREE.SphereGeometry(0.15, 3, 3);

function updateShipFires(dt, elapsed) {
  state.roamingShips.forEach(rs => {
    if (rs.userData.sinking) return;
    const dmg = rs.userData.maxHealth - rs.userData.health;
    if (dmg <= 0) return;

    if (!rs.userData._fireTimer) rs.userData._fireTimer = 0;
    rs.userData._fireTimer += dt;
    // Slower spawn rate: ~5-10 fps worth of spawning, not 77
    const fireRate = 0.12 / Math.max(dmg, 1);
    if (rs.userData._fireTimer < fireRate) return;
    rs.userData._fireTimer = 0;
    if (state.particles.length >= MAX_PARTICLES) return;

    // Fire particles: 2-4 per tick (was 2+dmg*2 = up to 8)
    const fireCount = Math.min(1 + dmg, 4);
    for (let i = 0; i < fireCount; i++) {
      if (state.particles.length >= MAX_PARTICLES) break;
      const geo = Math.random() > 0.5 ? _fireGeo : _fireSmallGeo;
      const mat = _fireMats[Math.floor(Math.random() * _fireMats.length)];
      const fire = new THREE.Mesh(geo, mat);
      const s = 0.6 + Math.random() * 1.0;
      fire.scale.set(s, s, s);
      fire.position.set(
        rs.position.x + (Math.random() - 0.5) * 4,
        rs.position.y + 2 + Math.random() * 4,
        rs.position.z + (Math.random() - 0.5) * 4
      );
      fire.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          0.5 + Math.random() * 1.0,
          (Math.random() - 0.5) * 0.4
        ),
        life: 15 + Math.random() * 15,
        type: 'fire',
      };
      scene.add(fire);
      state.particles.push(fire);
    }

    // Smoke: 1-2 per tick (was 1+dmg = up to 4)
    const smokeCount = Math.min(1 + Math.floor(dmg / 2), 2);
    for (let i = 0; i < smokeCount; i++) {
      if (state.particles.length >= MAX_PARTICLES) break;
      const smoke = new THREE.Mesh(_smokeGeo, _smokeMats[Math.floor(Math.random() * _smokeMats.length)]);
      const s = 0.8 + Math.random() * 0.6;
      smoke.scale.set(s, s, s);
      smoke.position.set(
        rs.position.x + (Math.random() - 0.5) * 3,
        rs.position.y + 5 + Math.random() * 3,
        rs.position.z + (Math.random() - 0.5) * 3
      );
      smoke.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          0.3 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.2
        ),
        life: 20 + Math.random() * 15,
        maxLife: 35,
        type: 'smoke',
      };
      scene.add(smoke);
      state.particles.push(smoke);
    }

    // Flickering fire light on damaged ships
    if (dmg >= 1 && !rs.userData._fireLight) {
      const fl = new THREE.PointLight(0xff4400, 4, 20);
      fl.position.y = 5;
      rs.add(fl);
      rs.userData._fireLight = fl;
    }
    if (rs.userData._fireLight) {
      rs.userData._fireLight.intensity = 3 + Math.sin(elapsed * 10) * 2 + dmg;
    }
  });
}

function fireBroadside() {
  if (!ship || !state.cannonReady || state.inQuiz || state.inBattle) return;

  state.cannonReady = false;
  state.stats.broadsidesFired++;
  const capRate = state.captain ? state.captain.fireRate : 1;
  state.cannonCooldown = (CANNON_COOLDOWN / capRate) * (1 - state.skills.seaDog * 0.15);

  // Starboard (right) perpendicular: rotate forward 90° clockwise in XZ
  // Forward = (sin(a), 0, cos(a)) → Right = (-cos(a), 0, sin(a))
  const rightX = -Math.cos(shipAngle);
  const rightZ = Math.sin(shipAngle);
  const shipY = ship.position.y + 3;

  // Fire 3 + chain shot bonus cannons from starboard (right) side only
  const cannonCount = 3 + state.skills.chainShot;
  for (let i = 0; i < cannonCount; i++) {
    const offset = (i - (cannonCount - 1) / 2) * 2.5;
    const muzzleX = ship.position.x + shipDirection.x * offset + rightX * 3;
    const muzzleZ = ship.position.z + shipDirection.z * offset + rightZ * 3;
    const muzzle = new THREE.Vector3(muzzleX, shipY, muzzleZ);

    const targetX = muzzleX + rightX * 60;
    const targetZ = muzzleZ + rightZ * 60;
    const target = new THREE.Vector3(targetX, shipY - 1, targetZ);

    fireCannonball(muzzle, target, true);
    createCannonFlash(muzzle.clone());
    createCannonSmoke(muzzle.clone());
  }
  playCannonFire();
  checkQuests();
  checkBadges();
}

// ---- Roaming Pirate Ships (free-roam, player can shoot) ----
function createRoamingShip() {
  const roamer = new THREE.Group();
  const model = cloneModel('ship-ghost.glb') || cloneModel('ship-pirate-medium.glb');
  if (model) {
    model.scale.setScalar(2.5);
    model.traverse(c => {
      if (c.isMesh) {
        c.material = c.material.clone();
        c.material.color.set(0x443322);
        c.material.emissive = new THREE.Color(0x221100);
        c.material.emissiveIntensity = 0.3;
      }
    });
    roamer.add(model);
  } else {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 6), new THREE.MeshStandardMaterial({ color: 0x3c2415, flatShading: true }));
    hull.position.y = 2; roamer.add(hull);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), new THREE.MeshStandardMaterial({ color: 0x992222, side: THREE.DoubleSide }));
    sail.position.set(0, 6, 0.3); roamer.add(sail);
  }
  roamer.add(new THREE.PointLight(0xff6600, 2, 20).translateY(5));

  // Spawn at random position in ocean
  const angle = Math.random() * Math.PI * 2;
  const dist = 40 + Math.random() * (OCEAN_SIZE / 2 - 60);
  roamer.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);

  // Health bar above ship
  const barBg = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
  );
  barBg.position.y = 28;
  barBg.name = 'healthBarBg';
  roamer.add(barBg);

  const barFill = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xe74c3c, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  barFill.position.y = 28;
  barFill.position.z = 0.01;
  barFill.name = 'healthBarFill';
  roamer.add(barFill);

  roamer.userData = {
    health: 3,
    maxHealth: 3,
    speed: 0.15 + Math.random() * 0.2,
    heading: Math.random() * Math.PI * 2,
    turnTimer: 0,
    turnInterval: 3 + Math.random() * 5,
    sinking: false,
    sinkTimer: 0,
    aggro: false,
    shootCooldown: 0,
  };

  // Detection radius ring
  const ringGeo = new THREE.RingGeometry(AGGRO_RADIUS - 0.5, AGGRO_RADIUS, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff3333, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.3;
  ring.name = 'aggroRing';
  roamer.add(ring);

  scene.add(roamer);
  state.roamingShips.push(roamer);
  return roamer;
}

function spawnRoamingShips() {
  for (let i = 0; i < ROAMING_SHIP_COUNT; i++) {
    createRoamingShip();
  }
}

function respawnRoamingShip() {
  // Respawn a new roaming ship after one is sunk
  setTimeout(() => {
    if (state.roamingShips.length < ROAMING_SHIP_COUNT) {
      createRoamingShip();
    }
  }, 8000 + Math.random() * 5000);
}

// ---- Wake Trail System ----
// ---- Wake Trail System (fine-grained) ----
// Shared geometries to avoid GC churn
const _foamDotGeo = new THREE.CircleGeometry(0.25, 5);
const _foamSmallGeo = new THREE.CircleGeometry(0.15, 4);
const _splashGeo = new THREE.SphereGeometry(0.08, 3, 3);
const _wakeLineGeo = new THREE.PlaneGeometry(0.12, 2.5);

// Fine foam dots scattered behind ship — many small particles instead of big circles
function spawnWakeTrail() {
  if (!ship) return;
  const behind = shipDirection.clone().multiplyScalar(-3);
  const perpX = Math.cos(shipAngle + Math.PI / 2);
  const perpZ = Math.sin(shipAngle + Math.PI / 2);

  // Spawn a cluster of tiny dots per call
  for (let i = 0; i < 5; i++) {
    const size = Math.random() < 0.3 ? _foamDotGeo : _foamSmallGeo;
    const spread = (Math.random() - 0.5) * 3;       // lateral spread
    const trail = -1.5 + Math.random() * -3;         // how far behind
    const foam = new THREE.Mesh(size, new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.55, 0.15 + Math.random() * 0.15, 0.82 + Math.random() * 0.15),
      transparent: true,
      opacity: 0.25 + Math.random() * 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    }));
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(
      ship.position.x + behind.x + shipDirection.x * trail + perpX * spread,
      0.25 + Math.random() * 0.1,
      ship.position.z + behind.z + shipDirection.z * trail + perpZ * spread
    );
    foam.scale.setScalar(0.6 + Math.random() * 0.8);
    foam.userData = { life: 80 + Math.random() * 60, maxLife: 140, type: 'wake' };
    scene.add(foam);
    state.wakeTrail.push(foam);
  }
}

// Fine mist/spray at the bow — tiny droplets
function spawnBowSplash() {
  if (!ship) return;
  const perpX = Math.cos(shipAngle + Math.PI / 2);
  const perpZ = Math.sin(shipAngle + Math.PI / 2);

  for (let i = 0; i < 6; i++) {
    const side = (Math.random() - 0.5) * 2;
    const splash = new THREE.Mesh(_splashGeo, new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.55, 0.1, 0.9 + Math.random() * 0.1),
      transparent: true,
      opacity: 0.4 + Math.random() * 0.3,
    }));
    splash.position.set(
      ship.position.x + shipDirection.x * 3.5 + perpX * side * 1.5,
      0.5 + Math.random() * 0.3,
      ship.position.z + shipDirection.z * 3.5 + perpZ * side * 1.5
    );
    splash.userData = {
      velocity: new THREE.Vector3(
        perpX * side * 0.15 + (Math.random() - 0.5) * 0.1,
        0.2 + Math.random() * 0.4,
        perpZ * side * 0.15 + (Math.random() - 0.5) * 0.1
      ),
      life: 18 + Math.random() * 12,
      type: 'splash',
    };
    scene.add(splash);
    state.wakeSplashes.push(splash);
  }
}

// Thin V-wake lines — narrower and more numerous
const wakeLines = [];
function spawnWakeVLine() {
  if (!ship) return;
  for (let side = -1; side <= 1; side += 2) {
    const line = new THREE.Mesh(_wakeLineGeo, new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.55, 0.12, 0.78 + Math.random() * 0.1),
      transparent: true,
      opacity: 0.2 + Math.random() * 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    }));
    const spreadAngle = shipAngle + Math.PI + side * (0.25 + Math.random() * 0.15);
    line.position.set(
      ship.position.x - shipDirection.x * 2.5 + Math.cos(shipAngle + Math.PI / 2) * 1.2 * side,
      0.22,
      ship.position.z - shipDirection.z * 2.5 + Math.sin(shipAngle + Math.PI / 2) * 1.2 * side
    );
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = -spreadAngle;
    line.userData = { life: 60 + Math.random() * 30, maxLife: 90, type: 'wakeLine' };
    scene.add(line);
    wakeLines.push(line);
  }
}

// ---- Minimap ----
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');

function drawMinimap() {
  const ctx = minimapCtx;
  const w = 180, h = 180, scale = w / (OCEAN_SIZE * 0.8), cx = w / 2, cy = h / 2;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(10,42,74,0.8)';
  ctx.fillRect(0, 0, w, h);

  islandMeshes.forEach(island => {
    const d = island.userData.islandData;
    const ix = cx + island.position.x * scale, iy = cy + island.position.z * scale;
    ctx.beginPath(); ctx.arc(ix, iy, 6, 0, Math.PI * 2);
    ctx.fillStyle = state.conquered.has(d.id) ? '#2ecc71' : `#${d.color.toString(16).padStart(6, '0')}`;
    ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '8px Inter'; ctx.textAlign = 'center'; ctx.fillText(d.id, ix, iy + 3);
  });

  // Wake trail on minimap
  ctx.strokeStyle = 'rgba(180,220,255,0.3)';
  ctx.lineWidth = 1;
  if (state.wakeTrail.length > 1) {
    ctx.beginPath();
    state.wakeTrail.forEach((w, i) => {
      const wx = cx + w.position.x * scale, wy = cy + w.position.z * scale;
      i === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
    });
    ctx.stroke();
  }

  state.enemyShips.forEach(e => {
    const ex = cx + e.position.x * scale, ey = cy + e.position.z * scale;
    ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fillStyle = '#e74c3c'; ctx.fill();
  });

  // Roaming ships on minimap
  state.roamingShips.forEach(rs => {
    if (rs.userData.sinking) return;
    const rx = cx + rs.position.x * scale, ry = cy + rs.position.z * scale;
    ctx.beginPath(); ctx.arc(rx, ry, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#cc6633'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,100,0,0.4)'; ctx.lineWidth = 0.5; ctx.stroke();
  });

  if (ship) {
    const px = cx + ship.position.x * scale, py = cy + ship.position.z * scale;
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#f39c12'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  }
}

// ---- Quiz System ----
const els = {
  quizOverlay: document.getElementById('quiz-overlay'),
  quizDot: document.getElementById('quiz-dot'),
  quizIslandName: document.getElementById('quiz-island-name'),
  quizLesson: document.getElementById('quiz-lesson'),
  questionCounter: document.getElementById('question-counter'),
  questionText: document.getElementById('question-text'),
  optionsContainer: document.getElementById('options-container'),
  resultFeedback: document.getElementById('result-feedback'),
  resultTitle: document.getElementById('result-title'),
  resultExplanation: document.getElementById('result-explanation'),
  nextBtn: document.getElementById('next-btn'),
  battleOverlay: document.getElementById('battle-overlay'),
  battleText: document.getElementById('battle-text'),
  islandLabel: document.getElementById('island-label'),
  islandsConquered: document.getElementById('islands-conquered'),
  battlesFought: document.getElementById('battles-fought'),
  scoreEl: document.getElementById('score'),
  badgeCount: document.getElementById('badge-count'),
  progressFill: document.getElementById('progress-fill'),
  victoryOverlay: document.getElementById('victory-overlay'),
  finalScore: document.getElementById('final-score'),
};

function openQuiz(islandData) {
  state.inQuiz = true;
  state.currentIsland = islandData;
  state.currentQuestion = 0;
  state.correctInQuiz = 0;
  const color = `#${islandData.color.toString(16).padStart(6, '0')}`;
  els.quizDot.style.background = color;
  els.quizDot.style.color = color;
  els.quizIslandName.textContent = islandData.name;
  els.quizLesson.textContent = islandData.lesson;
  showQuestion();
  els.quizOverlay.style.display = '';  // clear any inline override
  els.quizOverlay.classList.add('active');
}

function showQuestion() {
  const q = state.currentIsland.questions[state.currentQuestion];
  els.questionCounter.textContent = `Question ${state.currentQuestion + 1} of ${state.currentIsland.questions.length}`;
  els.questionText.textContent = q.question;
  els.resultFeedback.classList.remove('show', 'correct-feedback', 'wrong-feedback');
  els.nextBtn.style.display = 'none';
  els.optionsContainer.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(i, q, btn));
    els.optionsContainer.appendChild(btn);
  });
}

function handleAnswer(index, q, btn) {
  const buttons = els.optionsContainer.querySelectorAll('.option-btn');
  buttons.forEach(b => b.classList.add('disabled'));
  state.stats.questionsAnswered++;
  if (index === q.correct) {
    btn.classList.add('correct'); buttons[q.correct].classList.add('correct');
    els.resultFeedback.className = 'result-feedback show correct-feedback';
    els.resultTitle.textContent = '✅ Correct! Well done, Captain!';
    state.correctInQuiz++;
    state.stats.questionsCorrect++;
    addGold(100);
    gainXP(75);
    state._lastAnswerWrong = false;
    els.resultExplanation.textContent = q.explanation;
    els.nextBtn.style.display = 'block';
  } else {
    btn.classList.add('wrong'); buttons[q.correct].classList.add('correct');
    els.resultFeedback.className = 'result-feedback show wrong-feedback';
    els.resultTitle.textContent = '❌ Wrong! Enemy ships approaching!';
    state.battles++;
    state._lastAnswerWrong = true;
    els.resultExplanation.textContent = q.explanation;
    // Auto-close quiz after 1.5s on wrong answer — no Continue needed
    setTimeout(() => {
      advanceAfterAnswer();
    }, 1500);
  }
  checkQuests();
  checkBadges();
  updateHUD();
}

function advanceAfterAnswer() {
  const island = state.currentIsland;
  if (!island) return;
  const wasWrong = state._lastAnswerWrong;
  state.currentQuestion++;

  checkQuests();
  checkBadges();

  // All questions answered
  if (state.currentQuestion >= island.questions.length) {
    els.quizOverlay.classList.remove('active'); state.inQuiz = false;
    state.correctInQuiz >= 2 ? conquerIsland(island) : triggerBattle(island);
    return;
  }

  // Wrong answer: close quiz, battle, then resume
  if (wasWrong) {
    els.quizOverlay.classList.remove('active');
    state.inQuiz = false;
    state.inBattle = true;
    // Spawn enemy near player
    const enemy = createEnemyShip(island.id - 1);
    enemy.position.set(
      ship.position.x + (Math.random() - 0.5) * 40,
      0,
      ship.position.z + (Math.random() - 0.5) * 40
    );
    els.battleOverlay.classList.add('active'); els.battleText.classList.add('active');
    setTimeout(() => {
      els.battleOverlay.classList.remove('active'); els.battleText.classList.remove('active');
      playCannonFire();
      const sp = ship.position.clone().add(new THREE.Vector3(0, 5, 0));
      fireCannonball(enemy.position.clone().add(new THREE.Vector3(0, 5, 0)), sp);
      setTimeout(() => {
        playCannonFire();
        fireCannonball(sp, enemy.position.clone().add(new THREE.Vector3(0, 5, 0)));
        setTimeout(() => {
          createExplosion(enemy.position.clone().add(new THREE.Vector3(0, 3, 0)));
          playExplosion();
          clearEnemyShips();
          state.inBattle = false;
          // Reopen quiz for next question
          state.inQuiz = true;
          els.quizOverlay.classList.add('active');
          showQuestion();
        }, 600);
      }, 500);
    }, 1500);
  } else {
    showQuestion();
  }
}

// Continue button only needed for correct answers now
function nextQuestion() {
  els.nextBtn.style.display = 'none';
  advanceAfterAnswer();
}

function closeQuiz() {
  els.quizOverlay.classList.remove('active');
  els.quizOverlay.style.display = 'none';
  state.inQuiz = false;
  state.currentIsland = null;
}

function conquerIsland(island) {
  // Force close quiz screen
  els.quizOverlay.classList.remove('active');
  els.quizOverlay.style.display = 'none';
  state.inQuiz = false;
  state.currentIsland = null;

  state.conquered.add(island.id);
  if (state.correctInQuiz >= 3) state.stats.perfectIslands++;
  addGold(500);
  gainXP(250);
  const mesh = islandMeshes[island.id - 1];

  // Victory particles
  createVictoryParticles(new THREE.Vector3(mesh.position.x, 15, mesh.position.z));
  createVictoryParticles(new THREE.Vector3(mesh.position.x + 8, 10, mesh.position.z));
  createVictoryParticles(new THREE.Vector3(mesh.position.x - 8, 10, mesh.position.z));
  playVictory();

  // Show treasure chest
  mesh.traverse(c => { if (c.name === 'treasure-chest') c.visible = true; });

  // Change glow ring to green and make it brighter
  const ring = islandGlows[island.id - 1];
  if (ring) {
    ring.material.color.set(0x2ecc71);
    ring.material.opacity = 0.6;
  }

  // Brighten island light to green
  mesh.children.forEach(c => {
    if (c.isPointLight) { c.color.set(0x2ecc71); c.intensity = 6; c.distance = 60; }
  });

  // Add a green beacon light above the island
  const beacon = new THREE.PointLight(0x2ecc71, 4, 80);
  beacon.position.set(0, 25, 0);
  beacon.name = 'conquest-beacon';
  mesh.add(beacon);

  // Show conquest banner
  const banner = document.getElementById('conquest-banner');
  document.getElementById('conquest-name').textContent = `🏝️ ${island.name} is now yours, Captain!`;
  banner.classList.add('active');
  setTimeout(() => banner.classList.remove('active'), 3500);

  checkQuests();
  checkBadges();
  if (state.conquered.size >= 7) setTimeout(showVictory, 4000);
}

function triggerBattle(island) {
  // Always close quiz screen first
  els.quizOverlay.classList.remove('active');
  state.inQuiz = false;
  state.currentIsland = null;

  for (let i = 0; i < 2; i++) createEnemyShip(island.id - 1);
  state.inBattle = true;
  els.battleOverlay.classList.add('active'); els.battleText.classList.add('active');
  setTimeout(() => {
    els.battleOverlay.classList.remove('active'); els.battleText.classList.remove('active');
    setTimeout(() => {
      const sp = ship.position.clone();
      state.enemyShips.forEach(e => fireCannonball(e.position.clone().add(new THREE.Vector3(0, 5, 0)), sp.clone().add(new THREE.Vector3(0, 5, 0))));
      setTimeout(() => {
        state.enemyShips.forEach(e => fireCannonball(sp.clone().add(new THREE.Vector3(0, 5, 0)), e.position.clone().add(new THREE.Vector3(0, 5, 0))));
        setTimeout(() => {
          state.enemyShips.forEach(e => createExplosion(e.position.clone().add(new THREE.Vector3(0, 3, 0))));
          clearEnemyShips(); state.inBattle = false;
        }, 800);
      }, 1000);
    }, 500);
  }, 1600);
}

function triggerQuickBattle(island, callback) {
  const enemy = createEnemyShip(island.id - 1);
  els.battleOverlay.classList.add('active'); els.battleText.classList.add('active');
  setTimeout(() => {
    els.battleOverlay.classList.remove('active'); els.battleText.classList.remove('active');
    const sp = ship.position.clone().add(new THREE.Vector3(0, 5, 0));
    fireCannonball(enemy.position.clone().add(new THREE.Vector3(0, 5, 0)), sp);
    setTimeout(() => {
      fireCannonball(sp, enemy.position.clone().add(new THREE.Vector3(0, 5, 0)));
      setTimeout(() => { createExplosion(enemy.position.clone().add(new THREE.Vector3(0, 3, 0))); clearEnemyShips(); callback(); }, 600);
    }, 500);
  }, 1500);
}

function showVictory() {
  els.finalScore.textContent = `Final Score: ${state.score} | Battles: ${state.battles}`;
  els.victoryOverlay.classList.add('active');
}

function updateHUD() {
  els.islandsConquered.textContent = state.conquered.size;
  els.battlesFought.textContent = state.battles;
  els.scoreEl.textContent = state.score;
  if (els.badgeCount) els.badgeCount.textContent = `${state.badges.size}/${BADGES.length}`;
  els.progressFill.style.width = `${(state.conquered.size / 7) * 100}%`;
  // Level HUD
  const lvlEl = document.getElementById('hud-level');
  if (lvlEl) lvlEl.textContent = state.level;
  const xpNeeded = xpForLevel(state.level);
  const xpBar = document.getElementById('xp-fill');
  if (xpBar) xpBar.style.width = `${Math.min(100, (state.xp / xpNeeded) * 100)}%`;
  const xpText = document.getElementById('xp-text');
  if (xpText) xpText.textContent = `${state.xp} / ${xpNeeded} XP`;
  const spEl = document.getElementById('hud-skill-points');
  if (spEl) {
    spEl.textContent = state.skillPoints;
    spEl.parentElement.style.display = state.skillPoints > 0 ? '' : 'none';
  }
}

// ---- XP & Level Up ----
function gainXP(amount) {
  const cap = state.captain || { hp:5, speed:1, damage:1, fireRate:1 };
  state.xp += amount;
  let leveledUp = false;
  while (state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level++;
    // Give skill points: level × 2
    const pts = state.level * 2;
    state.skillPoints += pts;
    leveledUp = true;

    // Captain-dependent stat growth
    if (ship) {
      ship.userData.maxHealth += Math.round(cap.hp * 0.15 * 10) / 10;
      ship.userData.health = ship.userData.maxHealth;
      const fill = ship.getObjectByName('healthBarFill');
      if (fill) { fill.scale.x = 1; fill.position.x = 0; }
    }
  }
  if (leveledUp) {
    showLevelUpBanner();
    playPowerupSound();
  }
  updateHUD();
  checkQuests();
  checkBadges();
}

function showLevelUpBanner() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);' +
    'font-family:"Pirata One",cursive;font-size:56px;color:#ffd700;z-index:500;' +
    'text-shadow:0 0 30px #ff8800,0 0 60px #ff4400;pointer-events:none;' +
    'animation:cheerPop 3s ease-out forwards;white-space:nowrap;';
  el.textContent = `⚓ Level ${state.level}! +${state.level * 2} Skill Points!`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ---- Skills Panel ----
function openSkillPanel() {
  let panel = document.getElementById('skill-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'skill-panel';
    document.body.appendChild(panel);
  }
  panel.classList.add('active');
  renderSkillPanel();
}

function closeSkillPanel() {
  const panel = document.getElementById('skill-panel');
  if (panel) panel.classList.remove('active');
}

function renderSkillPanel() {
  const panel = document.getElementById('skill-panel');
  if (!panel) return;
  let html = `<h2 style="font-family:'Pirata One',cursive;color:#ffd700;margin:0 0 10px;">⚓ Skills</h2>`;
  html += `<p style="color:#ccc;margin-bottom:15px;">Skill Points: <span style="color:#ffd700;font-size:22px;">${state.skillPoints}</span></p>`;
  SKILL_DEFS.forEach(sd => {
    const cur = state.skills[sd.key];
    const maxed = cur >= sd.max;
    const canBuy = state.skillPoints > 0 && !maxed;
    html += `<div style="display:flex;align-items:center;gap:10px;margin:8px 0;padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;">`;
    html += `<span style="font-size:24px;">${sd.icon}</span>`;
    html += `<div style="flex:1;">`;
    html += `<div style="color:#fff;font-family:'Pirata One',cursive;font-size:16px;">${sd.name}</div>`;
    html += `<div style="color:#aaa;font-size:12px;">${sd.desc}</div>`;
    html += `<div style="color:#888;font-size:11px;margin-top:2px;">`;
    for (let i = 0; i < sd.max; i++) html += i < cur ? '⬛' : '⬜';
    html += ` ${cur}/${sd.max}</div></div>`;
    html += `<button class="skill-buy-btn" data-skill="${sd.key}" ${canBuy ? '' : 'disabled'} `
      + `style="padding:6px 14px;border:none;border-radius:4px;cursor:${canBuy?'pointer':'default'};`
      + `background:${canBuy?'linear-gradient(135deg,#f39c12,#e67e22)':'#555'};`
      + `color:#fff;font-family:'Pirata One',cursive;font-size:14px;">`
      + `${maxed ? 'MAX' : '+1'}</button>`;
    html += `</div>`;
  });
  html += `<button id="skill-panel-close" style="margin-top:12px;width:100%;padding:10px;border:none;border-radius:6px;`
    + `background:rgba(255,255,255,.1);color:#fff;font-family:'Pirata One',cursive;font-size:16px;cursor:pointer;">Close</button>`;
  panel.innerHTML = html;
  // Wire buttons
  panel.querySelectorAll('.skill-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.skill;
      if (state.skillPoints > 0 && state.skills[key] < SKILL_DEFS.find(s=>s.key===key).max) {
        state.skills[key]++;
        state.skillPoints--;
        applySkillEffects();
        renderSkillPanel();
        updateHUD();
        checkQuests();
        checkBadges();
      }
    });
  });
  panel.querySelector('#skill-panel-close').addEventListener('click', closeSkillPanel);
}

function applySkillEffects() {
  const cap = state.captain || { speed:1, fireRate:1 };
  // Swift Sails: +8% per point
  SHIP_SPEED = 0.8 * cap.speed * (1 + state.skills.swiftSails * 0.08);
}

// ---- Player Death & Respawn ----
function respawnPlayer() {
  state.stats.deaths++;
  state.stats.damageTakenSinceLastKill = 0;
  state.stats.killsWithoutDamage = 0;
  // Find a safe spawn point away from all islands
  let sx, sz;
  do {
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 100;
    sx = Math.cos(angle) * dist;
    sz = Math.sin(angle) * dist;
  } while (islandMeshes.some(isl => {
    const dx = sx - isl.position.x, dz = sz - isl.position.z;
    return Math.sqrt(dx * dx + dz * dz) < 30;
  }));

  ship.position.set(sx, 0, sz);
  shipAngle = Math.random() * Math.PI * 2;
  ship.rotation.y = shipAngle;

  // Restore health, lose gold
  const cap = state.captain || { hp: 5 };
  ship.userData.health = cap.hp;
  ship.userData.maxHealth = cap.hp;
  state.score = 0;
  updateHUD();

  // Reset health bar
  const fill = ship.getObjectByName('healthBarFill');
  if (fill) {
    fill.scale.x = 1;
    fill.position.x = 0;
    fill.material.color.set(0xe74c3c);
  }

  // Show death message
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
    'font-family:"Pirata One",cursive;font-size:48px;color:#ff4444;z-index:500;' +
    'text-shadow:0 0 20px #000,0 0 40px #330000;pointer-events:none;' +
    'animation:cheerPop 3s ease-out forwards;white-space:nowrap;';
  el.textContent = '☠️ Ye walked the plank! Gold lost!';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);

  // Clear aggro from nearby ships
  state.roamingShips.forEach(rs => { rs.userData.aggro = false; });
  checkQuests();
  checkBadges();
}

// ---- Input ----
document.addEventListener('keydown', e => {
  state.keys[e.key.toLowerCase()] = true;
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    fireBroadside();
  }
  if (e.key === 'Escape') {
    // Close any open panel first, then toggle main menu
    const cliTerm = document.getElementById('cli-terminal');
    const statsPanel = document.getElementById('captain-stats-panel');
    const creditsOv = document.getElementById('credits-overlay');
    const settingsOv = document.getElementById('settings-overlay');
    const menuOv = document.getElementById('main-menu-overlay');
    const skillPanel = document.getElementById('skill-panel');
    const badgePanel = document.getElementById('badge-panel');
    if (cliTerm.classList.contains('active')) {
      toggleTerminal();
    } else if (skillPanel && skillPanel.classList.contains('active')) {
      closeSkillPanel();
    } else if (badgePanel && badgePanel.classList.contains('active')) {
      closeBadgePanel();
    } else if (statsPanel.classList.contains('active')) {
      statsPanel.classList.remove('active');
    } else if (settingsOv.classList.contains('active')) {
      settingsOv.classList.remove('active');
    } else if (creditsOv.classList.contains('active')) {
      creditsOv.classList.remove('active');
    } else if (state.inQuiz) {
      closeQuiz();
    } else if (menuOv.classList.contains('active')) {
      menuOv.classList.remove('active');
    } else if (state.started) {
      menuOv.classList.add('active');
    }
  }
  if (e.key.toLowerCase() === 'e' && state.nearIsland && !state.inQuiz && !state.inBattle) {
    const d = state.nearIsland.userData.islandData;
    if (!state.conquered.has(d.id)) openQuiz(d);
  }
  if (e.key.toLowerCase() === 't' && state.started && document.activeElement.id !== 'cli-input') {
    toggleTerminal();
  }
});
document.addEventListener('keyup', e => { state.keys[e.key.toLowerCase()] = false; });

// Safe event binding helper — prevents null crashes if an element is missing
function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
  else console.warn(`Element #${id} not found for ${event} handler`);
}

els.nextBtn.addEventListener('click', nextQuestion);
on('start-btn', 'click', () => {
  document.getElementById('intro-overlay').classList.add('hidden');
  document.getElementById('story-modal').classList.add('active');
});
on('story-ok-btn', 'click', () => {
  document.getElementById('story-modal').classList.remove('active');
  state.started = true;
  ensureMusic();
});
on('replay-btn', 'click', () => location.reload());

// ---- Captain Selection ----
function buildCaptainSelection() {
  const grid = document.getElementById('captain-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const renderSection = (title, subtitle, captains, extraClass = '') => {
    if (!captains.length) return;
    const section = document.createElement('section');
    section.className = `captain-section ${extraClass}`.trim();
    section.innerHTML = `
      <h2 class="captain-section-title">${title}</h2>
      <p class="captain-section-subtitle">${subtitle}</p>
      <div class="captain-grid-section"></div>`;
    const sectionGrid = section.querySelector('.captain-grid-section');

    captains.forEach(cap => {
      const quest = getQuestByCaptainId(cap.id);
      const card = document.createElement('div');
      card.className = `captain-card ${cap.locked ? 'locked' : ''} ${state.captain && state.captain.id === cap.id ? 'current' : ''}`.trim();
      card.innerHTML = `
        <img src="${cap.img}" alt="${cap.realName}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 80%22><rect fill=%22%23333%22 width=%2280%22 height=%2280%22/><text x=%2240%22 y=%2248%22 text-anchor=%22middle%22 fill=%22%23f39c12%22 font-size=%2236%22>🏴‍☠️</text></svg>'">
        ${cap.locked ? '<div class="captain-lock-overlay">🔒</div>' : ''}
        <div class="pirate-name">${cap.name}</div>
        <div class="real-name">${cap.realName}</div>
        <div class="captain-specialty">${cap.specialty}</div>
        ${quest ? `<div class="captain-quest">${cap.locked ? `🔒 ${quest.desc}` : `✅ ${quest.name}`}</div>` : ''}
        <div class="captain-stats-preview">
          <span>❤️${cap.hp}</span>
          <span>💨${cap.speed.toFixed(1)}</span>
          <span>💥${cap.damage.toFixed(1)}</span>
        </div>`;
      card.addEventListener('click', () => {
        if (cap.locked && quest) {
          showToast(`Complete the quest '${quest.name}' to unlock this captain!`, 'quest-toast');
          return;
        }
        selectCaptain(cap);
      });
      sectionGrid.appendChild(card);
    });

    grid.appendChild(section);
  };

  const regularCaptains = CAPTAINS.filter(cap => !LEGENDARY_CAPTAIN_IDS.has(cap.id));
  const legendaryCaptains = CAPTAINS.filter(cap => LEGENDARY_CAPTAIN_IDS.has(cap.id));
  renderSection('⚓ Crew Roster', 'Choose from the captains already sailing the seas.', regularCaptains);
  renderSection('🔒 Legendary Captains', 'Complete quests to unlock GitHub\'s legendary mascots.', legendaryCaptains, 'legendary-section');
}

function selectCaptain(cap) {
  if (cap.locked) {
    const quest = getQuestByCaptainId(cap.id);
    showToast(quest ? `Complete the quest '${quest.name}' to unlock this captain!` : 'This captain is locked.', 'quest-toast');
    return;
  }
  if (state.started && state.captain && state.captain.id !== cap.id) {
    showToast('Ye cannot switch captains mid-voyage!', 'quest-toast');
    return;
  }
  state.captain = cap;
  SHIP_SPEED = 0.8 * cap.speed;
  ensureMusic();
  // Set up captain avatar in HUD
  document.getElementById('captain-avatar-img').src = cap.img;
  document.getElementById('captain-avatar-name').textContent = cap.name.split(' ').slice(0, 2).join(' ');
  document.getElementById('captain-avatar').style.display = 'flex';
  buildCaptainSelection();
  // Hide captain select, show intro
  document.getElementById('captain-select-overlay').classList.add('hidden');
  document.getElementById('intro-overlay').style.display = 'flex';
}

// Captain stats panel
document.getElementById('captain-avatar').addEventListener('click', () => {
  const cap = state.captain; if (!cap) return;
  document.getElementById('stats-captain-img').src = cap.img;
  document.getElementById('stats-captain-name').textContent = cap.name;
  document.getElementById('stats-captain-title').textContent = cap.realName + ' — ' + cap.specialty;
  document.getElementById('stats-health').textContent = ship
    ? `${ship.userData.health.toFixed(1)} / ${ship.userData.maxHealth}` : `${cap.hp} / ${cap.hp}`;
  document.getElementById('stats-armor').textContent = `${state.armor} / ${state.maxArmor}`;
  document.getElementById('stats-weapon').textContent = `Level ${state.weaponLevel}`;
  document.getElementById('stats-damage').textContent = (cap.damage * state.weaponLevel).toFixed(1);
  document.getElementById('stats-firerate').textContent =
    (CANNON_COOLDOWN / cap.fireRate).toFixed(1) + 's';
  document.getElementById('stats-speed').textContent = (0.8 * cap.speed).toFixed(2);
  document.getElementById('stats-islands').textContent = `${state.conquered.size} / 7`;
  document.getElementById('stats-score').textContent = state.score;
  document.getElementById('captain-stats-panel').classList.add('active');
});
document.getElementById('captain-stats-close').addEventListener('click', () => {
  document.getElementById('captain-stats-panel').classList.remove('active');
});
document.getElementById('open-badges-btn').addEventListener('click', e => {
  e.stopPropagation();
  const panel = document.getElementById('badge-panel');
  if (panel.classList.contains('active')) closeBadgePanel();
  else openBadgePanel('badges');
});
document.getElementById('badge-panel-close').addEventListener('click', closeBadgePanel);
document.querySelectorAll('#badge-panel .badge-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => openBadgePanel(btn.dataset.tab));
});

// ---- Social Share Buttons ----
function getShareText() {
  const cap = state.captain ? state.captain.name : 'a pirate captain';
  return `⚓ I'm playing Copilot CLI Pirates! Sailing as ${cap} with ${state.conquered.size}/7 islands conquered, Level ${state.level}. Learn Copilot CLI commands while battling on the high seas! 🏴‍☠️`;
}
function getShareUrl() { return window.location.href; }

on('share-x', 'click', () => {
  const text = getShareText() + ' by @chris_noring';
  window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getShareUrl())}`, '_blank');
});
on('share-linkedin', 'click', () => {
  const text = getShareText() + '\n\nCreated by Christoffer Noring: https://www.linkedin.com/in/christoffer-noring-3257061/';
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}&summary=${encodeURIComponent(text)}`, '_blank');
});
on('share-bluesky', 'click', () => {
  window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(getShareText() + ' ' + getShareUrl())}`, '_blank');
});
on('share-reddit', 'click', () => {
  window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(getShareUrl())}&title=${encodeURIComponent('Copilot CLI Pirates — Learn CLI commands while sailing the seas! ⚓🏴‍☠️')}`, '_blank');
});
on('share-copy', 'click', () => {
  navigator.clipboard.writeText(getShareText() + '\n' + getShareUrl()).then(() => {
    showToast('📋 Copied to clipboard!');
  }).catch(() => showToast('Could not copy'));
});

// ---- Main Menu Buttons ----
document.getElementById('menu-resume').addEventListener('click', () => {
  document.getElementById('main-menu-overlay').classList.remove('active');
});
document.getElementById('menu-new-game').addEventListener('click', () => {
  location.reload();
});
document.getElementById('menu-credits').addEventListener('click', () => {
  document.getElementById('credits-overlay').classList.add('active');
});
document.getElementById('credits-back').addEventListener('click', () => {
  document.getElementById('credits-overlay').classList.remove('active');
});

// ---- Settings Wiring ----
document.getElementById('menu-settings').addEventListener('click', () => {
  document.getElementById('settings-overlay').classList.add('active');
});
document.getElementById('settings-back').addEventListener('click', () => {
  document.getElementById('settings-overlay').classList.remove('active');
});
// Time-of-day buttons
document.querySelectorAll('.tod-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tod-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyTimeOfDay(btn.dataset.tod);
  });
});
// Music volume slider
document.getElementById('music-volume').addEventListener('input', e => {
  const v = parseInt(e.target.value) / 100;
  document.getElementById('music-volume-val').textContent = e.target.value + '%';
  if (bgMusicGain) bgMusicGain.gain.value = v;
});
// SFX volume slider
document.getElementById('sfx-volume').addEventListener('input', e => {
  const v = parseInt(e.target.value) / 100;
  document.getElementById('sfx-volume-val').textContent = e.target.value + '%';
  sfxVolume = v;
});
// Skills button
document.getElementById('open-skills-btn').addEventListener('click', openSkillPanel);
// Also open with K key
document.addEventListener('keydown', e => {
  if (!state.started || state.inQuiz || state.inBattle || document.activeElement.id === 'cli-input') return;
  if (e.key.toLowerCase() === 'k') {
    const sp = document.getElementById('skill-panel');
    if (sp && sp.classList.contains('active')) closeSkillPanel();
    else openSkillPanel();
  }
  if (e.key.toLowerCase() === 'b') {
    const bp = document.getElementById('badge-panel');
    if (bp && bp.classList.contains('active')) closeBadgePanel();
    else openBadgePanel('badges');
  }
});

// ---- Copilot CLI Terminal ----
const SHIP_MODELS = [
  { name: 'Sloop (Light)',    model: 'ship-pirate-small.glb',  scale: 2,   hp: 4, speed: 1.3, damage: 0.8, desc: 'Fast & nimble, low HP' },
  { name: 'Brigantine (Med)', model: 'ship-pirate-medium.glb', scale: 2.5, hp: 6, speed: 1.0, damage: 1.0, desc: 'Balanced all-rounder' },
  { name: 'Galleon (Heavy)',  model: 'ship-pirate-large.glb',  scale: 3,   hp: 9, speed: 0.7, damage: 1.4, desc: 'Slow but devastating' },
];

const CLI_COMMANDS = {
  '/help': {
    real: 'Shows all available slash commands',
    game: 'Lists all terminal commands with CLI & game descriptions',
    fn: cmdHelp,
  },
  '/model': {
    real: 'Select AI model (Sonnet, Opus, GPT-5…)',
    game: 'Choose a different ship class (Sloop / Brigantine / Galleon)',
    fn: cmdModel,
  },
  '/compact': {
    real: 'Summarize conversation to reduce context usage',
    game: 'Compact yer ship! Shrink for 8s to dodge cannonballs',
    fn: cmdCompact,
  },
  '/clear': {
    real: 'Abandon session and start fresh',
    game: 'Fire a devastating broadside clearing all nearby enemies',
    fn: cmdClear,
  },
  '/research': {
    real: 'Run deep research using GitHub & web sources',
    game: 'Reveal all island names & distances on the minimap',
    fn: cmdResearch,
  },
  '/diff': {
    real: 'Review code changes in the current directory',
    game: 'Compare yer stats vs the nearest enemy ship',
    fn: cmdDiff,
  },
  '/plan': {
    real: 'Create an implementation plan before coding',
    game: 'Plan yer route — show bearing & distance to all unconquered islands',
    fn: cmdPlan,
  },
  '/context': {
    real: 'Show context window token usage',
    game: 'Show detailed game stats: level, XP, skills, kills, islands',
    fn: cmdContext,
  },
  '/theme': {
    real: 'View or set color mode',
    game: 'Cycle time of day: morning → day → night',
    fn: cmdTheme,
  },
  '/fleet': {
    real: 'Enable fleet mode for parallel subagent execution',
    game: 'Summon 2 allied ships to fight alongside ye for 30s',
    fn: cmdFleet,
  },
  '/skills': {
    real: 'Manage skills for enhanced capabilities',
    game: 'Open the skill point allocation panel',
    fn: cmdSkills,
  },
  '/undo': {
    real: 'Rewind the last turn and revert file changes',
    game: 'Undo damage — restore 30% of yer missing health',
    fn: cmdUndo,
  },
  '/feedback': {
    real: 'Provide feedback about the CLI',
    game: 'Yer captain shouts a random pirate phrase!',
    fn: cmdFeedback,
  },
  '/version': {
    real: 'Display version information',
    game: 'Show game version and credits',
    fn: cmdVersion,
  },
  '/share': {
    real: 'Share session to markdown, HTML, or gist',
    game: 'Share yer position coordinates with the crew',
    fn: cmdShare,
  },
  '/agent': {
    real: 'Delegate a task to a background coding agent',
    game: 'Summon a ghost ship that auto-hunts enemies for 20s',
    fn: cmdAgent,
  },
  '/memory': {
    real: 'Manage stored memories for future sessions',
    game: 'Restore a random buff from yer past voyages',
    fn: cmdMemory,
  },
  '/mcp': {
    real: 'Show connected MCP tool servers',
    game: 'Activate the Mystic Cannon Protocol — triple damage for 10s',
    fn: cmdMcp,
  },
  '/init': {
    real: 'Initialize a new project with templates',
    game: 'Reset all cooldowns and gain a temporary shield',
    fn: cmdInit,
  },
  '/pr': {
    real: 'Create, view, or manage GitHub pull requests',
    game: 'Pull nearby loot drops toward yer ship like a magnet',
    fn: cmdPr,
  },
  '/issue': {
    real: 'Create or view GitHub issues',
    game: 'Mark an enemy ship — it takes double damage for 15s',
    fn: cmdIssue,
  },
  '/commit': {
    real: 'Stage and commit file changes with a message',
    game: 'Lock in yer progress — save current HP as minimum floor for 30s',
    fn: cmdCommit,
  },
  '/status': {
    real: 'Show git status of working directory changes',
    game: 'Full status report: nearby enemies, loot, islands & threats',
    fn: cmdStatus,
  },
  '/review': {
    real: 'Review code changes with AI analysis',
    game: 'Scan the nearest enemy — reveal its weakness and stats',
    fn: cmdReview,
  },
  '/delegate': {
    real: 'Hand off a sub-task to a specialized agent',
    game: 'Delegate repairs to yer crew — auto-heal 2 HP/s for 10s',
    fn: cmdDelegate,
  },
  '/test': {
    real: 'Run tests for the current project',
    game: 'Test yer cannons! Fire a full 360° barrage around yer ship',
    fn: cmdTest,
  },
};

function toggleTerminal() {
  const term = document.getElementById('cli-terminal');
  if (term.classList.contains('active')) {
    term.classList.remove('active');
  } else {
    term.classList.add('active');
    document.getElementById('cli-input').focus();
  }
}

function cliPrint(html) {
  const out = document.getElementById('cli-output');
  const div = document.createElement('div');
  div.className = 'cli-line';
  div.innerHTML = html;
  out.appendChild(div);
  out.scrollTop = out.scrollHeight;
}

function cliClear() {
  document.getElementById('cli-output').innerHTML = '';
}

function runCliCommand(raw) {
  const input = raw.trim().toLowerCase();
  cliPrint(`<span class="cli-cmd">copilot&gt; ${raw.trim()}</span>`);

  if (!input.startsWith('/')) {
    cliPrint(`<span class="cli-error">Unknown command. Type /help for a list of commands.</span>`);
    return;
  }

  const parts = input.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);
  const entry = CLI_COMMANDS[cmd];

  if (!entry) {
    cliPrint(`<span class="cli-error">Command not found: ${cmd}</span>`);
    cliPrint(`<span class="cli-real">Type /help to see available commands</span>`);
    return;
  }

  state.stats.cliCommandsUsed.add(cmd.replace('/', ''));

  // Commands with visual game effects: close terminal first so player sees the action
  const infoOnly = ['/help', '/context', '/status', '/diff', '/plan', '/research', '/version', '/share', '/review', '/skills'];
  if (!infoOnly.includes(cmd)) {
    // Close terminal, then run command after a brief delay
    const term = document.getElementById('cli-terminal');
    if (term.classList.contains('active')) term.classList.remove('active');
    setTimeout(() => {
      entry.fn(args);
      checkQuests();
      checkBadges();
    }, 300);
  } else {
    entry.fn(args);
    checkQuests();
    checkBadges();
  }
}

// ---- Command implementations ----

function cmdHelp() {
  cliPrint(`<span class="cli-highlight">⚡ Copilot CLI Terminal — Command Reference</span>`);
  cliPrint(`<hr class="cli-divider">`);
  Object.entries(CLI_COMMANDS).forEach(([cmd, info]) => {
    cliPrint(`<span class="cli-cmd">${cmd}</span>`);
    cliPrint(`  <span class="cli-label">CLI:</span> <span class="cli-real">${info.real}</span>`);
    cliPrint(`  <span class="cli-label">Game:</span> <span class="cli-game">${info.game}</span>`);
  });
  cliPrint(`<hr class="cli-divider">`);
  cliPrint(`<span class="cli-real">Press T to toggle terminal · These are real Copilot CLI commands!</span>`);
}

function cmdModel(args) {
  if (args.length === 0) {
    cliPrint(`<span class="cli-highlight">Available ship models:</span>`);
    SHIP_MODELS.forEach((m, i) => {
      cliPrint(`  <span class="cli-cmd">${i + 1}.</span> <span class="cli-game">${m.name}</span> — ${m.desc} (❤️${m.hp} 💨${m.speed} 💥${m.damage})`);
    });
    cliPrint(`<span class="cli-real">Usage: /model 1, /model 2, or /model 3</span>`);
    return;
  }
  const idx = parseInt(args[0]) - 1;
  if (idx < 0 || idx >= SHIP_MODELS.length) {
    cliPrint(`<span class="cli-error">Invalid model. Choose 1-${SHIP_MODELS.length}</span>`);
    return;
  }
  const m = SHIP_MODELS[idx];
  const cap = state.captain || { speed: 1, damage: 1, hp: 5 };

  // Swap ship model
  if (ship) {
    const oldModel = ship.getObjectByName('shipModel');
    if (oldModel) ship.remove(oldModel);
    const newModel = cloneModel(m.model);
    if (newModel) {
      newModel.scale.setScalar(m.scale);
      newModel.name = 'shipModel';
      ship.add(newModel);
    }
    ship.userData.maxHealth = m.hp + (state.level - 1) * Math.round(cap.hp * 0.15 * 10) / 10;
    ship.userData.health = ship.userData.maxHealth;
    ship.userData.shipModel = m;
    const fill = ship.getObjectByName('healthBarFill');
    if (fill) { fill.scale.x = 1; fill.position.x = 0; }
  }
  state._shipModelIdx = idx;
  SHIP_SPEED = 0.8 * cap.speed * m.speed * (1 + state.skills.swiftSails * 0.08);

  cliPrint(`<span class="cli-game">⚓ Switched to ${m.name}!</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /model lets you choose between AI models like Claude Sonnet and GPT-5</span>`);
  playPickupSound();
  updateHUD();
}

function cmdCompact() {
  if (!ship) return;
  cliPrint(`<span class="cli-game">🔄 Compacting ship! Shrink mode for 8 seconds…</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /compact summarizes your conversation to free up the context window</span>`);
  const origScale = ship.scale.clone();
  ship.scale.setScalar(0.4);
  playPickupSound();
  setTimeout(() => {
    if (ship) ship.scale.copy(origScale);
    cliPrint(`<span class="cli-game">Ship restored to full size</span>`);
  }, 8000);
}

function cmdClear() {
  cliPrint(`<span class="cli-game">💥 Clearing the seas! Devastating broadside fired!</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /clear abandons the current session and starts fresh</span>`);
  state.roamingShips.forEach(rs => {
    if (!rs.userData.sinking) {
      const dx = ship.position.x - rs.position.x;
      const dz = ship.position.z - rs.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 80) {
        rs.userData.health -= 5;
        createExplosion(rs.position.clone().add(new THREE.Vector3(0, 5, 0)));
        if (rs.userData.health <= 0) {
          rs.userData.sinking = true;
          rs.userData.sinkTimer = 0;
          recordShipSunk();
          addGold(200);
          state.battles++;
          showCaptainCheer();
          spawnDrop(rs.position.clone());
          respawnRoamingShip();
        }
      }
    }
  });
  playCannonFire();
  playExplosion();
  updateHUD();
  checkQuests();
  checkBadges();
}

function cmdResearch() {
  cliPrint(`<span class="cli-game">🔍 Researching the seas… Island intel revealed!</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /research launches deep research using GitHub search & web sources</span>`);
  cliPrint(`<hr class="cli-divider">`);
  ISLAND_DATA.forEach(d => {
    const mesh = islandMeshes[d.id - 1];
    const dist = ship ? ship.position.distanceTo(mesh.position).toFixed(0) : '??';
    const status = state.conquered.has(d.id) ? '✅ Conquered' : '🏝️ Unconquered';
    cliPrint(`  <span class="cli-cmd">${d.name}</span> — ${status} — <span class="cli-highlight">${dist}m away</span>`);
  });
}

function cmdDiff() {
  if (!ship) return;
  let nearest = null, nearDist = Infinity;
  state.roamingShips.forEach(rs => {
    if (rs.userData.sinking) return;
    const d = ship.position.distanceTo(rs.position);
    if (d < nearDist) { nearDist = d; nearest = rs; }
  });
  cliPrint(`<span class="cli-game">📊 Stats comparison:</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /diff reviews code changes in your directory</span>`);
  cliPrint(`<hr class="cli-divider">`);
  const cap = state.captain || { damage: 1 };
  cliPrint(`  <span class="cli-highlight">YOU:</span> ❤️ ${ship.userData.health.toFixed(1)}/${ship.userData.maxHealth} · 💥 ${(cap.damage * state.weaponLevel).toFixed(1)} · 🛡️ ${state.armor}`);
  if (nearest) {
    cliPrint(`  <span class="cli-error">ENEMY:</span> ❤️ ${nearest.userData.health.toFixed(1)}/${nearest.userData.maxHealth} · 📏 ${nearDist.toFixed(0)}m`);
  } else {
    cliPrint(`  <span class="cli-real">No enemies nearby</span>`);
  }
}

function cmdPlan() {
  if (!ship) return;
  cliPrint(`<span class="cli-game">🗺️ Battle plan — unconquered islands:</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /plan creates an implementation plan before coding</span>`);
  cliPrint(`<hr class="cli-divider">`);
  let count = 0;
  ISLAND_DATA.forEach(d => {
    if (state.conquered.has(d.id)) return;
    count++;
    const mesh = islandMeshes[d.id - 1];
    const dx = mesh.position.x - ship.position.x;
    const dz = mesh.position.z - ship.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz).toFixed(0);
    const bearing = ((Math.atan2(dx, dz) * 180 / Math.PI + 360) % 360).toFixed(0);
    cliPrint(`  <span class="cli-cmd">${d.name}</span> — ${dist}m at ${bearing}°`);
  });
  if (count === 0) cliPrint(`  <span class="cli-game">All islands conquered! 👑</span>`);
}

function cmdContext() {
  const cap = state.captain || { name: 'None', damage: 1, speed: 1, fireRate: 1 };
  cliPrint(`<span class="cli-game">📋 Game Context:</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /context shows your context window token usage</span>`);
  cliPrint(`<hr class="cli-divider">`);
  cliPrint(`  Captain: <span class="cli-highlight">${cap.name || cap.realName}</span>`);
  cliPrint(`  Level: <span class="cli-highlight">${state.level}</span> · XP: ${state.xp}/${xpForLevel(state.level)}`);
  cliPrint(`  Score: <span class="cli-highlight">${state.score}</span> · Battles: ${state.battles}`);
  cliPrint(`  Islands: <span class="cli-highlight">${state.conquered.size}/7</span>`);
  cliPrint(`  Weapon Lv: ${state.weaponLevel} · Armor: ${state.armor}/${state.maxArmor}`);
  const activeSkills = SKILL_DEFS.filter(s => state.skills[s.key] > 0);
  if (activeSkills.length) {
    cliPrint(`  Skills: ${activeSkills.map(s => `${s.icon}${s.name} ${state.skills[s.key]}/${s.max}`).join(' · ')}`);
  }
  cliPrint(`  Skill Points: <span class="cli-highlight">${state.skillPoints}</span>`);
}

const TOD_CYCLE = ['morning', 'day', 'night'];
let todIndex = 1;

function cmdTheme() {
  todIndex = (todIndex + 1) % TOD_CYCLE.length;
  const tod = TOD_CYCLE[todIndex];
  applyTimeOfDay(tod);
  document.querySelectorAll('.tod-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tod === tod);
  });
  const emojis = { morning: '🌅', day: '☀️', night: '🌙' };
  cliPrint(`<span class="cli-game">${emojis[tod]} Theme changed to ${tod}!</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /theme lets you change your terminal color mode</span>`);
}

function cmdFleet() {
  state.stats.fleetSummons++;
  cliPrint(`<span class="cli-game">⚓ Calling reinforcements! Allied fleet arriving!</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /fleet enables parallel subagent execution for faster work</span>`);
  // Spawn 2 friendly ships that orbit the player and shoot enemies
  for (let i = 0; i < 2; i++) {
    const ally = new THREE.Group();
    const model = cloneModel('ship-pirate-small.glb');
    if (model) {
      model.scale.setScalar(1.8);
      model.traverse(c => {
        if (c.isMesh) { c.material = c.material.clone(); c.material.color.set(0x22aa44); c.material.emissive = new THREE.Color(0x115522); c.material.emissiveIntensity = 0.4; }
      });
      ally.add(model);
    }
    ally.add(new THREE.PointLight(0x44ff88, 3, 20).translateY(4));
    ally.userData = { orbitAngle: i * Math.PI, orbitSpeed: 0.02, shootTimer: 0, isAlly: true };
    scene.add(ally);
    if (!state._allies) state._allies = [];
    state._allies.push(ally);
  }
  playPickupSound();
  // Remove allies after 30s
  setTimeout(() => {
    if (state._allies) {
      state._allies.forEach(a => scene.remove(a));
      state._allies = [];
      cliPrint(`<span class="cli-real">Allied fleet has departed</span>`);
    }
  }, 30000);
}

function cmdSkills() {
  openSkillPanel();
  cliPrint(`<span class="cli-game">⭐ Skills panel opened!</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /skills manages enhanced capabilities and MCP tools</span>`);
}

function cmdUndo() {
  if (!ship) return;
  const missing = ship.userData.maxHealth - ship.userData.health;
  const heal = missing * 0.3;
  ship.userData.health = Math.min(ship.userData.maxHealth, ship.userData.health + heal);
  const fill = ship.getObjectByName('healthBarFill');
  if (fill) {
    const r = Math.max(0, ship.userData.health / ship.userData.maxHealth);
    fill.scale.x = r; fill.position.x = -(1 - r) * 2;
  }
  cliPrint(`<span class="cli-game">⏪ Undo! Restored ${heal.toFixed(1)} health!</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /undo rewinds the last turn and reverts file changes</span>`);
  playPickupSound();
}

const PIRATE_FEEDBACK = [
  "Yarr, this be the finest ship on the seven seas!",
  "Shiver me timbers, I love a good broadside!",
  "A pirate's life be the only life fer me!",
  "The Copilot CLI be mightier than any cutlass!",
  "I'd trade me wooden leg for another cannon!",
  "The sea be callin', and I must answer!",
  "Arr, who needs a compass when ye have /plan!",
  "Me parrot says yer code needs more comments!",
  "Feedback? The only feedback I need is BOOM! 💥",
  "Tell me hearties, is /fleet better than /clear? Both go boom!",
];

function cmdFeedback() {
  const quote = PIRATE_FEEDBACK[Math.floor(Math.random() * PIRATE_FEEDBACK.length)];
  cliPrint(`<span class="cli-highlight">🏴‍☠️ "${quote}"</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /feedback lets you submit feedback about your experience</span>`);
  showCaptainCheer();
}

function cmdVersion() {
  cliPrint(`<span class="cli-highlight">⚓ Copilot CLI Pirates v1.0</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /version shows the installed version and checks for updates</span>`);
  cliPrint(`  Built with Three.js · Assets by Kenney.nl · Audio by OpenGameArt`);
  cliPrint(`  Captains: Microsoft Cloud Advocates & GitHub Legends`);
}

function cmdShare() {
  if (!ship) return;
  const x = ship.position.x.toFixed(0), z = ship.position.z.toFixed(0);
  cliPrint(`<span class="cli-game">📍 Current position: (${x}, ${z})</span>`);
  cliPrint(`  Heading: ${((shipAngle * 180 / Math.PI + 360) % 360).toFixed(0)}°`);
  cliPrint(`  Speed: ${SHIP_SPEED.toFixed(2)} · Level ${state.level}`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /share exports your session to markdown, HTML, or a GitHub gist</span>`);
}

// ---- New command implementations ----

function cmdAgent() {
  cliPrint(`<span class="cli-game">👻 Deploying background agent… Ghost ship summoned!</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /agent delegates a task to a background coding agent that works autonomously</span>`);
  // Spawn a ghost ship that auto-hunts enemies
  const ghost = new THREE.Group();
  const model = cloneModel('ship-ghost.glb');
  if (model) {
    model.scale.setScalar(2.5);
    model.traverse(c => {
      if (c.isMesh) { c.material = c.material.clone(); c.material.transparent = true; c.material.opacity = 0.6; c.material.emissive = new THREE.Color(0x6644ff); c.material.emissiveIntensity = 0.8; }
    });
    ghost.add(model);
  }
  ghost.add(new THREE.PointLight(0x8866ff, 4, 30).translateY(5));
  ghost.position.copy(ship.position);
  ghost.userData = { isGhostAgent: true, timer: 20, shootTimer: 0 };
  scene.add(ghost);
  if (!state._ghostAgents) state._ghostAgents = [];
  state._ghostAgents.push(ghost);
  playPowerupSound();
  setTimeout(() => {
    if (state._ghostAgents) {
      state._ghostAgents = state._ghostAgents.filter(g => {
        if (g === ghost) { scene.remove(g); return false; }
        return true;
      });
      cliPrint(`<span class="cli-real">🤖 Background agent completed its task and departed</span>`);
    }
  }, 20000);
}

function cmdMemory() {
  const buffs = [
    { name: 'Ancient Armor', effect: () => { state.armor = Math.min(state.maxArmor, state.armor + 2); }, msg: '🛡️ +2 Armor from a past voyage!' },
    { name: 'Forgotten Gold', effect: () => { addGold(500); }, msg: '💰 +500 gold remembered from buried treasure!' },
    { name: 'Old Speed Chart', effect: () => { SHIP_SPEED *= 1.2; setTimeout(() => applySkillEffects(), 15000); }, msg: '💨 Speed boost for 15s from an old chart!' },
    { name: 'Veteran\'s Wisdom', effect: () => { gainXP(150); }, msg: '📚 +150 XP from lessons learned!' },
    { name: 'Lucky Charm', effect: () => { state.weaponLevel = Math.min(5, state.weaponLevel + 1); }, msg: '⚔️ +1 Weapon Level from a lucky charm!' },
    { name: 'Ghost Heal', effect: () => { if (ship) { ship.userData.health = ship.userData.maxHealth; } }, msg: '❤️ Full heal from a spectral memory!' },
  ];
  const buff = buffs[Math.floor(Math.random() * buffs.length)];
  buff.effect();
  cliPrint(`<span class="cli-game">${buff.msg}</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /memory stores and recalls facts across sessions for personalized assistance</span>`);
  playPickupSound();
  updateHUD();
  checkQuests();
  checkBadges();
}

function cmdMcp() {
  cliPrint(`<span class="cli-game">🔮 MYSTIC CANNON PROTOCOL ACTIVATED! Triple damage for 10 seconds!</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /mcp shows connected Model Context Protocol tool servers</span>`);
  const origWeapon = state.weaponLevel;
  state.weaponLevel *= 3;
  playPowerupSound();
  // Visual: ship glows purple
  if (ship) {
    ship.traverse(c => {
      if (c.isMesh && c.material) { c.material._origEmissive = c.material.emissive?.clone(); c.material.emissive = new THREE.Color(0x9944ff); c.material.emissiveIntensity = 0.6; }
    });
  }
  setTimeout(() => {
    state.weaponLevel = origWeapon;
    if (ship) {
      ship.traverse(c => {
        if (c.isMesh && c.material && c.material._origEmissive) { c.material.emissive.copy(c.material._origEmissive); c.material.emissiveIntensity = 0; }
      });
    }
    cliPrint(`<span class="cli-real">🔮 Mystic Cannon Protocol deactivated</span>`);
  }, 10000);
}

function cmdInit() {
  cliPrint(`<span class="cli-game">🚀 Initializing fresh systems! Cooldowns reset, shield active!</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /init scaffolds a new project from templates and sets up your workspace</span>`);
  // Reset cannon cooldown
  state.cannonCooldown = 0;
  state.cannonReady = true;
  // Temporary shield: reduce damage by 90% for 8s
  state._shielded = true;
  playPowerupSound();
  if (ship) {
    // Visual shield sphere
    const shieldGeo = new THREE.SphereGeometry(8, 16, 16);
    const shieldMat = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.2, wireframe: true });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.name = 'initShield';
    ship.add(shield);
    setTimeout(() => {
      state._shielded = false;
      ship.remove(shield);
      cliPrint(`<span class="cli-real">🛡️ Shield faded</span>`);
    }, 8000);
  }
}

function cmdPr() {
  cliPrint(`<span class="cli-game">🧲 Pull Request activated! Drawing loot toward ye!</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /pr creates, views, or manages GitHub pull requests</span>`);
  // Magnetize all drops toward player for 10s
  state._lootMagnet = true;
  playPickupSound();
  setTimeout(() => {
    state._lootMagnet = false;
    cliPrint(`<span class="cli-real">🧲 Loot magnet deactivated</span>`);
  }, 10000);
}

function cmdIssue() {
  if (!ship) return;
  // Find nearest enemy and mark it for double damage
  let nearest = null, nearDist = Infinity;
  state.roamingShips.forEach(rs => {
    if (rs.userData.sinking) return;
    const d = ship.position.distanceTo(rs.position);
    if (d < nearDist) { nearDist = d; nearest = rs; }
  });
  if (!nearest || nearDist > 80) {
    cliPrint(`<span class="cli-error">No enemy ships nearby to file an issue against!</span>`);
    return;
  }
  nearest.userData.marked = true;
  nearest.userData.markedTimer = 15;
  // Visual: red ring above marked ship
  const markerGeo = new THREE.RingGeometry(4, 5, 16);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 12;
  marker.name = 'issueMarker';
  nearest.add(marker);
  cliPrint(`<span class="cli-game">🎯 Issue filed on enemy ${nearDist.toFixed(0)}m away! It takes double damage for 15s!</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /issue creates or views GitHub issues for tracking bugs and features</span>`);
  playPickupSound();
  setTimeout(() => {
    if (nearest) {
      nearest.userData.marked = false;
      const m = nearest.getObjectByName('issueMarker');
      if (m) nearest.remove(m);
    }
  }, 15000);
}

function cmdCommit() {
  if (!ship) return;
  const savedHP = ship.userData.health;
  state._commitFloor = savedHP;
  cliPrint(`<span class="cli-game">💾 Progress committed! HP floor locked at ${savedHP.toFixed(1)} for 30s!</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /commit stages and commits file changes with a message</span>`);
  playPickupSound();
  // Visual: green pulse
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:"Pirata One",cursive;font-size:36px;color:#2ecc71;z-index:500;text-shadow:0 0 20px #27ae60;pointer-events:none;animation:cheerPop 2s ease-out forwards;';
  el.textContent = `💾 Committed at ${savedHP.toFixed(1)} HP`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
  setTimeout(() => {
    state._commitFloor = null;
    cliPrint(`<span class="cli-real">💾 Commit checkpoint expired</span>`);
  }, 30000);
}

function cmdStatus() {
  if (!ship) return;
  cliPrint(`<span class="cli-game">📋 STATUS REPORT:</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /status shows git status of working directory changes</span>`);
  cliPrint(`<hr class="cli-divider">`);

  // Nearby enemies
  let nearEnemies = 0;
  state.roamingShips.forEach(rs => {
    if (rs.userData.sinking) return;
    if (ship.position.distanceTo(rs.position) < 80) nearEnemies++;
  });
  cliPrint(`  ⚔️ Enemies nearby: <span class="${nearEnemies > 0 ? 'cli-error' : 'cli-game'}">${nearEnemies}</span>`);

  // Drops on the sea
  cliPrint(`  🎁 Loot floating: <span class="cli-highlight">${state.drops.length}</span>`);

  // Nearest unconquered island
  let nearestIsland = null, niDist = Infinity;
  ISLAND_DATA.forEach(d => {
    if (state.conquered.has(d.id)) return;
    const mesh = islandMeshes[d.id - 1];
    const dist = ship.position.distanceTo(mesh.position);
    if (dist < niDist) { niDist = dist; nearestIsland = d; }
  });
  if (nearestIsland) {
    cliPrint(`  🏝️ Nearest target: <span class="cli-cmd">${nearestIsland.name}</span> (${niDist.toFixed(0)}m)`);
  }

  // Active buffs
  const buffs = [];
  if (state._shielded) buffs.push('🛡️ Shield');
  if (state._lootMagnet) buffs.push('🧲 Loot Magnet');
  if (state._commitFloor) buffs.push(`💾 HP Floor (${state._commitFloor.toFixed(1)})`);
  if (state._allies && state._allies.length) buffs.push('⚓ Fleet Active');
  if (state._ghostAgents && state._ghostAgents.length) buffs.push('👻 Ghost Agent');
  cliPrint(`  ✨ Active buffs: ${buffs.length ? buffs.join(' · ') : 'None'}`);

  // Threats
  const aggroCount = state.roamingShips.filter(rs => rs.userData.aggro).length;
  cliPrint(`  ⚠️ Aggro ships: <span class="${aggroCount > 0 ? 'cli-error' : 'cli-game'}">${aggroCount}</span>`);
}

function cmdReview() {
  if (!ship) return;
  let nearest = null, nearDist = Infinity;
  state.roamingShips.forEach(rs => {
    if (rs.userData.sinking) return;
    const d = ship.position.distanceTo(rs.position);
    if (d < nearDist) { nearDist = d; nearest = rs; }
  });
  if (!nearest || nearDist > 100) {
    cliPrint(`<span class="cli-error">No enemies close enough to review!</span>`);
    return;
  }
  const ud = nearest.userData;
  cliPrint(`<span class="cli-game">🔍 ENEMY REVIEW:</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /review analyzes code changes with AI for bugs and improvements</span>`);
  cliPrint(`<hr class="cli-divider">`);
  cliPrint(`  ❤️ Health: <span class="cli-highlight">${ud.health.toFixed(1)} / ${ud.maxHealth}</span>`);
  cliPrint(`  📏 Distance: <span class="cli-highlight">${nearDist.toFixed(0)}m</span>`);
  cliPrint(`  😡 Aggro: <span class="${ud.aggro ? 'cli-error' : 'cli-game'}">${ud.aggro ? 'HOSTILE' : 'Passive'}</span>`);
  cliPrint(`  🎯 Marked: ${ud.marked ? '<span class="cli-error">YES (2× damage)</span>' : 'No'}`);
  const hpPct = (ud.health / ud.maxHealth * 100).toFixed(0);
  const verdict = hpPct > 75 ? '💪 Strong — approach with caution' : hpPct > 30 ? '⚠️ Wounded — strike now!' : '💀 Critical — one more broadside!';
  cliPrint(`  📊 Assessment: ${verdict}`);
}

function cmdDelegate() {
  if (!ship) return;
  cliPrint(`<span class="cli-game">🔧 Delegating repairs to the crew! Auto-healing 2 HP/s for 10s!</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /delegate hands off a sub-task to a specialized agent</span>`);
  playPickupSound();
  let ticks = 0;
  const healInterval = setInterval(() => {
    ticks++;
    if (!ship || ticks > 10) {
      clearInterval(healInterval);
      cliPrint(`<span class="cli-real">🔧 Crew repairs complete!</span>`);
      return;
    }
    ship.userData.health = Math.min(ship.userData.maxHealth, ship.userData.health + 2);
    const fill = ship.getObjectByName('healthBarFill');
    if (fill) {
      const r = Math.max(0, ship.userData.health / ship.userData.maxHealth);
      fill.scale.x = r; fill.position.x = -(1 - r) * 2;
    }
  }, 1000);
}

function cmdTest() {
  cliPrint(`<span class="cli-game">🧪 Running cannon tests… 360° BARRAGE!</span>`);
  cliPrint(`<span class="cli-real">In Copilot CLI, /test runs your project's test suite and reports results</span>`);
  if (!ship) return;
  playCannonFire();
  // Fire 12 cannonballs in a full circle
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const target = ship.position.clone().add(new THREE.Vector3(Math.sin(angle) * 40, 5, Math.cos(angle) * 40));
    setTimeout(() => {
      fireCannonball(ship.position.clone().add(new THREE.Vector3(0, 5, 0)), target, true);
      if (i % 3 === 0) playCannonFire();
    }, i * 100);
  }
  setTimeout(() => {
    cliPrint(`<span class="cli-game">🧪 All 12 cannon tests passed! ✅</span>`);
  }, 1500);
}
document.getElementById('cli-close').addEventListener('click', toggleTerminal);
document.getElementById('terminal-btn').addEventListener('click', toggleTerminal);
document.getElementById('cli-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const input = e.target.value;
    if (input.trim()) runCliCommand(input);
    e.target.value = '';
    e.preventDefault();
  }
  if (e.key === 'Escape') {
    toggleTerminal();
    e.preventDefault();
    e.stopPropagation();
  }
  e.stopPropagation(); // Prevent game keys while typing
});
document.getElementById('cli-input').addEventListener('keyup', e => e.stopPropagation());
document.getElementById('cli-input').addEventListener('keypress', e => e.stopPropagation());

// ---- Loot / Drop System ----
function spawnDrop(position) {
  // Roll for drop (70% chance of something)
  if (Math.random() > 0.7) return;
  const roll = Math.random();
  let cumulative = 0;
  let dropType = DROP_TYPES[0];
  for (const dt of DROP_TYPES) {
    cumulative += dt.chance;
    if (roll <= cumulative) { dropType = dt; break; }
  }
  // Use crate model
  const crate = cloneModel('crate.glb');
  if (!crate) return;
  const group = new THREE.Group();
  crate.scale.setScalar(4);
  group.add(crate);
  group.position.set(position.x, 0.5, position.z);
  group.userData = { dropType, bobOffset: Math.random() * Math.PI * 2, life: 900 };
  // Colored glow to indicate type
  const glow = new THREE.PointLight(dropType.color, 5, 20);
  glow.position.y = 3;
  group.add(glow);
  // Floating icon label
  const iconSprite = makeTextSprite(dropType.icon, dropType.color);
  if (iconSprite) { iconSprite.position.y = 6; group.add(iconSprite); }
  scene.add(group);
  state.drops.push(group);
}

// Simple text sprite for drop icon
function makeTextSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = '48px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4, 4, 1);
  return sprite;
}

function updateDrops(elapsed) {
  const PICKUP_DIST = 10;
  for (let i = state.drops.length - 1; i >= 0; i--) {
    const d = state.drops[i];
    d.userData.life--;
    // Bob on water and rotate
    d.position.y = Math.sin(elapsed * 2 + d.userData.bobOffset) * 0.6;
    d.rotation.y += 0.015;
    // Blink when about to expire
    if (d.userData.life < 150) {
      d.visible = Math.floor(d.userData.life / 10) % 2 === 0;
    }
    // Expire
    if (d.userData.life <= 0) {
      scene.remove(d); state.drops.splice(i, 1); continue;
    }
    // Pickup detection
    if (!ship) continue;
    const dx = ship.position.x - d.position.x;
    const dz = ship.position.z - d.position.z;
    if (Math.sqrt(dx * dx + dz * dz) < PICKUP_DIST) {
      applyDrop(d.userData.dropType);
      scene.remove(d); state.drops.splice(i, 1);
    }
  }
}

function applyDrop(dropType) {
  const cap = state.captain || { damage: 1 };
  const notifEl = document.getElementById('loot-notifications');
  let msg = '';
  state.stats.dropsCollected++;
  switch (dropType.type) {
    case 'health':
      ship.userData.health = Math.min(ship.userData.maxHealth, ship.userData.health + 2);
      msg = `${dropType.icon} +2 Health!`;
      playPickupSound();
      break;
    case 'armor':
      state.armor = Math.min(state.maxArmor, state.armor + 1);
      msg = `${dropType.icon} +1 Armor! (${state.armor}/${state.maxArmor})`;
      playPickupSound();
      break;
    case 'weapon':
      if (state.weaponLevel < 5) {
        state.weaponLevel++;
        document.getElementById('weapon-level').textContent = state.weaponLevel;
        msg = `${dropType.icon} Weapon Level ${state.weaponLevel}! Damage: ${(cap.damage * state.weaponLevel).toFixed(1)}`;
      } else {
        addGold(300);
        msg = `${dropType.icon} Max Weapon! +300 Gold`;
      }
      playPowerupSound();
      break;
    case 'speed':
      SHIP_SPEED = Math.min(1.6, SHIP_SPEED + 0.1);
      msg = `${dropType.icon} Speed Boost! (${SHIP_SPEED.toFixed(1)})`;
      setTimeout(() => { SHIP_SPEED = 0.8 * (state.captain ? state.captain.speed : 1); }, 15000);
      playPowerupSound();
      break;
    case 'gold':
      addGold(500);
      msg = `${dropType.icon} Treasure! +500 Gold!`;
      playSoundBuffer('coins', 0.6);
      playSoundBuffer('chest', 0.4);
      break;
  }
  // Update health bar
  if (ship) {
    const fill = ship.getObjectByName('healthBarFill');
    if (fill) {
      const r = Math.max(0, ship.userData.health / ship.userData.maxHealth);
      fill.scale.x = r; fill.position.x = -(1 - r) * 2;
    }
  }
  updateHUD();
  checkQuests();
  checkBadges();
  // Show notification
  if (msg) {
    const el = document.createElement('div');
    el.className = 'loot-notification';
    el.textContent = msg;
    notifEl.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
}

// Apply weapon level to cannon damage
function getCannonDamage() {
  const cap = state.captain || { damage: 1 };
  return cap.damage * state.weaponLevel * (1 + state.skills.grapeShot * 0.15);
}

// ---- Game Loop ----
const clock = new THREE.Clock();
let wakeTimer = 0, splashTimer = 0, wakeLineTimer = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  if (!state.started) {
    camera.position.x = Math.cos(elapsed * 0.1) * 180;
    camera.position.z = Math.sin(elapsed * 0.1) * 180;
    camera.position.y = 60;
    camera.lookAt(0, 0, 0);
    if (ocean) ocean.material.uniforms.uTime.value = elapsed;
    renderer.render(scene, camera);
    return;
  }

  // Pause when menu/settings/credits/terminal are open
  const paused = document.getElementById('main-menu-overlay').classList.contains('active')
    || document.getElementById('settings-overlay').classList.contains('active')
    || document.getElementById('credits-overlay').classList.contains('active')
    || (document.getElementById('skill-panel') && document.getElementById('skill-panel').classList.contains('active'))
    || (document.getElementById('badge-panel') && document.getElementById('badge-panel').classList.contains('active'))
    || document.getElementById('cli-terminal').classList.contains('active')
    || state.inQuiz;
  if (paused) {
    renderer.render(scene, camera);
    return;
  }

  if (ocean) ocean.material.uniforms.uTime.value = elapsed;

  // ---- Ship movement ----
  if (ship && !state.inQuiz && !state.inBattle) {
    let moving = false;
    const turn = 0.03;
    if (state.keys['a'] || state.keys['arrowleft']) { shipAngle += turn; moving = true; }
    if (state.keys['d'] || state.keys['arrowright']) { shipAngle -= turn; moving = true; }
    shipDirection.set(Math.sin(shipAngle), 0, Math.cos(shipAngle));
    ship.rotation.y = shipAngle;

    if (state.keys['w'] || state.keys['arrowup']) { ship.position.addScaledVector(shipDirection, SHIP_SPEED); moving = true; }
    if (state.keys['s'] || state.keys['arrowdown']) { ship.position.addScaledVector(shipDirection, -SHIP_SPEED * 0.5); moving = true; }

    // ---- Collision: player vs islands ----
    const ISLAND_COLLISION_R = 18;
    const SHIP_COLLISION_R = 5;
    for (const isl of islandMeshes) {
      const dx = ship.position.x - isl.position.x;
      const dz = ship.position.z - isl.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = ISLAND_COLLISION_R;
      if (dist < minDist && dist > 0) {
        const push = (minDist - dist);
        const nx = dx / dist, nz = dz / dist;
        ship.position.x += nx * push;
        ship.position.z += nz * push;
        // Take small damage on hard collision
        if (push > 0.5 && ship.userData.health > 0) {
          const collisionDamage = 0.02;
          ship.userData.health = Math.max(0, ship.userData.health - collisionDamage);
          trackDamageTaken(collisionDamage);
          const fill = ship.getObjectByName('healthBarFill');
          if (fill) {
            const ratio = Math.max(0, ship.userData.health / ship.userData.maxHealth);
            fill.scale.x = ratio;
            fill.position.x = -(1 - ratio) * 2;
          }
        }
      }
    }

    // ---- Collision: player vs roaming ships ----
    for (const rs of state.roamingShips) {
      if (rs.userData.sinking) continue;
      const dx = ship.position.x - rs.position.x;
      const dz = ship.position.z - rs.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = SHIP_COLLISION_R * 2;
      if (dist < minDist && dist > 0) {
        const push = (minDist - dist) * 0.5;
        const nx = dx / dist, nz = dz / dist;
        ship.position.x += nx * push;
        ship.position.z += nz * push;
        rs.position.x -= nx * push;
        rs.position.z -= nz * push;
        // Both take collision damage (armor reduces player damage)
        const armorReduction = 1 - (state.armor * 0.15) - (state.skills.ironHull * 0.10);
        const collisionDamage = 0.1 * armorReduction;
        ship.userData.health = Math.max(0, ship.userData.health - collisionDamage);
        trackDamageTaken(collisionDamage);
        rs.userData.health = Math.max(0, rs.userData.health - 0.1);
        const pFill = ship.getObjectByName('healthBarFill');
        if (pFill) {
          const r = Math.max(0, ship.userData.health / ship.userData.maxHealth);
          pFill.scale.x = r; pFill.position.x = -(1 - r) * 2;
        }
        const rFill = rs.getObjectByName('healthBarFill');
        if (rFill) {
          const r = Math.max(0, rs.userData.health / rs.userData.maxHealth);
          rFill.scale.x = r; rFill.position.x = -(1 - r) * 2;
          if (r <= 0.33) rFill.material.color.set(0xff0000);
          else if (r <= 0.66) rFill.material.color.set(0xff8800);
        }
      }
    }

    // ---- Collision: player vs enemy orbit ships ----
    for (const es of state.enemyShips) {
      const dx = ship.position.x - es.position.x;
      const dz = ship.position.z - es.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = SHIP_COLLISION_R * 2;
      if (dist < minDist && dist > 0) {
        const push = (minDist - dist);
        const nx = dx / dist, nz = dz / dist;
        ship.position.x += nx * push;
        ship.position.z += nz * push;
      }
    }

    const bound = OCEAN_SIZE / 2 - 20;
    ship.position.x = THREE.MathUtils.clamp(ship.position.x, -bound, bound);
    ship.position.z = THREE.MathUtils.clamp(ship.position.z, -bound, bound);

    // Bob on water
    ship.position.y = Math.sin(elapsed * 1.5) * 0.6;
    ship.rotation.z = Math.sin(elapsed * 1.2) * 0.02;
    ship.rotation.x = Math.sin(elapsed * 0.9) * 0.015;

    if (moving) state.stats.timeSailing += dt;

    // ---- Wake effects when moving ----
    if (moving) {
      wakeTimer += dt;
      splashTimer += dt;
      wakeLineTimer += dt;

      // Foam trail — more frequent, smaller particles
      if (wakeTimer > 0.08) { spawnWakeTrail(); wakeTimer = 0; }
      // Bow mist
      if (splashTimer > 0.1) { spawnBowSplash(); splashTimer = 0; }
      // V-wake lines — more frequent thin lines
      if (wakeLineTimer > 0.15) { spawnWakeVLine(); wakeLineTimer = 0; }

      // Record position for ocean shader disturbance
      wakePositions[wakeIndex * 2] = ship.position.x;
      wakePositions[wakeIndex * 2 + 1] = ship.position.z;
      wakeIndex = (wakeIndex + 1) % WAKE_POINT_COUNT;
      ocean.material.uniforms.uWakeCount.value = Math.min(wakeIndex + 1, WAKE_POINT_COUNT);
    }

    // Camera
    const camTarget = new THREE.Vector3(
      ship.position.x - shipDirection.x * CAMERA_DISTANCE,
      CAMERA_HEIGHT,
      ship.position.z - shipDirection.z * CAMERA_DISTANCE
    );
    camera.position.lerp(camTarget, 0.05);
    camera.lookAt(ship.position.x, 5, ship.position.z);

    // Island proximity
    state.nearIsland = null;
    islandMeshes.forEach(island => { if (ship.position.distanceTo(island.position) < DOCK_DISTANCE) state.nearIsland = island; });

    if (state.nearIsland) {
      const d = state.nearIsland.userData.islandData;
      const prevVisited = state.stats.islandsVisited.size;
      state.stats.islandsVisited.add(d.id);
      if (state.stats.islandsVisited.size !== prevVisited) {
        checkQuests();
        checkBadges();
      }
      els.islandLabel.querySelector('.name').textContent = state.conquered.has(d.id) ? `✅ ${d.name} (Conquered!)` : `🏝️ ${d.name} — Press E to dock`;
      els.islandLabel.querySelector('.subtitle').textContent = d.description;
      els.islandLabel.classList.add('visible');
    } else { els.islandLabel.classList.remove('visible'); }
  }

  state._progressCheckTimer += dt;
  if (state._progressCheckTimer >= 5) {
    state._progressCheckTimer = 0;
    checkQuests();
    checkBadges();
  }

  // ---- Update wake trail ----
  state.wakeTrail = state.wakeTrail.filter(f => {
    f.userData.life--;
    const age = f.userData.life / f.userData.maxLife;
    f.material.opacity = age * 0.3;
    f.scale.setScalar(1 + (1 - age) * 0.8); // gentle expansion
    if (f.userData.life <= 0) { scene.remove(f); return false; }
    return true;
  });

  // ---- Update bow splashes ----
  state.wakeSplashes = state.wakeSplashes.filter(s => {
    s.position.add(s.userData.velocity);
    s.userData.velocity.y -= 0.04; // gravity
    s.userData.life--;
    s.material.opacity = Math.max(0, s.userData.life / 30);
    if (s.userData.life <= 0) { scene.remove(s); return false; }
    return true;
  });

  // ---- Update V-wake lines ----
  for (let i = wakeLines.length - 1; i >= 0; i--) {
    const wl = wakeLines[i];
    wl.userData.life--;
    const age = wl.userData.life / wl.userData.maxLife;
    wl.material.opacity = age * 0.2;
    wl.scale.x = 1 + (1 - age) * 1.5;  // gentle widen
    wl.scale.y = 1 + (1 - age) * 0.6;
    if (wl.userData.life <= 0) { scene.remove(wl); wakeLines.splice(i, 1); }
  }

  // ---- Island glow pulse ----
  islandGlows.forEach((ring, i) => {
    const d = ISLAND_DATA[i];
    ring.material.opacity = state.conquered.has(d.id)
      ? 0.3 + Math.sin(elapsed * 2 + i) * 0.15
      : 0.15 + Math.sin(elapsed * 1.5 + i) * 0.1;
  });

  // ---- Enemy orbiting ----
  state.enemyShips.forEach(e => {
    const d = e.userData;
    d.orbitAngle += d.orbitSpeed;
    const isl = islandMeshes[d.targetIsland];
    e.position.set(isl.position.x + Math.cos(d.orbitAngle) * 30, Math.sin(elapsed * 2) * 0.5, isl.position.z + Math.sin(d.orbitAngle) * 30);
    e.rotation.y = d.orbitAngle + Math.PI / 2;
  });

  // ---- Cannonballs + hit detection ----
  state.cannonballs = state.cannonballs.filter(b => {
    b.position.add(b.userData.velocity);
    // Add slight arc (gravity)
    b.userData.velocity.y -= 0.02;

    // Update shadow position on water
    if (b.userData.shadow) {
      b.userData.shadow.position.x = b.position.x;
      b.userData.shadow.position.z = b.position.z;
      // Shadow gets bigger/fainter as ball goes higher
      const h = Math.max(0, b.position.y);
      const s = 1 + h * 0.15;
      b.userData.shadow.scale.set(s, s, s);
      b.userData.shadow.material.opacity = Math.max(0.1, 0.4 - h * 0.02);
    }

    // Hit detection for player-fired cannonballs against roaming ships
    if (b.userData.isPlayerShot) {
      for (let i = state.roamingShips.length - 1; i >= 0; i--) {
        const rs = state.roamingShips[i];
        if (rs.userData.sinking) continue;
        const dist = b.position.distanceTo(rs.position);
        if (dist < 5) {
          // Hit! Apply weapon damage
          rs.userData.health -= getCannonDamage();
          state.stats.cannonHits++;
          createExplosion(b.position.clone());
          createCannonSmoke(b.position.clone());
          playHit();
          addGold(50);
          gainXP(25);

          // Update health bar
          const fill = rs.getObjectByName('healthBarFill');
          if (fill) {
            const ratio = Math.max(0, rs.userData.health / rs.userData.maxHealth);
            fill.scale.x = ratio;
            fill.position.x = -(1 - ratio) * 2;
            if (ratio <= 0.33) fill.material.color.set(0xff0000);
            else if (ratio <= 0.66) fill.material.color.set(0xff8800);
          }

          // Sunk?
          if (rs.userData.health <= 0) {
            rs.userData.sinking = true;
            rs.userData.sinkTimer = 0;
            recordShipSunk();
            const plunderBonus = 1 + state.skills.plunder * 0.25;
            addGold(Math.floor(200 * plunderBonus));
            state.battles++;
            gainXP(100);
            createExplosion(rs.position.clone().add(new THREE.Vector3(0, 5, 0)));
            createExplosion(rs.position.clone().add(new THREE.Vector3(2, 3, 1)));
            playExplosion(); playSink();
            showCaptainCheer();
            spawnDrop(rs.position.clone());
            respawnRoamingShip();
            checkQuests();
            checkBadges();
          }

          if (b.userData.shadow) scene.remove(b.userData.shadow);
          scene.remove(b);
          return false;
        }
      }
    }

    // Hit detection for enemy-fired cannonballs against player
    if (!b.userData.isPlayerShot && ship && !state.inQuiz) {
      const dist = b.position.distanceTo(ship.position);
      if (dist < 6) {
        const dmgReduction = Math.max(0.1, 1 - state.armor * 0.15 - state.skills.ironHull * 0.10);
        const hitDamage = 0.8 * dmgReduction;
        ship.userData.health = Math.max(0, ship.userData.health - hitDamage);
        trackDamageTaken(hitDamage);
        createExplosion(b.position.clone());
        playHit();
        const fill = ship.getObjectByName('healthBarFill');
        if (fill) {
          const ratio = Math.max(0, ship.userData.health / ship.userData.maxHealth);
          fill.scale.x = ratio;
          fill.position.x = -(1 - ratio) * 2;
        }
        updateHUD();
        if (b.userData.shadow) scene.remove(b.userData.shadow);
        scene.remove(b);
        return false;
      }
    }

    if (--b.userData.life <= 0 || b.position.y < -2) {
      // Splash if hitting water
      if (b.position.y < 1) {
        playSplash();
        for (let i = 0; i < 5; i++) {
          const sp = new THREE.Mesh(_splashGeo, new THREE.MeshBasicMaterial({
            color: 0xaaddff, transparent: true, opacity: 0.6,
          }));
          sp.position.copy(b.position);
          sp.userData = {
            velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, 1 + Math.random() * 2, (Math.random() - 0.5) * 1.5),
            life: 20, type: 'splash',
          };
          scene.add(sp);
          state.particles.push(sp);
        }
      } else {
        createExplosion(b.position.clone());
      }
      if (b.userData.shadow) scene.remove(b.userData.shadow);
      scene.remove(b);
      return false;
    }
    return true;
  });

  // ---- Particles (fire, smoke, explosion, victory) ----
  state.particles = state.particles.filter(p => {
    p.position.add(p.userData.velocity);
    p.userData.life--;
    p.material.transparent = true;

    if (p.userData.type === 'smoke') {
      p.userData.velocity.y *= 0.97; // slow rise
      p.userData.velocity.x *= 0.95;
      p.userData.velocity.z *= 0.95;
      const age = p.userData.life / p.userData.maxLife;
      p.material.opacity = age * 0.5;
      p.scale.setScalar(1 + (1 - age) * 2); // expand as it dissipates
    } else if (p.userData.type === 'fire') {
      p.userData.velocity.y -= 0.02;
      p.material.opacity = Math.max(0, p.userData.life / 20);
      p.scale.multiplyScalar(0.95); // shrink
    } else {
      p.userData.velocity.y -= 0.05;
      p.material.opacity = Math.max(0, p.userData.life / 60);
    }

    if (p.userData.life <= 0) { scene.remove(p); return false; }
    return true;
  });

  // ---- Player death check ----
  if (ship && ship.userData.health <= 0 && !state._respawning) {
    state._respawning = true;
    setTimeout(() => {
      respawnPlayer();
      state._respawning = false;
    }, 500);
  }

  // ---- Passive health regen (0.5 hp/sec) ----
  if (ship && ship.userData.health > 0 && ship.userData.health < ship.userData.maxHealth) {
    ship.userData.health = Math.min(ship.userData.maxHealth, ship.userData.health + 0.5 * dt);
    const fill = ship.getObjectByName('healthBarFill');
    if (fill) {
      const r = Math.max(0, ship.userData.health / ship.userData.maxHealth);
      fill.scale.x = r; fill.position.x = -(1 - r) * 2;
    }
  }

  // ---- Conquered glow ----
  islandMeshes.forEach(isl => {
    const d = isl.userData.islandData;
    if (state.conquered.has(d.id)) {
      isl.children.forEach(c => { if (c.isPointLight) { c.intensity = 2 + Math.sin(elapsed * 2 + d.id) * 1.5; c.color.set(0x2ecc71); } });
    }
  });

  // ---- Roaming ship AI ----
  for (let i = state.roamingShips.length - 1; i >= 0; i--) {
    const rs = state.roamingShips[i];
    const ud = rs.userData;

    if (ud.sinking) {
      ud.sinkTimer += dt;
      rs.position.y -= dt * 2;
      rs.rotation.z += dt * 0.5;
      rs.rotation.x += dt * 0.3;
      if (ud.sinkTimer > 3) {
        scene.remove(rs);
        state.roamingShips.splice(i, 1);
      }
      continue;
    }

    // ---- Aggro detection ----
    const dxP = ship.position.x - rs.position.x;
    const dzP = ship.position.z - rs.position.z;
    const distToPlayer = Math.sqrt(dxP * dxP + dzP * dzP);
    const ring = rs.getObjectByName('aggroRing');

    if (!ud.aggro && distToPlayer < AGGRO_RADIUS) {
      ud.aggro = true;
    } else if (ud.aggro && distToPlayer > AGGRO_DEAGGRO_RADIUS) {
      ud.aggro = false;
    }

    // Ring pulsates when aggro'd, fades when not
    if (ring) {
      if (ud.aggro) {
        ring.material.opacity = 0.12 + Math.sin(elapsed * 2.5 + i) * 0.06;
        ring.material.color.set(0xff2222);
      } else {
        // Faint idle pulse so player can see the zone
        const idleOp = 0.03 + Math.sin(elapsed * 1.2 + i * 3) * 0.015;
        ring.material.opacity = distToPlayer < AGGRO_RADIUS + 30 ? idleOp : 0;
        ring.material.color.set(0xffaa44);
      }
    }

    if (ud.aggro && !state.inQuiz) {
      // Pursue player: steer toward them
      const targetAngle = Math.atan2(dzP, dxP);
      let angleDiff = targetAngle - ud.heading;
      // Normalize
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      ud.heading += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.03);

      // Move faster when pursuing
      const pursuitSpeed = ud.speed * 1.3;
      rs.position.x += Math.cos(ud.heading) * pursuitSpeed;
      rs.position.z += Math.sin(ud.heading) * pursuitSpeed;
      rs.rotation.y = -ud.heading + Math.PI / 2;

      // Shoot broadside at player (from starboard/right side)
      ud.shootCooldown -= dt;
      if (ud.shootCooldown <= 0 && distToPlayer < AGGRO_RADIUS && distToPlayer > 8) {
        // Enemy forward = (cos(heading), 0, sin(heading))
        // Starboard (right) perpendicular
        const rightX = -Math.sin(ud.heading);
        const rightZ = Math.cos(ud.heading);
        const fwdX = Math.cos(ud.heading);
        const fwdZ = Math.sin(ud.heading);

        // Check which side the player is on; fire from the closer side
        const toPlayerX = dxP, toPlayerZ = dzP;
        const dot = toPlayerX * rightX + toPlayerZ * rightZ;
        const sideX = dot >= 0 ? rightX : -rightX;
        const sideZ = dot >= 0 ? rightZ : -rightZ;

        for (let ci = 0; ci < 2; ci++) {
          const offset = (ci - 0.5) * 2.5;
          const mx = rs.position.x + fwdX * offset + sideX * 3;
          const mz = rs.position.z + fwdZ * offset + sideZ * 3;
          const muzzle = new THREE.Vector3(mx, rs.position.y + 5, mz);
          const target = new THREE.Vector3(
            mx + sideX * 60, rs.position.y + 4, mz + sideZ * 60
          );
          fireCannonball(muzzle, target);
          createCannonFlash(muzzle.clone());
          createCannonSmoke(muzzle.clone());
        }
        playSoundBuffer('cannon1', 0.3);
        ud.shootCooldown = AGGRO_SHOOT_COOLDOWN + Math.random() * 1.5;
      }
    } else {
      // Random course changes (idle roaming)
      ud.turnTimer += dt;
      if (ud.turnTimer > ud.turnInterval) {
        ud.heading += (Math.random() - 0.5) * 1.2;
        ud.turnInterval = 3 + Math.random() * 5;
        ud.turnTimer = 0;
      }

      // Move at normal speed
      rs.position.x += Math.cos(ud.heading) * ud.speed;
      rs.position.z += Math.sin(ud.heading) * ud.speed;
      rs.rotation.y = -ud.heading + Math.PI / 2;
    }

    // Avoid map edges (always)
    const edgeDist = OCEAN_SIZE / 2 - 30;
    if (Math.abs(rs.position.x) > edgeDist || Math.abs(rs.position.z) > edgeDist) {
      ud.heading = Math.atan2(-rs.position.z, -rs.position.x) + (Math.random() - 0.5) * 0.5;
    }

    // ---- Roaming ship collisions vs islands ----
    for (const isl of islandMeshes) {
      const dx = rs.position.x - isl.position.x;
      const dz = rs.position.z - isl.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 18 && dist > 0) {
        const nx = dx / dist, nz = dz / dist;
        rs.position.x = isl.position.x + nx * 18;
        rs.position.z = isl.position.z + nz * 18;
        ud.heading = Math.atan2(nz, nx) + (Math.random() - 0.5) * 0.5;
      }
    }

    // ---- Roaming ship collisions vs other roaming ships ----
    for (let j = i - 1; j >= 0; j--) {
      const other = state.roamingShips[j];
      if (other.userData.sinking) continue;
      const dx = rs.position.x - other.position.x;
      const dz = rs.position.z - other.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 10 && dist > 0) {
        const push = (10 - dist) * 0.5;
        const nx = dx / dist, nz = dz / dist;
        rs.position.x += nx * push;
        rs.position.z += nz * push;
        other.position.x -= nx * push;
        other.position.z -= nz * push;
      }
    }

    // Bob on waves
    rs.position.y = ud.sinking ? rs.position.y : Math.sin(elapsed * 1.8 + i * 2) * 0.5;
    rs.rotation.z = ud.sinking ? rs.rotation.z : Math.sin(elapsed * 1.3 + i) * 0.02;

    // Billboard health bars toward camera
    const bg = rs.getObjectByName('healthBarBg');
    const fill = rs.getObjectByName('healthBarFill');
    if (bg) bg.lookAt(camera.position);
    if (fill) fill.lookAt(camera.position);
  }

  // ---- Player health bar billboard ----
  if (ship) {
    const pbg = ship.getObjectByName('healthBarBg');
    const pfill = ship.getObjectByName('healthBarFill');
    if (pbg) pbg.lookAt(camera.position);
    if (pfill) pfill.lookAt(camera.position);
  }

  // ---- Fire effects on damaged ships ----
  updateShipFires(dt, elapsed);
  updateDrops(elapsed);

  // ---- Allied fleet ships (/fleet command) ----
  if (state._allies && state._allies.length > 0 && ship) {
    state._allies.forEach((ally, ai) => {
      const ad = ally.userData;
      ad.orbitAngle += ad.orbitSpeed;
      ally.position.set(
        ship.position.x + Math.cos(ad.orbitAngle) * 20,
        Math.sin(elapsed * 2 + ai) * 0.4,
        ship.position.z + Math.sin(ad.orbitAngle) * 20
      );
      ally.rotation.y = ad.orbitAngle + Math.PI / 2;
      // Allies shoot nearby enemies
      ad.shootTimer -= dt;
      if (ad.shootTimer <= 0) {
        let nearestEnemy = null, nDist = 50;
        state.roamingShips.forEach(rs => {
          if (rs.userData.sinking) return;
          const d = ally.position.distanceTo(rs.position);
          if (d < nDist) { nDist = d; nearestEnemy = rs; }
        });
        if (nearestEnemy) {
          fireCannonball(
            ally.position.clone().add(new THREE.Vector3(0, 4, 0)),
            nearestEnemy.position.clone().add(new THREE.Vector3(0, 4, 0)),
            true
          );
          ad.shootTimer = 2.5 + Math.random();
        } else {
          ad.shootTimer = 1;
        }
      }
    });
  }

  // ---- Cannon cooldown ----
  if (!state.cannonReady) {
    state.cannonCooldown -= dt;
    if (state.cannonCooldown <= 0) {
      state.cannonCooldown = 0;
      state.cannonReady = true;
    }
  }
  // Update cooldown UI
  const cdFill = document.getElementById('cannon-cooldown-fill');
  if (cdFill) {
    const capRate = state.captain ? state.captain.fireRate : 1;
    const actualCooldown = CANNON_COOLDOWN / capRate;
    const pct = state.cannonReady ? 100 : ((actualCooldown - state.cannonCooldown) / actualCooldown) * 100;
    cdFill.style.width = `${pct}%`;
    if (state.cannonReady) cdFill.classList.remove('reloading');
    else cdFill.classList.add('reloading');
  }

  autoSave(dt);
  drawMinimap();
  renderer.render(scene, camera);
}

// ---- Resize ----
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---- Init ----
let _musicStarted = false;
function ensureMusic() {
  if (_musicStarted) return;
  _musicStarted = true;
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  startBackgroundMusic();
}

async function init() {
  loadProgress(); // Restore badges, quests, unlocked captains from localStorage

  // Clicking splash starts music early and skips to captain select
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.style.cursor = 'pointer';
    splash.addEventListener('click', () => {
      ensureMusic();
      splash.remove();
      document.getElementById('captain-select-overlay').style.display = '';
    });
  }

  // Auto-transition after 3.5s
  setTimeout(() => {
    if (splash && splash.parentNode) {
      splash.remove();
      document.getElementById('captain-select-overlay').style.display = '';
    }
  }, 3500);

  buildCaptainSelection();
  createSky();
  createStars();
  createOcean();
  await loadAllModels();
  await loadAllSounds();
  ISLAND_DATA.forEach((d, i) => createIsland(d, (i / 7) * Math.PI * 2 - Math.PI / 2));
  createShip();
  spawnRoamingShips();
  camera.position.set(0, CAMERA_HEIGHT + 30, CAMERA_DISTANCE + 30);
  camera.lookAt(0, 0, 0);
  updateHUD();
  animate();
}

// Save on page unload
window.addEventListener('beforeunload', saveProgress);

init();
