function uid(){ return 'p_' + Math.random().toString(36).slice(2,10); }
function shuffle(arr){
  const a = arr.map((v,i)=>({v,i}));
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];}
  return a;
}

const page = document.getElementById('page');
const urlParams = new URLSearchParams(location.search);
let PIN = urlParams.get('code') || '';
let gameRef = null;
let playerId = null;
let playerName = '';
let answeredIndex = -1; // dernier currentIndex pour lequel on a déjà répondu
let lastLiveState = null;

// --- grille (bloc-blast) : état local ---
let gridLinesShuffled = [], gridPlaced = [], currentGridQ = null, gridStartedAt = 0;
let dragEl = null, dragChipIndex = null, dragOffsetX = 0, dragOffsetY = 0;

function renderJoin(){
  page.innerHTML = `
    <h1 class="center">Rejoindre la partie</h1>
    <input type="text" id="pinInput" placeholder="Code à 4 chiffres" maxlength="4" value="${PIN}">
    <input type="text" id="nameInput" placeholder="Ton prénom" maxlength="16">
    <button class="btn gold" id="joinBtn" style="width:100%;">Rejoindre</button>
    <p id="joinError" style="color:var(--bad); text-align:center;"></p>`;
  document.getElementById('joinBtn').onclick = () => {
    const pin = document.getElementById('pinInput').value.trim();
    const name = document.getElementById('nameInput').value.trim();
    if(!/^\d{4}$/.test(pin)){ document.getElementById('joinError').textContent = 'Code à 4 chiffres invalide.'; return; }
    if(!name){ document.getElementById('joinError').textContent = 'Entre ton prénom.'; return; }
    PIN = pin; playerName = name;
    db.ref('games/'+PIN).once('value', snap=>{
      if(!snap.exists()){ document.getElementById('joinError').textContent = "Cette partie n'existe pas."; return; }
      joinGame();
    });
  };
}

function joinGame(){
  gameRef = db.ref('games/'+PIN);
  playerId = uid();
  gameRef.child('players/'+playerId).set({name: playerName, score: 0, joinedAt: Date.now()});
  gameRef.child('players/'+playerId).onDisconnect().remove();
  gameRef.on('value', onGameUpdate);
}

function onGameUpdate(snap){
  const state = snap.val();
  if(!state) return;
  lastLiveState = state;
  const idx = state.currentIndex;
  if(state.status === 'lobby') renderWaiting("En attente que le professeur démarre…");
  else if(state.status === 'question') {
    if(answeredIndex === idx) renderLocked();
    else renderMcqAnswer(state);
  }
  else if(state.status === 'grid') {
    if(answeredIndex === idx) renderLocked();
    else renderGridPuzzle(state);
  }
  else if(state.status === 'reveal') renderRevealForPlayer(state);
  else if(state.status === 'podium') renderPodiumForPlayer(state);
}

function scoreBadgeHtml(){
  const my = (lastLiveState && lastLiveState.players && lastLiveState.players[playerId]) || {score:0};
  return `<div class="score-badge"><b>${my.score||0}</b><small>PTS</small></div>`;
}

function renderWaiting(msg){
  page.innerHTML = `${scoreBadgeHtml()}<div class="center" style="padding:40px 10px;"><h2>${msg}</h2><p style="color:var(--muted)">Reste sur cette page.</p></div>`;
}

function renderLocked(){
  page.innerHTML = `${scoreBadgeHtml()}<div class="locked-msg">Réponse envoyée !<br><span style="color:var(--muted); font-size:.9rem;">En attente des autres joueurs…</span></div>`;
}

function renderMcqAnswer(state){
  const cq = state.currentQuestion;
  page.innerHTML = `
    ${scoreBadgeHtml()}
    <div class="progress">${cq.round}</div>
    <p class="center" style="color:var(--muted)">Regarde l'écran de la classe et choisis la bonne réponse :</p>
    <div class="shape-grid" id="shapeGrid"></div>`;
  const grid = document.getElementById('shapeGrid');
  cq.letters.forEach((l,i)=>{
    const b = document.createElement('button');
    b.className = 'shape-btn';
    b.style.background = LETTER_COLORS[i];
    b.textContent = l;
    b.onclick = () => submitMcqAnswer(state, i);
    grid.appendChild(b);
  });
}

function submitMcqAnswer(state, letterIndex){
  const idx = state.currentIndex;
  const timeMs = Date.now() - state.questionStartedAt;
  const correct = letterIndex === state.correctLetterIndex;
  const points = correct ? calcPoints(100, timeMs, state.duration) : 0;
  answeredIndex = idx;
  gameRef.child('answers/'+idx+'/'+playerId).set({letterIndex, correct, points, timeMs, name: playerName});
  gameRef.child('players/'+playerId+'/score').transaction(cur => (cur||0) + points);
  renderLocked();
}

function letterColorFor(l){ return l === 'A' ? LETTER_COLORS[0] : (l === 'B' ? LETTER_COLORS[1] : (l==='C'?LETTER_COLORS[2]:LETTER_COLORS[3])); }

function renderGridPuzzle(state){
  currentGridQ = state.currentQuestion;
  gridLinesShuffled = shuffle(currentGridQ.lines);
  gridPlaced = [null,null,null,null];
  gridStartedAt = Date.now();
  page.innerHTML = `
    ${scoreBadgeHtml()}
    <div class="progress">${currentGridQ.round}</div>
    <h2>Reconstitue la strophe</h2>
    <div class="hint">Indice : ${currentGridQ.scheme}. Les blocs de même couleur riment ensemble.</div>
    <div class="gridrows" id="gridrows"></div>
    <div class="tray" id="tray"></div>`;
  drawGridRows();
  drawTray();
}

