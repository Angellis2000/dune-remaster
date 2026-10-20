import consoleUrl from '../gfx/assets/frontend/network-arrakis-observatory-v1.png?url';
import crestsUrl from '../gfx/assets/frontend/house-crests-modern.png?url';
import type {Button} from '../input/pad.ts';
let nextChoicePopupId=0;

interface NetworkMap {id:string;name:string;description:string;width:number;height:number;teamSize:number;capacity:number;preview:string;data:string;spawns?:{x:number;y:number}[]}
export interface NetworkRoom {id:string;name:string;map:string;players:number;capacity:number;state:'waiting'|'playing'|'finished';passwordRequired?:boolean}
/** Комната и состав с сервера (net/session.ts). */
export interface ServerRoomInfo {id:string;name:string;map:number;teamSize:number;players:number;capacity:number;state:'waiting'|'playing'|'finished';passwordRequired:boolean}
export interface ServerRoomState extends ServerRoomInfo {host:number;config:{map:number;teamSize:number;credits:number};observers:number;members:{slot:number;name:string;house:string;team:number;connected:boolean;ai?:boolean;difficulty?:number;spawn?:number|null}[]}
/** Карта для лобби: каталог сетевых карт или карты ROM (id «rom-N»). */
const HOUSE_NAMES_LOBBY:Record<string,string>={A:'Атрейдесы',H:'Харконнены',O:'Ордосы',F:'Фримены',S:'Сардаукары',M:'Наёмники'};
export type LobbyMap={id:string;name:string;description:string;width:number;height:number;teamSize:number;capacity:number;preview:string;data:string;spawns?:{x:number;y:number}[]};
const HOUSE_OPTIONS=[['A','Атрейдесы'],['H','Харконнены'],['O','Ордосы'],['F','Фримены'],['S','Сардаукары'],['M','Наёмники']] as const;
export interface NetworkLobbyConfig {
  version:1;server:string;name:string;roomName:string;password:string;teamSize:number;map:string;randomStarts:boolean;seed:number;resources:number;speed:string;friendlyFire:false;infiniteSpice:true;role:'player'|'observer';
  slots:{id:number;team:number;controller:string;house:string;difficulty:string;spawn:number|null}[];
}
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,className='',text='')=>{
  const element=document.createElement(tag);element.className=className;element.textContent=text;return element;
};
function choice(label:string,options:readonly(readonly[string,string])[],value?:string){
  const select=node('select');select.setAttribute('aria-label',label);
  options.forEach(([id,text])=>{const option=node('option','',text);option.value=id;select.append(option);});
  if(value!==undefined)select.value=value;return select;
}
function field(label:string,input:HTMLElement){const root=node('label','network-field');root.append(node('span','',label),input);return root;}

