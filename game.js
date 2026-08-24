// Uni Ark - readable source. Run `node compress.js` to create game.min.js.
const canvas = document.querySelector("#game");
const pen = canvas.getContext("2d");
pen.imageSmoothingEnabled = false;
const W = 800;
const H = 440;
pen.scale(canvas.width / W, canvas.height / H);
const colors = ["#ff4d8e", "#ff963e", "#ffe54e", "#54dd83", "#55c5ff", "#9d72ff"];
const groundColors = ["#6a5", "#8b6", "#9c7", "#ba8", "#cb9", "#795"];
const storageKey = "unicornBlast.uniArk.save";
const endingNames = ["GOLD", "FRIENDS", "LAST UNICORN", "DRAGON", "PARADE", "ONE PIECE"];
const secondEndingNames = ["BURGER", "DOUBLE RAINBOW", "TITANIC", "42", "SOFTEST BED", "PRISM CAVE"];
const endings = [
  ["A POT OF GOLD!", "A stranded leprechaun shares gold and a safe hill."],
  ["NEW BEST FRIENDS!", "A lost herd welcomes the unicorn into its family."],
  ["THE LAST UNICORN!", "The unicorn reached the ark—but no other unicorn came. With no pair, it became the last of its kind."],
  ["A TINY RAINBOW DRAGON!", "The rescued egg hatches into a loyal flying friend."],
  ["THE GRAND PARADE!", "The unicorn led every wandering critter to safety\u2014in the opposite direction from the ark."],
  ["THE ONE PIECE!", "The unicorn found the One Piece and left an IOU note for Luffy."]
];
const secondEndings = endings.map(ending => ending.slice());
secondEndings[0] = ["THE PERFECT BURGER!", "The unicorn found a burger and stopped for one bite."];
secondEndings[1] = ["A DOUBLE RAINBOW!", "The unicorn found a double rainbow and couldn't look away."];
secondEndings[2] = ["THE WRONG BOAT!", "The unicorn boarded the Titanic instead\u2014and missed the ark."];
secondEndings[3] = ["THE ANSWER WAS 42!", "The unicorn found the number 42 and understood the meaning of life."];
secondEndings[4] = ["THE SOFTEST BED!", "The unicorn found the softest bed in the world, overslept."];
secondEndings[5] = ["THE PRISM CAVE!", "Six crystal walls the perfect unicorn home."];

const columns = 51;
const rows = 41;
const cell = 28;
const mazeX = 0;
const mazeY = 0;
const arkSignColumn = 25;
const arkSignRow = 37;
const worldWidth = columns * cell;
const worldHeight = rows * cell;
const keys = new Set();
const particles = [];
const paint = [];
const treeDrops = [];
const treeDropTimes = new Map();
let lastOpen = [];
const pickups = [];
const critters = [];
const effects = Array(6).fill(0);
const pickupColors = ["#5d8", , "#fe5", "#97f", "#d47", "#f62", , "#f4f"];
const pickupTimes = [600, , 600, 300, 300, 300];
const speaker = window.speechSynthesis;
const Speech = window.SpeechSynthesisUtterance;
const pickupSpeech = "Speed||vision|wall walk|slow curse|flood surge||rainbow laser".split("|");
let pickupPopup = "";
let pickupPopupUntil = 0;
let laserShots = 0;
let beam = 0;
let glowType = -1;
let maze = [];
let mode = "title";
let frame = 0;
let nextFrame = 0;
let waterY = H + 30;
let ending = 0;
let endingQuest = 1;
let finaleTime = 0;
let doubleFinalePending = false;
let shake = 0;
let flash = 0;
let audio;
let master;
let muted = false;
let bumpWait = 0;
let cameraX = 0;
let cameraY = 0;
let arkDirection = 1;
let foundEndings = 0;
const unicorn = { x: 0, y: 0, direction: 1 };
const firstQuestMask = 63;
const allQuestsMask = 4095;
const achievementNames = [
  "KNOCK 30 APPLES DOWN", "KNOCK 80 APPLES DOWN", "KNOCK 140 APPLES DOWN",
  "LEARN TO WALK AROUND", "LAST 20 SECONDS", "LAST 40 SECONDS", "LAST 60 SECONDS",
  "SWIM WITH THE FISHIES", "CHASE 15 CRITTERS", "CHASE 40 CRITTERS", "CHASE 70 CRITTERS",
  "CURSES", "NO POWER-UPS", "GET ON THE ARK"
];
let achievementBits = 0;
let applesKnocked = 0;
let crittersChased = 0;
let longestRun = 0;
let roundFrames = 0;
let roundDistance = 0;
let roundPickups = 0;
let roundCurses = 0;
let achievementPopup = "";
let achievementPopupUntil = 0;
let nextCritterSpawn = 0;

loadProgress();

const scale = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];

function startAudio() {
  if (!audio) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audio = new Audio();
    master = audio.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(audio.destination);
  }
  audio.resume();
}

function tone(frequency, duration = 0.12, type = "triangle", volume = 0.12, delay = 0) {
  if (!audio || muted) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const time = audio.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, time);
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  oscillator.connect(gain).connect(master);
  oscillator.start(time);
  oscillator.stop(time + duration);
}

function musicTick() {
  if (!audio || muted) return;
  if (mode === "title" && frame % 48 === 0) {
    tone(scale[Math.floor(frame / 48) % 6], 0.28, "triangle", 0.055);
  }
  if (mode === "maze") {
    const danger = Math.max(0, Math.min(1, (worldHeight + 60 - waterY) / worldHeight));
    const beat = Math.max(6, Math.floor(24 - danger * 18));
    if (frame % beat === 0) {
      const column = Math.floor((unicorn.x - mazeX) / cell);
      const row = Math.floor((unicorn.y - mazeY) / cell);
      const note = scale[Math.abs(column + row + Math.floor(frame / beat)) % scale.length];
      tone(note * (danger > 0.65 ? 2 : 1), 0.11, "triangle", 0.08);
      tone(note / 2, 0.18, "sine", 0.05);
      if (danger > 0.5) tone(90, 0.04, "square", 0.06, 0.06);
    }
  }
  if (mode === "finale" && ending === 2 && endingQuest === 1) {
    if (finaleTime < 300 && finaleTime % 18 === 0) {
      const note = [392, 493.88, 587.33, 783.99][Math.floor(finaleTime / 18) % 4];
      tone(note, .22, "triangle", .065);
      tone(note / 2, .3, "sine", .035);
    } else if (finaleTime === 300) {
      tone(392, .65, "sine", .08);
      tone(311.13, .8, "triangle", .065, .16);
      tone(233.08, 1.2, "sine", .055, .34);
    } else if (finaleTime > 300 && finaleTime % 54 === 0) {
      const note = [293.66, 261.63, 233.08, 196][Math.floor((finaleTime - 300) / 54) % 4];
      tone(note, .75, "sine", .05);
      tone(note / 2, .9, "triangle", .025);
    }
  } else if (mode === "finale" && frame % 24 === 0) {
    const root = scale[ending % scale.length];
    tone(root, 0.3, "sine", 0.07);
    tone(root * 1.25, 0.3, "triangle", 0.05, 0.08);
    tone(root * 1.5, 0.35, "sine", 0.04, 0.16);
  }
}

function rect(x, y, width, height, color) {
  pen.fillStyle = color;
  pen.fillRect(Math.floor(x), Math.floor(y), Math.ceil(width), Math.ceil(height));
}

function roundRect(x, y, width, height, radius, color) {
  const corner = Math.max(2, Math.floor(radius / 2));
  rect(x + corner, y, width - corner * 2, height, color);
  rect(x, y + corner, width, height - corner * 2, color);
}

function circle(x, y, radius, color) {
  const size = Math.ceil(radius * 2);
  const corner = Math.max(1, Math.floor(radius / 3));
  rect(x - radius + corner, y - radius, size - corner * 2, size, color);
  rect(x - radius, y - radius + corner, size, size - corner * 2, color);
}

function line(x1, y1, x2, y2, color, size) {
  pen.strokeStyle = color;
  pen.lineWidth = size;
  pen.lineCap = "butt";
  pen.beginPath();
  pen.moveTo(x1, y1);
  pen.lineTo(x2, y2);
  pen.stroke();
}

function text(message, x, y, size, color = "#482260") {
  pen.fillStyle = color;
  pen.textAlign = "center";
  pen.font = `900 ${size}px monospace`;
  pen.fillText(message, x, y);
}

function wrappedText(message, x, y, width, size, color = "#482260") {
  pen.font = `900 ${size}px monospace`;
  const words = message.split(" ");
  const lines = [""];
  for (const word of words) {
    const line = lines[lines.length - 1];
    const next = line ? `${line} ${word}` : word;
    if (line && pen.measureText(next).width > width) lines.push(word);
    else lines[lines.length - 1] = next;
  }
  lines.forEach((line, index) => text(line, x, y + index * (size + 4), size, color));
}

function ease(value) {
  value = Math.max(0, Math.min(1, value));
  return 1 - (1 - value) ** 3;
}

function saveProgress() {
  const save = {
    version: 1,
    quests: {
      rainbow: endingNames.filter((name, index) => foundEndings & 1 << index),
      doubleRainbow: secondEndingNames.filter((name, index) => foundEndings & 1 << index + 6)
    },
    achievements: achievementNames.filter((name, index) => achievementBits & 1 << index),
    stats: {
      applesKnockedDown: applesKnocked,
      crittersChased,
      longestRunSeconds: longestRun
    }
  };
  localStorage.setItem(storageKey, JSON.stringify(save, null, 2));
}

