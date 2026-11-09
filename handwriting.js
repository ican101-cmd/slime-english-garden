const writingSize = {width:64, height:96};
const caseByHeight = 'COSUVWXZ';
let handwritingParameters;

function decodeHandwritingParameters() {
  return handwritingModel.parameters.map(([scale, encoded]) => {
    const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
    const data = new DataView(bytes.buffer);
    return Float32Array.from({length: bytes.length / 2}, (_,i) => data.getInt16(i * 2,true) * scale);
  });
}

function inkBounds(canvas) {
  const {width,height} = canvas;
  const pixels = canvas.getContext('2d').getImageData(0,0,width,height).data;
  let left = width, right = -1, top = height, bottom = -1;
  for (let y=0; y<height; y++) {
    for (let x=0; x<width; x++) {
      if (pixels[(y*width+x)*4+3] < 32) continue;
      left = Math.min(left,x);
      right = Math.max(right,x);
      top = Math.min(top,y);
      bottom = Math.max(bottom,y);
    }
  }
  return {left,top,width:right-left+1,height:bottom-top+1};
}

function handwritingFeatures(canvas, bounds) {
  const image = document.createElement('canvas');
  image.width = image.height = 28;
  const context = image.getContext('2d',{willReadFrequently:true});
  const scale = 20 / Math.max(bounds.width,bounds.height);
  const width = Math.max(1,Math.round(bounds.width*scale));
  const height = Math.max(1,Math.round(bounds.height*scale));
  context.drawImage(canvas,bounds.left,bounds.top,bounds.width,bounds.height,
    Math.floor((28-width)/2),Math.floor((28-height)/2),width,height);
  const pixels = context.getImageData(0,0,28,28).data;
  const values = new Float32Array(196);
  for (let y=0; y<14; y++) {
    for (let x=0; x<14; x++) {
      const i = (y*56+x*2)*4+3;
      values[y*14+x] = (pixels[i]+pixels[i+4]+pixels[i+112]+pixels[i+116])/1020;
    }
  }
  return values;
}

function dense(values, weights, biases, relu=false) {
  const result = biases.slice();
  for (let i=0; i<values.length; i++) {
    if (values[i] === 0) continue;
    for (let j=0; j<result.length; j++) result[j] += values[i] * weights[i*result.length+j];
  }
  if (relu) for (let j=0; j<result.length; j++) result[j] = Math.max(0,result[j]);
  return result;
}

function readLetter(canvas) {
  const bounds = inkBounds(canvas);
  if (Math.max(bounds.width,bounds.height) < 9) return '';
  handwritingParameters ??= decodeHandwritingParameters();
  const [firstWeights,firstBiases,lastWeights,lastBiases] = handwritingParameters;
  const features = handwritingFeatures(canvas,bounds);
  const hidden = dense(features,firstWeights,firstBiases,true);
  const scores = dense(hidden,lastWeights,lastBiases);
  let best = 0;
  for (let i=1; i<scores.length; i++) if (scores[i] > scores[best]) best = i;
  const char = handwritingModel.letters[best];
  return caseByHeight.includes(char) && bounds.top >= 28 ? char.toLowerCase() : char;
}

function handwritingPad(length, input) {
  const pad = el('fieldset','handwriting');
  const grid = el('div','handwriting-grid');
  const status = el('p','handwriting-status');
  status.setAttribute('role','status');
  grid.style.setProperty('--cells',length);
  const cells = [];
  const history = [];
  let active;
  let recognized = false;

  function draw(canvas, from, to) {
    const context = canvas.getContext('2d',{willReadFrequently:true});
    context.strokeStyle = context.fillStyle = '#224236';
    context.lineCap = context.lineJoin = 'round';
    context.lineWidth = 3.2;
    context.beginPath();
    if (from) {
      context.moveTo(...from);
      context.lineTo(...to);
      context.stroke();
    } else {
      context.arc(...to,context.lineWidth/2,0,Math.PI*2);
      context.fill();
    }
  }
  function erase(canvas) {
    canvas.getContext('2d',{willReadFrequently:true}).clearRect(0,0,canvas.width,canvas.height);
  }
  function position(canvas,event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX-rect.left) * canvas.width / rect.width;
    const y = (event.clientY-rect.top) * canvas.height / rect.height;
    return [Math.max(1,Math.min(canvas.width-1,x)),Math.max(1,Math.min(canvas.height-1,y))];
  }
  function updated() {
    if (recognized) {
      input.value = '';
      recognized = false;
    }
    status.textContent = '';
    undo.disabled = clear.disabled = recognize.disabled = !history.length;
  }

  const recognize = button('辨識手寫','primary',()=>{
    if (active) return;
    if (typeof handwritingModel === 'undefined') {
      status.textContent = '辨識暫時無法使用，可以用鍵盤輸入。';
      return;
    }
    const letters = cells.map(readLetter);
    if (letters.some(letter=>!letter)) {
      status.textContent = '請在每格寫一個清楚的字母，再按辨識。';
      return;
    }
    input.value = letters.join('');
    recognized = true;
    status.textContent = '請檢查辨識結果，可以先修正，再送出答案。';
  });
  const undo = button('復原一筆','secondary',()=>{
    if (active || !history.length) return;
    const {canvas} = history.pop();
    erase(canvas);
    for (const stroke of history) {
      if (stroke.canvas !== canvas) continue;
      stroke.points.forEach((point,index)=>draw(canvas,stroke.points[index-1],point));
    }
    updated();
  });
  const clear = button('清除全部','secondary',()=>{
    if (active) return;
    history.length = 0;
    cells.forEach(erase);
    updated();
  });

  for (let i=0; i<length; i++) {
    const canvas = el('canvas','writing-cell');
    canvas.width = writingSize.width;
    canvas.height = writingSize.height;
    canvas.setAttribute('aria-label','第 ' + (i+1) + ' 格手寫區');
    canvas.addEventListener('pointerdown',event=>{
      if (pad.disabled || active || event.button !== 0) return;
      const point = position(canvas,event);
      const stroke = {canvas, points:[point]};
      history.push(stroke);
      active = {id:event.pointerId,stroke};
      canvas.setPointerCapture(event.pointerId);
      draw(canvas,null,point);
      updated();
    });
    canvas.addEventListener('pointermove',event=>{
      if (pad.disabled || active?.id !== event.pointerId || active.stroke.canvas !== canvas) return;
      const point = position(canvas,event);
      const points = active.stroke.points;
      draw(canvas,points.at(-1),point);
      points.push(point);
    });
    for (const name of ['pointerup','pointercancel','lostpointercapture']) {
      canvas.addEventListener(name,event=>{
        if (active?.id === event.pointerId && active.stroke.canvas === canvas) active = undefined;
      });
    }
    grid.append(canvas);
    cells.push(canvas);
  }
  const actions = el('div','handwriting-actions');
  actions.append(recognize,undo,clear);
  pad.append(el('legend','','四線手寫'),el('p','handwriting-hint','每格寫一個英文字母，寫好後按「辨識手寫」。'),grid,actions,status);
  updated();
  return pad;
}
