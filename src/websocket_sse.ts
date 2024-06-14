import './style.css';
import { WebSocketClient } from "./utils/webSocketClient.ts";

let uuid = '';
let name = '';
const ws = new WebSocketClient('ws://localhost:3200');
const sse = new EventSource('http://localhost:8844/sse');

const addMsg = (obj:any, type:string) => {
  const el = document.createElement('li');
  el.setAttribute('class', type);
  el.innerHTML = 
  `
    <div class="avatar">
      <div class="pic">
        <img src="https://picsum.photos/100/100?human=16">
      </div>
      <div class="name">${obj.name}</div>
    </div>
    <div class="text">${obj.data}</div>
  `;
  document.querySelector<HTMLElement>('#chat-list')!.append(el);
}

const push = (data:any) => {
  console.log('client push action：', data);
  ws.send(JSON.stringify({ type: "push", data }))
};

// 連接
ws.connect();
ws.onmessage((string:any)=>{
  const data = JSON.parse(string.data);

  switch (data.type) {
    case 'clients':
      uuid = data.client;
      data.data.map((data:string)=>{
        let el = document.createElement('option');
        el.text = data;
        document.querySelector<HTMLSelectElement>('#target')!.add(el);
      });
      break;
    case 'push':
      document.querySelector<HTMLElement>('#pin')!.innerText = `🔔 公告：${data.data}`;
      document.querySelector<HTMLElement>('#chat')!.classList.contains('no-pin') && document.querySelector<HTMLElement>('#chat')!.classList.remove('no-pin');
      break;
    default:
      data && addMsg(data, 'remote'); 
      break;
  }
})

const send = (data:any) => {
  const target = document.querySelector<HTMLSelectElement>('#target')!.value;
  console.log('client send action：', data, target, name);
  const obj = { type: "message", data, target, client: uuid, name };
  ws.send(JSON.stringify(obj))
  addMsg(obj, 'local');
};

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <h1>WebSocket DEMO</h1>
  <div id="example"></div>
  <section>
    <h2>基本操作</h2>
    Push Message: <input type="text" id="sendMsg"><button id="sendBtn">Send</button>
  </section>
  <section>
    <h2>聊天室</h2>
    <div class="setting-chat">
      <span>名字：</span><input type="text" id="name">
      <span>聊天對象：</span><select id="target" value=""></select>
      <button id="startBtn">開始聊天</button>
    </div>
    <div id="chat" class="no-pin hidden">
      <ul id="chat-list">
        <li id="pin"></li>
      </ul>
      <div class="bottom">
        <input type="text" id="chatMsg"><button id="chatBtn">Send</button> 
      </div>
    </div>
  </section>
`;

document.querySelector<HTMLButtonElement>('#startBtn')!.addEventListener('click', () => {
  name = document.querySelector<HTMLInputElement>('#name')!.value;
  document.querySelector<HTMLElement>('#chat')!.classList.contains('hidden') && document.querySelector<HTMLElement>('#chat')!.classList.remove('hidden');
  document.querySelector<HTMLInputElement>('#name')?.setAttribute('disabled', '');
  document.querySelector<HTMLSelectElement>('#target')?.setAttribute('disabled', '');
  document.querySelector<HTMLButtonElement>('#startBtn')?.setAttribute('disabled', '');
});

document.querySelector<HTMLButtonElement>('#sendBtn')!.addEventListener('click', () => {
  const msg = document.querySelector<HTMLInputElement>('#sendMsg');
  push(msg?.value)
});

document.querySelector<HTMLButtonElement>('#chatBtn')!.addEventListener('click', () => {
  const msg = document.querySelector<HTMLInputElement>('#chatMsg');
  send(msg?.value)
  msg!.value = '';
});



let div = document.querySelector<HTMLDivElement>('#example');

sse.onopen = () => div!.innerHTML = '<p>Connection open ...</p>';
sse.onerror = () => div!.innerHTML = '<p>Connection close.</p>';
sse.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('message event~~', data);
  div!.innerHTML = (`<p>${data.msg}: ${data.time}</p>`)
};
sse.addEventListener('custom', (event) => div!.innerHTML = (`<p>${event.data}</p>`), false);