/** Offline lobby presentation. snapshot() is the boundary for the later network client. */
export class NetworkMenu {
  readonly root=node('section','settings network-menu');
  private dialog=node('div','network-console');
  private connection=node('div','network-connection');
  private name=node('input');private roomName=node('input');
  private roomPassword=node('input');private passwordDialog=node('section','network-password-dialog');private passwordInput=node('input');private passwordMessage=node('p');
  private pendingJoin:{id:string;observer:boolean}|null=null;
  private creatingRoom=false;private createName=node('input');private createNameField=field('Название комнаты',this.createName);
  private playerHouse=choice('Ваш дом',HOUSE_OPTIONS, 'A');
  private roomSection=node('section','network-room-browser');private roomList=node('div','network-room-list');
  private lobby=node('div','network-lobby');private roomField:HTMLElement|null=null;
  private rooms:NetworkRoom[]=[];private selectedRoom='';private mode:'rooms'|'lobby'='rooms';
  private role:'player'|'observer'='player';private observerBadge=node('p','network-observers');
  private observedRoom:string|null=null;
  private map=choice('Карта',[]);private preview=node('img');
  private format=choice('Формат матча',[['1','1 на 1'],['2','2 на 2'],['3','3 на 3'],['4','4 на 4']],'4');
  private description=node('p','network-map-description');
  private random=node('input');private seed=Math.floor(Math.random()*0xffffffff)>>>0;
  private resources=choice('Начальные кредиты',[['2000','2 000'],['5000','5 000'],['10000','10 000'],['20000','20 000'],['25000','25 000'],['50000','50 000']], '5000');
  private speed=choice('Скорость игры',[['normal','Нормально'],['fast','Быстро']], 'normal');
  private slots:{controller:HTMLSelectElement;house:HTMLSelectElement;difficulty:HTMLSelectElement;row:HTMLElement;active:boolean}[]=[];
  private status=node('p','network-status','Сервер не подключён');
  private mapList:NetworkMap[]=[];
  private previousFocus:HTMLElement|null=null;
  private viewer=node('section','network-map-viewer');
  private viewerImage=node('img');private viewerTitle=node('h2');private viewerZoom=1;
  private viewerStage=node('div','network-map-stage');private viewerViewport=node('div','network-map-viewport');
  private markers=node('div','network-spawn-markers');
  private choicePopup=node('div','network-choice-popup');private choiceSelect:HTMLSelectElement|null=null;private choiceCursor=0;
  private spawnMessage=node('p','network-map-legend');
  private spawnPoints:{id:number;team:number;x:number;y:number}[]=[];
  private spawnAssignments=new Map<number,number>();private spawnMap='';private viewerBaseSize=512;
  /** серверный режим: комнаты и состав приходят с сервера, карты — из ROM */
  private server=false;private serverReady=false;private you:number|null=null;private room:ServerRoomState|null=null;
  constructor(private host:{back():void;ui?(sequence?:number):void;endpoint?:string;refreshRooms?():void;joinRoom?(id:string,role:'player'|'observer',password?:string):void;leaveObservation?():void;
    romMaps?():LobbyMap[];connect?(name:string):Promise<void>;createRoom?(c:{roomName:string;password:string;map:number;teamSize:number;credits:number;house:string}):void;
    leaveRoom?():void;setOwn?(c:{house?:string;team?:number;spawn?:number}):void;setConfig?(c:{map:number;teamSize:number;credits:number}):void;startMatch?():void;
    bot?(c:{op:'add';team:number;house?:string;difficulty?:number}|{op:'remove';slot:number}|{op:'set';slot:number;house?:string;difficulty?:number}):void;openReplays?():void}){
    this.root.hidden=true;this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-label','Сетевая игра');
    this.dialog.style.setProperty('--network-console',`url("${consoleUrl}")`);
    this.root.style.setProperty('--network-backdrop',`url("${consoleUrl}")`);
    this.root.style.setProperty('--network-crests',`url("${crestsUrl}")`);
    const header=node('header','network-heading');header.append(node('div','network-eyebrow','ARRAKIS · КОМАНДНЫЙ ЦЕНТР'),node('h1','','СЕТЕВАЯ ИГРА'),node('span','network-capacity','4 × 4 / 8 МЕСТ'));
    const back=node('button','network-back','Назад');back.type='button';back.addEventListener('click',()=>this.back());header.append(back);
    this.name.maxLength=24;this.name.value='Командир';this.name.setAttribute('autocomplete','nickname');
    this.roomName.maxLength=48;this.roomName.value='Битва за Арракис';this.roomField=field('Название комнаты',this.roomName);this.roomField.hidden=true;
    this.roomPassword.type='password';this.roomPassword.maxLength=32;this.roomPassword.autocomplete='new-password';
    for(const input of [this.name,this.roomName]){
      input.readOnly=true;input.addEventListener('pointerdown',()=>{input.readOnly=false;});input.addEventListener('blur',()=>{input.readOnly=true;});
    }
    const connection=this.connection;connection.append(field('Имя игрока',this.name),field('Ваш дом',this.playerHouse),this.roomField,this.status);this.status.setAttribute('role','status');
    this.playerHouse.addEventListener('change',()=>{if(this.slots[0])this.slots[0].house.value=this.playerHouse.value;});
    const layout=node('div','network-layout'),sidebar=node('aside','network-map-panel');
    this.preview.alt='Схема карты и стартовые позиции';this.preview.width=this.preview.height=768;
    this.preview.tabIndex=0;this.preview.draggable=false;this.preview.setAttribute('role','button');this.preview.setAttribute('aria-label','Просмотреть карту');
    this.preview.addEventListener('click',()=>void this.openMap());
    this.map.addEventListener('change',()=>this.updateMap());
    this.format.addEventListener('change',()=>this.applyFormat());
    sidebar.append(field('Формат матча',this.format),field('Театр военных действий',this.map),this.preview,this.description);
    this.random.type='checkbox';this.random.checked=true;this.random.addEventListener('change',()=>{if(this.random.checked)this.spawnAssignments.clear();});const random=node('label','network-random');random.append(this.random,node('span','','Случайные позиции внутри команд'));sidebar.append(random);
    const rules=node('div','network-rules');rules.append(field('Кредиты',this.resources),field('Скорость',this.speed),field('Пароль комнаты',this.roomPassword));sidebar.append(rules);
    sidebar.append(node('p','network-friendly-fire','Огонь по союзникам запрещён'));
    const teams=node('div','network-teams');
    for(let team=0;team<2;team++){
      const section=node('section',`network-team team-${team}`);section.append(node('h2','',team?'КОМАНДА 2 · ПРОТИВНИКИ':'КОМАНДА 1 · СОЮЗНИКИ'));
      const labels=node('div','network-slot-labels');['Место','Участник','Дом','ИИ',''].forEach(label=>labels.append(node('span','',label)));section.append(labels);
      const add=node('button','network-add','+ Игрок');add.type='button';
      add.setAttribute('aria-label',`Добавить игрока в команду ${team+1}`);
      for(let index=0;index<4;index++){
        const id=team*4+index,row=node('div','network-slot');
        const controller=choice(`Участник ${id+1}`,[['open','Открыто'],['human','Игрок'],['ai',team?'ИИ · враг':'ИИ · союзник'],['closed','Закрыто']],id===0?'human':team&&index===0?'ai':'open');
        const house=choice(`Дом участника ${id+1}`,[['random','Случайный'],...HOUSE_OPTIONS]);
        if(id===0){house.options[0].remove();house.value=this.playerHouse.value;house.addEventListener('change',()=>{this.playerHouse.value=house.value;});}
        const difficulty=choice(`Сложность ИИ ${id+1}`,[['easy','Легко'],['normal','Нормально'],['hard','Сложно']], 'normal');
        const update=()=>{difficulty.disabled=controller.value!=='ai';house.disabled=controller.value==='closed';row.classList.toggle('slot-closed',controller.value==='closed');};
        controller.addEventListener('change',update);update();
        const remove=node('button','network-remove','×');remove.type='button';remove.setAttribute('aria-label',`Убрать игрока ${id+1}`);remove.disabled=id===0;
        row.append(node('span','network-slot-number',String(id+1).padStart(2,'0')),controller,house,difficulty,remove);section.append(row);
        const slot={controller,house,difficulty,row,active:index===0};this.slots.push(slot);row.hidden=!slot.active;
        remove.addEventListener('click',()=>{slot.active=false;row.hidden=true;for(const [point,player]of this.spawnAssignments)if(player===id)this.spawnAssignments.delete(point);add.disabled=false;add.focus();});
      }
      add.addEventListener('click',()=>{
        const available=this.slots.slice(team*4,team*4+Number(this.format.value)).find(slot=>!slot.active);
        if(!available)return;available.active=true;available.row.hidden=false;available.controller.value='human';available.controller.dispatchEvent(new Event('change',{bubbles:true}));available.controller.focus();
        add.disabled=this.slots.slice(team*4,team*4+Number(this.format.value)).every(slot=>slot.active);
      });
      section.append(add);
      teams.append(section);
    }
    const roster=node('div','network-roster'),matchRules=node('div','network-match-rules');
    const sections=node('nav','network-compact-nav');sections.setAttribute('aria-label','Раздел настроек');
    this.root.dataset.section='map';
    for(const [id,label]of [['map','Карта'],['players','Игроки'],['rules','Правила']]){
      const button=node('button','network-section-tab',label);button.type='button';button.dataset.section=id;button.setAttribute('aria-pressed',String(id==='map'));
      button.addEventListener('click',()=>{
        this.root.dataset.section=id;
        sections.querySelectorAll<HTMLButtonElement>('button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
      });sections.append(button);
    }
    this.lobby.append(sections);
    matchRules.append(random,rules,sidebar.querySelector('.network-friendly-fire')!,node('p','network-friendly-fire','Месторождения спайса не истощаются'));
    roster.append(teams,matchRules);layout.append(sidebar,roster);
    const footer=node('footer','network-footer');
    const note=node('div');note.append(node('strong','','ПЕСОК. СПАЙС. ПРЕВОСХОДСТВО.'),node('p','','↑ ↓ настройка · ← → значение · A / Enter выбор · B / Esc назад'));
    const actions=node('div','network-actions');
    for(const label of ['Создать игру','Подключиться']){const button=node('button','',label);button.type='button';button.disabled=true;button.title='Сетевое подключение ещё не настроено';actions.append(button);}
    note.append(this.observerBadge);footer.append(note,actions);this.lobby.append(layout,footer);this.lobby.hidden=true;
    const roomsHeading=node('div','network-rooms-heading');roomsHeading.append(node('h2','','ОТКРЫТЫЕ КОМНАТЫ'),node('span','network-room-preview-label','ПРЕДПРОСМОТР'));
    const refresh=node('button','','Обновить');refresh.type='button';refresh.addEventListener('click',()=>{this.host.refreshRooms?.();if(!this.server)this.status.textContent='Сервер не подключён · макет интерфейса';});
    const create=node('button','network-create','Создать комнату');create.type='button';create.addEventListener('click',()=>this.openCreateRoom());
    const replays=node('button','network-replays-open','Записи');replays.type='button';replays.title='Записи сыгранных матчей';replays.addEventListener('click',()=>this.host.openReplays?.());roomsHeading.append(refresh,replays,create);
    const columns=node('div','network-room-columns');['Комната','Карта','Игроки','Состояние'].forEach(text=>columns.append(node('span','',text)));
    const roomFooter=node('div','network-rooms-footer');roomFooter.append(node('p','','Выберите комнату и нажмите A / Enter, чтобы войти. ↑ ↓ выбор · B / Esc назад'));
    const join=node('button','network-join','Войти в комнату');join.type='button';join.addEventListener('click',()=>this.joinSelected());roomFooter.append(join);
    const observe=node('button','network-observe','Войти наблюдателем');observe.type='button';observe.addEventListener('click',()=>this.joinSelected(true));roomFooter.append(observe);
    this.roomSection.append(roomsHeading,columns,this.roomList,roomFooter);
    this.dialog.append(header,connection,this.roomSection,this.lobby);this.root.append(this.dialog);
    this.setRooms([
      {id:'preview-1',name:'Битва за спайс',map:'rift-valley',players:3,capacity:8,state:'waiting'},
      {id:'preview-2',name:'Большая война · 4 × 4',map:'imperial-frontier',players:8,capacity:8,state:'playing'},
      {id:'preview-3',name:'Совместная операция',map:'worm-ring',players:4,capacity:8,state:'waiting'},
    ],true);
    this.viewer.hidden=true;this.viewer.setAttribute('role','dialog');this.viewer.setAttribute('aria-label','Просмотр карты');this.viewer.setAttribute('aria-modal','true');
    const viewerToolbar=node('header','network-map-toolbar');this.viewerStage.append(this.viewerImage,this.markers);this.viewerViewport.append(this.viewerStage);
    this.viewerImage.alt='Большая карта со стартовыми позициями двух команд';this.viewerImage.draggable=false;
    this.viewer.addEventListener('dragstart',event=>event.preventDefault());
    viewerToolbar.append(this.viewerTitle);
    for(const [label,action]of [['−',()=>this.zoomMap(-.5)],['+',()=>this.zoomMap(.5)],['Закрыть',()=>this.closeMap()]] as const){const button=node('button','',label);button.type='button';button.setAttribute('aria-label',label==='−'?'Уменьшить карту':label==='+'?'Увеличить карту':label);button.addEventListener('click',action);viewerToolbar.append(button);}
    this.viewer.append(viewerToolbar,this.viewerViewport,this.spawnMessage);
    this.root.append(this.viewer);
    this.passwordDialog.hidden=true;this.passwordDialog.setAttribute('role','dialog');this.passwordDialog.setAttribute('aria-modal','true');this.passwordDialog.setAttribute('aria-label','Пароль комнаты');
    this.passwordInput.type='password';this.passwordInput.maxLength=32;this.passwordInput.autocomplete='current-password';this.passwordInput.setAttribute('aria-label','Пароль комнаты');
    const passwordActions=node('div','network-actions'),passwordEnter=node('button','','Войти'),passwordCancel=node('button','','Отмена');passwordEnter.type=passwordCancel.type='button';passwordEnter.addEventListener('click',()=>this.confirmRoomPassword());passwordCancel.addEventListener('click',()=>this.cancelRoomPassword());passwordActions.append(passwordEnter,passwordCancel);
    this.createName.maxLength=48;this.createNameField.hidden=true;
    this.passwordMessage.setAttribute('role','status');this.passwordDialog.append(node('h2','','ПАРОЛЬ КОМНАТЫ'),this.passwordMessage,this.createNameField,field('Введите пароль',this.passwordInput),passwordActions);this.root.append(this.passwordDialog);
    this.choicePopup.id=`network-choice-${++nextChoicePopupId}`;this.choicePopup.hidden=true;this.choicePopup.setAttribute('role','listbox');this.root.append(this.choicePopup);
    this.root.querySelectorAll<HTMLSelectElement>('select').forEach(select=>{
      select.setAttribute('aria-controls',this.choicePopup.id);select.setAttribute('aria-expanded','false');
      select.addEventListener('pointerdown',event=>{event.preventDefault();if(select.disabled)return;if(this.choiceSelect===select)this.closeChoice();else this.openChoice(select);});
      select.addEventListener('mousedown',event=>event.preventDefault());
      select.addEventListener('click',event=>{event.preventDefault();if(event.detail===0&&!this.choiceSelect&&!select.disabled)this.openChoice(select);});
    });
    this.root.addEventListener('pointerdown',event=>{if(this.choiceSelect&&!this.choicePopup.contains(event.target as Node)&&event.target!==this.choiceSelect)this.closeChoice(false);},{capture:true});
    window.addEventListener('pointerdown',event=>{if(this.choiceSelect&&!this.root.contains(event.target as Node))this.closeChoice(false);},{capture:true});
    this.root.addEventListener('scroll',event=>{if(this.choiceSelect&&event.target!==this.choicePopup&&!this.choicePopup.contains(event.target as Node))this.closeChoice(false);},{capture:true});
    this.root.addEventListener('focusin',()=>{if(this.isOpen)this.host.ui?.(0x19);});
    this.root.addEventListener('change',()=>this.host.ui?.(0x28));
    this.root.addEventListener('click',event=>{if(this.isOpen&&(event.target as HTMLElement).closest('button'))this.host.ui?.(0x28);});
    this.root.addEventListener('keydown',event=>{
      if(event.code==='Escape'){event.preventDefault();event.stopPropagation();if(this.choiceSelect)this.closeChoice();else if(!this.passwordDialog.hidden)this.cancelRoomPassword();else if(!this.viewer.hidden)this.closeMap();else this.back();return;}
      if(event.code==='F4'&&(event.target as HTMLElement).tagName==='SELECT'){event.preventDefault();event.stopPropagation();this.openChoice(event.target as HTMLSelectElement);return;}
      if((event.code==='Enter'||event.code==='NumpadEnter')&&(event.target===this.passwordInput||event.target===this.createName)){event.preventDefault();event.stopPropagation();this.confirmRoomPassword();return;}
      const arrows:Record<string,Button>={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'a',NumpadEnter:'a',Space:'a',Digit1:'a',Numpad1:'a',Digit2:'b',Numpad2:'b',Digit3:'c',Numpad3:'c'};
      const button=arrows[event.code];
      if(button){
        const target=event.target as HTMLInputElement;
        if(target.tagName==='INPUT'&&target.type!=='checkbox'&&!target.readOnly&&/^Digit|^Numpad|^Space/.test(event.code))return;
        if((event.code==='ArrowLeft'||event.code==='ArrowRight')&&target.tagName==='INPUT'&&target.type!=='checkbox'&&target.type!=='number'&&!target.readOnly)return;
        event.preventDefault();event.stopPropagation();this.handlePad(button);return;
      }
      if(event.code==='Tab'){
        this.closeChoice(false);
        const focusable=this.focusable(),first=focusable[0],last=focusable.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    },{capture:true});
    window.addEventListener('resize',()=>{this.closeChoice(false);if(!this.viewer.hidden)this.fitMap();});
  }
  get isOpen(){return !this.root.hidden;}
  async open(){
    this.previousFocus=document.activeElement as HTMLElement;this.root.hidden=false;this.showRooms();this.host.ui?.(0x2c);this.root.querySelector<HTMLElement>('.network-create')?.focus();
    if(this.host.romMaps&&this.host.connect){await this.openServer();return;}
    try{
      const previousMap=this.map.value;
      const response=await fetch('./maps/network/catalog.json',{cache:'no-store'});if(!response.ok)throw Error('catalog');
      this.mapList=await response.json();
      this.applyFormat(previousMap);
      this.renderRooms();
    }catch{this.description.textContent='Не удалось загрузить каталог карт. Повторите вход в лобби.';}
  }
  close(){this.closeChoice(false);if(this.observedRoom)this.host.leaveObservation?.();this.observedRoom=null;this.root.hidden=true;this.viewer.hidden=true;this.passwordDialog.hidden=true;this.passwordInput.value='';this.pendingJoin=null;this.dialog.inert=false;}
  private async openMap(){
    const map=this.mapList.find(item=>item.id===this.map.value);if(!map)return;
    if(!map.data){this.spawnPoints=[];this.markers.replaceChildren();}
    this.viewerTitle.textContent=`${map.name} · ${map.teamSize} на ${map.teamSize} · ${map.width} × ${map.height}`;this.viewerImage.src=map.preview;
    this.viewerZoom=1;this.viewer.hidden=false;this.dialog.inert=true;
    this.fitMap();this.viewerViewport.scrollTop=this.viewerViewport.scrollLeft=0;
    this.host.ui?.(0x28);this.focusable()[0]?.focus();
    if(this.server&&this.room&&map.spawns){this.drawServerSpawns();return;}
    if(!map.data){this.spawnMessage.textContent='Стартовые позиции выбираются автоматически: команды как можно дальше друг от друга.';return;}
    try{const response=await fetch(map.data,{cache:'no-store'});if(!response.ok)throw Error('map');const data=await response.json();if(this.viewer.hidden||this.map.value!==map.id)return;if(this.spawnMap!==map.id){this.spawnMap=map.id;this.spawnAssignments.clear();}this.spawnPoints=data.spawns;this.drawSpawns();}catch{this.spawnMessage.textContent='Не удалось загрузить точки высадки.';}
  }
  private fitMap(){this.viewerBaseSize=Math.max(1,Math.min(this.viewerViewport.clientWidth,this.viewerViewport.clientHeight)-2);this.viewerStage.style.width=`${Math.floor(this.viewerBaseSize*this.viewerZoom)}px`;this.viewerViewport.style.overflow=this.viewerZoom===1?'hidden':'auto';if(this.viewerZoom===1)this.viewerViewport.scrollTop=this.viewerViewport.scrollLeft=0;}
  private zoomMap(delta:number){this.viewerZoom=Math.max(1,Math.min(3,this.viewerZoom+delta));this.fitMap();}
  private playerLabel(id:number){return id===0&&this.role==='player'?(this.name.value.trim()||'Вы'):(this.slots[id]?.controller.value==='ai'?'ИИ ':'Игрок ')+(id+1);}
  private drawSpawns(){
    const map=this.mapList.find(item=>item.id===this.map.value);if(!map)return;
    this.markers.replaceChildren();const selected=0;
    for(const point of this.spawnPoints){
      const occupant=this.spawnAssignments.get(point.id),own=occupant===0&&this.role==='player',button=node('button',`network-spawn-point spawn-team-${point.team}${occupant!==undefined?' occupied':''}${own?' spawn-self':''}`);
      button.type='button';button.style.left=`${(point.x+.5)/map.width*100}%`;button.style.top=`${(point.y+.5)/map.height*100}%`;
      button.disabled=this.role==='observer'||point.team!==0;
      button.dataset.point=String(point.id);button.setAttribute('aria-label',`Точка ${point.id+1}: ${occupant===undefined?'свободна':this.playerLabel(occupant)}`);button.append(node('span','',String(point.id+1)));
      if(occupant!==undefined){
        const house=this.slots[occupant]?.house.value??'random',houseName=({A:'Атрейдесы',H:'Харконнены',O:'Ордосы'} as Record<string,string>)[house]??'Случайный дом';
        const flag=node('span',`network-house-flag flag-house-${house}`);flag.setAttribute('aria-hidden','true');flag.append(node('span',`network-house-crest crest-${house}`,house==='random'?'?':''));
        button.append(flag,node('strong','network-spawn-owner',`${this.playerLabel(occupant)} · ${houseName}${own?' · Вы':point.team?' · враг':' · союзник'}`));
        button.setAttribute('aria-label',`Точка ${point.id+1}: ${this.playerLabel(occupant)}, ${houseName}${own?', ваша высадка':point.team?', противник':', союзник'}`);
      }
      button.addEventListener('click',()=>{
        if(this.role==='observer'){this.spawnMessage.textContent='Режим наблюдателя: точки высадки выбирают игроки.';return;}
        if(occupant!==undefined&&occupant!==selected){this.spawnMessage.textContent=`Точка ${point.id+1} занята: ${this.playerLabel(occupant)}.`;this.host.ui?.(0x1a);return;}
        if(point.team!==Math.floor(selected/4)){this.spawnMessage.textContent='Выберите точку на стороне своей команды.';this.host.ui?.(0x1a);return;}
        for(const [start,player]of this.spawnAssignments)if(player===selected)this.spawnAssignments.delete(start);
        if(occupant!==selected)this.spawnAssignments.set(point.id,selected);
        this.random.checked=false;this.drawSpawns();this.markers.querySelector<HTMLElement>(`[data-point="${point.id}"]`)?.focus();this.host.ui?.(0x28);
      });this.markers.append(button);
    }
    this.spawnMessage.textContent=this.role==='observer'?'Наблюдение: точки высадки выбирают игроки.':`Выберите свою свободную точку на синей стороне. Красные точки — противники. Занято: ${this.spawnAssignments.size} / ${Number(this.format.value)*2}.`;
    this.fitMap();
  }
  /** Точки высадки комнаты на сервере: свою — щелчком занять или снять, занятые другими показаны с именем и домом. */
  private drawServerSpawns(){
    const map=this.mapList.find(item=>item.id===this.map.value),room=this.room;if(!map?.spawns||!room)return;
    this.markers.replaceChildren();
    const me=room.members.find(m=>m.slot===this.you),waiting=room.state==='waiting';
    map.spawns.slice(0,6).forEach((point,i)=>{
      const occupant=room.members.find(m=>!m.ai&&m.spawn===i),own=!!occupant&&occupant.slot===this.you,enemy=!!occupant&&!!me&&occupant.team!==me.team;
      const button=node('button',`network-spawn-point${occupant?` occupied spawn-team-${enemy?1:0}`:''}${own?' spawn-self':''}`);
      button.type='button';button.style.left=`${(point.x+1)/map.width*100}%`;button.style.top=`${(point.y+1)/map.height*100}%`;
      button.disabled=this.you===null||!waiting;button.dataset.point=String(i);button.append(node('span','',String(i+1)));
      const houseName=occupant?(HOUSE_NAMES_LOBBY[occupant.house]??'Дом'):'';
      button.setAttribute('aria-label',occupant?`Точка ${i+1}: ${occupant.name}, ${houseName}${own?', ваша':''}`:`Точка ${i+1}: свободна`);
      if(occupant){
        const flag=node('span',`network-house-flag flag-house-${occupant.house}`);flag.setAttribute('aria-hidden','true');flag.append(node('span',`network-house-crest crest-${occupant.house}`));
        button.append(flag,node('strong','network-spawn-owner',`${occupant.name} · ${houseName}${own?' · Вы':enemy?' · враг':' · союзник'}`));
      }
      button.addEventListener('click',()=>{
        if(occupant&&!own){this.spawnMessage.textContent=`Точка ${i+1} занята: ${occupant.name}.`;this.host.ui?.(0x1a);return;}
        this.host.setOwn?.({spawn:own?-1:i});this.host.ui?.(0x28);
      });
      this.markers.append(button);
    });
    this.spawnMessage.textContent=this.you===null?'Наблюдение: точки высадки выбирают игроки.':!waiting?'Матч уже идёт.':
      me?.spawn!=null?`Ваша точка высадки — ${me.spawn+1}. Нажмите её ещё раз, чтобы отменить.`:'Нажмите свободную точку, чтобы высадиться там. Без выбора точку назначит игра — команды подальше друг от друга.';
    this.fitMap();
  }
  private closeMap(){this.viewer.hidden=true;this.dialog.inert=false;this.preview.focus();this.host.ui?.(0x28);}
  private back(){if(this.mode==='lobby'){if(this.server){this.host.leaveRoom?.();this.room=null;this.you=null;this.host.refreshRooms?.();}this.showRooms();this.focusable().find(element=>element.classList.contains('network-room'))?.focus();this.host.ui?.(0x28);return;}this.close();this.host.ui?.();this.host.back();this.previousFocus?.focus();}
  private showRooms(){if(this.observedRoom)this.host.leaveObservation?.();this.observedRoom=null;this.role='player';this.playerHouse.disabled=false;this.roomName.disabled=false;this.mode='rooms';this.lobby.hidden=true;this.roomSection.hidden=false;this.connection.hidden=true;const capacity=this.root.querySelector<HTMLElement>('.network-capacity');if(capacity)capacity.hidden=true;if(this.roomField)this.roomField.hidden=true;if(!this.server)this.status.textContent='Единый сервер · макет интерфейса';this.updateRoomActions();}
  private showLobby(room?:NetworkRoom,role:'player'|'observer'='player'){
    this.mode='lobby';this.lobby.hidden=false;this.roomSection.hidden=true;this.connection.hidden=false;const capacity=this.root.querySelector<HTMLElement>('.network-capacity');if(capacity)capacity.hidden=false;if(this.roomField)this.roomField.hidden=false;
    this.role=role;const observing=role==='observer';this.playerHouse.disabled=observing;this.roomName.disabled=observing;
    this.slots[0].active=!observing;this.slots[0].row.hidden=observing;
    if(room){const map=this.mapList.find(map=>map.id===room.map);if(map){this.format.value=String(map.teamSize);this.applyFormat(room.map);}}
    if(observing)for(const [point,player]of this.spawnAssignments)if(player===0)this.spawnAssignments.delete(point);
    for(const control of [this.format,this.map,this.random,this.resources,this.speed,this.roomPassword])control.disabled=observing||!!room;
    this.slots.forEach((slot,id)=>{slot.controller.disabled=observing;slot.house.disabled=observing||slot.controller.value==='closed';slot.difficulty.disabled=observing||slot.controller.value!=='ai';const remove=slot.row.querySelector<HTMLButtonElement>('button');if(remove)remove.disabled=observing||id===0;});
    this.lobby.querySelectorAll<HTMLButtonElement>('.network-add').forEach((button,index)=>button.disabled=observing||this.slots.slice(index*4,index*4+Number(this.format.value)).every(slot=>slot.active));
    this.observerBadge.hidden=!observing;this.observerBadge.textContent=observing?`НАБЛЮДАТЕЛЬ · ${this.name.value.trim()||'Вы'} · до завершения матча · игровое место не занято`:'';
    if(room){this.map.value=room.map;this.roomName.value=room.name;this.updateMap();}
    this.status.textContent=observing?'Наблюдение · макет комнаты':room?'Предпросмотр комнаты · сервер не подключён':'Новая комната · сервер не подключён';
    if(observing)this.preview.focus();else this.roomName.focus();
  }
  setRooms(rooms:NetworkRoom[],preview=false){
    this.rooms=rooms;if(!rooms.some(room=>room.id===this.selectedRoom))this.selectedRoom=rooms[0]?.id??'';
    if(this.observedRoom&&!rooms.some(room=>room.id===this.observedRoom&&room.state==='playing')){this.viewer.hidden=true;this.dialog.inert=false;this.showRooms();this.status.textContent='Матч завершён. Просмотр закрыт.';}
    const label=this.root.querySelector<HTMLElement>('.network-room-preview-label');if(label)label.textContent=preview?'ПРЕДПРОСМОТР':'ЕДИНЫЙ СЕРВЕР';
    this.renderRooms();
  }
  private renderRooms(){
    this.roomList.replaceChildren();
    if(!this.rooms.length){this.roomList.append(node('p','network-empty-rooms','Открытых комнат пока нет. Создайте свою.'));this.updateRoomActions();return;}
    for(const room of this.rooms){
      const button=node('button','network-room');button.type='button';button.dataset.roomId=room.id;button.setAttribute('aria-pressed',String(this.selectedRoom===room.id));
      const map=this.mapList.find(item=>item.id===room.map);
      button.append(node('strong','',room.name),node('span','network-room-map',`${map?.name??'Арракис'} · ${room.capacity/2} × ${room.capacity/2}`),node('span','network-room-population',`${room.players} / ${room.capacity}`),node('span',`network-room-state state-${room.state}`,room.state==='waiting'?'Ожидание':room.state==='playing'?'Идёт игра':'Завершена'));
      button.addEventListener('click',()=>{this.selectedRoom=room.id;this.roomList.querySelectorAll<HTMLElement>('button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));this.updateRoomActions();});
      button.addEventListener('dblclick',()=>{this.selectedRoom=room.id;this.joinSelected();});this.roomList.append(button);
    }this.updateRoomActions();
  }
  private updateRoomActions(){const room=this.rooms.find(item=>item.id===this.selectedRoom),join=this.root.querySelector<HTMLButtonElement>('.network-join'),observe=this.root.querySelector<HTMLButtonElement>('.network-observe');if(join)join.disabled=!room||room.state!=='waiting'||room.players>=room.capacity;if(observe){observe.disabled=!room||room.state!=='playing';observe.title='Наблюдение доступно только во время матча';}}
  private joinSelected(observer=false,password?:string){
    const room=this.rooms.find(item=>item.id===this.selectedRoom);if(!room||(observer?room.state!=='playing':room.state!=='waiting'||room.players>=room.capacity))return;
    if(room.passwordRequired!==false&&password===undefined){this.creatingRoom=false;this.createNameField.hidden=true;this.passwordInput.autocomplete='current-password';this.passwordDialog.querySelector('h2')!.textContent='ПАРОЛЬ КОМНАТЫ';this.passwordDialog.querySelector('button')!.textContent='Войти';this.passwordDialog.querySelector('button')!.classList.remove('network-create');this.pendingJoin={id:room.id,observer};this.passwordDialog.hidden=false;this.dialog.inert=true;this.passwordInput.value='';this.passwordInput.readOnly=false;this.passwordMessage.textContent=room.name;this.passwordInput.focus();return;}
    const role=observer?'observer':'player';this.role=role;this.observedRoom=observer?room.id:null;if(this.host.joinRoom)this.host.joinRoom(room.id,role,password);else this.showLobby(room,role);
  }
  private openCreateRoom(){this.creatingRoom=true;this.pendingJoin=null;this.createNameField.hidden=false;this.createName.value=this.roomName.value;this.createName.readOnly=false;this.passwordInput.value='';this.passwordInput.readOnly=false;this.passwordInput.autocomplete='new-password';this.passwordDialog.querySelector('h2')!.textContent='СОЗДАТЬ КОМНАТУ';this.passwordDialog.querySelector('button')!.textContent='Создать комнату';this.passwordDialog.querySelector('button')!.classList.add('network-create');this.passwordMessage.textContent='Укажите название и пароль для входа игроков и наблюдателей.';this.passwordDialog.hidden=false;this.dialog.inert=true;this.createName.focus();this.createName.select();}
  private confirmRoomPassword(){const pending=this.pendingJoin;if(!pending&&!this.creatingRoom)return;if(this.creatingRoom&&!this.createName.value.trim()){this.passwordMessage.textContent='Введите название комнаты.';this.createName.focus();return;}if(!this.passwordInput.value){this.passwordMessage.textContent='Введите пароль комнаты.';this.passwordInput.focus();this.host.ui?.(0x1a);return;}const password=this.passwordInput.value;this.passwordDialog.hidden=true;this.passwordInput.value='';this.pendingJoin=null;this.dialog.inert=false;if(this.creatingRoom){this.creatingRoom=false;this.roomName.value=this.createName.value.trim();this.roomPassword.value=password;this.seed=Math.floor(Math.random()*0xffffffff)>>>0;if(this.server){const map=Number(this.map.value.replace('rom-',''))||1;this.host.createRoom?.({roomName:this.roomName.value,password,map,teamSize:Number(this.format.value),credits:Number(this.resources.value),house:this.playerHouse.value});this.status.textContent='Создаём комнату…';return;}this.showLobby();return;}this.selectedRoom=pending!.id;this.joinSelected(pending!.observer,password);}
  private cancelRoomPassword(){this.creatingRoom=false;this.passwordDialog.hidden=true;this.passwordInput.value='';this.pendingJoin=null;this.dialog.inert=false;this.roomList.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();}
  private applyFormat(preferred=this.map.value){
    const size=Number(this.format.value),maps=this.mapList.filter(map=>map.teamSize===size);
    this.map.replaceChildren();for(const map of maps){const option=node('option','',`${map.name} · ${map.width} × ${map.height}`);option.value=map.id;this.map.append(option);}if(maps.some(map=>map.id===preferred))this.map.value=preferred;
    this.slots.forEach((slot,id)=>{if(id%4>=size){slot.active=false;slot.row.hidden=true;}});
    this.lobby.querySelectorAll<HTMLButtonElement>('.network-add').forEach((button,index)=>button.disabled=this.role==='observer'||this.slots.slice(index*4,index*4+size).every(slot=>slot.active));
    const capacity=this.root.querySelector<HTMLElement>('.network-capacity');if(capacity)capacity.textContent=`${size} × ${size} / ${size*2} МЕСТ`;
    this.updateMap();
  }
  private updateMap(){const map=this.mapList.find(item=>item.id===this.map.value);if(!map)return;if(this.spawnMap!==map.id){this.spawnMap=map.id;this.spawnAssignments.clear();this.spawnPoints=[];}this.map.value=map.id;this.preview.src=map.preview;this.description.textContent=`${map.description}. ${map.teamSize} на ${map.teamSize} · ${map.capacity} стартов · ${map.width} × ${map.height} клеток.`;}
  private openChoice(select:HTMLSelectElement){
    if(select.disabled||!select.options.length)return;this.closeChoice(false);this.choiceSelect=select;this.choiceCursor=Math.max(0,select.selectedIndex);this.choicePopup.hidden=false;this.choicePopup.setAttribute('aria-label',select.getAttribute('aria-label')??'Выбор');select.setAttribute('aria-expanded','true');select.focus();
    const rect=select.getBoundingClientRect(),height=Math.min(248,select.options.length*42+8,(window.innerHeight||800)-24),width=Math.min(Math.max(rect.width,180),(window.innerWidth||1000)-24);
    this.choicePopup.style.width=`${width}px`;this.choicePopup.style.maxHeight=`${height}px`;this.choicePopup.style.left=`${Math.max(12,Math.min(rect.left,(window.innerWidth||1000)-width-12))}px`;this.choicePopup.style.top=`${rect.bottom+height+6<=(window.innerHeight||800)?rect.bottom+6:Math.max(12,rect.top-height-6)}px`;this.drawChoice();
  }
  private drawChoice(){
    const select=this.choiceSelect;if(!select)return;this.choicePopup.replaceChildren();
    Array.from(select.options).forEach((option,index)=>{const item=node('button','network-choice-option',option.textContent??'');item.id=`${this.choicePopup.id}-${index}`;item.type='button';item.tabIndex=-1;item.disabled=option.disabled;item.setAttribute('role','option');item.setAttribute('aria-selected',String(index===select.selectedIndex));item.classList.toggle('choice-cursor',index===this.choiceCursor);item.addEventListener('pointerdown',event=>event.preventDefault());item.addEventListener('pointerenter',()=>{this.choiceCursor=index;Array.from(this.choicePopup.children).forEach((child,i)=>child.classList.toggle('choice-cursor',i===index));select.setAttribute('aria-activedescendant',item.id);});item.addEventListener('click',event=>{event.stopPropagation();this.chooseOption(index);});this.choicePopup.append(item);});
    select.setAttribute('aria-activedescendant',`${this.choicePopup.id}-${this.choiceCursor}`);this.choicePopup.children[this.choiceCursor]?.scrollIntoView?.({block:'nearest'});
  }
  private chooseOption(index:number){const select=this.choiceSelect;if(!select||select.options[index]?.disabled)return;select.selectedIndex=index;this.closeChoice();select.dispatchEvent(new Event('change',{bubbles:true}));}
  private closeChoice(focus=true){const select=this.choiceSelect;this.choiceSelect=null;this.choicePopup.hidden=true;if(select){select.setAttribute('aria-expanded','false');select.removeAttribute('aria-activedescendant');if(focus)select.focus();}}
  private focusable(){const scope=this.choiceSelect?this.choicePopup:!this.passwordDialog.hidden?this.passwordDialog:this.viewer.hidden?this.root:this.viewer;return [...scope.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),[role="button"]')].filter(element=>!element.closest('[hidden]')&&element.getClientRects().length>0);}
  handlePad(button:Button){
    if(!this.isOpen)return false;
    if(this.choiceSelect){
      if(button==='b'||button==='start')this.closeChoice();
      else if(button==='a'||button==='c')this.chooseOption(this.choiceCursor);
      else{const select=this.choiceSelect,direction=button==='up'||button==='left'?-1:1;for(let i=0;i<select.options.length;i++){this.choiceCursor=(this.choiceCursor+direction+select.options.length)%select.options.length;if(!select.options[this.choiceCursor].disabled)break;}this.drawChoice();this.host.ui?.(0x19);}return true;
    }
    if(button==='b'||button==='start'){if(!this.passwordDialog.hidden)this.cancelRoomPassword();else if(!this.viewer.hidden)this.closeMap();else this.back();return true;}
    const items=this.focusable(),current=items.indexOf(document.activeElement as HTMLElement);
    const focused=document.activeElement as HTMLInputElement|HTMLSelectElement|HTMLButtonElement;
    if(button==='left'||button==='right'){
      const direction=button==='left'?-1:1;
      if(focused?.classList.contains('network-section-tab')){
        const tabs=[...focused.parentElement!.querySelectorAll<HTMLButtonElement>('button')],index=tabs.indexOf(focused as HTMLButtonElement);
        const next=tabs[(index+direction+tabs.length)%tabs.length];next.click();next.focus();
      }else if(focused?.tagName==='SELECT'){
        const select=focused as HTMLSelectElement;select.selectedIndex=(select.selectedIndex+direction+select.options.length)%select.options.length;select.dispatchEvent(new Event('change',{bubbles:true}));
      }else if(focused?.tagName==='INPUT'&&(focused as HTMLInputElement).type==='checkbox'){
        const input=focused as HTMLInputElement;input.checked=!input.checked;input.dispatchEvent(new Event('change',{bubbles:true}));
      }else if(focused?.tagName==='INPUT'&&(focused as HTMLInputElement).type==='number'){
        const input=focused as HTMLInputElement;input.value=String(Math.max(1,(Number(input.value)||1)+direction));
      }else items[(current+direction+items.length)%items.length]?.focus();
    }else if(button==='up'||button==='down')items[(current+(button==='up'?-1:1)+items.length)%items.length]?.focus();
    else if(button==='a'||button==='c'){
      if(focused?.classList.contains('network-room')){this.selectedRoom=focused.dataset.roomId??'';this.joinSelected();}
      else if(focused?.tagName==='SELECT')this.handlePad('right');
      else if(focused?.tagName==='INPUT'&&(focused as HTMLInputElement).type!=='checkbox'){
        const input=focused as HTMLInputElement;
        if(input.type!=='number'&&input.readOnly){input.readOnly=false;input.focus();input.select();}
        else{input.readOnly=true;items[(current+1)%items.length]?.focus();}
      }
      else focused?.click();
    }
    return true;
  }
  /** Свой дом (буква), выбранный в поле «Ваш дом». */
  ownHouse(){return this.playerHouse.value;}
  setStatus(text:string){this.status.textContent=text;}
  private async openServer(){
    this.server=true;
    if(!this.serverReady){
      this.serverReady=true;
      this.mapList=this.host.romMaps!();
      for(const option of [...this.format.options])if(option.value==='4')option.remove();
      if(this.format.value==='4'||!this.format.value)this.format.value='1';
      this.random.closest('label')?.setAttribute('hidden','');
      this.lobby.querySelectorAll<HTMLElement>('.network-add').forEach(button=>button.hidden=true);
      this.slots.forEach(slot=>{
        slot.difficulty.hidden=true;slot.row.querySelector<HTMLElement>('.network-remove')?.setAttribute('hidden','');
        // сложность компьютера: видна у мест компьютеров, менять может хозяин
        slot.difficulty.addEventListener('change',()=>{
          if(!this.room||this.room.state!=='waiting'||this.you!==this.room.host)return;
          const at=this.slotOf(slot),member=this.room.members.find(m=>m.slot===at);
          if(member?.ai)this.host.bot?.({op:'set',slot:at,difficulty:['easy','normal','hard'].indexOf(slot.difficulty.value)});
        });
        slot.house.addEventListener('change',()=>{
          if(!this.room||this.you===null||slot.house.value==='random')return;
          const at=this.slotOf(slot),member=this.room.members.find(m=>m.slot===at);
          if(at===this.you)this.host.setOwn?.({house:slot.house.value});
          else if(member?.ai&&this.you===this.room.host)this.host.bot?.({op:'set',slot:at,house:slot.house.value});
        });
        // хозяин: свободное место → «Компьютер», место компьютера → «Свободно»
        slot.controller.addEventListener('change',()=>{
          if(!this.room||this.room.state!=='waiting'||this.you!==this.room.host)return;
          const at=this.slotOf(slot),member=this.room.members.find(m=>m.slot===at),team=Math.floor(this.slots.indexOf(slot)/4);
          if(slot.controller.value==='ai'&&!member)this.host.bot?.({op:'add',team});
          else if(slot.controller.value==='open'&&member?.ai)this.host.bot?.({op:'remove',slot:at});
        });
      });
      const sendConfig=()=>{if(!this.room||this.room.state!=='waiting'||this.you!==this.room.host)return;this.host.setConfig?.({map:Number(this.map.value.replace('rom-',''))||1,teamSize:Number(this.format.value),credits:Number(this.resources.value)});};
      for(const control of [this.format,this.map,this.resources])control.addEventListener('change',sendConfig);
      const [start,team]=[...this.lobby.querySelectorAll<HTMLButtonElement>('.network-actions button')];
      start.textContent='Начать матч';start.title='';start.addEventListener('click',()=>this.host.startMatch?.());
      team.textContent='Сменить команду';team.title='';team.addEventListener('click',()=>{const me=this.room?.members.find(m=>m.slot===this.you);if(me)this.host.setOwn?.({team:1-me.team});});
      this.playerHouse.addEventListener('change',()=>{if(this.room&&this.you!==null&&this.room.state==='waiting')this.host.setOwn?.({house:this.playerHouse.value});});
    }
    this.applyFormat();
    this.setRooms([],false);
    this.status.textContent='Подключение к серверу…';
    try{await this.host.connect!(this.name.value.trim()||'Командир');this.host.refreshRooms?.();}
    catch{this.status.textContent='Сервер недоступен. Проверьте интернет и нажмите «Обновить».';}
  }
  /** Номер места на сервере для строки лобби (строки — по 4 на команду). */
  private slotOf(slot:{row:HTMLElement}){const id=this.slots.findIndex(s=>s.row===slot.row),size=Number(this.format.value);return Math.floor(id/4)*size+id%4;}
  /** Список комнат с сервера. */
  setServerRooms(rooms:ServerRoomInfo[]){
    this.setRooms(rooms.map(room=>({id:room.id,name:room.name,map:`rom-${room.map}`,players:room.players,capacity:room.capacity,state:room.state,passwordRequired:room.passwordRequired})),false);
    if(this.mode==='rooms')this.status.textContent=rooms.length?`Комнат на сервере: ${rooms.length}`:'Сервер подключён · комнат пока нет';
  }
  /** Комната с сервера: показать лобби и состав. */
  setRoom(room:ServerRoomState,you:number|null){
    const fresh=this.room?.id!==room.id||this.mode!=='lobby';
    this.room=room;this.you=you;
    const asRoom:NetworkRoom={id:room.id,name:room.name,map:`rom-${room.map}`,players:room.players,capacity:room.capacity,state:room.state,passwordRequired:room.passwordRequired};
    if(fresh){this.selectedRoom=room.id;this.showLobby(you===null?undefined:asRoom,you===null?'observer':'player');}
    const host=you!==null&&you===room.host&&room.state==='waiting';
    this.format.value=String(room.config.teamSize);this.applyFormat(`rom-${room.config.map}`);this.resources.value=String(room.config.credits);
    for(const control of [this.format,this.map,this.resources])control.disabled=!host;
    this.roomName.value=room.name;this.roomName.disabled=true;this.roomPassword.disabled=true;
    const size=room.config.teamSize;
    this.slots.forEach((slot,id)=>{
      const team=Math.floor(id/4),index=id%4,visible=index<size;slot.active=visible;slot.row.hidden=!visible;if(!visible)return;
      const member=room.members.find(m=>m.slot===team*size+index),own=member!==undefined&&member.slot===you;
      slot.controller.replaceChildren();
      const canEdit=host&&(!member||!!member.ai);
      if(member?.ai){slot.controller.append(node('option','',member.name),node('option','','Свободно'));(slot.controller.options[0] as HTMLOptionElement).value='ai';(slot.controller.options[1] as HTMLOptionElement).value='open';slot.controller.value='ai';}
      else{const label=node('option','',member?`${member.name}${own?' (вы)':''}${member.connected?'':' · нет связи'}${member.slot===room.host?' · хозяин':''}`:'Свободно');label.value=member?'human':'open';slot.controller.append(label);if(!member&&host){const ai=node('option','','Компьютер');ai.value='ai';slot.controller.append(ai);}slot.controller.value=label.value;}
      slot.controller.disabled=!canEdit||room.state!=='waiting';
      slot.row.classList.toggle('slot-closed',!member);
      if(member)slot.house.value=member.house;else slot.house.value='random';
      slot.house.disabled=!(own||(member?.ai&&host))||room.state!=='waiting';
      slot.difficulty.hidden=!member?.ai;slot.difficulty.disabled=!host||room.state!=='waiting';
      if(member?.ai)slot.difficulty.value=['easy','normal','hard'][member.difficulty??1]??'normal';
      if(own)this.playerHouse.value=member!.house;
    });
    const [start,team]=[...this.lobby.querySelectorAll<HTMLButtonElement>('.network-actions button')];
    const teams=new Set(room.members.map(m=>m.team));
    if(start){start.disabled=!host||room.members.length<2||teams.size<2;start.hidden=you===null;}
    if(team){team.disabled=you===null||room.state!=='waiting';team.hidden=you===null;}
    if(!this.viewer.hidden)this.drawServerSpawns();
    const mine=room.members.find(m=>m.slot===you)?.spawn,spot=mine!=null?` · ваша точка ${mine+1}`:' · точка: нажмите на карту';
    const who=(you===null?'Вы наблюдатель':host?'Вы хозяин комнаты — когда все соберутся, нажмите «Начать матч»':'Ждём, пока хозяин начнёт матч')+(you===null?'':spot);
    this.status.textContent=room.state==='waiting'?`«${room.name}» · игроков ${room.members.length} из ${room.capacity} · ${who}`:`«${room.name}» · матч идёт`;
  }
  snapshot():NetworkLobbyConfig{const size=Number(this.format.value);return{version:1,server:this.host.endpoint??'',name:this.name.value.trim(),roomName:this.roomName.value.trim(),password:this.roomPassword.value,teamSize:size,map:this.map.value,randomStarts:this.random.checked,seed:this.seed,resources:Number(this.resources.value),speed:this.speed.value,friendlyFire:false,infiniteSpice:true,role:this.role,slots:this.slots.flatMap((slot,id)=>id%4>=size?[]:[{id:Math.floor(id/4)*size+id%4,team:Math.floor(id/4),controller:slot.active?slot.controller.value:'closed',house:slot.house.value,difficulty:slot.difficulty.value,spawn:[...this.spawnAssignments].find(([,player])=>player===id)?.[0]??null}])};}
}
