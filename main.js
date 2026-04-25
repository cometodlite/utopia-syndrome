(() => {
  const TILE = 8;
  const MAP_W = 16;
  const MAP_H = 16;
  const SAVE_KEY = 'utopia_pixel_alpha_save';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

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
    9: '보안문',
  };

  // 16x16 map / 8x8 tile / 128x128 internal resolution
  // 0 floor, 1 wall, 2 gym, 3 lab, 4 dna, 5 low containment, 6 office, 7 high gate, 8 church terminal, 9 door
  const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,9,3,3,3,9,4,4,4,9,6,6,1],
    [1,2,0,2,1,3,0,3,1,4,0,4,1,6,0,1],
    [1,2,2,2,1,3,3,3,1,4,4,4,1,6,6,1],
    [1,9,1,1,1,9,1,1,1,9,1,1,1,9,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,0,1],
    [1,5,5,5,1,0,0,0,1,0,0,0,1,7,7,1],
    [1,5,0,5,9,0,1,0,9,0,1,0,9,7,0,1],
    [1,5,5,5,1,8,1,0,1,0,1,0,1,7,7,1],
    [1,0,1,1,1,9,1,0,1,0,1,9,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,0,1,0,1],
    [1,1,1,1,1,0,1,1,1,0,1,1,0,1,0,1],
    [1,0,0,0,9,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,0,1,0,1,1,1,1,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ];

  const palette = {
    void: '#07101d',
    floor: '#121b2e',
    floor2: '#17233b',
    grid: '#233455',
    wall: '#32435f',
    wallHi: '#445a7d',
    wallShadow: '#1d2a42',
    door: '#8b6d35',
    doorHi: '#d7b761',
    gym: '#164b35',
    gym2: '#1f6549',
    lab: '#1e3e6b',
    lab2: '#2a5790',
    dna: '#4e2f68',
    dna2: '#6f4394',
    low: '#4b4322',
    low2: '#70602a',
    office: '#2d4052',
    office2: '#3f5b73',
    high: '#632d3a',
    high2: '#8f4051',
    church: '#453050',
    church2: '#714a81',
    playerSkin: '#dbeafe',
    playerSuit: '#7cc7ff',
    playerSuit2: '#1f5f9c',
    black: '#08111f',
    white: '#e9f2ff',
    red: '#ff6875',
    green: '#72e4a1',
    yellow: '#ffd166',
    cyan: '#67e8f9',
  };

  const defaultState = (trait = null) => {
    const state = {
      started: Boolean(trait), trait, day: 1, action: 3,
      player: { x: 7, y: 5, dir: 'down' },
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

  function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function load() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; } }
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
    if (state.action <= 0 && ![4,6,9].includes(tile)) return log('오늘 행동력이 부족합니다. N으로 다음 날을 진행하세요.');
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
      case 9:
        log('보안문입니다. 시설 구역과 중앙 복도를 잇고 있습니다.');
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
      localStorage.removeItem(SAVE_KEY);
      state = defaultState();
      renderUI();
    }
  }

  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function pixel(x, y, c) { rect(x, y, 1, 1, c); }

  function drawBaseTile(x, y, t) {
    const px = x * TILE, py = y * TILE;
    if (t === 1) {
      rect(px, py, TILE, TILE, palette.wallShadow);
      rect(px, py, TILE, 2, palette.wallHi);
      rect(px, py + 2, TILE, 5, palette.wall);
      pixel(px + 1, py + 3, palette.grid);
      pixel(px + 6, py + 5, palette.grid);
      return;
    }
    if (t === 9) {
      rect(px, py, TILE, TILE, palette.floor);
      rect(px, py + 3, TILE, 2, palette.door);
      rect(px + 1, py + 2, 6, 1, palette.doorHi);
      rect(px + 1, py + 5, 6, 1, palette.doorHi);
      return;
    }
    const base = {
      0: palette.floor,
      2: palette.gym,
      3: palette.lab,
      4: palette.dna,
      5: palette.low,
      6: palette.office,
      7: palette.high,
      8: palette.church,
    }[t] || palette.floor;
    const hi = {
      0: palette.floor2,
      2: palette.gym2,
      3: palette.lab2,
      4: palette.dna2,
      5: palette.low2,
      6: palette.office2,
      7: palette.high2,
      8: palette.church2,
    }[t] || palette.floor2;
    rect(px, py, TILE, TILE, base);
    // Micro floor pattern: makes 8x8 tiles readable after 4x scaling.
    if ((x + y) % 2 === 0) pixel(px + 1, py + 1, hi);
    if ((x * 3 + y) % 4 === 0) pixel(px + 6, py + 5, hi);
    rect(px, py, TILE, 1, 'rgba(255,255,255,0.05)');
    rect(px, py + 7, TILE, 1, 'rgba(0,0,0,0.12)');
  }

  function drawFacilityIcon(x, y, type) {
    const px = x * TILE, py = y * TILE;
    if (type === 2) { // gym: dumbbell
      rect(px + 1, py + 3, 1, 2, palette.white); rect(px + 6, py + 3, 1, 2, palette.white);
      rect(px + 2, py + 4, 4, 1, palette.green);
    }
    if (type === 3) { // lab: monitor
      rect(px + 2, py + 2, 4, 3, palette.cyan); rect(px + 3, py + 5, 2, 1, palette.white); pixel(px + 5, py + 3, palette.black);
    }
    if (type === 4) { // DNA helix
      pixel(px + 2, py + 1, palette.green); pixel(px + 5, py + 1, palette.cyan);
      pixel(px + 3, py + 2, palette.cyan); pixel(px + 4, py + 2, palette.green);
      pixel(px + 3, py + 4, palette.green); pixel(px + 4, py + 4, palette.cyan);
      pixel(px + 2, py + 6, palette.cyan); pixel(px + 5, py + 6, palette.green);
    }
    if (type === 5) { // low containment: lock
      rect(px + 2, py + 3, 4, 3, palette.yellow); rect(px + 3, py + 1, 2, 2, palette.yellow); pixel(px + 4, py + 5, palette.black);
    }
    if (type === 6) { // office: terminal
      rect(px + 2, py + 2, 4, 3, palette.white); rect(px + 3, py + 3, 2, 1, palette.black); rect(px + 2, py + 6, 4, 1, palette.cyan);
    }
    if (type === 7) { // high containment: warning
      rect(px + 1, py + 6, 6, 1, palette.red); rect(px + 2, py + 4, 4, 1, palette.red); rect(px + 3, py + 2, 2, 1, palette.red); pixel(px + 4, py + 5, palette.yellow);
    }
    if (type === 8) { // church terminal: cross antenna
      rect(px + 3, py + 1, 2, 6, palette.white); rect(px + 1, py + 3, 6, 1, palette.white); pixel(px + 4, py + 6, palette.cyan);
    }
  }

  function drawPlayer() {
    const px = state.player.x * TILE;
    const py = state.player.y * TILE;
    // shadow
    rect(px + 2, py + 7, 4, 1, 'rgba(0,0,0,0.4)');
    // head / visor
    rect(px + 2, py + 1, 4, 3, palette.playerSkin);
    rect(px + 3, py + 2, 2, 1, palette.black);
    // suit
    rect(px + 2, py + 4, 4, 3, palette.playerSuit);
    rect(px + 1, py + 5, 1, 1, palette.playerSuit2);
    rect(px + 6, py + 5, 1, 1, palette.playerSuit2);
    // legs direction hint
    if (state.player.dir === 'left') { rect(px + 1, py + 7, 2, 1, palette.playerSuit2); rect(px + 4, py + 7, 2, 1, palette.playerSuit2); }
    else if (state.player.dir === 'right') { rect(px + 2, py + 7, 2, 1, palette.playerSuit2); rect(px + 5, py + 7, 2, 1, palette.playerSuit2); }
    else { rect(px + 2, py + 7, 2, 1, palette.playerSuit2); rect(px + 5, py + 7, 2, 1, palette.playerSuit2); }
  }

  function drawScanlines() {
    for (let y = 0; y < 128; y += 4) rect(0, y, 128, 1, 'rgba(255,255,255,0.025)');
    rect(0, 0, 128, 1, 'rgba(255,255,255,0.08)');
    rect(0, 127, 128, 1, 'rgba(0,0,0,0.2)');
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;
    rect(0, 0, canvas.width, canvas.height, palette.void);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) drawBaseTile(x, y, tileAt(x, y));
    }
    // facility icons only on the central tile of room clusters to avoid clutter
    drawFacilityIcon(2, 2, 2);
    drawFacilityIcon(6, 2, 3);
    drawFacilityIcon(10, 2, 4);
    drawFacilityIcon(14, 2, 6);
    drawFacilityIcon(2, 8, 5);
    drawFacilityIcon(14, 8, 7);
    drawFacilityIcon(5, 9, 8);
    // containment warning strips
    for (let x = 13; x <= 14; x++) { pixel(x * TILE + 1, 7 * TILE + 1, palette.yellow); pixel(x * TILE + 5, 9 * TILE + 6, palette.yellow); }
    drawPlayer();
    drawScanlines();
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
  els.reset.addEventListener('click', () => { if (confirm('저장 데이터를 초기화할까요?')) { localStorage.removeItem(SAVE_KEY); state = defaultState(); renderUI(); } });
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