function loadProgress() {
  let save;
  try {
    save = JSON.parse(localStorage.getItem(storageKey) ?? "null");
  } catch (error) {
    save = null;
  }
  if (save && save.quests && save.stats) {
    const rainbow = Array.isArray(save.quests.rainbow) ? save.quests.rainbow : [];
    const doubleRainbow = Array.isArray(save.quests.doubleRainbow) ? save.quests.doubleRainbow : [];
    endingNames.forEach((name, index) => {
      if (rainbow.includes(name)) foundEndings |= 1 << index;
      if (doubleRainbow.includes(secondEndingNames[index])) foundEndings |= 1 << index + 6;
    });
    const unlocked = Array.isArray(save.achievements) ? save.achievements : [];
    achievementNames.forEach((name, index) => {
      if (unlocked.includes(name)) achievementBits |= 1 << index;
    });
    applesKnocked = Number(save.stats.applesKnockedDown) || 0;
    crittersChased = Number(save.stats.crittersChased) || 0;
    longestRun = Number(save.stats.longestRunSeconds) || 0;
  }
}

function unlockAchievement(index) {
  const bit = 1 << index;
  if (achievementBits & bit) return;
  achievementBits |= bit;
  saveProgress();
  achievementPopup = achievementNames[index];
  achievementPopupUntil = frame + 180;
  flash = Math.max(flash, 4);
  tone(880, .18, "triangle", .09);
  tone(1174.66, .22, "triangle", .07, .1);
}

function checkAchievementTiers(value, targets, startIndex) {
  targets.forEach((target, index) => {
    if (value >= target) unlockAchievement(startIndex + index);
  });
}

function achievementProgress(index) {
  if (index < 3) {
    const target = [30, 80, 140][index];
    return `${Math.min(applesKnocked, target)}/${target} APPLES`;
  }
  if (index >= 4 && index <= 6) {
    const target = [20, 40, 60][index - 4];
    return `${Math.min(longestRun, target)}/${target} SECONDS`;
  }
  if (index >= 8 && index <= 10) {
    const target = [15, 40, 70][index - 8];
    return `${Math.min(crittersChased, target)}/${target} CRITTERS`;
  }
  if (index === 13) return "LOCKED";
  return achievementBits & 1 << index ? "UNLOCKED" : "LOCKED";
}

function makeMaze() {
  maze = Array.from({ length: rows }, () => Array(columns).fill("#"));
  const stack = [[25, 39]];
  maze[39][25] = ".";
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const directions = [[2, 0], [-2, 0], [0, 2], [0, -2]]
      .sort(() => Math.random() - 0.5);
    const next = directions.find(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx > 0 && nx < columns - 1 && ny > 0 && ny < rows - 1 && maze[ny][nx] === "#";
    });
    if (!next) {
      stack.pop();
      continue;
    }
    const [dx, dy] = next;
    maze[y + dy / 2][x + dx / 2] = ".";
    maze[y + dy][x + dx] = ".";
    stack.push([x + dx, y + dy]);
  }

  // Add balanced horizontal and vertical loops for shorter, branchier routes.
  let opened = 0;
  let attempts = 0;
  while (opened < 96 && attempts++ < 1200) {
    const vertical = opened % 2 === 0;
    const x = vertical ? 1 + Math.floor(Math.random() * 25) * 2 :
      2 + Math.floor(Math.random() * 24) * 2;
    const y = vertical ? 2 + Math.floor(Math.random() * 19) * 2 :
      1 + Math.floor(Math.random() * 20) * 2;
    if (maze[y][x] === "#") {
      maze[y][x] = ".";
      opened++;
    }
  }

  // Keep a small clearing around the sign so nearby tree canopies cannot hide it.
  for (let row = arkSignRow - 1; row <= arkSignRow + 1; row++) {
    for (let column = arkSignColumn - 2; column <= arkSignColumn + 2; column++) {
      maze[row][column] = ".";
    }
  }

  // Put all six endings in distant dead ends throughout the world.
  const choices = [];
  const fallbackChoices = [];
  for (let y = 3; y < rows - 1; y += 2) {
    for (let x = 1; x < columns - 1; x += 2) {
      const exits = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .filter(([dx, dy]) => maze[y + dy][x + dx] === ".").length;
      if (Math.abs(x - 25) + Math.abs(y - 39) > 12) {
        const choice = [x, y];
        fallbackChoices.push(choice);
        if (exits === 1) choices.push(choice);
      }
    }
  }
  choices.sort(() => Math.random() - 0.5);
  const chosen = [];
  for (const choice of choices) {
    if (chosen.every(other => Math.abs(choice[0] - other[0]) +
      Math.abs(choice[1] - other[1]) > 12)) chosen.push(choice);
    if (chosen.length === 6) break;
  }
  for (const choice of choices) {
    if (chosen.length === 6) break;
    if (!chosen.includes(choice)) chosen.push(choice);
  }
  fallbackChoices.sort(() => Math.random() - 0.5);
  for (const choice of fallbackChoices) {
    if (chosen.length === 6) break;
    if (!chosen.includes(choice) && chosen.every(other =>
      Math.abs(choice[0] - other[0]) + Math.abs(choice[1] - other[1]) > 8)) chosen.push(choice);
  }
  for (const choice of fallbackChoices) {
    if (chosen.length === 6) break;
    if (!chosen.includes(choice)) chosen.push(choice);
  }
  chosen.forEach(([x, y], index) => maze[y][x] = String(index));

  pickups.length = 0;
  effects.fill(0);
  laserShots = beam = 0;
  glowType = -1;
  for (let index = 0; index < 7;) {
    const x = 1 + Math.floor(Math.random() * 25) * 2;
    const y = 1 + Math.floor(Math.random() * 20) * 2;
    if (maze[y][x] === "." && Math.abs(x - 25) + Math.abs(y - 39) > 5) {
      const point = cellCenter(x, y);
      const type = [0, 2, 3, 4, 5, 7, 2][index];
      pickups.push([point.x, point.y, type]);
      index++;
    }
  }

  critters.length = 0;
  treeDrops.length = 0;
  treeDropTimes.clear();
  for (let index = 0; index < 36; index++) spawnCritter(false, index);
  nextCritterSpawn = frame + 480;

  // The Ark sign is a false lead; there is no Ark destination in the maze.
  arkDirection = Math.random() < 0.5 ? -1 : 1;
}

function cellCenter(column, row) {
  return { x: mazeX + (column + 0.5) * cell, y: mazeY + (row + 0.5) * cell };
}

function openAt(x, y) {
  const column = Math.floor((x - mazeX) / cell);
  const row = Math.floor((y - mazeY) / cell);
  if (row < 0 || row >= rows || column < 0 || column >= columns) return false;
  if (effects[3]) return true;
  return maze[row][column] !== "#";
}

function canStand(x, y) {
  const radius = 8;
  return openAt(x - radius, y - radius) && openAt(x + radius, y - radius) &&
    openAt(x - radius, y + radius) && openAt(x + radius, y + radius);
}

function critterCanStand(x, y) {
  const radius = 5;
  return x - radius >= mazeX && x + radius < mazeX + worldWidth &&
    y - radius >= mazeY && y + radius < mazeY + worldHeight;
}

function spawnCritter(keepAway = true, typeIndex = critters.length) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const column = 1 + Math.floor(Math.random() * 25) * 2;
    const row = 1 + Math.floor(Math.random() * 20) * 2;
    if (maze[row][column] !== "." || Math.abs(column - 25) + Math.abs(row - 39) <= 5) continue;
    const point = cellCenter(column, row);
    if (keepAway && Math.hypot(point.x - unicorn.x, point.y - unicorn.y) < 220) continue;
    if (critters.some(critter => Math.hypot(point.x - critter.x, point.y - critter.y) < 16)) continue;
    critters.push({
      x: point.x + (Math.random() - .5) * 8,
      y: point.y + (Math.random() - .5) * 8,
      angle: Math.random() * Math.PI * 2,
      turn: 20 + Math.random() * 100,
      type: typeIndex % 3,
      direction: Math.random() < .5 ? -1 : 1,
      step: Math.random() * 20,
      chased: false
    });
    return true;
  }
  return false;
}

function spawnMoreCritters() {
  if (frame < nextCritterSpawn || critters.length >= 60) return;
  nextCritterSpawn = frame + 480 + Math.random() * 240;
  spawnCritter();
}

function updateCritters() {
  for (const critter of critters) {
    if (--critter.turn <= 0) {
      critter.angle += (Math.random() - .5) * 2.8;
      critter.turn = 35 + Math.random() * 110;
    }
    const dx = critter.x - unicorn.x;
    const dy = critter.y - unicorn.y;
    const distance = Math.hypot(dx, dy);
    const fleeing = distance < 105;
    let vx = Math.cos(critter.angle) * .22;
    let vy = Math.sin(critter.angle) * .22;
    if (fleeing) {
      if (!critter.chased) {
        critter.chased = true;
        crittersChased++;
        saveProgress();
        checkAchievementTiers(crittersChased, [15, 40, 70], 8);
      }
      const hurry = (105 - distance) / 105 * 2.15;
      vx += dx / Math.max(1, distance) * hurry;
      vy += dy / Math.max(1, distance) * hurry;
    }
    const waterDistance = waterY - critter.y;
    if (waterDistance < 190) vy -= (190 - waterDistance) / 190 * .72;
    const speed = Math.hypot(vx, vy);
    const maxSpeed = fleeing ? 2.35 : 2;
    if (speed > maxSpeed) {
      vx *= maxSpeed / speed;
      vy *= maxSpeed / speed;
    }
    let moved = false;
    if (critterCanStand(critter.x + vx, critter.y)) {
      critter.x += vx;
      moved = true;
    }
    if (critterCanStand(critter.x, critter.y + vy)) {
      critter.y += vy;
      moved = true;
    }
    if (!moved) {
      critter.angle += Math.PI * (.55 + Math.random() * .9);
      critter.turn = 8;
    }
    if (Math.abs(vx) > .05) critter.direction = Math.sign(vx);
    critter.step += speed;
  }
}

