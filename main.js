(() => {
  const TILE = 8, MAP_W = 16, MAP_H = 16;
  const SAVE_KEY = 'utopia_pixel_alpha_02_story_save';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const els = {
    title: document.getElementById('titleScreen'),
    start: document.getElementById('startScreen'),
    game: document.getElementById('gameScreen'),
    survivalBtn: document.getElementById('survivalBtn'),
    storyBtn: document.getElementById('storyBtn'),
    continueBtn: document.getElementById('continueBtn'),
    startDescription: document.getElementById('startDescription'),
    mode: document.getElementById('modeText'), day: document.getElementById('dayText'), hp: document.getElementById('hpText'),
    sanity: document.getElementById('sanityText'), contam: document.getElementById('contamText'), base: document.getElementById('baseText'), quartz: document.getElementById('quartzText'),
    objective: document.getElementById('objectiveText'), playerInfo: document.getElementById('playerInfo'), room: document.getElementById('roomText'),
    log: document.getElementById('logList'), dnaShop: document.getElementById('dnaShop'), interact: document.getElementById('interactBtn'), nextDay: document.getElementById('nextDayBtn'), reset: document.getElementById('resetBtn'),
    overlay: document.getElementById('dialogueOverlay'), speaker: document.getElementById('dialogueSpeaker'), dtext: document.getElementById('dialogueText'), next: document.getElementById('dialogueNextBtn'), choices: document.getElementById('choiceList'),
  };

  const DNA = [['DNA-a','세포 파괴 유전자',50],['DNA-Ω','외부종 세포 포식 유전자',75],['DNA-Bf','생체 융합 유전자',30],['DNA-M','형태 변형 유전자',60],['DNA-H','자가 치유 유전자',80],['CRISPR-1G','DNA 변형/분할 도구',5]];
  const roomNames = {2:'운동 시설',3:'연구 시설',4:'DNA 보관실',5:'저위험 격리실',6:'관리실',7:'고위험 격리문',8:'교회 통신 단말',9:'보안문'};
  const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,2,2,2,9,3,3,3,9,4,4,4,9,6,6,1],[1,2,0,2,1,3,0,3,1,4,0,4,1,6,0,1],[1,2,2,2,1,3,3,3,1,4,4,4,1,6,6,1],
    [1,9,1,1,1,9,1,1,1,9,1,1,1,9,0,1],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[1,0,1,1,1,0,1,1,1,0,1,1,1,0,0,1],[1,5,5,5,1,0,0,0,1,0,0,0,1,7,7,1],
    [1,5,0,5,9,0,1,0,9,0,1,0,9,7,0,1],[1,5,5,5,1,8,1,0,1,0,1,0,1,7,7,1],[1,0,1,1,1,9,1,0,1,0,1,9,1,1,0,1],[1,0,0,0,0,0,1,0,0,0,1,0,0,1,0,1],
    [1,1,1,1,1,0,1,1,1,0,1,1,0,1,0,1],[1,0,0,0,9,0,0,0,1,0,0,0,0,0,0,1],[1,0,1,1,1,1,1,0,1,0,1,1,1,1,0,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];
  const p = {void:'#07101d',floor:'#121b2e',floor2:'#17233b',grid:'#233455',wall:'#32435f',wallHi:'#445a7d',wallShadow:'#1d2a42',door:'#8b6d35',doorHi:'#d7b761',gym:'#164b35',gym2:'#1f6549',lab:'#1e3e6b',lab2:'#2a5790',dna:'#4e2f68',dna2:'#6f4394',low:'#4b4322',low2:'#70602a',office:'#2d4052',office2:'#3f5b73',high:'#632d3a',high2:'#8f4051',church:'#453050',church2:'#714a81',playerSkin:'#dbeafe',playerSuit:'#7cc7ff',playerSuit2:'#1f5f9c',black:'#08111f',white:'#e9f2ff',red:'#ff6875',green:'#72e4a1',yellow:'#ffd166',cyan:'#67e8f9'};

  let pendingMode = 'survival';
  let dialogue = [];
  let choiceActive = false;
  const keys = new Set(); let lastMove = 0;

  function defaultState(trait=null, mode='survival') {
    const st = { screen:'title', started:Boolean(trait), mode, trait, day:1, action:3, player:{x:7,y:5,dir:'down'}, stats:{str:0,vit:0,awake:0,int:0,point:0,barrier:1,ahKey:0,dbKey:0}, survival:{hp:100,maxHp:100,sanity:100,contam:0,base:100}, quartz:100,bingoCode:0,inventory:[],logs:[], story:{chapter:0,step:0,objective:''} };
    if (trait === '격리') { st.stats.barrier++; st.stats.ahKey++; st.survival.maxHp += 10; st.survival.hp += 10; }
    if (trait === '연구') { st.stats.int += 5; st.quartz += 25; st.stats.dbKey++; }
    if (trait === '전투') { st.stats.str += 5; st.stats.vit += 5; st.survival.maxHp += 20; st.survival.hp += 20; }
    if (trait === '피실험') { st.stats.awake += 7; st.survival.contam += 10; st.stats.barrier++; }
    if (mode === 'story') st.story.objective = '프롤로그를 확인하세요.';
    return st;
  }
  let state = load() || defaultState();
  function save(){ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function load(){ try{return JSON.parse(localStorage.getItem(SAVE_KEY));}catch{return null;} }
  function log(msg){ state.logs.unshift(msg); state.logs = state.logs.slice(0,18); save(); renderUI(); }

  function setScreen(screen){ state.screen = screen; save(); renderUI(); }
  function chooseMode(mode){ pendingMode = mode; els.startDescription.textContent = mode === 'story' ? 'Story Mode: USI 신입 인원으로 배정되어 Chapter 0부터 사건을 따라갑니다.' : 'Survival Mode: 하나의 특성을 고르고 시설 내부에서 최대한 오래 살아남으세요.'; state = defaultState(null, mode); state.screen='start'; renderUI(); }
  function start(trait){ state = defaultState(trait, pendingMode); state.screen='game'; state.started = true; if (pendingMode === 'story') startStory(); else log(`${trait} 특성으로 생존을 시작했습니다.`); save(); renderUI(); }
  function startStory(){ state.story.chapter=0; state.story.step=0; state.story.objective='관리실의 SITE 단말기를 확인하라.'; state.player.x=7; state.player.y=5; log('Story Mode 시작: Chapter 0. 신입 배정'); showDialogue([
    ['SYSTEM','당신은 USI에 새로 배정된 관리 인원입니다.'],['SYSTEM','임무는 단순합니다.\n개체를 확인하고, 보고서를 작성하고, 살아남으십시오.'],['오퍼레이터','신입 인원 확인 완료. 먼저 관리실의 SITE 단말기로 이동하세요.\n※ 대사창은 Enter/Space 또는 다음 버튼으로 넘길 수 있습니다.']
  ]); }

  function tileAt(x,y){ return map[y]?.[x] ?? 1; } function isBlocked(x,y){ return tileAt(x,y)===1; } function currentRoom(){ return roomNames[tileAt(state.player.x,state.player.y)] || '중앙 복도'; }
  function tryMove(dx,dy,dir){ if (dialogue.length || choiceActive || state.screen!=='game') return; const nx=state.player.x+dx, ny=state.player.y+dy; state.player.dir=dir; if(!isBlocked(nx,ny)){state.player.x=nx; state.player.y=ny; save(); renderUI();} }

  function showDialogue(lines){ dialogue = lines.map(([speaker,text,after])=>({speaker,text,after})); renderDialogue(); }
  function renderDialogue(){ if(!dialogue.length){ els.overlay.classList.add('hidden'); return; } const d=dialogue[0]; els.overlay.classList.remove('hidden'); els.speaker.textContent=d.speaker; els.dtext.textContent=d.text; els.choices.classList.add('hidden'); els.choices.innerHTML=''; els.next.classList.remove('hidden'); }
  function nextDialogue(){ const d=dialogue.shift(); if (d?.after) d.after(); if(dialogue.length) renderDialogue(); else { els.overlay.classList.add('hidden'); renderUI(); save(); } }
  function showChoices(speaker, text, choices){ dialogue=[]; choiceActive=true; els.overlay.classList.remove('hidden'); els.speaker.textContent=speaker; els.dtext.textContent=text; els.next.classList.add('hidden'); els.choices.classList.remove('hidden'); els.choices.innerHTML = choices.map((c,i)=>`<button data-choice="${i}">${c.label}</button>`).join(''); els.choices.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>{ choiceActive=false; els.next.classList.remove('hidden'); els.choices.classList.add('hidden'); choices[i].run(); }); }

  function storyInteract(tile){
    const s=state.story;
    if (s.chapter===0 && s.step===0 && tile===6){ s.step=1; s.objective='훈련실로 이동해 운동 장비를 확인하라.'; showDialogue([['SITE 단말기','USI 신입 인원 등록 완료.\n권한: 임시 관리 인원.'],['오퍼레이터','다음은 훈련실입니다. 움직임과 상호작용을 확인하세요.']]); return true; }
    if (s.chapter===0 && s.step===1 && tile===2){ state.stats.point++; state.stats.vit++; s.step=2; s.objective='연구 시설에서 연구원 하엘과 대화하라.'; showDialogue([['훈련실','운동 방향성을 확인했습니다.\n수치 포인트 +1, 체력 +1.'],['오퍼레이터','좋습니다. 연구 시설로 이동하세요. 하엘 연구원이 대기 중입니다.']]); return true; }
    if (s.chapter===0 && s.step===2 && tile===3){ state.stats.int++; s.step=3; s.objective='저위험 격리실을 점검하라.'; showDialogue([['연구원 하엘','방금 배정된 신입이군요. USI에 온 걸 환영합니다.'],['연구원 하엘','보고서는 사실보다 오래 살아남은 사람의 문장에 가깝습니다.'],['연구원 하엘','저위험 격리실부터 확인하세요. AH-1 신호는 아직 안정적입니다.']]); return true; }
    if (s.chapter===0 && s.step===3 && tile===5){ s.step=4; s.objective='관리실에서 첫 보고서를 작성하라.'; showDialogue([['격리실 로그','저위험 격리실 점검 완료.\n52Hz 웨일의 신호가 낮게 울립니다.'],['???','──── 52Hz ────'],['오퍼레이터','방금 노이즈가 있었습니다. 관리실에서 보고서를 작성하세요.']]); return true; }
    if (s.chapter===0 && s.step===4 && tile===6){ s.chapter=1; s.step=0; s.objective='교회 통신 단말에서 이상 신호를 확인하라.'; state.survival.sanity=Math.max(0,state.survival.sanity-3); showDialogue([['SITE 단말기','보고서 저장 완료.'],['경고','AH-1 / 52Hz 웨일의 주파수 신호가 비정상적으로 증폭되었습니다.'],['연구원 하엘','저 소리는 격리실 안에서 난 게 아닙니다. 교회 통신 단말을 확인해야 합니다.']]); return true; }
    if (s.chapter===1 && s.step===0 && tile===8){ s.step=1; s.objective='저위험 격리실에서 AH-1 신호 기록을 수집하라.'; state.survival.sanity=Math.max(0,state.survival.sanity-8); showChoices('교회 통신 단말','끊어진 찬송과 고래 울음 같은 주파수가 겹쳐 들립니다.',[
      {label:'신호를 계속 듣는다. 각성 +1 / 정신 -6', run:()=>{state.stats.awake++; state.survival.sanity=Math.max(0,state.survival.sanity-6); showDialogue([['SYSTEM','당신은 파형 속에서 문장을 보았습니다.\n“우리는 이미 같은 칸을 밟았다.”']]);}},
      {label:'기록 장치를 끈다. 기지 안정도 +3', run:()=>{state.survival.base=Math.min(100,state.survival.base+3); showDialogue([['SYSTEM','기록 장치를 차단했습니다. 하지만 신호는 머릿속에서 계속 반복됩니다.']]);}}
    ]); return true; }
    if (s.chapter===1 && s.step===1 && tile===5){ s.step=2; s.objective='관리실에서 52Hz 주파수 차단을 시도하라.'; state.survival.sanity=Math.max(0,state.survival.sanity-5); showDialogue([['AH-1 격리 로그','52Hz 웨일의 신호 기록을 수집했습니다.'],['오퍼레이터','격리실 내부 생체 반응은 없습니다. 그런데 신호는 점점 가까워지고 있습니다.']]); return true; }
    if (s.chapter===1 && s.step===2 && tile===6){ const success = state.stats.int + state.stats.awake + Math.floor(Math.random()*6) >= 7; s.step=3; s.objective= success ? 'Chapter 1 도입부 완료. Survival Mode처럼 계속 생존하라.' : '차단 실패. 시설 안정도를 회복하며 생존하라.'; if(success){state.quartz+=25; showDialogue([['SITE 단말기','주파수 차단 성공. 보상 쿼츠 +25.'],['연구원 하엘','당신, 방금 신호를 듣고도 버텼군요. 이상합니다. 아주 많이요.']]);} else {state.survival.base=Math.max(0,state.survival.base-12); state.survival.sanity=Math.max(0,state.survival.sanity-10); showDialogue([['SITE 단말기','주파수 차단 실패. 기지 안정도 -12, 정신 -10.'],['???','다음 칸은 누구의 것입니까?']]);} return true; }
    return false;
  }

  function interact(){ if (dialogue.length || choiceActive || state.screen!=='game') return; const tile=tileAt(state.player.x,state.player.y); if(state.mode==='story' && storyInteract(tile)){ clampSurvival(); save(); renderUI(); checkGameOver(); return; }
    if (state.action<=0 && ![4,6,9].includes(tile)) return log('오늘 행동력이 부족합니다. N으로 다음 날을 진행하세요.');
    switch(tile){case 2: state.stats.point++; state.stats.vit += Math.random()<.5?1:0; state.stats.str += Math.random()<.5?1:0; state.action--; log('운동 방향성을 제시했습니다. 수치 포인트 +1.'); break; case 3: state.stats.int++; state.survival.sanity=Math.max(0,state.survival.sanity-2); state.action--; log('서적과 연구 문서를 읽었습니다. 지능 +1, 정신 -2.'); break; case 4: log('DNA 보관실입니다. 우측 DNA 상점에서 구매할 수 있습니다.'); break; case 5: state.action--; if(Math.random()<.18) containmentBreach('도버 데몬 [DB-2 / II]'); else {state.quartz+=8; log('저위험 격리실 점검 성공. 쿼츠 +8.');} break; case 6: state.survival.base=Math.min(100,state.survival.base+4); log('관리실에서 시설 점검을 진행했습니다. 기지 안정도 +4.'); break; case 7: state.action--; if(state.stats.ahKey<1) return log('AH 키 레벨이 부족합니다.'); if(Math.random()<.45) containmentBreach('고리 뱀 [AH-3 / V]'); else {state.quartz+=20; log('고위험 격리문 점검 성공. 쿼츠 +20.');} break; case 8: state.action--; state.survival.sanity=Math.max(0,state.survival.sanity-5); state.stats.awake++; log('교회 통신 단말에서 알 수 없는 찬송 신호를 수신했습니다. 각성 +1, 정신 -5.'); break; case 9: log('보안문입니다. 시설 구역과 중앙 복도를 잇고 있습니다.'); break; default: log('중앙 복도입니다. 주변 시설로 이동하세요.');}
    clampSurvival(); save(); renderUI(); checkGameOver(); }

  function containmentBreach(name){ const s=state.survival; const resist=state.stats.str+state.stats.vit+state.stats.awake+(state.trait==='전투'?8:0)+(state.trait==='격리'?5:0); if(Math.floor(Math.random()*100)+resist>=55){s.base=Math.max(0,s.base-8); s.sanity=Math.max(0,s.sanity-5); state.quartz+=15; log(`격리 실패 발생: ${name}. 대응 성공. 기지 -8, 쿼츠 +15.`);} else {s.hp=Math.max(0,s.hp-22); s.sanity=Math.max(0,s.sanity-14); s.contam=Math.min(100,s.contam+9); s.base=Math.max(0,s.base-18); log(`격리 실패 발생: ${name}. 대응 실패. HP -22, 정신 -14, 오염 +9, 기지 -18.`);} }
  function nextDay(){ if(dialogue.length || choiceActive || state.screen!=='game') return; state.day++; state.action=3; state.survival.sanity=Math.max(0,state.survival.sanity-3); state.survival.base=Math.max(0,state.survival.base-2); if(Math.random()<.25) containmentBreach(Math.random()<.5?'루시드 [DB-1 / IV]':'그렘린 [AH-5 / IV]'); else log(`DAY ${state.day} 시작. 시설의 불빛이 차갑게 점멸합니다.`); clampSurvival(); save(); renderUI(); checkGameOver(); }
  function buyDna(code,price){ if(state.screen!=='game') return; if(state.quartz<price) return log('쿼츠가 부족합니다.'); state.quartz-=price; state.inventory.push(code); if(code==='DNA-H') state.survival.hp=Math.min(state.survival.maxHp,state.survival.hp+25); if(code==='DNA-Ω') state.survival.contam=Math.min(100,state.survival.contam+8); if(code==='CRISPR-1G' && Math.random()<.1) log('CRISPR-1G 조작 실패. DNA 안정성이 흔들립니다.'); log(`${code} 구매 완료. 쿼츠 -${price}.`); save(); renderUI(); checkGameOver(); }
  function clampSurvival(){ const s=state.survival; s.hp=Math.min(s.maxHp,Math.max(0,s.hp)); s.sanity=Math.min(100,Math.max(0,s.sanity)); s.contam=Math.min(100,Math.max(0,s.contam)); s.base=Math.min(100,Math.max(0,s.base)); }
  function checkGameOver(){ const s=state.survival; let r=''; if(s.hp<=0) r='사망했습니다.'; else if(s.sanity<=0) r='정신이 붕괴했습니다.'; else if(s.contam>=100) r='변칙 오염에 잠식되었습니다.'; else if(s.base<=0) r='기지가 붕괴했습니다.'; if(r){ alert(`GAME OVER\n${r}\n생존 일수: ${state.day}일`); localStorage.removeItem(SAVE_KEY); state=defaultState(); renderUI(); } }

  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);} function pixel(x,y,c){rect(x,y,1,1,c);} function drawBaseTile(x,y,t){ const px=x*TILE, py=y*TILE; if(t===1){rect(px,py,TILE,TILE,p.wallShadow); rect(px,py,TILE,2,p.wallHi); rect(px,py+2,TILE,5,p.wall); pixel(px+1,py+3,p.grid); pixel(px+6,py+5,p.grid); return;} if(t===9){rect(px,py,TILE,TILE,p.floor); rect(px,py+3,TILE,2,p.door); rect(px+1,py+2,6,1,p.doorHi); rect(px+1,py+5,6,1,p.doorHi); return;} const base={0:p.floor,2:p.gym,3:p.lab,4:p.dna,5:p.low,6:p.office,7:p.high,8:p.church}[t]||p.floor; const hi={0:p.floor2,2:p.gym2,3:p.lab2,4:p.dna2,5:p.low2,6:p.office2,7:p.high2,8:p.church2}[t]||p.floor2; rect(px,py,TILE,TILE,base); if((x+y)%2===0) pixel(px+1,py+1,hi); if((x*3+y)%4===0) pixel(px+6,py+5,hi); rect(px,py,TILE,1,'rgba(255,255,255,.05)'); rect(px,py+7,TILE,1,'rgba(0,0,0,.12)'); }
  function drawFacilityIcon(x,y,type){ const px=x*TILE, py=y*TILE; if(type===2){rect(px+1,py+3,1,2,p.white);rect(px+6,py+3,1,2,p.white);rect(px+2,py+4,4,1,p.green);} if(type===3){rect(px+2,py+2,4,3,p.cyan);rect(px+3,py+5,2,1,p.white);pixel(px+5,py+3,p.black);} if(type===4){pixel(px+2,py+1,p.green);pixel(px+5,py+1,p.cyan);pixel(px+3,py+2,p.cyan);pixel(px+4,py+2,p.green);pixel(px+3,py+4,p.green);pixel(px+4,py+4,p.cyan);pixel(px+2,py+6,p.cyan);pixel(px+5,py+6,p.green);} if(type===5){rect(px+2,py+3,4,3,p.yellow);rect(px+3,py+1,2,2,p.yellow);pixel(px+4,py+5,p.black);} if(type===6){rect(px+2,py+2,4,3,p.white);rect(px+3,py+3,2,1,p.black);rect(px+2,py+6,4,1,p.cyan);} if(type===7){rect(px+1,py+6,6,1,p.red);rect(px+2,py+4,4,1,p.red);rect(px+3,py+2,2,1,p.red);pixel(px+4,py+5,p.yellow);} if(type===8){rect(px+3,py+1,2,6,p.white);rect(px+1,py+3,6,1,p.white);pixel(px+4,py+6,p.cyan);} }
  function drawPlayer(){ const px=state.player.x*TILE, py=state.player.y*TILE; rect(px+2,py+7,4,1,'rgba(0,0,0,.4)'); rect(px+2,py+1,4,3,p.playerSkin); rect(px+3,py+2,2,1,p.black); rect(px+2,py+4,4,3,p.playerSuit); rect(px+1,py+5,1,1,p.playerSuit2); rect(px+6,py+5,1,1,p.playerSuit2); rect(px+2,py+7,2,1,p.playerSuit2); rect(px+5,py+7,2,1,p.playerSuit2); }
  function drawScanlines(){ for(let y=0;y<128;y+=4) rect(0,y,128,1,'rgba(255,255,255,.025)'); rect(0,0,128,1,'rgba(255,255,255,.08)'); rect(0,127,128,1,'rgba(0,0,0,.2)'); }
  function draw(){ ctx.imageSmoothingEnabled=false; rect(0,0,128,128,p.void); for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++) drawBaseTile(x,y,tileAt(x,y)); [[2,2,2],[6,2,3],[10,2,4],[14,2,6],[2,8,5],[14,8,7],[5,9,8]].forEach(a=>drawFacilityIcon(...a)); for(let x=13;x<=14;x++){pixel(x*TILE+1,7*TILE+1,p.yellow); pixel(x*TILE+5,9*TILE+6,p.yellow);} drawPlayer(); if(state.mode==='story' && state.story.chapter===1){ rect(0,0,128,128,'rgba(120,0,20,.08)'); } drawScanlines(); }

  function renderUI(){ els.title.classList.toggle('hidden', state.screen!=='title'); els.start.classList.toggle('hidden', state.screen!=='start'); els.game.classList.toggle('hidden', state.screen!=='game'); if(state.screen!=='game') return; els.mode.textContent = state.mode==='story' ? `STORY C${state.story.chapter}` : 'SURVIVAL'; els.day.textContent=state.day; els.hp.textContent=`${state.survival.hp}/${state.survival.maxHp}`; els.sanity.textContent=state.survival.sanity; els.contam.textContent=state.survival.contam; els.base.textContent=state.survival.base; els.quartz.textContent=state.quartz; els.objective.textContent = state.mode==='story' ? state.story.objective : '살아남으십시오. 시설을 점검하고 다음 Day를 진행하세요.'; els.room.textContent=currentRoom(); els.playerInfo.innerHTML=[['특성',state.trait],['행동력',state.action],['근력',state.stats.str],['체력',state.stats.vit],['각성',state.stats.awake],['지능',state.stats.int],['수치 포인트',state.stats.point],['베리어',state.stats.barrier],['AH 키',state.stats.ahKey],['DB 키',state.stats.dbKey],['빙고코드',state.bingoCode],['인벤토리',state.inventory.length?state.inventory.join(', '):'없음']].map(([k,v])=>`<div class="info-row"><span>${k}</span><b>${v}</b></div>`).join(''); els.log.innerHTML=state.logs.map(l=>`<div>· ${l}</div>`).join(''); els.dnaShop.innerHTML=DNA.map(([code,name,price])=>`<div class="shop-item"><b>${code}</b><br><span class="muted">${name} · ${price}쿼츠</span><button data-dna="${code}" data-price="${price}">구매</button></div>`).join(''); draw(); }

  els.survivalBtn.onclick=()=>chooseMode('survival'); els.storyBtn.onclick=()=>chooseMode('story'); els.continueBtn.onclick=()=>{ const saved=load(); if(saved){ state=saved; state.screen='game'; renderUI(); } else alert('저장된 데이터가 없습니다.'); };
  document.querySelectorAll('.trait-card').forEach(btn=>btn.addEventListener('click',()=>start(btn.dataset.trait))); els.interact.onclick=interact; els.nextDay.onclick=nextDay; els.next.onclick=nextDialogue; els.reset.onclick=()=>{ if(confirm('저장 데이터를 초기화할까요?')){ localStorage.removeItem(SAVE_KEY); state=defaultState(); renderUI(); } };
  els.dnaShop.addEventListener('click',e=>{ if(e.target.matches('button[data-dna]')) buyDna(e.target.dataset.dna, Number(e.target.dataset.price)); });
  // Keyboard controls use e.code instead of e.key so WASD works even when the Korean IME is active.
  window.addEventListener('keydown', e => {
    const code = e.code;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyW','KeyA','KeyS','KeyD'].includes(code)) e.preventDefault();
    if (code === 'KeyE') interact();
    if (code === 'KeyN') nextDay();
    if ((code === 'Enter' || code === 'Space') && dialogue.length) nextDialogue();
    keys.add(code);
  });
  window.addEventListener('keyup', e => keys.delete(e.code));

  function loop(t){
    const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
    if(state.screen==='game' && state.started && !dialogue.length && !choiceActive && t-lastMove>(running?90:150)){
      if(keys.has('KeyW')||keys.has('ArrowUp')){tryMove(0,-1,'up');lastMove=t;}
      else if(keys.has('KeyS')||keys.has('ArrowDown')){tryMove(0,1,'down');lastMove=t;}
      else if(keys.has('KeyA')||keys.has('ArrowLeft')){tryMove(-1,0,'left');lastMove=t;}
      else if(keys.has('KeyD')||keys.has('ArrowRight')){tryMove(1,0,'right');lastMove=t;}
    }
    if(state.screen==='game' && state.started) draw();
    requestAnimationFrame(loop);
  }
  renderUI(); requestAnimationFrame(loop);
})();
