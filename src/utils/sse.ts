const DEFAULT_RETRY_TIMES = 10;

class CCEventSource {
    private eventSourceUrl;
    private onmessage;
    private eventSource:any;
    private retryTimes;
    private currentTimer;
    private eventArray:any;
    //建構函式
    constructor(options:any) {
        this.eventSourceUrl = options && options.url;
        this.onmessage = options && options.onmessage;
        this.eventSource = null;
        this.retryTimes =
            options && options.retryTimes
                ? options.retryTimes
                : DEFAULT_RETRY_TIMES;
        this.#initEventSource(this.eventSourceUrl);
        this.currentTimer = 0;
        this.eventArray = [];
    }

    //初始化eventSource
    #initEventSource(url:string) {
        //相容判斷
        if ('EventSource' in window) {
            let that = this;

            //實例化EventSource
            this.eventSource = new EventSource(that.eventSourceUrl);

            //EventSource打開
            this.eventSource.onopen = function () {
                console.log('EventSource連接成功', that.eventSourceUrl);
            };

            //EventSource接收到新消息
            this.eventSource.onmessage = function (event:any) {
                // 連接成功後，重設重試次數的值
                this.currentTimer = 0;
                try {
                    if (event.data && typeof event.data === 'string') {
                        // let data = JSON.parse(JSON.parse(event.data));
                        let data = event.data;

                        //業務邏輯回呼
                        if (typeof that.onmessage === 'function') {
                            that.onmessage(data);
                        }
                    }
                } catch (error) {
                    console.log('EventSource初始化異常', error);
                }
            };

            //EventSource關閉
            this.eventSource.onclose = function () {
                console.log('EventSource連接斷開', that.eventSourceUrl);
            };

            //EventSource錯誤
            this.eventSource.onerror = function (error:any) {
                // 監聽錯誤
                console.log('EventSource連接錯誤', error);
                that.currentTimer++;
                if (that.currentTimer > that.retryTimes) {
                    that.close();
                }
            };
        } else {
            throw new Error('瀏覽器不支援EventSource物件');
        }
    }

    addEventForESInstance(eventName:any, callback:any) {
        let es = this.eventSource;
        let eventArray = this.eventArray;
        if (es) {
            es.addEventListener(eventName, callback);
            this.eventArray = [...eventArray, { eventName, callback }];
        }
    }
    removeEventForESInstance(eventName:any) {
        let es = this.eventSource;
        let eventArray = this.eventArray;
        if (es && eventArray.length) {
            let eventArrayWaitRemove = eventArray.filter(
                (item:any) => item.eventName === eventName,
            );
            if (eventArrayWaitRemove.length) {
                eventArrayWaitRemove.forEach((eventItem:any) => {
                    es.removeEventListener(
                        eventItem.eventName,
                        eventItem.callback,
                    );
                });
            }
            this.eventArray = eventArray.filter(
                (item:any) => item.eventName !== eventName,
            );
        }
    }

    //關閉eventSource
    close() {
        this.eventSource.close();
        this.eventSourceUrl = '';
        this.eventSource = null;
        this.onmessage = null;
        this.currentTimer = 0;
    }
}

export default CCEventSource;

