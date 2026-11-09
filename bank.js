const bank = [];
const topics = {
  letters: '字母與字首',
  numbers: '數字與年齡',
  feelings: '情緒與感受',
  daily: '日常對話',
  review: '綜合閱讀'
};
function question(topic, title, prompt, answer, distractors, extra = {}) {
  bank.push({id: bank.length, topic, title, prompt, answer, distractors, ...extra});
}

const abc = 'ABCDEFGHIJKLMNO';
for (let i = 0; i < abc.length; i++) {
  const upper = abc[i];
  const lower = upper.toLowerCase();
  const near = (letter) => ({b:'d', d:'b', i:'l', l:'i', m:'n', n:'m'}[letter] ?? abc[(i+1)%15].toLowerCase());
  question('letters', '大小寫配對', upper, lower, [near(lower), abc[(i+2)%15].toLowerCase()].filter((x,j,a) => x !== lower && a.indexOf(x) === j));
  if (i % 3 === 1) question('letters', '寫出對應的大寫字母', lower, upper, [], {exact:true});
  if (i > 0 && i < 14 && i % 2 === 0) question('letters', '照字母順序填空', abc[i-1] + ' → ___ → ' + abc[i+1], upper, [], {exact:true});
}
for (const [word, answer, a, b] of [
  ['bird','b','d','e'], ['dog','d','b','g'], ['ear','e','a','i'], ['cat','c','a','d'],
  ['fish','f','h','g'], ['hand','h','f','j'], ['jam','j','g','i'], ['milk','m','n','l'],
  ['nose','n','m','o'], ['apple','a','e','b']
]) {
  question('letters', '聽一聽，選出單字的第一個字母', '', answer, [a,b], {audio:word, fallback:word, note:word + ' 的第一個字母是 ' + answer + '。'});
}
for (const [a,b,correct] of [
  ['bird','book',true], ['dog','bird',false], ['cat','cake',true],
  ['fish','five',true], ['nose','milk',false], ['ear','egg',true]
]) {
  question('letters','聽一聽，兩個單字的字首相同嗎？','',correct?'○ 相同':'× 不同',[correct?'× 不同':'○ 相同'],{audio:a + '. ' + b + '.',fallback:a + ' / ' + b,note:a + ' 和 ' + b + ' 的字首分別是 ' + a[0] + ' 和 ' + b[0] + '。'});
}
for (const [word, options] of [['dad',['bed','sad']],['sad',['dad','bad']],['bed',['bad','dad']],['cat',['cap','bat']]]) {
  question('letters','聽一聽，選出聽到的單字','',word,options,{audio:word,fallback:word});
}

const numbers = ['one','two','three','four','five','six','seven','eight','nine','ten'];
const scrambled = ['eno','owt','ereth','uorf','efiv','xsi','veens','iegth','enin','ent'];
for (let i = 0; i < numbers.length; i++) {
  const n = i + 1;
  const word = numbers[i];
  question('numbers','數一數，選出正確的英文',('★ '.repeat(Math.min(5,n)) + (n>5?'\n'+'★ '.repeat(n-5):'')).trim(),word,[numbers[(i+1)%10],numbers[(i+8)%10]],{count:true});
  question('numbers','聽一聽，選出數字','',String(n),[String((i+1)%10+1),String((i+7)%10+1)],{audio:word,fallback:word});
  if (i > 1) question('numbers','重排字母，拼出數字',n + '  →  ' + scrambled[i].split('').join('  '),word,[]);
}
for (const age of [4,5,6,7,8,9,10]) {
  question('numbers','選出正確的年齡回答','How old are you? （' + age + ' 歲）',
    'I’m ' + numbers[age-1] + ' years old.', ['I’m ' + numbers[age-3] + ' years old.', 'I’m happy.']);
}
question('numbers','看提示，填入英文數字','I’m ___ years old. （8 歲）','eight',[]);
question('numbers','選出適合的問題','B: I’m nine.','How old are you?',['How are you?','What’s your name?']);