function drawCritter(critter) {
  const hop = Math.abs(Math.sin(critter.step * .45)) * 1.5;
  pen.save();
  pen.translate(critter.x, critter.y - hop);
  pen.scale(critter.direction * .82, .82);
  if (critter.type === 0) {
    circle(-1, 1, 6, "#f2e3db");
    circle(5, -2, 4, "#fff4ed");
    roundRect(4, -12, 3, 9, 2, "#fff4ed");
    roundRect(8, -11, 3, 9, 2, "#e7ced0");
    circle(7, -3, 1, "#382643");
    circle(-7, 2, 3, "#fff");
  } else if (critter.type === 1) {
    roundRect(-7, -5, 14, 10, 4, "#ef8b42");
    circle(7, -4, 5, "#f6a055");
    line(-6, 1, -12, -5, "#ef8b42", 4);
    line(-11, -5, -14, -2, "#fff3df", 3);
    circle(9, -5, 1, "#30233e");
  } else {
    circle(0, -1, 6, "#6ad7c5");
    circle(6, -3, 4, "#8ae8d6");
    pen.fillStyle = "#ffe56a";
    pen.beginPath();
    pen.moveTo(10, -3); pen.lineTo(15, -1); pen.lineTo(10, 1); pen.fill();
    line(-2, 1, -8, 6, "#46a8b3", 4);
    circle(7, -4, 1, "#30233e");
  }
  pen.restore();
}

function drawCritters() {
  for (const critter of critters) drawCritter(critter);
}

function drawFog() {
  const screenX = unicorn.x - cameraX;
  const screenY = unicorn.y - cameraY;
  const sight = effects[2] ? 330 : 145;
  const fog = pen.createRadialGradient(screenX, screenY, 42,
    screenX, screenY, sight);
  fog.addColorStop(0, "#12072500");
  fog.addColorStop(0.5, "#12072535");
  fog.addColorStop(1, "#120725f5");
  pen.fillStyle = fog;
  pen.fillRect(0, 0, W, H);
}

function drawSky() {
  const sky = pen.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#6842b3");
  sky.addColorStop(0.5, "#79ddff");
  sky.addColorStop(1, "#ffd4ed");
  rect(0, 0, W, H, sky);
  const arch = [6, 4, 3, 2, 1, 0, 0, 1, 2, 3, 4, 6];
  colors.forEach((color, band) => arch.forEach((step, index) =>
    rect(index * 72 - 10, 52 + step * 10 + band * 6, 58, 7, color + "88")));
  circle(710, 55, 35, "#fff39c");
  for (let star = 0; star < 24; star++) {
    circle((star * 137 + frame * 0.08) % W, 10 + star * 47 % 100,
      star % 5 ? 1.5 : 3, "#fff7c4");
  }
}

function treeTypeAt(x, y) {
  const column = x / cell | 0;
  const row = y / cell | 0;
  const groveColumn = column / 8 | 0;
  const groveRow = row / 7 | 0;
  return Math.abs(groveColumn * 7 + groveRow * 11 + (groveColumn / 2 | 0) * 3) % 3;
}

function dropFromTree(x, y, brush, treeType) {
  if (mode !== "maze" || brush < .3) return;
  const column = x / cell | 0;
  const row = y / cell | 0;
  if (Math.abs(column * 19 + row * 23) % 3) return;
  const treeId = `${x},${y}`;
  if ((treeDropTimes.get(treeId) || 0) > frame) return;
  treeDropTimes.set(treeId, frame + 210);
  const complete = (foundEndings & firstQuestMask) === firstQuestMask;
  if (treeType === 0) {
    const amount = 2 + (column + row & 1);
    for (let index = 0; index < amount; index++) treeDrops.push({
      x: x + 8 + Math.random() * 15,
      y: y + 1 + Math.random() * 8,
      vx: (Math.random() - .5) * 1.2,
      vy: -.35 - Math.random() * .45,
      spin: Math.random() * Math.PI,
      turn: (Math.random() - .5) * .18,
      ground: y + 25 + Math.random() * 5,
      life: 170 + Math.random() * 70,
      type: "leaf",
      color: complete ? ["#8d3f78", "#d65a9d", "#f3a0c8"][(column + index) % 3] :
        ["#174d3d", "#278855", "#72c96c"][(column + index) % 3]
    });
  } else if (treeType === 1) {
    applesKnocked++;
    saveProgress();
    checkAchievementTiers(applesKnocked, [30, 80, 140], 0);
    treeDrops.push({
    x: x + 15,
    y: y + 2,
    vx: (Math.random() - .5) * .7,
    vy: -.5,
    spin: 0,
    turn: 0,
    ground: y + 27,
    life: 300,
    type: "fruit",
      color: "#ef4f58"
    });
  } else {
    const amount = 3 + (column + row & 1);
    for (let index = 0; index < amount; index++) treeDrops.push({
      x: x + 5 + Math.random() * 20,
      y: y - 3 + Math.random() * 15,
      vx: (Math.random() - .5) * .8,
      vy: -.15 - Math.random() * .3,
      spin: Math.random() * Math.PI,
      turn: (Math.random() - .5) * .1,
      ground: y + 25 + Math.random() * 4,
      life: 150 + Math.random() * 70,
      type: "snow",
      color: complete ? (index & 1 ? "#f3b4d4" : "#ffe1f0") :
        (index & 1 ? "#d9f4ff" : "#f7fdff")
    });
  }
}

function updateTreeDrops() {
  for (let index = treeDrops.length - 1; index >= 0; index--) {
    const drop = treeDrops[index];
    if (drop.y < drop.ground || drop.vy < 0) {
      drop.vy += drop.type === "fruit" ? .075 : drop.type === "snow" ? .018 : .025;
      if (drop.type !== "fruit") drop.vx += Math.sin(frame * .12 + drop.spin) * .012;
      drop.x += drop.vx;
      drop.y += drop.vy;
      drop.spin += drop.turn;
      if (drop.y >= drop.ground) {
        drop.y = drop.ground;
        drop.vy = drop.type === "fruit" ? -Math.abs(drop.vy) * .28 : 0;
        drop.vx *= .65;
      }
    }
    if (--drop.life <= 0) treeDrops.splice(index, 1);
  }
}

function drawTreeDrops() {
  for (const drop of treeDrops) {
    pen.save();
    pen.globalAlpha = Math.min(1, drop.life / 35);
    pen.translate(drop.x, drop.y);
    if (drop.type === "leaf") {
      pen.rotate(drop.spin);
      rect(-3, -1, 6, 3, drop.color);
      rect(2, 0, 3, 1, "#7b5534");
    } else if (drop.type === "fruit") {
      circle(0, 0, 4.5, drop.color);
      line(0, -4, 1, -8, "#70452e", 2);
      pen.rotate(-.5);
      rect(1, -8, 5, 2, "#55a84f");
    } else {
      circle(0, 0, 2.7, drop.color);
      circle(-2, 2, 1.5, "#bde8fa");
    }
    pen.restore();
  }
}

function drawTree(x, y) {
  const walking = keys.has("w") || keys.has("a") || keys.has("s") || keys.has("d") ||
    keys.has("arrowup") || keys.has("arrowleft") || keys.has("arrowdown") || keys.has("arrowright");
  const brushDistance = Math.hypot(unicorn.x - (x + 15), unicorn.y - (y + 8));
  const brush = walking ? Math.max(0, 1 - brushDistance / 52) : 0;
  const fluff = brush * (.65 + Math.sin(frame * .55 + x * .13 + y * .09) * .35);
  const sway = Math.sin(frame * .42 + x * .17) * brush * 2.4;
  const treeType = treeTypeAt(x, y);
  const secondQuest = (foundEndings & firstQuestMask) === firstQuestMask;
  dropFromTree(x, y, brush, treeType);
  if (treeType === 2) {
    roundRect(x + 12, y + 8, 6, 22, 2, secondQuest ? "#75405f" : "#60452f");
    pen.save();
    pen.translate(sway, 0);
    pen.beginPath();
    pen.moveTo(x + 15, y - 8);
    pen.lineTo(x + 1, y + 18);
    pen.lineTo(x + 29, y + 18);
    pen.fillStyle = secondQuest ? "#7b2f69" : "#17473f";
    pen.fill();
    pen.beginPath();
    pen.moveTo(x + 15, y);
    pen.lineTo(x + 3, y + 25);
    pen.lineTo(x + 27, y + 25);
    pen.fillStyle = secondQuest ? "#a84482" : "#24725b";
    pen.fill();
    line(x + 15, y - 4, x + 15, y + 18, secondQuest ? "#e77eb5" : "#70bd78", 2);
    line(x + 15, y - 7, x + 7, y + 8, secondQuest ? "#ffe1f0" : "#f4fcff", 3);
    line(x + 15, y, x + 5, y + 19, secondQuest ? "#f3b4d4" : "#d9f4ff", 3);
    line(x + 15, y, x + 25, y + 19, secondQuest ? "#ffd2e8" : "#eefbff", 2);
    pen.restore();
    return;
  }
  roundRect(x + 11, y + 5, 8, 25, 3, secondQuest ?
    (treeType === 1 ? "#824260" : "#75405f") : (treeType === 1 ? "#6b3e2d" : "#75462f"));
  pen.save();
  pen.translate(x + 15 + sway, y + 7);
  pen.scale(1 + fluff * .1, 1 + fluff * .07);
  pen.translate(-x - 15, -y - 7);
  circle(x + 15, y + 7, 13, secondQuest ? (treeType === 1 ? "#7b315f" : "#713064") :
    (treeType === 1 ? "#24543f" : "#174d3d"));
  circle(x + 7, y + 8, 10, secondQuest ? (treeType === 1 ? "#b44f84" : "#a94282") :
    (treeType === 1 ? "#367a4d" : "#278855"));
  circle(x + 23, y + 9, 10, secondQuest ? (treeType === 1 ? "#e97db2" : "#f080bd") :
    (treeType === 1 ? "#4b9a58" : "#55d47b"));
  if (treeType === 1) {
    circle(x + 8, y + 4, 2.5, "#ef4f58");
    circle(x + 19, y + 10, 2.5, "#f36b55");
    circle(x + 23, y + 2, 2.5, "#ef4f58");
  } else circle(x + 10, y + 2, 4, secondQuest ? "#ffd0e8" : "#c6ff8d");
  pen.restore();
}

