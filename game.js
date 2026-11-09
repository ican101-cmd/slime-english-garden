const challenge = document.querySelector('#challenge');
const garden = document.querySelector('#slimes');
const change = document.querySelector('#change');
const levelNames = ['小史萊姆','中史萊姆','大史萊姆','巨型史萊姆','史萊姆王'];
const sizes = [56,82,113,151,190];
const colors = [['#adf1a9','#6dcf8c'],['#c1efff','#69bce8'],['#edcaff','#aa82e4'],['#ffe9a8','#ffba61'],['#ffdaef','#f596b9']];
const roundSize = 20;
let round, position, energy, peak, right, mistakes, locked, replay;

function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content != null) node.textContent = content;
  return node;
}
function button(label, style, handler) {
  const node = el('button', style, label);
  node.type = 'button';
  node.addEventListener('click', handler);
  return node;
}
function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function newRound() {
  const quotas = {letters:[6,2,2],numbers:[5,1,1],feelings:[4,1,1],daily:[3,1,0],review:[2,0,0]};
  const selection = [];
  for (const [topic,[total,listening,writing]] of Object.entries(quotas)) {
    const pool = shuffle(bank.filter(q => q.topic === topic));
    const picked = [
      ...pool.filter(q=>q.audio).slice(0,listening),
      ...pool.filter(q=>!q.distractors.length).slice(0,writing),
      ...pool.filter(q=>!q.audio && q.distractors.length).slice(0,total-listening-writing)
    ];
    selection.push(...picked);
  }
  return shuffle(selection);
}
function rank(value) {
  return value ? Math.floor(Math.log2(value)) : -1;
}
function makeSlime(tier) {
  const slime = el('div','slime');
  slime.style.setProperty('--size',sizes[tier]+'px');
  slime.style.setProperty('--light',colors[tier][0]);
  slime.style.setProperty('--dark',colors[tier][1]);
  if (tier === levelNames.length-1) slime.append(el('span','crown','👑'));
  return slime;
}
let mergeAudio;
async function prepareMergeAudio() {
  try {
    mergeAudio ??= new AudioContext();
    if (mergeAudio.state !== 'running') await mergeAudio.resume();
    return mergeAudio;
  } catch {
    return null;
  }
}
function playMergeChime(context, tier) {
  if (context?.state !== 'running') return;
  const now = context.currentTime;
  const pitch = 2 ** (tier/12);
  // A soft downward pop followed by three ascending bell notes.
  const notes = [
    [0,520,280,.12,.16],
    [.045,659,659,.18,.085],
    [.095,831,831,.19,.075],
    [.15,988,988,.22,.065]
  ];
  for (const [delay,from,to,length,volume] of notes) {
    const start = now + delay;
    const end = start + length;
    const tone = context.createOscillator();
    const envelope = context.createGain();
    tone.frequency.setValueAtTime(from*pitch,start);
    tone.frequency.exponentialRampToValueAtTime(to*pitch,end);
    envelope.gain.setValueAtTime(.0001,start);
    envelope.gain.linearRampToValueAtTime(volume,start+.012);
    envelope.gain.exponentialRampToValueAtTime(.0001,end);
    tone.connect(envelope).connect(context.destination);
    tone.start(start);
    tone.stop(end);
  }
}

