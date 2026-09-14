function shuffle(arr){
  const a = arr.map((v,i)=>({v,i}));
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function makePin(){ return String(Math.floor(1000 + Math.random()*9000)); }

const PIN = makePin();
const gameRef = db.ref('games/' + PIN);
let idx = -1;
let countdownTimer = null;

gameRef.set({status:'lobby', currentIndex:-1, createdAt: Date.now()});
gameRef.onDisconnect().remove(); // nettoie la partie si le prof ferme l'onglet

const page = document.getElementById('page');
const scoreless = true;

function renderLobby(){
  page.innerHTML = `
    <div class="round-label">Écran de classe</div>
    <h1 class="center">Rejoignez la partie</h1>
    <div class="pin">${PIN}</div>
    <div class="qr-wrap"><div id="qrcode"></div></div>
    <p class="center">ou va sur <b>${location.origin}${location.pathname.replace('host.html','player.html')}</b> et entre le code.</p>
    <div class="lobby-list" id="lobbyList"></div>
    <div class="center"><button class="btn gold" id="startBtn" disabled>En attente de joueurs…</button></div>`;
  new QRCode(document.getElementById('qrcode'), {
    text: location.origin + location.pathname.replace('host.html','player.html') + '?code=' + PIN,
    width:180, height:180
  });
  gameRef.child('players').on('value', snap=>{
    const players = snap.val() || {};
    const names = Object.values(players).map(p=>p.name);
    document.getElementById('lobbyList').innerHTML = names.map(n=>`<div class="lobby-chip">${n}</div>`).join('') || '<span style="color:var(--muted)">Personne pour le moment…</span>';
    const startBtn = document.getElementById('startBtn');
    if(names.length > 0){ startBtn.disabled = false; startBtn.textContent = `Démarrer avec ${names.length} joueur${names.length>1?'s':''}`; }
    else { startBtn.disabled = true; startBtn.textContent = 'En attente de joueurs…'; }
  });
  document.getElementById('startBtn').onclick = () => { gameRef.child('players').off(); nextQuestion(); };
}

function progressLabel(){ return `Question ${idx+1} / ${QUESTIONS.length}`; }

function nextQuestion(){
  idx++;
  if(countdownTimer) clearInterval(countdownTimer);
  if(idx >= QUESTIONS.length){ showPodium(); return; }
  const q = QUESTIONS[idx];
  gameRef.child('answers/' + idx).remove();

  if(q.type === 'mcq'){
    const shuffled = shuffle(q.options);
    const correctLetterIndex = shuffled.findIndex(o => o.i === q.correct);
    const currentQuestion = {
      type:'mcq', round:q.round, prompt:q.prompt, raw:q.raw || null,
      options: shuffled.map(o=>o.v), letters:['A','B','C','D'].slice(0, shuffled.length)
    };
    gameRef.update({status:'question', currentIndex:idx, currentQuestion, questionStartedAt: Date.now(), duration: MCQ_DURATION, correctLetterIndex});
    showHostQuestion(currentQuestion, MCQ_DURATION, q.explain);
  } else {
    const currentQuestion = {type:'grid', round:q.round, scheme:q.scheme, letters:q.letters, lines:q.lines};
    gameRef.update({status:'grid', currentIndex:idx, currentQuestion, questionStartedAt: Date.now(), duration: GRID_DURATION, correctLetterIndex:null});
    showHostQuestion(currentQuestion, GRID_DURATION, null);
  }
}

function showHostQuestion(cq, duration, explain){
  const isGrid = cq.type === 'grid';
  page.innerHTML = `
    <div class="progress">${progressLabel()} — ${cq.round}</div>
    <h2>${isGrid ? "Fais glisser chaque vers dans la bonne ligne" : cq.prompt}</h2>
    ${cq.raw ? `<div class="verse-block">${cq.raw}</div>` : ''}
    ${isGrid ? `<p>Schéma de rimes : <b>${cq.scheme}</b></p><p style="color:var(--muted)">Chaque élève résout le puzzle sur son téléphone.</p>`
             : cq.options.map((o,i)=>`<div class="opt-row"><span class="opt-tag" style="background:${LETTER_COLORS[i]}">${cq.letters[i]}</span><span class="opt-text">${o}</span></div>`).join('')}
    <div class="timerbar"><div class="timerbar-fill" id="timerFill"></div></div>
    <p class="center" id="answerCount" style="color:var(--muted)">0 réponse</p>
    <div class="center"><button class="btn gold" id="revealBtn">Voir les réponses</button></div>`;

  const startedAt = Date.now();
  countdownTimer = setInterval(()=>{
    const remaining = Math.max(0, duration - (Date.now()-startedAt));
    document.getElementById('timerFill').style.width = (remaining/duration*100)+'%';
    if(remaining <= 0) clearInterval(countdownTimer);
  }, 150);

  gameRef.child('players').once('value', psnap=>{
    const total = Object.keys(psnap.val()||{}).length;
    gameRef.child('answers/'+idx).on('value', asnap=>{
      const count = Object.keys(asnap.val()||{}).length;
      document.getElementById('answerCount').textContent = `${count} / ${total} réponse(s)`;
    });
  });

  document.getElementById('revealBtn').onclick = () => { gameRef.child('answers/'+idx).off(); showReveal(cq, explain); };
}

function showReveal(cq, explain){
  clearInterval(countdownTimer);
  gameRef.update({status:'reveal'});
  gameRef.child('answers/'+idx).once('value', async asnap=>{
    const answers = asnap.val() || {};
    let body = '';
    if(cq.type === 'mcq'){
      const counts = cq.letters.map((_,i)=>Object.values(answers).filter(a=>a.letterIndex===i).length);
      body = cq.options.map((o,i)=>`
        <div class="opt-row ${i===0?'':''}" style="${true?'':''}">
          <span class="opt-tag" style="background:${LETTER_COLORS[i]}">${cq.letters[i]}</span>
          <span class="opt-text">${o}</span>
          <span class="opt-votes">${counts[i]}</span>
        </div>`).join('');
      body = cq.options.map((o,i)=>{
        return `<div class="opt-row" id="row${i}"><span class="opt-tag" style="background:${LETTER_COLORS[i]}">${cq.letters[i]}</span><span class="opt-text">${o}</span><span class="opt-votes">${counts[i]}</span></div>`;
      }).join('');
    } else {
      const finishers = Object.values(answers).filter(a=>a.finished).sort((a,b)=>a.timeMs-b.timeMs);
      body = `<p>${finishers.length} élève(s) ont reconstitué la strophe.</p>` +
        finishers.slice(0,5).map((f,i)=>`<div class="leaderboard-row"><span class="leaderboard-rank">${i+1}</span><span class="leaderboard-name">${f.name||''}</span><span class="leaderboard-score">${(f.timeMs/1000).toFixed(1)}s</span></div>`).join('');
    }
    page.innerHTML = `
      <div class="progress">${progressLabel()} — ${cq.round}</div>
      <h2>Réponses</h2>
      ${body}
      ${explain ? `<p style="color:var(--muted); margin-top:14px;">${explain}</p>` : ''}
      <h3 style="margin-top:22px;">Classement actuel</h3>
      <div id="miniLeaderboard"></div>
      <div class="center"><button class="btn gold" id="nextBtn">${idx+1 >= QUESTIONS.length ? 'Voir le podium' : 'Question suivante'}</button></div>`;
    if(cq.type === 'mcq'){
      const correct = (await gameRef.child('correctLetterIndex').once('value')).val();
      const el = document.getElementById('row'+correct); if(el) el.classList.add('correct');
    }
    renderMiniLeaderboard();
    document.getElementById('nextBtn').onclick = nextQuestion;
  });
}

function renderMiniLeaderboard(){
  gameRef.child('players').once('value', snap=>{
    const players = Object.values(snap.val()||{}).sort((a,b)=>b.score-a.score).slice(0,5);
    document.getElementById('miniLeaderboard').innerHTML = players.map((p,i)=>
      `<div class="leaderboard-row"><span class="leaderboard-rank">${i+1}</span><span class="leaderboard-name">${p.name}</span><span class="leaderboard-score">${p.score||0} pts</span></div>`
    ).join('') || '<p style="color:var(--muted)">Pas encore de scores.</p>';
  });
}

function showPodium(){
  gameRef.update({status:'podium'});
  gameRef.child('players').once('value', snap=>{
    const players = Object.values(snap.val()||{}).sort((a,b)=>b.score-a.score);
    const [p1,p2,p3] = players;
    page.innerHTML = `
      <h1 class="center">Fin de la partie !</h1>
      <div class="podium">
        ${p2?`<div class="step second"><div class="medal">🥈</div><div>${p2.name}</div><div>${p2.score} pts</div></div>`:''}
        ${p1?`<div class="step first"><div class="medal">🥇</div><div>${p1.name}</div><div>${p1.score} pts</div></div>`:''}
        ${p3?`<div class="step third"><div class="medal">🥉</div><div>${p3.name}</div><div>${p3.score} pts</div></div>`:''}
      </div>
      <h3>Classement complet</h3>
      ${players.map((p,i)=>`<div class="leaderboard-row"><span class="leaderboard-rank">${i+1}</span><span class="leaderboard-name">${p.name}</span><span class="leaderboard-score">${p.score} pts</span></div>`).join('')}
      <p class="center" style="margin-top:18px; color:var(--muted);">Recharge la page pour lancer une nouvelle partie (nouveau code).</p>`;
  });
}

renderLobby();