function drawMaze(trees = false) {
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const tile = maze[row][column];
      const x = mazeX + column * cell;
      const y = mazeY + row * cell;
      if (x + cell < cameraX - 30 || x > cameraX + W + 30 ||
        y + cell < cameraY - 30 || y > cameraY + H + 30) continue;
      if (trees) {
        if (tile === "#") drawTree(x, y);
      } else {
        const ground = groundColors[((row / 6 | 0) + (column / 8 | 0)) % 6];
        rect(x, y, cell, cell, ground);
        if (tile !== "#") {
          const destination = Number(tile);
          if (Number.isInteger(destination)) drawExit(column, row, destination);
        }
      }
    }
  }
  if (!trees) drawArkSign();
}

function drawExit(column, row, index) {
  const point = cellCenter(column, row);
  circle(point.x, point.y, 14 + Math.sin(frame * 0.12) * 2, colors[index]);
  const questOffset = (foundEndings & firstQuestMask) === firstQuestMask ? 6 : 0;
  if (foundEndings & 1 << index + questOffset) {
    text("★", point.x, point.y + 5, 14, "#fff");
    text((questOffset ? secondEndingNames : endingNames)[index], point.x, point.y - 18, 9, "#fff");
  } else text("?", point.x, point.y + 7, 20, "#fff");
}

function drawArkSign() {
  const sign = cellCenter(arkSignColumn, arkSignRow);
  roundRect(sign.x - 31, sign.y - 11, 62, 22, 4, "#8b5735");
  text(arkDirection < 0 ? "← ARK" : "ARK →", sign.x, sign.y + 5, 11, "#fff");
}

function drawUnicorn(x, y, scale = 1, showGlow = true) {
  const complete = (foundEndings & 63) === 63;
  const coat = complete ? colors[Math.floor(frame / 7) % colors.length] : "#fffdf8";
  pen.save();
  pen.translate(x, y);
  pen.scale(unicorn.direction * scale, scale);
  if (showGlow) {
    if (glowType < 0 || !(glowType === 7 ? laserShots : effects[glowType])) {
      glowType = effects.findIndex(Boolean);
      if (glowType < 0 && laserShots) glowType = 7;
    }
    if (glowType >= 0) {
      const pulse = Math.sin(frame * .16) * 2;
      pen.save();
      pen.globalCompositeOperation = "screen";
      pen.globalAlpha = .13;
      circle(0, -3, 31 + pulse, pickupColors[glowType]);
      pen.globalAlpha = .2;
      circle(0, -3, 24 + pulse, pickupColors[glowType]);
      pen.restore();
    }
  }
  roundRect(-14, 10, 28, 7, 3, "#21153b77");
  colors.forEach((color, band) =>
    line(-9, -3 + band * 2, -25 - band * 2, 2 + band * 3, color, 3));
  roundRect(-15, -10, 30, 20, 8, coat);
  roundRect(7, -14, 12, 18, 6, coat);
  circle(18, -14, 8, coat);
  circle(21, -15, 1.3, "#482260");
  pen.fillStyle = "#ffe45b";
  pen.beginPath();
  pen.moveTo(15, -21);
  pen.lineTo(18, -34);
  pen.lineTo(21, -20);
  pen.fill();
  roundRect(-5, -5, 12, 6, 3, "#ff51ad");
  const step = Math.sin(frame * 0.5) * 4;
  line(-7, 7, -9 + step, 17, coat, 5);
  line(7, 7, 9 - step, 17, coat, 5);
  pen.restore();
}

function addParticles(x, y, amount) {
  for (let index = 0; index < amount; index++) {
    particles.push({ x, y,
      vx: (Math.random() - 0.5) * 11,
      vy: (Math.random() - 0.5) * 11,
      life: 16 + Math.random() * 30,
      color: colors[(index + frame) % colors.length] });
  }
}

function updateParticles() {
  for (let index = particles.length - 1; index >= 0; index--) {
    const particle = particles[index];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.08;
    if (--particle.life <= 0) particles.splice(index, 1);
  }
}

function drawParticles() {
  pen.save();
  pen.globalCompositeOperation = "screen";
  for (const particle of particles) {
    pen.globalAlpha = Math.min(1, particle.life / 12);
    circle(particle.x, particle.y, 2.5, particle.color);
  }
  pen.restore();
}

function drawPaint() {
  for (const mark of paint) colors.forEach((color, band) => {
    const offset = (band - 2.5) * 2;
    rect(mark[0] - 3 + (mark[3] ? offset : 0),
      mark[1] - 3 + (mark[2] ? offset : 0), 6, 6, color);
  });
}

function drawPickups() {
  for (const pickup of pickups) {
    const type = pickup[2];
    const x = pickup[0];
    const y = pickup[1] + Math.sin(frame * .1 + x) * 2;
    pen.fillStyle = pickupColors[type];
    pen.beginPath();
    if (type % 3 === 0) {
      pen.moveTo(x, y - 12);
      pen.lineTo(x + 12, y);
      pen.lineTo(x, y + 12);
      pen.lineTo(x - 12, y);
      pen.closePath();
    } else if (type % 3 === 1) pen.arc(x, y, 11, 0, Math.PI * 2);
    else pen.rect(x - 10, y - 10, 20, 20);
    pen.fill();
    pen.strokeStyle = "#fff";
    pen.lineWidth = 2;
    pen.beginPath();
    if (type === 0) {
      pen.moveTo(x - 7, y - 5); pen.lineTo(x - 1, y); pen.lineTo(x - 7, y + 5);
      pen.moveTo(x, y - 5); pen.lineTo(x + 7, y); pen.lineTo(x, y + 5);
    } else if (type === 2) {
      pen.ellipse(x, y, 7, 4, 0, 0, Math.PI * 2);
      pen.moveTo(x + 2, y); pen.arc(x, y, 2, 0, Math.PI * 2);
    } else if (type === 3) {
      pen.rect(x - 6, y - 7, 12, 14); pen.moveTo(x, y - 7); pen.lineTo(x, y + 7);
    } else if (type === 4) {
      pen.moveTo(x - 7, y + 6); pen.lineTo(x + 7, y + 6);
      pen.lineTo(x + 4, y - 3); pen.lineTo(x - 4, y - 3); pen.closePath();
    } else if (type === 5) {
      pen.moveTo(x, y - 8); pen.quadraticCurveTo(x + 11, y + 5, x, y + 8);
      pen.quadraticCurveTo(x - 11, y + 5, x, y - 8);
    } else {
      pen.moveTo(x - 8, y + 6); pen.lineTo(x + 7, y - 7);
      pen.moveTo(x - 2, y - 3); pen.lineTo(x + 7, y - 7); pen.lineTo(x + 3, y + 2);
    }
    pen.stroke();
  }
}

function drawUnicornEffects(x, y) {
  const pulse = Math.sin(frame * .18) * 3;
  if (effects[0]) for (let index = 0; index < 3; index++)
    line(x - unicorn.direction * (24 + index * 9), y - 7 + index * 7,
      x - unicorn.direction * (10 + index * 5), y - 7 + index * 7, colors[index], 2);
  if (effects[2]) {
    pen.strokeStyle = "#ffe54e"; pen.lineWidth = 3; pen.beginPath();
    pen.arc(x, y, 31 + pulse, 0, Math.PI * 2); pen.stroke();
  }
  if (effects[3]) for (let index = 0; index < 4; index++)
    rect(x - 25 + index * 14, y - 24 + index % 2 * 42, 8, 8, "#b993ff99");
  if (effects[4]) {
    circle(x - 10, y + 17, 6, "#5b214f"); circle(x + 10, y + 17, 6, "#5b214f");
  }
  if (effects[5]) for (let index = 0; index < 3; index++)
    line(x - 14 + index * 14, y + 25, x - 14 + index * 14, y + 12, "#ff613e", 3);
}

