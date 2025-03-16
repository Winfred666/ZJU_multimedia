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

export const initVideoEncoder = (width: number, height: number) => {
  let muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: {
      // use default H.264 codec
      codec: "avc",
      width,
      height,
    },
    // always set when use array buffer target
    fastStart: "in-memory",
  });

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

export const downloadVideo = async (
  muxer: Mp4Muxer.Muxer<Mp4Muxer.ArrayBufferTarget>,
  encoder: VideoEncoder,
  video_name: string
) => {
  // Forces all pending encodes to complete
  await encoder.flush();
  console.log("flushing encoder");

  muxer.finalize();
  let buffer = muxer.target.buffer;
  
  downloadBlob(new Blob([buffer], { type: "video/mp4" }), video_name);
};
