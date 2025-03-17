class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.stopped = false;
    this.port.onmessage = (event) => {
      if (event.data.command === "stop") {
        this.stopped = true;
      }
      if (event.data.numberOfChannels) {
        this.numberOfChannels;
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (this.stopped) return false; // Stop processing completely
    const input = inputs[0];
    // return true means that the processor will be called again
    if (input.length === 0) return true;

    // if there are multiple channels, we can downmix them here
    // If you have multiple channels but want a mono mix:
    const numberOfFrames = input[0].length;
    const mixed = new Float32Array(numberOfFrames);
    for (let i = 0; i < numberOfFrames; i++) {
      let sum = 0;
      for (let ch = 0; ch < input.length; ch++) {
        sum += input[ch][i];
      }
      mixed[i] = sum / input.length;
    }

    // Send the audio data to the main thread
    this.port.postMessage({
      // sampleRate: this.sampleRate,
      numberOfFrames,
      channelData: mixed.buffer,
    }, [mixed.buffer]); // Transfer the ownership of the buffer

    return true;
  }
}

registerProcessor("audio-processor", AudioProcessor);