function drawPickupPopup() {
  const remaining = pickupPopupUntil - frame;
  if (remaining <= 0) return;
  pen.save();
  pen.globalAlpha = Math.min(1, remaining / 18);
  pen.font = "900 14px monospace";
  const width = Math.max(120, pen.measureText(pickupPopup).width + 36);
  roundRect(400 - width / 2, 26, width, 34, 17, "#35175ddd");
  text(pickupPopup, 400, 49, 14, "#fff");
  pen.restore();
}

function drawAchievementPopup() {
  const remaining = achievementPopupUntil - frame;
  if (remaining <= 0) return;
  pen.save();
  pen.globalAlpha = Math.min(1, remaining / 24);
  roundRect(245, 65, 310, 46, 18, "#35175dee");
  text("ACHIEVEMENT UNLOCKED!", 400, 84, 10, "#ffe56a");
  text(achievementPopup, 400, 103, 12, "#fff");
  pen.restore();
}

function collectPickups() {
  for (let index = pickups.length - 1; index >= 0; index--) {
    const pickup = pickups[index];
    if (Math.hypot(unicorn.x - pickup[0], unicorn.y - pickup[1]) < 18) {
      const type = pickup[2];
      roundPickups++;
      if (type >= 4 && type <= 5) {
        roundCurses |= 1 << type - 4;
        if (roundCurses === 3) unlockAchievement(11);
      }
      glowType = type;
      if (type === 7) {
        laserShots = 3;
        shootLaser();
        setTimeout(shootLaser, 2000);
        setTimeout(shootLaser, 4000);
      }
      else effects[type] = pickupTimes[type];
      pickups.splice(index, 1);
      flash = 5;
      pickupPopup = pickupSpeech[type].toUpperCase();
      pickupPopupUntil = frame + 90;
      addParticles(unicorn.x, unicorn.y, 24);
      tone(type < 4 || type === 7 ? 720 : 95, 0.18, "square", 0.1);
      announce(pickupSpeech[type]);
    }
  }
}

function announce(message) {
  if (!speaker) return;
  speaker.cancel();
  const utterance = new Speech(message);
  utterance.pitch = 0.35;
  utterance.rate = 0.72;
  speaker.speak(utterance);
}

function drawWater(level = waterY, fullWidth = worldWidth, bottom = worldHeight) {
  if (level > bottom) return;
  const water = pen.createLinearGradient(0, level, 0, bottom);
  water.addColorStop(0, "#71e7ffbb");
  water.addColorStop(1, "#246bdbed");
  pen.fillStyle = water;
  pen.beginPath();
  pen.moveTo(0, level);
  for (let x = 0; x <= fullWidth; x += 20) {
    pen.lineTo(x, level + Math.sin(x * 0.06 + frame * 0.18) * 7);
  }
  pen.lineTo(fullWidth, bottom);
  pen.lineTo(0, bottom);
  pen.fill();
}

function updateCamera(immediate = false) {
  const targetX = Math.max(0, Math.min(worldWidth - W, unicorn.x - W / 2));
  const targetY = Math.max(0, Math.min(worldHeight - H, unicorn.y - H / 2));
  if (immediate) {
    cameraX = targetX;
    cameraY = targetY;
  } else {
    cameraX += (targetX - cameraX) * 0.12;
    cameraY += (targetY - cameraY) * 0.12;
  }
}

function moveUnicorn() {
  const oldX = unicorn.x;
  const oldY = unicorn.y;
  let dx = Number(keys.has("d") || keys.has("arrowright")) -
    Number(keys.has("a") || keys.has("arrowleft"));
  let dy = Number(keys.has("s") || keys.has("arrowdown")) -
    Number(keys.has("w") || keys.has("arrowup"));
  if (dx && dy) {
    dx *= 0.707;
    dy *= 0.707;
  }
  if (dx) unicorn.direction = Math.sign(dx);
  const speed = effects[4] ? 1.5 : effects[0] ? 5 : 3.2;
  let moved = false;
  let blocked = false;
  if (dx) {
    const column = Math.floor((unicorn.x - mazeX) / cell);
    const row = Math.floor((unicorn.y - mazeY) / cell);
    let targetY = null;
    let nearest = cell;
    for (let offset = -1; offset <= 1; offset++) {
      const lane = cellCenter(column, row + offset);
      const nextCell = cellCenter(column + Math.sign(dx), row + offset);
      const distance = Math.abs(lane.y - unicorn.y);
      if (distance < nearest && openAt(lane.x, lane.y) && openAt(nextCell.x, nextCell.y)) {
        nearest = distance;
        targetY = lane.y;
      }
    }
    const correction = targetY === null ? 0 :
      Math.max(-speed * 1.5, Math.min(speed * 1.5, targetY - unicorn.y));
    if (Math.abs(correction) > .01 && canStand(unicorn.x, unicorn.y + correction)) {
      unicorn.y += correction;
      moved = true;
    }
    if (canStand(unicorn.x + dx * speed, unicorn.y)) {
      unicorn.x += dx * speed;
      moved = true;
    } else blocked = true;
  }
  if (dy) {
    const column = Math.floor((unicorn.x - mazeX) / cell);
    const row = Math.floor((unicorn.y - mazeY) / cell);
    let targetX = null;
    let nearest = cell;
    for (let offset = -1; offset <= 1; offset++) {
      const lane = cellCenter(column + offset, row);
      const nextCell = cellCenter(column + offset, row + Math.sign(dy));
      const distance = Math.abs(lane.x - unicorn.x);
      if (distance < nearest && openAt(lane.x, lane.y) && openAt(nextCell.x, nextCell.y)) {
        nearest = distance;
        targetX = lane.x;
      }
    }
    const correction = targetX === null ? 0 :
      Math.max(-speed * 1.5, Math.min(speed * 1.5, targetX - unicorn.x));
    if (Math.abs(correction) > .01 && canStand(unicorn.x + correction, unicorn.y)) {
      unicorn.x += correction;
      moved = true;
    }
    if (canStand(unicorn.x, unicorn.y + dy * speed)) {
      unicorn.y += dy * speed;
      moved = true;
    } else blocked = true;
  }
  if (moved && frame % 2 === 0) paint.push([unicorn.x, unicorn.y + 10, dx, dy]);
  if (moved) {
    roundDistance += Math.hypot(unicorn.x - oldX, unicorn.y - oldY);
    if (roundDistance >= 100) unlockAchievement(3);
  }
  if (moved && frame % 7 === 0) {
    const column = Math.floor((unicorn.x - mazeX) / cell);
    const row = Math.floor((unicorn.y - mazeY) / cell);
    tone(scale[Math.abs(column * 2 + row) % scale.length] * 2, 0.05, "sine", 0.035);
  }
  if (blocked && bumpWait === 0) {
    tone(105, 0.07, "square", 0.08);
    bumpWait = 9;
  }
}

function checkExit() {
  const column = Math.floor((unicorn.x - mazeX) / cell);
  const row = Math.floor((unicorn.y - mazeY) / cell);
  if (row < 0 || row >= rows || column < 0 || column >= columns) return;
  const tile = maze[row][column];
  if (tile !== "#") lastOpen = [unicorn.x, unicorn.y];
  const destination = Number(tile);
  if (Number.isInteger(destination)) beginEnding(destination);
}

function clearTouchingTrees() {
  const radius = 8;
  const firstColumn = Math.floor((unicorn.x - radius - mazeX) / cell);
  const lastColumn = Math.floor((unicorn.x + radius - mazeX) / cell);
  const firstRow = Math.floor((unicorn.y - radius - mazeY) / cell);
  const lastRow = Math.floor((unicorn.y + radius - mazeY) / cell);
  let removed = 0;
  for (let row = firstRow; row <= lastRow; row++) {
    for (let column = firstColumn; column <= lastColumn; column++) {
      if (row < 0 || row >= rows || column < 0 || column >= columns ||
        maze[row][column] !== "#") continue;
      maze[row][column] = ".";
      const point = cellCenter(column, row);
      addParticles(point.x, point.y, 8);
      removed++;
    }
  }
  if (removed) {
    flash = 5;
    tone(150, .12, "square", .06);
  }
}

function shootLaser() {
  if (!laserShots || mode !== "maze") return;
  laserShots--;
  beam = 8;
  const row = Math.floor((unicorn.y - mazeY) / cell);
  const startColumn = Math.floor((unicorn.x - mazeX) / cell);
  for (let column = startColumn + unicorn.direction; column >= 0 && column < columns;
    column += unicorn.direction) {
    if (maze[row][column] === "#") maze[row][column] = ".";
    const point = cellCenter(column, row);
    addParticles(point.x, point.y, 2);
  }
  flash = 10;
  tone(900, 0.25, "sawtooth", 0.12);
}

function drawLaser() {
  if (!beam) return;
  colors.forEach((color, index) => rect(unicorn.x, unicorn.y - 6 + index * 2,
    unicorn.direction > 0 ? worldWidth - unicorn.x : -unicorn.x, 2, color));
  beam--;
}

function updateMaze() {
  roundFrames++;
  const survivedSeconds = Math.floor(roundFrames / 60);
  if (survivedSeconds > longestRun) {
    longestRun = survivedSeconds;
    if (roundFrames % 60 === 0) saveProgress();
  }
  checkAchievementTiers(survivedSeconds, [20, 40, 60], 4);
  moveUnicorn();
  spawnMoreCritters();
  updateCritters();
  updateTreeDrops();
  collectPickups();
  if (effects[3] === 1) clearTouchingTrees();
  updateCamera();
  if (bumpWait > 0) bumpWait--;
  const waterSpeed = effects[5] ? .46 : .25;
  waterY -= waterSpeed;
  if (unicorn.y > waterY + 5) {
    unlockAchievement(7);
    saveProgress();
    mode = "caught";
    flash = 12;
    shake = 15;
    addParticles(unicorn.x, unicorn.y, 80);
    tone(220, 0.35, "sawtooth", 0.1);
    tone(110, 0.5, "sine", 0.08, 0.15);
  } else checkExit();
  effects.forEach((time, index) => effects[index] = Math.max(0, time - 1));
}

