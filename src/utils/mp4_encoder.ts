// The code presented below uses the WebCodecs API and the mp4-muxer npm package to encode a video from a canvas source up to 10 times faster than realtime.

import * as Mp4Muxer from "mp4-muxer";

const downloadBlob = (blob: Blob, blob_name: string) => {
  let url = window.URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = blob_name;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
};

export const initVideoEncoder = (
  video: HTMLVideoElement,
  width: number,
  height: number
) => {
  const audioSettings = (video as any)
    .captureStream()
    ?.getAudioTracks()[0]
    ?.getSettings();
  let muxerSettings = {
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: {
      // use default H.264 codec
      codec: "avc",
      width,
      height,
    },
    // always set when use array buffer target
    fastStart: "in-memory",
  };

  // only when we have audio track
  if (
    audioSettings &&
    window.AudioWorkletNode &&
    "AudioEncoder" in window &&
    window.isSecureContext
  ) {
    muxerSettings = Object.assign(muxerSettings, {
      audio: {
        codec: "aac",
        sampleRate: audioSettings?.sampleRate ?? 48_000,
        numberOfChannels: 1, // DOWNMIX to mono !!!
      },
    });
  }
  let muxer = new Mp4Muxer.Muxer(muxerSettings as any);

  let encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => console.error(error),
  });
  // This codec should work in most browsers
  // See https://dmnsgn.github.io/media-codecs for list of codecs and see if your browser supports
  encoder.configure({
    codec: "avc1.640028", // support higher resolution
    width: width,
    height: height,
    bitrate: 3_429_000,
    bitrateMode: "constant",
  });
  return { encoder, muxer };
};

let encoderNode: AudioWorkletNode;
let mediaElementSource: MediaElementAudioSourceNode;
let audioCtx: AudioContext;
export const initAndEncodeAudio = async (
  video: HTMLVideoElement,
  muxer: any
) => {
  // safari/firefox does not support audio encoder, need checking whether exists
  if (!window.AudioWorkletNode) {
    console.warn("AudioWorkletNode not supported, skip audio encoding.");
    return null;
  }
  if (!("AudioEncoder" in window) || !window.isSecureContext) {
    console.warn(
      `AudioEncoder is supported in this browser! Current secure status: ${window.isSecureContext}`
    );
    return null;
  }
  // check audiotrack of video and get sample rate
  const audioSettings = (video as any)
    .captureStream()
    ?.getAudioTracks()[0]
    ?.getSettings();

  if (!audioSettings) {
    console.warn("No audio track found in video, skip audio encoding.");
    return null;
  }
  const audio_encoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (error) => console.error(error),
  });

  const numberOfChannels = 1; // DOWNMIX to mono !!!
  console.log("number of sound channels:", numberOfChannels);
  audio_encoder.configure({
    codec: "mp4a.40.2",
    sampleRate: audioSettings.sampleRate ?? 48_000,
    numberOfChannels,
    bitrate: 128_000,
  });

  if (!audioCtx) audioCtx = new AudioContext();
  if (!mediaElementSource)
    mediaElementSource = audioCtx.createMediaElementSource(video);
  // Load the worklet module.
  await audioCtx.audioWorklet.addModule(
    `${process.env.BASE_URL || "/"}audio-processor.js`
  );

  // Create the AudioWorkletNode using your custom processor.
  encoderNode = new AudioWorkletNode(audioCtx, "audio-processor");

  encoderNode.port.postMessage({ numberOfChannels });

  // Connect your audio source to the encoder node and then to the destination.
  mediaElementSource.connect(encoderNode);
  encoderNode.connect(audioCtx.destination);

  let encode_curtime = 0;
  // Listen for messages (audio chunks) from the worklet.
  encoderNode.port.onmessage = (event) => {
    const { channelData, numberOfFrames } = event.data;
    const sampleRate = audioSettings.sampleRate ?? 48_000;
    // Here sampleRate is 48_000 numberOfFrames (128) means that it only finish 128/48_000 second
    // times FPS is the frame number.
    const timestamp = encode_curtime * 1e6;
    // Create an AudioData object for encoding.
    const audioData = new AudioData({
      data: new Float32Array(channelData),
      format: "f32",
      numberOfChannels,
      numberOfFrames,
      sampleRate,
      timestamp, // in microseconds
    });
    encode_curtime += numberOfFrames / sampleRate;
    if (encode_curtime > video.duration) {
      // audio is longer than video
      console.warn(
        `Audio ${encode_curtime} in video is longer than video ${video.duration}, stop encoding.`
      );
      exitAudioEncodeSafe();
      return;
    }
    // Encode the audio block.
    audio_encoder.encode(audioData);
    audioData.close();
  };
  return audio_encoder;
};

export const renderCanvas2FrameEncode = (
  canvas: OffscreenCanvas | HTMLCanvasElement,
  videoEncoder: VideoEncoder,
  frameNumber: number,
  fps: number
) => {
  let frame = new VideoFrame(canvas, {
    // Equally spaces frames out depending on frames per second
    timestamp: (frameNumber * 1e6) / fps,
  });
  // console.log("new_frame: ", frame)
  // The encode() method of the VideoEncoder interface asynchronously encodes a VideoFrame
  videoEncoder.encode(frame);
  // The close() method of the VideoFrame interface clears all states and releases the reference to the media resource.
  frame.close();
};

const exitAudioEncodeSafe = () => {
  if (encoderNode) {
    encoderNode.port.postMessage({ command: "stop" });
    encoderNode.disconnect();
  }
};

export const downloadVideo = async (
  muxer: any,
  video_encoder: VideoEncoder,
  audio_encoder: AudioEncoder | null,
  video_name: string
) => {
  // Forces all pending encodes to complete
  exitAudioEncodeSafe();

  if (audio_encoder && audio_encoder.state === "configured")
    await audio_encoder.flush();
  await video_encoder.flush();

  console.log("flushing encoder");

  muxer.finalize();
  let buffer = muxer.target.buffer;

  downloadBlob(new Blob([buffer], { type: "video/mp4" }), video_name);
};
