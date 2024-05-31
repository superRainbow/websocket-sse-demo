import * as http from 'http';
import { WebSocketServer } from 'ws';

let clients = [];
const wss = new WebSocketServer({ port: 3200 });
console.log('服務執行在http://localhost:3200/');

wss.getUniqueID = () => {
  function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return s4() + s4() + '-' + s4();
};

function sendAllClient () {
  clients.map((client) => {
    const data = clients.filter((item) => item !== client).map((item) => item.id);
    client.send(JSON.stringify({type: 'clients', data, client: client.id,status: 'ok'}));
  })
}

function sendMsgToOther (obj) {
  clients.map((client) => {
    obj.target === client.id && client.send(JSON.stringify({ ...obj, status: 'ok' }));
  })
}

wss.on('connection', (ws) => {
  console.log('[伺服器]：已連線～');

  ws.id = wss.getUniqueID();
  clients.push(ws);
  sendAllClient();

  // Listen for messages from client
  ws.on('message', (rawData, isBinary) => {
    const data = isBinary ? rawData : rawData.toString();
    const obj = JSON.parse(data);
    console.log('[伺服器]：來自 client ', obj);
    switch (obj.type) {
      case 'push':
        /// 發送給所有 client：
        let clients = wss.clients;  //取得所有連接中的 client
        console.log('clients', clients);
        clients.forEach(client => {
          client.send(JSON.stringify({ ...obj, status: 'ok' })); // 發送至每個 client
        })
        break;
      default:
        sendMsgToOther(obj);
        break;
    }
  });

  ws.on('close', () => {
    console.log('[伺服器]：已斷線~');
  });
});


http.createServer((req, res) => {

  if (req.url === '/sse') {
    res.writeHead(200, {
      'Content-Type':'text/event-stream',
      'Cache-Control':'no-cache',
      'Connection':'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('retry: 10000\n');
    res.write('event: custom\n');
    res.write('data: custom event\n');
    res.write('data: ' + (new Date()) + '\n\n');

    var interval = setInterval(() => {
      const data = { msg: 'SSE DEMO', time: new Date() };
      res.write('data: ' + JSON.stringify(data) + '\n\n');
    }, 1000);

    req.connection.addListener('close', () => {
      clearInterval(interval);
    }, false);
  }
}).listen(8844, () => {
  console.log('SSE 正在運行...');
});