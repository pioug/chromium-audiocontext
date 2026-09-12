registerProcessor("tone", class extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = ({ data }) => {
      const deadline = Date.now() + data;
      while (Date.now() < deadline) {}
      this.port.postMessage(0);
    };
  }

  process(_inputs, [output]) {
    for (let frame = 0; frame < output[0].length; frame++) {
      const sample = Math.sin(2 * Math.PI * 440 * (currentFrame + frame) / sampleRate) * 0.2;
      for (const channel of output) channel[frame] = sample;
    }
    return true;
  }
});
