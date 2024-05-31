import { EventDispatcher } from './dispatcher.ts';

export class WebSocketClient extends EventDispatcher {
    // #socket連結
    private url = '';
    // #socket實例
    private socket: WebSocket | null = null;
    // #重連次數
    private reconnectAttempts = 0;
    // #最大重連數
    private maxReconnectAttempts = 5;
    // #重連間隔
    private reconnectInterval = 10000; // 10 seconds
    // #傳送心跳資料間隔
    private heartbeatInterval = 1000 * 30;
    // #計時器id
    private heartbeatTimer?: NodeJS.Timeout;
    // #徹底終止ws
    private stopWs = false;
    // *建構函式
    constructor(url: string) {
        super();
        this.url = url;
    }
    // >生命週期鉤子
    onopen(callBack: Function) {
        this.addEventListener('open', callBack);
    }
    onmessage(callBack: Function) {
        this.addEventListener('message', callBack);
    }
    onclose(callBack: Function) {
        this.addEventListener('close', callBack);
    }
    onerror(callBack: Function) {
        this.addEventListener('error', callBack);
    }
    // >消息傳送
    public send(message: string): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(message);
        } else {
            console.error('[WebSocket] 未連接');
        }
    }

    // !初始化連接
    public connect(): void {
        if (this.reconnectAttempts === 0) {
            this.log('WebSocket', `初始化連接中...          ${this.url}`);
        }
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            return;
        }
        this.socket = new WebSocket(this.url);

        // !websocket連接成功
        this.socket.onopen = event => {
            this.stopWs = false;
            // 重設重連嘗試成功連接
            this.reconnectAttempts = 0;
            // 在連接成功時停止當前的心跳檢測並重新啟動
            this.startHeartbeat();
            this.log('WebSocket', `連接成功,等待伺服器端資料推送[onopen]...     ${this.url}`);
            this.dispatchEvent('open', event);
        };

        this.socket.onmessage = event => {
            this.dispatchEvent('message', event);
            this.startHeartbeat();
        };

        this.socket.onclose = event => {
            if (this.reconnectAttempts === 0) {
                this.log('WebSocket', `連接斷開[onclose]...    ${this.url}`);
            }
            if (!this.stopWs) {
                this.handleReconnect();
            }
            this.dispatchEvent('close', event);
        };

        this.socket.onerror = event => {
            if (this.reconnectAttempts === 0) {
                this.log('WebSocket', `連接異常[onerror]...    ${this.url}`);
            }
            this.closeHeartbeat();
            this.dispatchEvent('error', event);
        };
    }

    // > 斷網重連邏輯
    private handleReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.log('WebSocket', `嘗試重連... (${this.reconnectAttempts}/${this.maxReconnectAttempts})       ${this.url}`);
            setTimeout(() => {
                this.connect();
            }, this.reconnectInterval);
        } else {
            this.closeHeartbeat();
            this.log('WebSocket', `最大重連失敗，終止重連: ${this.url}`);
        }
    }

    // >關閉連接
    public close(): void {
        if (this.socket) {
            this.stopWs = true;
            this.socket.close();
            this.socket = null;
            this.removeEventListener('open');
            this.removeEventListener('message');
            this.removeEventListener('close');
            this.removeEventListener('error');
        }
        this.closeHeartbeat();
    }

    // >開始心跳檢測 -> 定時傳送心跳消息
    // 自動心跳（Automatic Heartbeat）
    // 在網路通訊中常用的機制，用於維持連接的活躍狀態，檢測連接是否仍然有效，並及時發現和處理連接斷開或故障的情況。
    // 心跳機制通過定期傳送“心跳”消息（通常是一個簡單的 ping 或者 pong 消息）來確認連接雙方的狀態
    private startHeartbeat(): void {
        if (this.stopWs) return;
        if (this.heartbeatTimer) {
            this.closeHeartbeat();
        }
        this.heartbeatTimer = setInterval(() => {
            if (this.socket) {
                // this.socket.send(JSON.stringify({ type: 'heartBeat', data: {} }));
                this.log('WebSocket', '送心跳資料...');
            } else {
                console.error('[WebSocket] 未連接');
            }
        }, this.heartbeatInterval);
    }

    // >關閉心跳
    private closeHeartbeat(): void {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = undefined;
    }
}