function drawArk(x, y) {
  pen.fillStyle = "#a85e35";
  pen.beginPath();
  pen.moveTo(x - 95, y);
  pen.lineTo(x + 105, y);
  pen.lineTo(x + 65, y + 55);
  pen.lineTo(x - 65, y + 55);
  pen.fill();
  roundRect(x - 53, y - 58, 106, 61, 8, "#c47a47");
  pen.fillStyle = "#8d4c30";
  pen.beginPath();
  pen.moveTo(x - 72, y - 55);
  pen.lineTo(x, y - 92);
  pen.lineTo(x + 72, y - 55);
  pen.fill();
  line(x - 44, y - 57, x - 44, y - 87, "#5b342a", 3);
  pen.fillStyle = colors[(frame / 6 | 0) % colors.length];
  pen.beginPath();
  pen.moveTo(x - 42, y - 85);
  pen.lineTo(x - 19, y - 77);
  pen.lineTo(x - 42, y - 69);
  pen.fill();
}

function drawArkHill(x, y) {
  pen.fillStyle = "#477d45";
  pen.beginPath();
  pen.moveTo(x - 150, y + 70);
  pen.quadraticCurveTo(x - 75, y - 42, x, y - 34);
  pen.quadraticCurveTo(x + 88, y - 25, x + 160, y + 70);
  pen.closePath();
  pen.fill();
  pen.fillStyle = "#72b957";
  pen.beginPath();
  pen.moveTo(x - 122, y + 70);
  pen.quadraticCurveTo(x - 52, y - 25, x + 12, y - 20);
  pen.quadraticCurveTo(x + 72, y - 12, x + 130, y + 70);
  pen.closePath();
  pen.fill();
  circle(x - 60, y - 16, 10, "#2f6841");
  circle(x + 68, y - 5, 13, "#3b7846");
}

function potOfGold(x, y) {
  circle(x, y - 15, 18, "#ffe65c");
  circle(x - 13, y - 20, 8, "#fff477");
  circle(x + 13, y - 21, 8, "#ffc83d");
  roundRect(x - 23, y - 10, 46, 32, 12, "#30233e");
}

function drawOnePieceDiscovery() {
  roundRect(495, 292, 108, 52, 8, "#7b3f27");
  roundRect(490, 275, 118, 31, 12, "#a85e35");
  rect(490, 295, 118, 8, "#e1a83a");
  rect(542, 292, 15, 24, "#ffe56a");
  circle(515, 285, 9, "#ffe56a");
  circle(535, 281, 8, "#ff963e");
  circle(578, 284, 10, "#ffe56a");
  pen.save();
  pen.translate(610, 262);
  pen.rotate(-.12);
  rect(-24, -18, 48, 36, "#fff8df");
  text("IOU", 0, -2, 13, "#482260");
  text("LUFFY", 0, 12, 8, "#482260");
  pen.restore();
}

function drawSecondQuestDiscovery() {
  if (ending === 0) {
    roundRect(510, 276, 80, 22, 10, "#f3b34f");
    rect(514, 296, 72, 8, "#64bd57");
    rect(510, 304, 80, 10, "#713923");
    rect(516, 314, 68, 6, "#ffd94e");
    roundRect(510, 320, 80, 20, 9, "#df873d");
    circle(530, 282, 2, "#fff3bd");
    circle(553, 280, 2, "#fff3bd");
    circle(574, 284, 2, "#fff3bd");
    return true;
  }
  if (ending === 1) {
    [26, 62].forEach(extra => colors.forEach((color, index) => {
      pen.strokeStyle = color;
      pen.lineWidth = 4;
      pen.beginPath();
      pen.arc(550, 335, extra + index * 5, Math.PI, Math.PI * 2);
      pen.stroke();
    }));
    return true;
  }
  if (ending === 2) {
    // A grand ocean liner headed the wrong way instead of Noah's little ark.
    pen.save();
    pen.translate(550, 304);
    pen.rotate(-.035);
    pen.fillStyle = "#191a2c";
    pen.beginPath();
    pen.moveTo(-92, 16);
    pen.lineTo(91, 16);
    pen.lineTo(65, 47);
    pen.lineTo(-68, 47);
    pen.closePath();
    pen.fill();
    rect(-84, 8, 157, 10, "#a93434");
    rect(-66, -12, 120, 21, "#fff8df");
    rect(-58, -28, 112, 17, "#fff8df");
    [-50, -22, 6, 34].forEach(x => {
      rect(x, -61, 14, 34, "#e8ad45");
      rect(x - 2, -63, 20, 8, "#202033");
    });
    for (let x = -56; x <= 47; x += 17) circle(x, -2, 3, "#55c5ff");
    for (let x = -39; x <= 28; x += 17) circle(x, -20, 2, "#55c5ff");
    text("TITANIC", 2, 38, 9, "#fff");
    pen.restore();
    return true;
  }
  if (ending === 3) {
    roundRect(493, 260, 114, 82, 16, "#2d174be6");
    text("42", 550, 322, 58, "#ffe56a");
    return true;
  }
  if (ending === 4) {
    rect(490, 326, 125, 14, "#75405f");
    rect(495, 286, 112, 42, "#f6a9d1");
    roundRect(500, 278, 48, 24, 10, "#fff5fb");
    rect(496, 318, 110, 10, "#b993ff");
    text("Z", 575, 278, 16, "#fff");
    text("Z", 595, 258, 20, "#fff");
    text("Z", 620, 233, 25, "#fff");
    return true;
  }
  return false;
}

function drawDiscovery() {
  if (endingQuest === 2 && drawSecondQuestDiscovery()) return;
  if (endingQuest === 1 && ending === 5) {
    drawOnePieceDiscovery();
    return;
  }
  if (ending === 0) {
    circle(505, 285, 19, "#ffbc86");
    roundRect(482, 255, 46, 10, 3, "#237948");
    roundRect(490, 234, 30, 23, 4, "#2c9a57");
    potOfGold(555, 325);
  }
  if (ending === 1) {
    [465, 515, 565, 615, 665].forEach((x, index) => {
      unicorn.direction = index % 2 ? -1 : 1;
      drawUnicorn(x, 310 + index % 2 * 35, 0.72, false);
    });
    unicorn.direction = 1;
  }
  if (ending === 2) {
    roundRect(535, 265, 25, 90, 10, "#855034");
    colors.forEach((color, index) => {
      const angle = index / 6 * Math.PI * 2;
      circle(548 + Math.cos(angle) * 40, 245 + Math.sin(angle) * 28, 31, color);
    });
    circle(548, 245, 31, "#fff59b");
  }
  if (ending === 3) {
    circle(550, 315, 21, "#6ee6ae");
    circle(570, 300, 14, "#79f0bd");
    circle(575, 297, 2, "#402353");
    colors.forEach((color, index) => line(535, 315 + index * 2, 505, 325 + index * 3, color, 3));
  }
  if (ending === 4) {
    // The unicorn has accidentally organized the critters into a parade away from the ark.
    line(493, 282, 493, 337, "#75405f", 4);
    pen.fillStyle = "#ff4d8e";
    pen.beginPath();
    pen.moveTo(495, 283);
    pen.lineTo(580, 292);
    pen.lineTo(565, 313);
    pen.lineTo(495, 304);
    pen.closePath();
    pen.fill();
    text("PARADE!", 534, 300, 10, "#fff");
    [
      { x: 520, y: 338, type: 0, direction: 1, step: frame * .12 },
      { x: 557, y: 327, type: 1, direction: 1, step: frame * .12 + 2 },
      { x: 595, y: 342, type: 2, direction: 1, step: frame * .12 + 4 },
      { x: 632, y: 324, type: 0, direction: 1, step: frame * .12 + 6 },
      { x: 666, y: 341, type: 1, direction: 1, step: frame * .12 + 8 }
    ].forEach(drawCritter);
  }
  if (ending === 5) {
    colors.forEach((color, index) => {
      const height = 35 + index % 3 * 18;
      rect(500 + index * 18, 345 - height, 13, height, color);
      rect(503 + index * 18, 337 - height, 7, 8, "#fff");
    });
  }
}

function drawFinaleGlow(x, y, strength) {
  pen.save();
  pen.globalAlpha = strength;
  pen.globalCompositeOperation = "screen";
  colors.forEach((color, index) => {
    pen.strokeStyle = color;
    pen.lineWidth = 4;
    pen.beginPath();
    pen.arc(x, y, 54 + index * 8 + Math.sin(frame * .08 + index) * 4,
      Math.PI * 1.08, Math.PI * 1.92);
    pen.stroke();
  });
  for (let index = 0; index < 18; index++) {
    const angle = index / 18 * Math.PI * 2 + frame * .012;
    const radius = 72 + index % 3 * 17 + Math.sin(frame * .06 + index) * 8;
    circle(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius,
      index % 4 ? 2 : 4, colors[index % colors.length]);
  }
  pen.restore();
}