function drawGridRows(){
  const el = document.getElementById('gridrows');
  el.innerHTML = '';
  currentGridQ.letters.forEach((l,i)=>{
    const row = document.createElement('div');
    row.className = 'gridrow' + (gridPlaced[i] !== null ? ' done' : '');
    row.dataset.row = i;
    row.innerHTML = gridPlaced[i] !== null
      ? `<span class="letter-tag" style="background:${letterColorFor(l)}">${l}</span><span class="rtext">${gridLinesShuffled[gridPlaced[i]].v}</span>`
      : `<span class="letter-tag" style="background:${letterColorFor(l)}">${l}</span><span class="placeholder-text">Ligne ${i+1} — dépose ici</span>`;
    el.appendChild(row);
  });
}

function drawTray(){
  const el = document.getElementById('tray');
  el.innerHTML = '';
  gridLinesShuffled.forEach((line,i)=>{
    if(gridPlaced.includes(i)) return;
    const targetLetter = currentGridQ.letters[line.i];
    const b = document.createElement('div');
    b.className = 'block';
    b.style.background = letterColorFor(targetLetter);
    b.dataset.chip = i;
    b.textContent = line.v;
    b.addEventListener('pointerdown', onBlockPointerDown);
    el.appendChild(b);
  });
}

function onBlockPointerDown(e){
  const el = e.currentTarget;
  dragChipIndex = parseInt(el.dataset.chip);
  dragEl = el;
  const rect = el.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left; dragOffsetY = e.clientY - rect.top;
  el.style.width = rect.width + 'px'; el.style.left = rect.left + 'px'; el.style.top = rect.top + 'px';
  el.classList.add('dragging');
  try{ el.setPointerCapture(e.pointerId); }catch(err){}
  document.addEventListener('pointermove', onDragMove);
  document.addEventListener('pointerup', onDragEnd, {once:true});
}
function onDragMove(e){
  if(!dragEl) return;
  dragEl.style.left = (e.clientX - dragOffsetX) + 'px';
  dragEl.style.top = (e.clientY - dragOffsetY) + 'px';
  document.querySelectorAll('.gridrow').forEach(r=>r.classList.remove('hover'));
  const under = document.elementFromPoint(e.clientX, e.clientY);
  const rowEl = under ? under.closest('.gridrow') : null;
  if(rowEl && !rowEl.classList.contains('done')) rowEl.classList.add('hover');
}
function onDragEnd(e){
  document.removeEventListener('pointermove', onDragMove);
  document.querySelectorAll('.gridrow').forEach(r=>r.classList.remove('hover'));
  const under = document.elementFromPoint(e.clientX, e.clientY);
  const rowEl = under ? under.closest('.gridrow') : null;
  if(rowEl && !rowEl.classList.contains('done')){
    const rowIndex = parseInt(rowEl.dataset.row);
    const correctIndex = gridLinesShuffled[dragChipIndex].i;
    if(correctIndex === rowIndex){ gridPlaced[rowIndex] = dragChipIndex; }
    else { rowEl.classList.add('shake'); setTimeout(()=>rowEl.classList.remove('shake'),320); }
  }
  if(dragEl){ dragEl.classList.remove('dragging'); dragEl.style.position=''; dragEl.style.left=''; dragEl.style.top=''; dragEl.style.width=''; }
  dragEl = null; dragChipIndex = null;
  drawGridRows(); drawTray();
  if(gridPlaced.every(v=>v!==null)) finishGrid();
}

function finishGrid(){
  const idx = lastLiveState.currentIndex;
  const timeMs = Date.now() - gridStartedAt;
  const points = calcPoints(200, timeMs, lastLiveState.duration || GRID_DURATION);
  answeredIndex = idx;
  gameRef.child('answers/'+idx+'/'+playerId).set({finished:true, timeMs, points, name: playerName});
  gameRef.child('players/'+playerId+'/score').transaction(cur => (cur||0) + points);
  setTimeout(renderLocked, 500);
}

function renderRevealForPlayer(state){
  const idx = state.currentIndex;
  gameRef.child('answers/'+idx+'/'+playerId).once('value', snap=>{
    const mine = snap.val();
    let msg = "Tu n'as pas répondu à temps.";
    if(mine){
      if(state.currentQuestion.type === 'mcq') msg = mine.correct ? `Bonne réponse ! +${mine.points} pts` : "Raté pour cette fois.";
      else msg = `Strophe reconstituée en ${(mine.timeMs/1000).toFixed(1)}s ! +${mine.points} pts`;
    }
    page.innerHTML = `${scoreBadgeHtml()}<div class="locked-msg"><h2>${msg}</h2><p style="color:var(--muted)">Regarde l'écran de la classe pour la suite.</p></div>`;
  });
}

function renderPodiumForPlayer(state){
  const players = Object.entries(state.players||{}).map(([id,p])=>({id,...p})).sort((a,b)=>b.score-a.score);
  const rank = players.findIndex(p=>p.id===playerId) + 1;
  const me = players.find(p=>p.id===playerId) || {score:0};
  page.innerHTML = `
    <div class="center" style="padding:20px 10px;">
      <h1>Partie terminée !</h1>
      <p style="font-size:1.3rem;">Tu termines <b>${rank}${rank===1?'er':'ème'}</b> avec <b>${me.score||0} points</b>.</p>
      <p style="color:var(--muted)">Merci d'avoir joué !</p>
    </div>`;
}

renderJoin();