const feelings = [
  ['happy','開心','😄'], ['sad','難過','😢'], ['angry','生氣','😠'], ['hungry','肚子餓','🍔'], ['thirsty','口渴','🥤']
];
for (let i=0; i<feelings.length; i++) {
  const [word, zh, icon] = feelings[i];
  const options = [feelings[(i+1)%5][0],feelings[(i+3)%5][0]];
  question('feelings','看情境，選出適合的單字',icon + '  ' + zh,word,options);
  question('feelings','聽一聽，選出聽到的感受','',word,options,{audio:'I’m ' + word + '.',fallback:'I’m ' + word + '.'});
  question('feelings','填入感受的英文單字',icon + '  I’m ___. （' + zh + '）',word,[]);
  question('feelings','選出適合的回答','Are you ' + word + '? （是，我' + zh + '。）','Yes, I am.',['No, I’m not.','I’m nine.']);
}
question('feelings','選出適合的回答','Are you angry? （沒有，我很開心。）','No, I’m not. I’m happy.',['Yes, I am.','No, I’m not. I’m thirsty.']);
question('feelings','選出適合的問題','B: Yes, I am. I need some water.','Are you thirsty?',['Are you hungry?','How old are you?']);

for (const [prompt, answer, a, b] of [
  ['Good morning.','Good morning.','Good afternoon.','Goodbye.'],
  ['Good afternoon.','Good afternoon.','Good morning.','I’m seven.'],
  ['How are you?','I’m fine.','I’m eight.','Goodbye.'],
  ['What’s your name?','My name is Emma.','I’m nine.','Good afternoon.'],
  ['Hi, I’m John.','Hi, I’m Amy.','I’m ten years old.','Sit down.'],
  ['Thank you.','You’re welcome.','I’m thirsty.','Stand up.'],
  ['Here you are.','Thank you.','I’m six.','What’s your name?'],
  ['Goodbye.','Bye.','Good morning.','I’m fine.'],
  ['Stand up.','站起來','坐下','揮手說再見'],
  ['Sit down.','坐下','站起來','喝水']
]) {
  question('daily','聽一聽，選出適合的回答或動作','',answer,[a,b],{audio:prompt,fallback:prompt});
}
question('daily','選出適合的問題','B: My name is Leo.','What’s your name?',['How old are you?','Are you OK?']);
question('daily','選出適合的回應','A: Here you are.\nB: Thank you.\nA: ___','You’re welcome.',['Good morning.','I’m hungry.']);
question('daily','選出適合的課堂指令','老師請大家坐下。','Sit down.',['Stand up.','Goodbye.']);

for (const [story, claim, yes, note] of [
  ['Mia: I’m eight. Today is my birthday!','Mia is eight years old.',true,'Mia 說 I’m eight.，她八歲。'],
  ['Leo: I’m not hungry. I’m thirsty.','Leo is hungry.',false,'Leo 說他不餓，他口渴。'],
  ['Amy: Are you sad?\nBen: No, I’m not. I’m happy.','Ben is happy.',true,'Ben 說他很開心。'],
  ['Joy: I’m ten. How about you?\nMax: I’m nine.','Max is ten years old.',false,'Max 說他九歲。'],
  ['Nina: Here you are.\nTom: Thank you.','Tom 說了謝謝。',true,'Thank you. 是謝謝。'],
  ['I’m hungry. I need some food.','說話的人想喝水。',false,'hungry 是肚子餓，food 是食物。'],
  ['I can’t find my pen. I’m sad.','說話的人很難過。',true,'sad 是難過。']
]) {
  question('review','讀一讀，下面這句對嗎？',story + '\n\n' + claim,yes?'○ 正確':'× 錯誤',[yes?'× 錯誤':'○ 正確'],{note});
}
for (const [word, answer] of [['lab','LAB'],['ham','HAM'],['FOOD','food'],['BED','bed']]) {
  question('review','把整個單字改成' + (answer === answer.toUpperCase()?'大寫':'小寫'),word,answer,[],{exact:true});
}
