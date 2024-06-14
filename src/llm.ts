import './style.css';
import { fetchEventSource } from '@microsoft/fetch-event-source';
class FatalError extends Error { }

let resultText = '';

const addMsg = (string:any, type:string) => {
    const el = document.createElement('li');
    el.setAttribute('class', type);
    el.innerHTML = 
    `
      <div class="avatar">
        <div class="pic">
          <img src="${type === 'local' ? '../public/user.jpg' : '../public/ai.png'}">
        </div>
        <div class="name">${type === 'local' ? 'Me' : 'AI'}</div>
      </div>
      <div class="text">${string}</div>
    `;
    document.querySelector<HTMLElement>('#chat-list')!.append(el);
}

const sendAction = () => {
    const msg = document.querySelector<HTMLInputElement>('#chatMsg');
    msg?.value && generate();
    msg?.value && addMsg(msg?.value, 'local');
    msg!.value = '';
}

const generate = async () => {
    document.querySelector<HTMLButtonElement>('#chatBtn')!.disabled = true;
    const ctrl = new AbortController();
    fetchEventSource(import.meta.env.VITE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: import.meta.env.VITE_USE_LLM === 'chatgpt' ? "gpt-3.5-turbo" : "LM Studio Community/Meta-Llama-3-8B-Instruct-GGUF",
            messages: [
                {
                    "role": "user",
                    "content": "## Role: Emoji Helper\n## Profile:\n- author: Arthur\n- version: 0.1\n- language: 中文\n- description: 一個可以幫助你找到最合適的 Emoji 表情的機器小助手。\n## Goals:\n- 根據使用者輸入的訊息，幫助使用者找到最符合的 Emoji 表情。\n- 提供友好的使用者體驗，快速回應使用者的需求。\n## Constrains:\n- 限制條件：輸出的是符合情境的唯一一個 Emoji，可能會有主觀性。\n- 不會做任何解釋說明\n## Skills:\n- 理解使用者輸入的訊息，並根據語義找到最合適的 Emoji 表情。\n## Workflows:\n- 使用者輸入訊息\n- 機器小助手根據語義理解使用者需求, 輸出最適合的那個 Emoji\n## Initialization:\n我是一個 Emoji 小能手, 你來輸入訊息, 我給你最適合該訊息的一個 Emoji"
                },
                { role: "user", content: document.querySelector<HTMLInputElement>('#chatMsg')!.value }
            ],
            max_tokens: 1024,
            temperature: 0.7, 
            stream: true, // For streaming responses
        }),
        signal: ctrl.signal,
        onmessage(data:any) {
          console.log('data', data);
          
            if(data.event === '' && data.data !== '[DONE]'){
                const msg = JSON.parse(data.data).choices[0];
                
                if(msg.finish_reason === null) {
                    resultText += msg.delta?.content  || '';
                } else {
                    addMsg(resultText, 'remote');
                    resultText = '';
                }
            }
            if (data.event === 'close') {
                ctrl.abort();
            }
            if (data.event === 'FatalError') {
                throw new FatalError(data.data);
            }
        },
        onerror(err) {
          console.log('err', err);
          
            if (err instanceof FatalError) {
                throw err; // rethrow to stop the operation
            } else {
                // do nothing to automatically retry. You can also
                // return a specific retry interval here.
            }
        }
    });
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <h1>LLM DEMO</h1>
  <section>
    <h2>Emoji 回應小工具</h2>
    <h3>使用：${import.meta.env.VITE_USE_LLM}</h3>
    <div id="chat">
      <ul id="chat-list">
        <li id="pin"></li>
      </ul>
      <div class="bottom">
        <input type="text" id="chatMsg"><button id="chatBtn">Send</button> 
      </div>
    </div>
  </section>
`;
document.querySelector<HTMLInputElement>('#chatMsg')!.addEventListener("keyup", (event) => {
  if (event.key === "Enter") {
    sendAction();
  }
});
document.querySelector<HTMLButtonElement>('#chatBtn')!.addEventListener('click', sendAction);