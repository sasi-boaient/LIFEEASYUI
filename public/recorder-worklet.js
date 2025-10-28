class RecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.port.onmessage = (e) => {
            if (e.data === "flush") {
                this.flush();
            }
        };
    }

    process(inputs) {
        const input = inputs[0];
        if (input && input[0]) {
            // Send each audio chunk to main thread
            this.port.postMessage(input[0]);
        }
        return true; // keep processor alive
    }
}

registerProcessor("recorder-processor", RecorderProcessor);