function beginEnding(index) {
  if (roundPickups === 0) unlockAchievement(12);
  saveProgress();
  const secondQuest = (foundEndings & firstQuestMask) === firstQuestMask;
  const previousEndings = foundEndings;
  ending = index;
  endingQuest = secondQuest ? 2 : 1;
  foundEndings |= 1 << index + (secondQuest ? 6 : 0);
  saveProgress();
  doubleFinalePending = secondQuest && previousEndings !== foundEndings &&
    (foundEndings & allQuestsMask) === allQuestsMask;
  mode = "finale";
  finaleTime = 0;
  flash = 12;
  shake = 12;
  particles.length = 0;
  effects.fill(0);
  laserShots = 0;
  glowType = -1;
  addParticles(400, 245, 100);
  const root = scale[index];
  tone(root, 0.5, "triangle", 0.12);
  tone(root * 1.25, 0.5, "triangle", 0.09, 0.1);
  tone(root * 1.5, 0.6, "sine", 0.08, 0.2);
}

function drawDoubleRainbowEnding() {
  drawSky();
  const rise = ease(finaleTime / 75);
  const glow = .6 + Math.sin(frame * .07) * .15;
  drawWater(390 - rise * 55, W, H);
  pen.save();
  pen.globalAlpha = glow;
  drawProgressArch(400, 325, 145, 0, 10);
  drawProgressArch(400, 335, 185, 6, 10);
  pen.restore();
  unicorn.direction = 1;
  drawUnicorn(400, 350 - rise * 26, 1.35);
  roundRect(170, 70, 460, 92, 22, "#35175de8");
  text("DOUBLE RAINBOW QUEST", 400, 101, 27, "#fff");
  text("COMPLETE!", 400, 134, 27, "#ffe56a");
  if (finaleTime > 75) {
    roundRect(316, 245, 168, 38, 19, "#59328e");
    text("ANY KEY / TAP", 400, 271, 13, "#fff");
  }
  if (frame % 5 === 0) addParticles(400 + (Math.random() - .5) * 330,
    285 + (Math.random() - .5) * 90, 1);
  drawParticles();
  finaleTime++;
}

function drawArkPassenger(x, y, color) {
  circle(x, y, 8, color);
  rect(x - 7, y - 12, 5, 7, color);
  rect(x + 2, y - 12, 5, 7, color);
  circle(x - 3, y - 1, 1, "#38243d");
  circle(x + 3, y - 1, 1, "#38243d");
}

function drawLastUnicornEnding() {
  if (finaleTime === 120) unlockAchievement(13);
  const sailing = ease((finaleTime - 125) / 130);
  const sadness = ease((finaleTime - 300) / 90);
  const arkY = 300 - sailing * 28 + Math.sin(frame * .06) * (2 + sailing * 2);
  drawSky();
  circle(665, 90, 43, "#ffe76d");
  pen.save();
  pen.globalAlpha = 1 - sailing;
  drawArkHill(400, 334);
  pen.restore();
  drawWater(390 - sailing * 42, W, H);
  drawArk(400, arkY);

  // The other passengers visibly came two by two.
  [[330, "#f3b56c"], [370, "#9ad67b"], [430, "#81ccef"], [470, "#e49bc8"]]
    .forEach(([x, color]) => {
      drawArkPassenger(x - 7, arkY - 7, color);
      drawArkPassenger(x + 7, arkY - 7, color);
    });

  unicorn.direction = 1;
  const boarded = ease(finaleTime / 115);
  const unicornX = 90 + boarded * 292;
  const unicornY = 335 - boarded * (63 + sailing * 28);
  drawUnicorn(unicornX, unicornY, .9);

  if (finaleTime < 300 && frame % 5 === 0)
    addParticles(400 + (Math.random() - .5) * 280, 245 + (Math.random() - .5) * 90, 2);
  drawParticles();

  if (sadness > 0) {
    rect(0, 0, W, H, `rgba(20,16,48,${sadness * .58})`);
    // An empty place beside the unicorn makes the missing partner unmistakable.
    pen.save();
    pen.globalAlpha = sadness * (.45 + Math.sin(frame * .08) * .08);
    pen.setLineDash([5, 5]);
    pen.strokeStyle = "#c9c3df";
    pen.lineWidth = 2;
    pen.strokeRect(420, arkY - 55, 57, 52);
    pen.setLineDash([]);
    pen.restore();
    text("NO SECOND UNICORN", 449, arkY - 63, 9, "#ded8ec");
  }

  const card = ease((finaleTime - 10) / 42);
  const cardY = -116 + card * 132;
  roundRect(90, cardY, 620, finaleTime >= 415 ? 184 : finaleTime >= 300 ? 126 : 84,
    20, "#35175de8");
  text("YOU MADE IT TO THE ARK!", 400, cardY + 34, 24, "#fff");
  text("Safe at last—the ark sails above the rising flood.", 400, cardY + 59, 12, "#ffe56a");
  if (finaleTime >= 300) {
    text("EVERY ANIMAL CAME IN PAIRS...", 400, cardY + 89, 18, "#fff");
    text("Every animal except one.", 400, cardY + 111, 12, "#cfc5df");
  }
  if (finaleTime >= 415) {
    text("You - The last UNICORN", 400, cardY + 142, 22, "#fff");
  }

  const achievementRemaining = achievementPopupUntil - frame;
  if (achievementPopup === achievementNames[13] && achievementRemaining > 0) {
    pen.save();
    pen.globalAlpha = Math.min(1, achievementRemaining / 24);
    roundRect(245, 378, 310, 46, 18, "#35175dee");
    text("ACHIEVEMENT UNLOCKED!", 400, 397, 10, "#ffe56a");
    text(achievementNames[13], 400, 416, 12, "#fff");
    pen.restore();
  }

  if (finaleTime >= 560) {
    roundRect(316, 350, 168, 38, 19, "#59328e");
    text("ANY KEY / TAP", 400, 376, 13, "#fff");
  }
  finaleTime++;
}

function drawFinale() {
  if (ending === 2 && endingQuest === 1) {
    drawLastUnicornEnding();
    return;
  }
  drawSky();
  const reveal = ease((finaleTime - 45) / 70);
  const flood = ease((finaleTime - 90) / 110);
  const departure = ease((finaleTime - 200) / 110);
  const arkX = 125 - departure * 300;
  const arkY = 273 + Math.sin(frame * .07) * 4 - departure * 25;
  const waterLevel = 430 - flood * 135 + Math.sin(frame * .05) * 3;
  drawArkHill(125, 304);
  drawWater(waterLevel, W, H);
  drawArk(arkX, arkY);
  pen.save();
  pen.translate(550, 305);
  pen.scale(reveal, reveal);
  pen.translate(-550, -305);
  drawFinaleGlow(550, 300, reveal * .75);
  drawDiscovery();
  pen.restore();
  unicorn.direction = 1;
  const arrival = ease(finaleTime / 90);
  drawUnicorn(760 - arrival * 330,
    350 - flood * 43 - Math.sin(frame * .12) * (2 + flood * 4), 1.2);
  if (finaleTime > 70 && finaleTime < 300 && frame % 5 === 0)
    addParticles(550 + (Math.random() - .5) * 90, 300 + (Math.random() - .5) * 60, 2);
  drawParticles();
  pen.save();
  pen.globalAlpha = .72;
  drawWater(waterLevel + 7, W, H);
  pen.restore();
  const card = ease((finaleTime - 12) / 42);
  const cardY = -116 + card * 132;
  roundRect(105, cardY, 590, 126, 20, "#35175dcc");
  const endingText = (endingQuest === 2 ? secondEndings : endings)[ending];
  text(endingText[0], 400, cardY + 38, 27, "#fff");
  wrappedText(endingText[1], 400, cardY + 66, 540, 14, "#fff");
  text("YOU MISSED THE ARK - THE FLOOD IS RISING!", 400, cardY + 109, 12, "#ffe56a");
  if (finaleTime >= 90) {
    const button = ease((finaleTime - 90) / 28);
    const buttonY = 184 - button * 18;
    roundRect(316, buttonY, 168, 38, 19, "#59328e");
    text("ANY KEY / TAP", 400, buttonY + 26, 13, "#fff");
  }
  finaleTime++;
}

function drawGame() {
  drawSky();
  pen.save();
  pen.translate(-cameraX, -cameraY);
  drawMaze();
  drawPaint();
  drawPickups();
  drawCritters();
  drawMaze(true);
  drawTreeDrops();
  drawLaser();
  drawWater();
  drawParticles();
  drawUnicornEffects(unicorn.x, unicorn.y);
  drawUnicorn(unicorn.x, unicorn.y);
  const frontRow = Math.floor((unicorn.y - mazeY) / cell) + 1;
  if (frontRow < rows) for (let column = 0; column < columns; column++) {
    if (maze[frontRow][column] === "#")
      drawTree(mazeX + column * cell, mazeY + frontRow * cell);
  }
  pen.restore();
  drawFog();
  drawPickupPopup();
  drawAchievementPopup();
}

function drawOverlay(title, action) {
  const titleMode = mode === "title";
  roundRect(titleMode ? 190 : 230, titleMode ? 88 : 135,
    titleMode ? 420 : 340, titleMode ? 330 : 145, 24, "#ffffffed");
  text(title, 400, titleMode ? 140 : 192, titleMode ? 38 : 28, "#63368e");
  if (titleMode) {
    drawProgressRainbow();
    roundRect(285, 289, 230, 30, 15, "#63368e");
    text("ACHIEVEMENTS", 400, 309, 12, "#fff");
    if ((foundEndings & allQuestsMask) === allQuestsMask)
      text("★", 400, 104, 24, "#ffe54e");
    roundRect(520, 98, 72, 25, 12, "#8e518a");
    text("RESET", 556, 115, 9, "#fff");
    text("PRESS ANY KEY", 400, 365, 14, "#ff4d9e");
    text("WASD / ARROWS  ·  SWIPE", 400, 397, 11, "#63368e");
  } else text(action, 400, 238, 14, "#ff4d9e");
}