async function playMerges(total) {
  const audio = prepareMergeAudio();
  const scene = garden.parentElement;
  const stage = el('div','merge-stage');
  stage.setAttribute('aria-hidden','true');
  scene.append(stage);
  scene.classList.add('merging');
  const bounds = scene.getBoundingClientRect();
  if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
    scene.scrollIntoView({block:'nearest',behavior:'auto'});
  }

  const duration = 900;
  const petalColors = ['#f784b1','#ffc8dc','#fff2a6','#f6bafa','#e962a1'];
  try {
    for (let tier=0; total % (2 ** (tier+1)) === 0; tier++) {
      const burst = el('div','merge-burst');
      burst.style.setProperty('--merge-duration',duration+'ms');
      const caption = el('div','merge-caption',levelNames[tier] + ' × 2 → ' + levelNames[tier+1]);
      burst.append(caption);
      for (const side of [-1,1]) {
        const slime = makeSlime(tier);
        slime.classList.add('merge-partner');
        slime.style.setProperty('--side',side);
        burst.append(slime);
      }
      const result = makeSlime(tier+1);
      result.classList.add('merge-result');
      burst.append(result);
      for (let i=0; i<24; i++) {
        const petal = el('span','merge-petal');
        const angle = i * (Math.PI * 2 / 24);
        const spread = 50 + (i%5)*18;
        petal.style.setProperty('--x',Math.round(Math.cos(angle)*spread)+'px');
        petal.style.setProperty('--y',Math.round(Math.sin(angle)*spread*.65)+'px');
        petal.style.setProperty('--spin',(i%2 ? 1 : -1) * (120 + i*13)+'deg');
        petal.style.setProperty('--petal-color',petalColors[i%petalColors.length]);
        if (i === 0) {
          petal.addEventListener('animationstart',async()=>{
            const context = await audio;
            if (burst.isConnected) playMergeChime(context,tier);
          },{once:true});
        }

        burst.append(petal);
      }
      stage.replaceChildren(burst);
      await new Promise(resolve => setTimeout(resolve,duration));
    }
  } finally {
    stage.remove();
    scene.classList.remove('merging');
  }
}

function drawGarden(message='', loss=false) {
  document.querySelector('#energy').textContent = energy + ' 點能量';
  const level = rank(energy);
  document.querySelector('#level').textContent = levelNames[level] ?? '等待第一隻史萊姆';
  const target = level < 0 ? 1 : 2 ** (level+1);
  document.querySelector('#goal').textContent = level < 0 ? '答對第一題，就能得到小史萊姆！' :
    level === levelNames.length-1 ? '史萊姆王誕生了！' : '距離' + levelNames[level+1] + '還差 ' + (target-energy) + ' 點能量';
  garden.replaceChildren();
  const present = [];
  for (let i=Math.max(level,0); i>=0; i--) {
    if (energy && !(energy & (2 ** i))) continue;
    const slime = makeSlime(i);
    slime.classList.toggle('empty',!energy);
    if (energy) present.push(levelNames[i]);
    garden.append(slime);
  }
  garden.setAttribute('aria-label', present.join('、') || '目前沒有史萊姆');
  change.textContent = message;
  change.className = 'change' + (message ? ' visible' : '') + (loss ? ' loss' : '');
}
let currentAudio;
function stopSpeech() {
  currentAudio?.pause();
  currentAudio = undefined;
}
function play(q, fallback) {
  stopSpeech();
  const clip = new Audio('audio/' + q.id + '.wav');
  currentAudio = clip;
  clip.play().catch(() => {
    if (currentAudio === clip) fallback();
  });
}

