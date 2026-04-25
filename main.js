(() => {
  const TILE = 32;
  const MAP_W = 16;
  const MAP_H = 12;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const els = {
    start: document.getElementById('startScreen'),
    game: document.getElementById('gameScreen'),
    day: document.getElementById('dayText'),
    hp: document.getElementById('hpText'),
    sanity: document.getElementById('sanityText'),
    contam: document.getElementById('contamText'),
    base: document.getElementById('baseText'),
    quartz: document.getElementById('quartzText'),
    playerInfo: document.getElementById('playerInfo'),
    room: document.getElementById('roomText'),
    log: document.getElementById('logList'),
    dnaShop: document.getElementById('dnaShop'),
    interact: document.getElementById('interactBtn'),
    nextDay: document.getElementById('nextDayBtn'),
    reset: document.getElementById('resetBtn'),
  };

  const DNA = [
    ['DNA-a', '세포 파괴 유전자', 50],
    ['DNA-Ω', '외부종 세포 포식 유전자', 75],
    ['DNA-Bf', '생체 융합 유전자', 30],
    ['DNA-M', '형태 변형 유전자', 60],
    ['DNA-H', '자가 치유 유전자', 80],
    ['CRISPR-1G', 'DNA 변형/분할 도구', 5],
  ];

  const roomNames = {
    2: '운동 시설',
    3: '연구 시설',
    4: 'DNA 보관실',
    5: '저위험 격리실',
    6: '관리실',
    7: '고위험 격리문',
    8: '교회 통신 단말',
  };

  const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,1,3,3,3,1,4,4,4,1,6,6,1],
    [1,2,0,2,1,3,0,3,1,4,0,4,1,6,0,1],
    [1,2,2,2,1,3,3,3,1,4,4,4,1,6,6,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,0,1],
    [1,5,5,5,1,0,0,0,1,0,0,0,1,7,7,1],
    [1,5,0,5,1,1,1,0,1,1,1,0,1,7,0,1],
    [1,5,5,5,1,8,1,0,0,0,1,0,1,7,7,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,0,1,0,1,1,1,1,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ];

  const colors = {
    floor: '#172033', wall: '#38445e', gym: '#234d3a', lab: '#273f66', dna: '#50396d',
    low: '#4a4526', office: '#344354', high: '#63313a', church: '#463957', grid: '#26344f'
  };

  const defaultState = (trait = null) => {
    const state = {
      started: Boolean(trait), trait, day: 1, action: 3,
      player: { x: 2, y: 4, dir: 'down' },
      stats: { str: 0, vit: 0, awake: 0, int: 0, point: 0, barrier: 1, ahKey: 0, dbKey: 0 },
      survival: { hp: 100, maxHp: 100, sanity: 100, contam: 0, base: 100 },
      quartz: 100, bingoCode: 0, inventory: [], logs: []
    };
    if (trait === '격리') { state.stats.barrier += 1; state.stats.ahKey += 1; state.survival.maxHp += 10; state.survival.hp += 10; }
    if (trait === '연구') { state.stats.int += 5; state.quartz += 25; state.stats.dbKey += 1; }
    if (trait === '전투') { state.stats.str += 5; state.stats.vit += 5; state.survival.maxHp += 20; state.survival.hp += 20; }
    if (trait === '피실험') { state.stats.awake += 7; state.survival.contam += 10; state.stats.barrier += 1; }
    return state;
  };

  let state = load() || defaultState();
  const keys = new Set();
  let lastMove = 0;

  function save() { localStorage.setItem('utopia_pixel_alpha_save', JSON.stringify(state)); }
  function load() { try { return JSON.parse(localStorage.getItem('utopia_pixel_alpha_save')); } catch { return null; } }
  function log(msg) { state.logs.unshift(msg); state.logs = state.logs.slice(0, 18); save(); renderUI(); }

  function start(trait) {
    state = defaultState(trait);
    log(`${trait} 특성으로 생존을 시작했습니다.`);
    save();
    renderUI();
  }

  function tileAt(x, y) { return map[y]?.[x] ?? 1; }
  function isBlocked(x, y) { return tileAt(x, y) === 1; }
  function currentRoom() { return roomNames[tileAt(state.player.x, state.player.y)] || '중앙 복도'; }

  function tryMove(dx, dy, dir) {
    const nx = state.player.x + dx, ny = state.player.y + dy;
    state.player.dir = dir;
    if (!isBlocked(nx, ny)) { state.player.x = nx; state.player.y = ny; save(); renderUI(); }
  }

  function interact() {
    const tile = tileAt(state.player.x, state.player.y);
    if (state.action <= 0 && ![4,6].includes(tile)) return log('오늘 행동력이 부족합니다. N으로 다음 날을 진행하세요.');
    switch (tile) {
      case 2:
        state.stats.point += 1;
        state.stats.vit += Math.random() < 0.5 ? 1 : 0;
        state.stats.str += Math.random() < 0.5 ? 1 : 0;
        state.action -= 1;
        log('운동 방향성을 제시했습니다. 수치 포인트 +1, 힘 수치가 1.3배 성장 흐름을 받습니다.');
        break;
      case 3:
        state.stats.int += 1;
        state.survival.sanity = Math.max(0, state.survival.sanity - 2);
        state.action -= 1;
        log('서적과 연구 문서를 읽었습니다. 지능 +1, 정신 안정도 -2.');
        break;
      case 4:
        log('DNA 보관실입니다. 우측 DNA 상점에서 구매할 수 있습니다.');
        break;
      case 5:
        state.action -= 1;
        if (Math.random() < 0.18) containmentBreach('도버 데몬 [DB-2 / II]');
        else { state.quartz += 8; log('저위험 격리실 점검 성공. 쿼츠 +8.'); }
        break;
      case 6:
        state.survival.base = Math.min(100, state.survival.base + 4);
        log('관리실에서 시설 점검을 진행했습니다. 기지 안정도 +4.');
        break;
      case 7:
        state.action -= 1;
        if (state.stats.ahKey < 1) return log('AH 키 레벨이 부족합니다. 고위험 격리문은 열리지 않습니다.');
        if (Math.random() < 0.45) containmentBreach('고리 뱀 [AH-3 / V]');
        else { state.quartz += 20; log('고위험 격리문 점검 성공. 쿼츠 +20.'); }
        break;
      case 8:
        state.action -= 1;
        state.survival.sanity = Math.max(0, state.survival.sanity - 5);
        state.stats.awake += 1;
        log('교회 통신 단말에서 알 수 없는 찬송 신호를 수신했습니다. 각성 +1, 정신 -5.');
        break;
      default:
        log('중앙 복도입니다. 주변 시설로 이동하세요.');
    }
    clampSurvival(); save(); renderUI(); checkGameOver();
  }

  function containmentBreach(name) {
    const s = state.survival;
    const resist = state.stats.str + state.stats.vit + state.stats.awake + (state.trait === '전투' ? 8 : 0) + (state.trait === '격리' ? 5 : 0);
    const roll = Math.floor(Math.random() * 100);
    if (roll + resist >= 55) {
      s.base = Math.max(0, s.base - 8);
      s.sanity = Math.max(0, s.sanity - 5);
      state.quartz += 15;
      log(`격리 실패 발생: ${name}. 대응 성공. 기지 안정도 -8, 쿼츠 +15.`);
    } else {
      s.hp = Math.max(0, s.hp - 22);
      s.sanity = Math.max(0, s.sanity - 14);
      s.contam = Math.min(100, s.contam + 9);
      s.base = Math.max(0, s.base - 18);
      log(`격리 실패 발생: ${name}. 대응 실패. HP -22, 정신 -14, 오염 +9, 기지 -18.`);
    }
  }

  function nextDay() {
    state.day += 1;
    state.action = 3;
    state.survival.sanity = Math.max(0, state.survival.sanity - 3);
    state.survival.base = Math.max(0, state.survival.base - 2);
    if (Math.random() < 0.25) containmentBreach(Math.random() < 0.5 ? '루시드 [DB-1 / IV]' : '그렘린 [AH-5 / IV]');
    else log(`DAY ${state.day} 시작. 시설의 불빛이 차갑게 점멸합니다.`);
    clampSurvival(); save(); renderUI(); checkGameOver();
  }

  function buyDna(code, price) {
    if (state.quartz < price) return log('쿼츠가 부족합니다.');
    state.quartz -= price;
    state.inventory.push(code);
    if (code === 'DNA-H') state.survival.hp = Math.min(state.survival.maxHp, state.survival.hp + 25);
    if (code === 'DNA-Ω') state.survival.contam = Math.min(100, state.survival.contam + 8);
    if (code === 'CRISPR-1G' && Math.random() < 0.1) log('CRISPR-1G 조작 실패. DNA 안정성이 흔들립니다.');
    log(`${code} 구매 완료. 쿼츠 -${price}.`);
    save(); renderUI(); checkGameOver();
  }

  function clampSurvival() {
    const s = state.survival;
    s.hp = Math.min(s.maxHp, Math.max(0, s.hp));
    s.sanity = Math.min(100, Math.max(0, s.sanity));
    s.contam = Math.min(100, Math.max(0, s.contam));
    s.base = Math.min(100, Math.max(0, s.base));
  }

  function checkGameOver() {
    const s = state.survival;
    let reason = '';
    if (s.hp <= 0) reason = '사망했습니다.';
    else if (s.sanity <= 0) reason = '정신이 붕괴했습니다.';
    else if (s.contam >= 100) reason = '변칙 오염에 완전히 잠식되었습니다.';
    else if (s.base <= 0) reason = '기지가 붕괴했습니다.';
    if (reason) {
      alert(`GAME OVER\n${reason}\n생존 일수: ${state.day}일`);
      localStorage.removeItem('utopia_pixel_alpha_save');
      state = defaultState();
      renderUI();
    }
  }

  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (let y=0; y<MAP_H; y++) for (let x=0; x<MAP_W; x++) {
      const t = tileAt(x,y);
      let fill = colors.floor;
      if (t === 1) fill = colors.wall;
      if (t === 2) fill = colors.gym;
      if (t === 3) fill = colors.lab;
      if (t === 4) fill = colors.dna;
      if (t === 5) fill = colors.low;
      if (t === 6) fill = colors.office;
      if (t === 7) fill = colors.high;
      if (t === 8) fill = colors.church;
      ctx.fillStyle = fill;
      ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
      ctx.strokeStyle = colors.grid;
      ctx.strokeRect(x*TILE, y*TILE, TILE, TILE);
    }
    // player pixel body
    const px = state.player.x*TILE, py = state.player.y*TILE;
    ctx.fillStyle = '#79b8ff'; ctx.fillRect(px+9, py+7, 14, 18);
    ctx.fillStyle = '#dbeafe'; ctx.fillRect(px+11, py+4, 10, 8);
    ctx.fillStyle = '#0b1020'; ctx.fillRect(px+13, py+7, 2, 2); ctx.fillRect(px+18, py+7, 2, 2);
    ctx.fillStyle = '#1f5f9c'; ctx.fillRect(px+7, py+25, 6, 4); ctx.fillRect(px+19, py+25, 6, 4);
  }

  function renderUI() {
    const started = state.started;
    els.start.classList.toggle('hidden', started);
    els.game.classList.toggle('hidden', !started);
    if (!started) return;
    els.day.textContent = state.day;
    els.hp.textContent = `${state.survival.hp}/${state.survival.maxHp}`;
    els.sanity.textContent = state.survival.sanity;
    els.contam.textContent = state.survival.contam;
    els.base.textContent = state.survival.base;
    els.quartz.textContent = state.quartz;
    els.room.textContent = currentRoom();
    els.playerInfo.innerHTML = [
      ['특성', state.trait], ['행동력', state.action], ['근력', state.stats.str], ['체력', state.stats.vit], ['각성', state.stats.awake],
      ['지능', state.stats.int], ['수치 포인트', state.stats.point], ['베리어', state.stats.barrier], ['AH 키', state.stats.ahKey], ['DB 키', state.stats.dbKey], ['빙고코드', state.bingoCode], ['인벤토리', state.inventory.length ? state.inventory.join(', ') : '없음']
    ].map(([k,v]) => `<div class="info-row"><span>${k}</span><b>${v}</b></div>`).join('');
    els.log.innerHTML = state.logs.map(l => `<div>· ${l}</div>`).join('');
    els.dnaShop.innerHTML = DNA.map(([code,name,price]) => `<div class="shop-item"><b>${code}</b><br><span class="muted">${name} · ${price}쿼츠</span><button data-dna="${code}" data-price="${price}">구매</button></div>`).join('');
    draw();
  }

  document.querySelectorAll('.trait-card').forEach(btn => btn.addEventListener('click', () => start(btn.dataset.trait)));
  els.interact.addEventListener('click', interact);
  els.nextDay.addEventListener('click', nextDay);
  els.reset.addEventListener('click', () => { if (confirm('저장 데이터를 초기화할까요?')) { localStorage.removeItem('utopia_pixel_alpha_save'); state = defaultState(); renderUI(); } });
  els.dnaShop.addEventListener('click', e => { if (e.target.matches('button[data-dna]')) buyDna(e.target.dataset.dna, Number(e.target.dataset.price)); });

  window.addEventListener('keydown', e => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Shift'].includes(e.key)) e.preventDefault();
    if (e.key.toLowerCase() === 'e') interact();
    if (e.key.toLowerCase() === 'n') nextDay();
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

  function loop(t) {
    if (state.started && t - lastMove > (keys.has('shift') ? 90 : 150)) {
      if (keys.has('w') || keys.has('arrowup')) { tryMove(0,-1,'up'); lastMove = t; }
      else if (keys.has('s') || keys.has('arrowdown')) { tryMove(0,1,'down'); lastMove = t; }
      else if (keys.has('a') || keys.has('arrowleft')) { tryMove(-1,0,'left'); lastMove = t; }
      else if (keys.has('d') || keys.has('arrowright')) { tryMove(1,0,'right'); lastMove = t; }
    }
    if (state.started) draw();
    requestAnimationFrame(loop);
  }

  renderUI();
  requestAnimationFrame(loop);
})();