function drawAchievements() {
  rect(0, 0, W, H, "#120725cc");
  roundRect(55, 14, 690, 412, 24, "#fffdf5f2");
  text("ACHIEVEMENTS", 400, 53, 28, "#63368e");
  achievementNames.forEach((name, index) => {
    const column = Math.floor(index / 7);
    const row = index % 7;
    const x = 78 + column * 325;
    const y = 68 + row * 43;
    const unlocked = Boolean(achievementBits & 1 << index);
    roundRect(x, y, 319, 36, 8, unlocked ? colors[index % colors.length] + "44" : "#a8a8ae44");
    text(unlocked ? "★" : "◇", x + 16, y + 17, 12, unlocked ? "#ff9b35" : "#888");
    text(name, x + 170, y + 15, 10, unlocked ? "#51276f" : "#777");
    text(achievementProgress(index), x + 170, y + 29, 8,
      unlocked ? "#8d3b83" : index === 13 ? "#a04d7d" : "#888");
  });
  roundRect(330, 382, 140, 31, 15, "#63368e");
  text("BACK", 400, 403, 12, "#fff");
}

function drawProgressArch(x, y, radius, bitOffset, width = 6) {
  colors.forEach((color, index) => {
    pen.strokeStyle = foundEndings & 1 << index + bitOffset ? color :
      ["#777", "#888", "#999", "#aaa", "#bbb", "#ccc"][index];
    pen.lineWidth = width;
    pen.beginPath();
    pen.arc(x, y, radius - index * width, Math.PI, Math.PI * 2);
    pen.stroke();
  });
}

function drawProgressRainbow() {
  const firstCount = colors.filter((color, index) => foundEndings & 1 << index).length;
  if ((foundEndings & firstQuestMask) !== firstQuestMask) {
    drawProgressArch(400, 235, 72, 0, 7);
    text(`RAINBOW QUEST  ${firstCount}/6`, 400, 267, 12, "#63368e");
    return;
  }
  const secondCount = colors.filter((color, index) => foundEndings & 1 << index + 6).length;
  drawProgressArch(316, 232, 59, 0, 6);
  drawProgressArch(484, 232, 59, 6, 6);
  text("RAINBOW  6/6", 316, 258, 10, "#63368e");
  text(`RAINBOW  ${secondCount}/6`, 484, 258, 10, "#63368e");
  text("DOUBLE RAINBOW QUEST", 400, 278, 12, "#9d42a8");
}

function rainbowFlash() {
  if (!flash) return;
  pen.save();
  pen.globalAlpha = flash / 16;
  colors.forEach((color, index) => rect(index * W / 6, 0, W / 6 + 1, H, color));
  pen.restore();
  flash--;
}

function start() {
  makeMaze();
  roundFrames = 0;
  roundDistance = 0;
  roundPickups = 0;
  roundCurses = 0;
  const startCell = cellCenter(25, 39);
  unicorn.x = startCell.x;
  unicorn.y = startCell.y;
  unicorn.direction = 1;
  waterY = worldHeight + 60;
  particles.length = 0;
  paint.length = 0;
  mode = "maze";
  updateCamera(true);
  tone(261.63, 0.18, "square", 0.07);
  tone(392, 0.22, "triangle", 0.06, 0.08);
}

function showMenu() {
  mode = "title";
  waterY = worldHeight + 60;
}

function advanceFinale() {
  if (mode === "finale" && doubleFinalePending) {
    doubleFinalePending = false;
    mode = "doubleFinale";
    finaleTime = 0;
    flash = 12;
    particles.length = 0;
    addParticles(400, 285, 120);
    tone(392, .35, "triangle", .09);
    tone(523.25, .45, "triangle", .08, .12);
    tone(783.99, .7, "sine", .07, .28);
    return;
  }
  showMenu();
}

function showAchievements() {
  mode = "achievements";
  keys.clear();
}

function resetProgress() {
  foundEndings = 0;
  achievementBits = 0;
  applesKnocked = 0;
  crittersChased = 0;
  longestRun = 0;
  achievementPopup = "";
  achievementPopupUntil = 0;
  saveProgress();
  flash = 8;
}

function render() {
  pen.save();
  if (shake) {
    pen.translate(Math.random() * shake - shake / 2, Math.random() * shake - shake / 2);
    shake *= 0.72;
  }
  if (mode === "finale") drawFinale();
  else if (mode === "doubleFinale") drawDoubleRainbowEnding();
  else {
    drawGame();
    if (mode === "title") drawOverlay("UNI-ARK", "");
    if (mode === "caught") drawOverlay("SWEPT AWAY!", "TAP / MOVE");
    if (mode === "achievements") drawAchievements();
  }
  rainbowFlash();
  pen.restore();
}

function loop(time) {
  if (!nextFrame || time - nextFrame > 100) nextFrame = time;
  if (time >= nextFrame) {
    nextFrame += 16.67;
    frame++;
    if (mode === "maze") updateMaze();
    updateParticles();
    musicTick();
    render();
  }
  requestAnimationFrame(loop);
}

let waitForMenuKeyRelease = false;
window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  const moving = ["w", "a", "s", "d", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key);
  startAudio();
  if (mode === "achievements") {
    if (["escape", "enter", " ", "h"].includes(key)) showMenu();
    event.preventDefault();
    return;
  }
  if (key === "escape") {
    if (mode === "finale" || mode === "doubleFinale") advanceFinale();
    else if (mode !== "title") showMenu();
    keys.clear();
    waitForMenuKeyRelease = true;
    event.preventDefault();
    return;
  }
  if ((mode === "finale" || mode === "doubleFinale") && !event.repeat) {
    if (mode === "finale" && ending === 2 && endingQuest === 1 && finaleTime < 560) {
      event.preventDefault();
      return;
    }
    advanceFinale();
    keys.clear();
    waitForMenuKeyRelease = true;
    event.preventDefault();
    return;
  }
  if (waitForMenuKeyRelease) {
    event.preventDefault();
    return;
  }
  if (key === "m" && !event.repeat) {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.9;
  }
  if (mode === "title" && key === "h" && !event.repeat) {
    showAchievements();
    event.preventDefault();
    return;
  }
  if (mode === "title" && key !== "m") start();
  else if (moving && mode === "caught") start();
  keys.add(key);
  if (key === " " && mode === "caught") start();
  if ([" ", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) event.preventDefault();
});
window.addEventListener("keyup", event => {
  waitForMenuKeyRelease = false;
  keys.delete(event.key.toLowerCase());
});
window.addEventListener("blur", () => {
  keys.clear();
  nextFrame = 0;
});
document.addEventListener("visibilitychange", () => {
  keys.clear();
  nextFrame = 0;
});
let swipePointer = -1;
let swipeX = 0;
let swipeY = 0;
let swipeKey = "";

function releaseSwipe() {
  if (swipeKey) keys.delete(swipeKey);
  swipeKey = "";
  swipePointer = -1;
}

canvas.addEventListener("pointerdown", event => {
  startAudio();
  swipePointer = event.pointerId;
  swipeX = event.clientX;
  swipeY = event.clientY;
  const bounds = canvas.getBoundingClientRect();
  const canvasScale = Math.min(bounds.width / W, bounds.height / H);
  const pointerX = (event.clientX - bounds.left - (bounds.width - W * canvasScale) / 2) / canvasScale;
  const pointerY = (event.clientY - bounds.top - (bounds.height - H * canvasScale) / 2) / canvasScale;
  if (mode === "achievements") {
    if (pointerX >= 330 && pointerX <= 470 && pointerY >= 382 && pointerY <= 413) showMenu();
    releaseSwipe();
    return;
  }
  if (mode === "title" && pointerX >= 285 && pointerX <= 515 &&
    pointerY >= 289 && pointerY <= 319) {
    showAchievements();
    releaseSwipe();
    return;
  }
  if (mode === "title" && pointerX >= 520 && pointerX <= 592 &&
    pointerY >= 98 && pointerY <= 123) {
    resetProgress();
    releaseSwipe();
    return;
  }
  if (mode === "finale" || mode === "doubleFinale") {
    if (!(mode === "finale" && ending === 2 && endingQuest === 1 && finaleTime < 560)) advanceFinale();
  }
  else if (mode === "title" || mode === "caught") start();
});
canvas.addEventListener("pointermove", event => {
  if (event.pointerId !== swipePointer) return;
  const dx = event.clientX - swipeX;
  const dy = event.clientY - swipeY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
  const next = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "d" : "a") : (dy > 0 ? "s" : "w");
  if (next !== swipeKey) {
    if (swipeKey) keys.delete(swipeKey);
    swipeKey = next;
    keys.add(swipeKey);
  }
});
canvas.addEventListener("pointerup", releaseSwipe);
canvas.addEventListener("pointercancel", releaseSwipe);

makeMaze();
const firstCell = cellCenter(25, 39);
unicorn.x = firstCell.x;
unicorn.y = firstCell.y;
waterY = worldHeight + 60;
updateCamera(true);
requestAnimationFrame(loop);