function start(list, isReplay=false) {
  stopSpeech();
  round = list;
  replay = isReplay;
  position = energy = peak = right = 0;
  mistakes = [];
  drawGarden();
  showQuestion();
}
function showQuestion(focus=false) {
  locked = false;
  const q = round[position];
  const meta = el('div','meta');
  meta.append(el('span','tag',topics[q.topic]),el('span','', (replay?'錯題練習 · ':'') + '第 ' + (position+1) + ' / ' + round.length + ' 題'));
  const track = el('div','track');
  track.setAttribute('aria-hidden','true');
  const fill = el('i');
  fill.style.width = (position/round.length*100) + '%';
  track.append(fill);

  const title = el('h2','',q.title);
  title.tabIndex = -1;
  const prompt = el('div',q.count?'prompt count':'prompt',q.prompt);
  if (q.count) prompt.setAttribute('aria-label',q.prompt.trim().replace(/\s+/g,' '));
  const feedback = el('div','feedback');
  feedback.setAttribute('role','status');
  const actions = el('div','actions');
  const form = el('form','write');
  let pad;
  const choices = el('div','answers');
  const next = button(position+1===round.length?'看結果 →':'下一題 →','primary',()=>{
    stopSpeech();
    drawGarden();
    position++;
    if (position === round.length) showResult();
    else showQuestion(true);
  });
  const optionButtons = [];
  async function answer(value) {
    if (locked || !value.trim()) return;
    locked = true;
    stopSpeech();
    const given = value.trim();
    const correct = q.exact ? given === q.answer : given.toLowerCase() === q.answer.toLowerCase();
    const before = energy;
    energy = Math.max(0, energy + (correct ? 1 : -1));
    peak = Math.max(peak,energy);
    const advanced = correct && energy > 1 && (energy & 1) === 0;
    const growth = rank(energy) > rank(before) && before > 0;
    if (correct) right++;
    else mistakes.push(q);
    for (const option of optionButtons) {
      option.disabled = true;
      if (option.dataset.answer === q.answer) option.classList.add('correct');
      else if (option.dataset.answer === given) option.classList.add('wrong');
    }
    for (const input of form.elements) input.disabled = true;
    if (pad) pad.disabled = true;
    const win = growth ? '進化成' + levelNames[rank(energy)] + '！' : advanced ? '同級史萊姆合體了！' : '獲得一隻小史萊姆！';
    const loss = before ? '－1 點能量' : '能量維持 0 點';
    drawGarden(correct ? win : loss, !correct);
    feedback.classList.toggle('wrong',!correct);
    feedback.textContent = (correct ? '答對了！' : '再加油！正解是 ' + q.answer) + (q.note ? ' ' + q.note : '');
    fill.style.width = ((position+1)/round.length*100) + '%';
    const animateMerge = advanced && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    next.disabled = animateMerge;
    actions.append(next);
    if (animateMerge) {
      await playMerges(energy);
      next.disabled = false;
    }
    next.focus();
  }
  challenge.replaceChildren(meta,track,title);
  if (q.audio) {
    const fallback = el('p','prompt');
    fallback.hidden = true;
    fallback.setAttribute('role','status');
    challenge.append(button('🔊 播放英文','audio',()=>play(q,()=>{
      fallback.textContent = '這台裝置目前無法播放。改讀：' + q.fallback;
      fallback.hidden = false;
    })),fallback);
  }
  if (q.prompt) challenge.append(prompt);
  if (q.distractors.length) {
    shuffle([q.answer,...q.distractors]).forEach((value,i)=>{
      const option = button('','option',()=>answer(value));
      option.dataset.answer = value;
      const badge = el('span','key',String.fromCharCode(65+i));
      badge.setAttribute('aria-hidden','true');
      option.append(badge,el('span','',value));
      optionButtons.push(option);
      choices.append(option);
    });
    challenge.append(choices);
  } else {
    const input = el('input');
    input.placeholder = '辨識結果或鍵盤輸入';
    input.setAttribute('aria-label','英文答案');
    input.lang = 'en';
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.required = true;
    const submit = el('button','primary','送出答案');
    submit.type = 'submit';
    form.addEventListener('submit',e=>{e.preventDefault();answer(input.value);});
    form.append(input,submit);
    pad = handwritingPad(q.answer.length,input);
    challenge.append(pad,form);
  }
  challenge.append(feedback,actions);
  if (focus) title.focus({preventScroll:true});
}
function showResult() {
  const finish = el('div','finish');
  const title = el('h2','',replay?'錯題練習完成！':'花園挑戰完成！');
  title.tabIndex = -1;
  finish.append(title,el('p','', '答對 ' + right + ' / ' + round.length + ' 題 · 最終能量 ' + energy + ' 點'),
    el('p','', peak ? '這一輪最高養到' + levelNames[rank(peak)] + '。' : '再玩一輪，試著孵出你的第一隻史萊姆。'));
  if (mistakes.length) {
    const list = el('ul');
    const counts = {};
    for (const q of mistakes) counts[q.topic] = (counts[q.topic] ?? 0) + 1;
    for (const [topic,count] of Object.entries(counts)) list.append(el('li','',topics[topic] + ' · ' + count + ' 題'));
    finish.append(el('strong','','可以再練習的題型'),list);
  }
  const actions = el('div','actions');
  actions.append(button('再玩 ' + roundSize + ' 題','primary',()=>start(newRound())));
  if (mistakes.length) actions.append(button('重練錯題','secondary',()=>start(shuffle(mistakes),true)));
  finish.append(actions);
  challenge.replaceChildren(finish);
  title.focus({preventScroll:true});
}
start(newRound());
