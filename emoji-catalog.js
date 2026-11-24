/* THE YOUNG CLUB emoji directory, offline/local search (English & Korean keywords).
   Shared by Blog editor/comments and Community composer. No external API. */
(()=>{'use strict';
const groups=[
 ['Smileys / 표정',[
 '😀|grin happy smile|웃음 미소','😃|happy smile|기쁨','😄|laugh happy|웃음','😁|grin smile|치아 미소','😆|laugh big grin|크게 웃음','😅|sweat smile|땀 웃음','😂|laugh cry tears|웃음 눈물','🤣|rofl laugh|폭소','🥹|tears smile emotional|감동 눈물','😊|blush smile|미소','☺️|smile|미소','😇|angel innocent|천사','🙂|smile|미소','🙃|upside down|거꾸로','😉|wink|윙크','😍|heart eyes love|사랑 눈 하트','🥰|love hearts|사랑','😘|kiss|키스','😗|kiss|뽀뽀','😋|yummy delicious|맛있다','😛|tongue|혀','😜|wink tongue|장난','🤪|silly crazy|장난','😝|tongue laugh|장난','🤗|hug embrace|포옹','🤭|giggle hand mouth|웃음','🫢|surprise hand mouth|놀람','🫣|peek shy|부끄러움','🤫|shush quiet|조용','🤔|thinking|생각 고민','🫡|salute respect|경례','🤐|zip mouth secret|비밀','😐|neutral straight|무표정','😑|expressionless|무표정','😶|silent no mouth|침묵','🙄|eye roll|눈 굴리기','😏|smirk|비웃음','😒|unamused|불만','😔|sad pensive|슬픔','😢|cry sad|슬픔 눈물','😭|cry sob|울음','🥲|smiling tear|눈물','😤|steam nose angry|화남','😠|angry|화남','😡|rage angry|분노','🤬|swear curse|욕','😳|flushed embarrassed|당황','😱|scream fear|공포','😨|scared|무서움','😰|anxious sweat|걱정','🥺|pleading eyes|부탁 눈물','😬|grimace awkward|어색','😴|sleep zzz|잠','🥱|yawn tired|피곤','🤒|sick fever|아픔 감기','🤕|bandage injured|다침','🤢|nausea|메스꺼움','🤮|vomit|토','🤧|sneeze|재채기','😷|mask|마스크','🤩|star eyes excited|반짝 신남','🥳|party celebrate|축하 파티','😎|cool sunglasses|선글라스','🤓|nerd glasses|안경','🧐|monocle curious|궁금','🥸|disguise|변장','🤠|cowboy|카우보이','🤑|money face|돈','😈|devil|악마','👻|ghost|유령','💀|skull|해골','🤖|robot|로봇','👽|alien|외계인','💩|poop|똥'
 ]],
 ['Hands / 손짓',[
 '👋|wave hello|안녕 손 인사','🤚|raised hand|손','🖐️|hand fingers|손바닥','✋|stop hand|손바닥','🖖|vulcan|손','👌|ok perfect|오케이','🤌|pinched fingers|손가락','🤏|pinch small|조금','✌️|peace victory|브이','🤞|crossed fingers luck|행운','🫰|finger heart|손 하트','🤟|love you|사랑','🤘|rock sign|락','🤙|call me|전화','👈|point left|왼쪽','👉|point right|오른쪽','👆|point up|위','👇|point down|아래','☝️|point finger|손가락','👍|thumbs up like|좋아요 엄지','👎|thumbs down dislike|싫어요','✊|fist|주먹','👊|punch|주먹','🤛|fist left|주먹','🤜|fist right|주먹','👏|clap applause|박수','🙌|raised hands celebration|만세 환호','👐|open hands|손','🤲|palms together|손','🤝|handshake agreement|악수','🙏|pray thanks|기도 감사','🫶|heart hands|손하트 사랑','💪|muscle strong|근육 힘','🦾|robot arm|팔','🦵|leg|다리','🦶|foot|발','👀|eyes look|눈','🧠|brain|뇌','🫀|heart organ|심장','🦴|bone|뼈'
 ]],
 ['Hearts & Symbols / 하트',[
 '❤️|red heart love|빨간 하트 사랑','🩷|pink heart love|분홍 하트','🧡|orange heart|주황 하트','💛|yellow heart|노랑 하트','💚|green heart|초록 하트','💙|blue heart|파랑 하트','🩵|light blue heart|하늘 하트','💜|purple heart|보라 하트','🤎|brown heart|갈색 하트','🖤|black heart|검정 하트','🤍|white heart|하얀 하트','💔|broken heart|상처 하트','❤️‍🔥|heart on fire|불타는 하트','💕|two hearts|하트','💞|revolving hearts|사랑','💓|beating heart|심장','💗|growing heart|하트','💖|sparkling heart|반짝 하트','💘|cupid heart|큐피드','💝|gift heart|선물 하트','💟|heart decoration|하트','❣️|heart exclamation|하트 느낌표','💯|hundred perfect|백점 완벽','✅|check done yes|체크 확인','☑️|checkbox|체크','✔️|check|체크','❌|cross wrong|엑스','❗|exclamation important|느낌표 중요','❓|question|물음표','⚠️|warning caution|경고 주의','🚨|alarm emergency|경보','💡|idea light bulb|아이디어 전구','✨|sparkles|반짝','🌟|glowing star|별','⭐|star|별','💫|dizzy star|별','🔥|fire hot|불','💥|boom explosion|폭발','💦|splash sweat|물 땀','💨|wind speed|바람','💬|speech bubble|말풍선','🗨️|chat speech|대화','💭|thought bubble|생각','🔔|bell notifications|알림 종','📣|megaphone announce|확성기','🔒|lock secure|잠금','🔑|key|열쇠','🆕|new|새로운','🆒|cool|쿨','🆗|ok|오케이','🔴|red circle|빨간 원','🟡|yellow circle|노란 원','🟢|green circle|초록 원','🔵|blue circle|파란 원','🏳️|flag|깃발'
 ]],
 ['Nature & Animals / 자연',[
 '🌱|sprout growth|새싹 성장','🌿|herb leaves|잎','🍀|clover luck|네잎클로버 행운','🌳|tree|나무','🌲|evergreen tree|소나무','🌴|palm|야자수','🌵|cactus|선인장','🌸|flower cherry blossom|꽃 벚꽃','🌹|rose|장미','🌺|hibiscus flower|꽃','🌻|sunflower|해바라기','🌼|blossom daisy|꽃','🌷|tulip|튤립','🪻|hyacinth lavender|라벤더','🍁|maple leaf fall|단풍','🍂|autumn leaf|낙엽','🌾|rice grain|벼','🪴|potted plant|화분','☀️|sun|태양','🌤️|sun cloud|맑음','🌦️|sun rain|비','🌧️|rain cloud|비','❄️|snowflake|눈','🌈|rainbow|무지개','🌙|moon night|달','🌕|full moon|보름달','🌊|ocean wave|파도 바다','💧|water drop|물방울','🐶|dog puppy|강아지','🐕|dog|개','🐈|cat|고양이','🐱|cat face|고양이','🐻|bear|곰','🐼|panda|판다','🦊|fox|여우','🐰|rabbit bunny|토끼','🐹|hamster|햄스터','🐸|frog|개구리','🐢|turtle|거북이','🦋|butterfly|나비','🐝|bee|벌','🐞|ladybug|무당벌레','🐥|chick|병아리','🦄|unicorn|유니콘','🐳|whale|고래','🐬|dolphin|돌고래','🐙|octopus|문어','🦖|dinosaur|공룡'
 ]],
 ['Food & Drink / 음식',[
 '🍎|apple fruit|사과','🍊|orange tangerine|귤','🍋|lemon|레몬','🍌|banana|바나나','🍉|watermelon|수박','🍇|grapes|포도','🍓|strawberry|딸기','🫐|blueberry|블루베리','🍒|cherries|체리','🍑|peach|복숭아','🥑|avocado|아보카도','🥕|carrot|당근','🥦|broccoli|브로콜리','🍅|tomato|토마토','🌽|corn|옥수수','🥒|cucumber|오이','🥐|croissant|크루아상','🍞|bread|빵','🥯|bagel|베이글','🥨|pretzel|프레첼','🧀|cheese|치즈','🍳|egg cooking|계란','🥞|pancakes|팬케이크','🥓|bacon|베이컨','🍔|hamburger|햄버거','🍟|fries|감자튀김','🍕|pizza|피자','🌮|taco|타코','🍜|ramen noodle|라면 국수','🍝|pasta|파스타','🍣|sushi|초밥','🍱|bento|도시락','🍗|chicken leg|닭고기','🍩|donut|도넛','🍪|cookie|쿠키','🎂|birthday cake|생일 케이크','🧁|cupcake|컵케이크','🍰|cake|케이크','🍫|chocolate|초콜릿','🍬|candy|사탕','🍦|ice cream|아이스크림','☕|coffee|커피','🍵|tea|차','🧋|bubble tea|버블티','🥛|milk|우유','🧃|juice|주스','🍹|drink|음료'
 ]],
 ['Work, School & Health / 일·건강',[
 '🩺|stethoscope medical|청진기 병원','🏥|hospital medical|병원','💊|pill medicine|약','🩹|bandage medical|반창고','🩻|xray radiology|엑스레이','🧑‍⚕️|healthcare worker|의료인','👩‍⚕️|doctor female|의사','👨‍⚕️|doctor male|의사','🦽|wheelchair|휠체어','🦯|cane|지팡이','🛌|person in bed|침대','🏃|running exercise|달리기 운동','🚶|walking|걷기','🧘|yoga stretching|요가 스트레칭','🏋️|lifting weights gym|헬스 웨이트','🚴|cycling bike|자전거','🏊|swimming|수영','🧗|climbing|클라이밍','🤸|gymnastics|체조','⛹️|basketball person|농구','⚽|soccer ball|축구','🏀|basketball|농구','🏈|football|미식축구','🎾|tennis|테니스','⛳|golf|골프','🏆|trophy|트로피','🥇|gold medal|금메달','🥈|silver medal|은메달','🥉|bronze medal|동메달','🎖️|medal|훈장','🏅|medal sports|메달','🎯|target goal|목표','📚|books study|책 공부','📖|open book reading|독서 책','📕|red book|책','📒|notebook|노트','📓|journal notebook|일기','✏️|pencil|연필','📝|memo notes|메모','📋|clipboard list|차트','📌|pushpin|핀','📎|paperclip|클립','🧮|abacus|주판','🎓|graduation school|졸업 학위','🏫|school|학교','💻|laptop|노트북','🖥️|desktop computer|컴퓨터','⌨️|keyboard|키보드','📱|phone mobile|핸드폰','📷|camera photo|카메라','🎥|video camera|카메라','🎬|movie|영화','🎧|headphones|헤드폰','🎤|microphone|마이크','💼|briefcase work job|일 직장','📆|calendar|달력','⏰|alarm clock|알람','🔍|search magnifying glass|검색','📈|chart growth|차트 성장','📉|chart down|차트 하락','💰|money bag|돈','💵|money|달러','💸|money flying|돈','🛒|shopping cart|쇼핑','🎁|gift present|선물'
 ]],
 ['Travel & Celebrations / 여행',[
 '🎉|party celebrate|축하 파티','🎊|confetti celebration|축하','🎈|balloon birthday|풍선 생일','🎂|birthday cake|생일 케이크','🎁|gift present|선물','🥳|party|파티','🎃|pumpkin halloween|할로윈','🎄|christmas tree|크리스마스','🎅|santa claus|산타','⛄|snowman|눈사람','🎆|fireworks|불꽃놀이','🎇|sparkler|불꽃','🎀|ribbon|리본','🏖️|beach vacation|해변 휴가','⛺|camping|캠핑','🏕️|camp site|캠핑','✈️|airplane flight|비행기','🧳|luggage suitcase|여행 가방','🚗|car|자동차','🚕|taxi|택시','🚌|bus|버스','🚆|train|기차','🚀|rocket|로켓','🚲|bicycle|자전거','🗺️|map|지도','🧭|compass|나침반','🏙️|city skyline|도시','🌆|sunset city|노을','🌅|sunrise|일출','🏡|house home|집','🏠|home|집'
 ]]
];
const items=[],seen=new Set();
for(const [category,list] of groups){
 for(const raw of list){
  const [emoji,english='',korean='']=raw.split('|');
  if(!emoji||seen.has(emoji))continue;
  seen.add(emoji);
  items.push({emoji,category,keywords:(emoji+' '+english+' '+korean+' '+category).toLocaleLowerCase(),english,korean});
 }
}
function search(query,limit=240){
 const q=String(query||'').trim().toLocaleLowerCase();
 const terms=q.split(/\s+/).filter(Boolean);
 const found=terms.length?items.filter(i=>terms.every(t=>i.keywords.includes(t))):items;
 return found.slice(0,Math.min(400,Math.max(1,limit)));
}
window.TYC_EmojiCatalog=Object.freeze({items:Object.freeze(items),search,categories:Object.freeze(groups.map(g=>g[0]))});
})();
