<template>
  <div class=" relative w-full h-full">
    <canvas ref="videoCanvas"></canvas>
    <video ref="videoElement" class="hidden"></video>
    <!-- upper canvas, managed by fabrics to draw UI!! -->
    <div class="absolute top-0 left-0">
      <canvas id="uiCanvas" ref="uiCanvas"></canvas>
    </div>
    <!-- use offscreen canvas instead -->
    <!-- <canvas ref="webglCanvas" class="hidden"></canvas>
    <canvas ref="exportCanvas" class="hidden"></canvas> -->
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';

import { useEditorStore } from '@/stores/video';
import { useVideoStore } from '@/stores/video';
import { storeToRefs } from 'pinia';
import { apply_filter } from '@/utils/apply_filters_basic';
import { registerGLConvProcessor } from '@/utils/apply_filters_webgl';
import { FPS_DEFUALT } from '@/utils/default_config';
import { initVideoEncoder, renderCanvas2FrameEncode, downloadVideo } from '@/utils/mp4_encoder';
import { initZoneEditor, renderZone } from '@/utils/zone_editor';


const editor = useEditorStore();

const { edit_range, is_loop, is_mute, is_play, cur_time, play_speed, new_seek_frame } = storeToRefs(editor);

const videoStore = useVideoStore();
const { is_exporting, export_progress } = storeToRefs(videoStore);

// 定义 props
const props = defineProps({
  videoUrl: {
    type: String,
    required: true
  }
});


// 获取 DOM 元素的引用
const videoCanvas = ref<HTMLCanvasElement>();
const videoElement = ref<HTMLVideoElement>();
const uiCanvas = ref<HTMLCanvasElement>();

let webglCanvas: OffscreenCanvas;
let exportCanvas: OffscreenCanvas;

// 定义视频上下文
let ctx: any = undefined;


// watch is_play, is_loop, is_mute value and set videoElement value to them
watch([is_play, is_loop, is_mute, play_speed], ([is_play, is_loop, is_mute, play_speed]) => {
  if (videoElement.value) {
    videoElement.value.muted = is_mute;
    if (is_play) {
      videoElement.value.play();
    } else {
      videoElement.value.pause();
    }
    videoElement.value.loop = is_loop;
    videoElement.value.playbackRate = play_speed;
  }
});


// 监听人为调整视频播放进度事件
watch(new_seek_frame, (new_seek_frame) => {
  if (videoElement.value) {
    videoElement.value.currentTime = new_seek_frame;
  }
});


// let temp_save_fame: string | undefined;

// 定义绘制视频帧到 canvas 的函数
const drawVideoFrame = () => {
  // if exporting, do not draw video frame, just spin the event loop.
  if (is_exporting.value) {
    requestAnimationFrame(drawVideoFrame);
    return;
  }

  if (!videoElement.value || !videoCanvas.value) return;
  const canvas = <HTMLCanvasElement>videoCanvas.value;
  const video = <HTMLVideoElement>videoElement.value;
  // 性能优化：如果视频暂停且当前时间未变，则不重绘
  const currentTime = video.currentTime;

  // 0. UI canvas render (no block!)
  renderZone(currentTime);
  
  // if (video.paused && cur_time.value === currentTime) {
  //   if (!temp_save_fame) {
  //     // 如果没有保存，保存当前画面
  //     temp_save_fame = canvas.toDataURL();
  //     // console.log("Save current frame to temp_save_fame:", temp_save_fame)
  //   }
  //   const img = new Image();
  //   img.src = temp_save_fame;
  //   img.onload = () => {
  //     ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  //   }
  //   window.requestAnimationFrame(drawVideoFrame);
  //   return;
  // }
  // temp_save_fame = undefined;

  // 1. video 播放器边界情况处理
  const videoSrc = video.src;
  if (!videoSrc) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // 2. 绘制视频帧到 canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  // 3. filter 滤镜处理
  let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  apply_filter(imgData, currentTime);
  ctx.putImageData(imgData, 0, 0);

  // 4. FPS,时间控制
  cur_time.value = currentTime;

  if (currentTime >= edit_range.value[1]) {
    if (is_loop.value) {
      video.currentTime = edit_range.value[0];
    } else {
      video.currentTime = edit_range.value[1];
      is_play.value = false;
    }
  }

  // WARNING: do not control the rate we draw on canvas, just control <video> directly.
  window.requestAnimationFrame(drawVideoFrame);
};

// 监听视频元数据加载事件
const handleMetadataLoaded = () => {
  const canvas = <HTMLCanvasElement>videoCanvas.value;
  const uiCvs = <HTMLCanvasElement>uiCanvas.value;
  const video = <HTMLVideoElement>videoElement.value;
  // 设置 range 为视频的时长，不剪辑
  edit_range.value = [0, video.duration];

  const MAX_WIDTH = Math.floor(window.innerWidth * 3 / 4);
  const MAX_HEIGHT = Math.floor(window.innerHeight * 2 / 3);
  // 设置 canvas 的大小为综合屏幕大小和视频大小，使得视频长边占满最大值

  if (video.videoHeight / MAX_HEIGHT > video.videoWidth / MAX_WIDTH) {
    canvas.height = Math.min(MAX_HEIGHT, video.videoHeight); // 高度是长边
    canvas.width = canvas.height / video.videoHeight * video.videoWidth;
  } else {
    canvas.width = Math.min(MAX_WIDTH, video.videoWidth);
    canvas.height = canvas.width / video.videoWidth * video.videoHeight;
  }
  console.log("canvas 宽高：", canvas.width, canvas.height)

  uiCvs.width = canvas.width;
  uiCvs.height = canvas.height;
  initZoneEditor(uiCvs);// load ui canvas

  // now we can set offscreen webgl canvas size
  webglCanvas = new OffscreenCanvas(canvas.width, canvas.height);
  exportCanvas = new OffscreenCanvas(video.videoWidth, video.videoHeight);

  const canvas_gl = webglCanvas;

  if (!canvas_gl) {
    throw new Error("webglCanvas is not ready!!!")
  }
  const gl = canvas_gl.getContext('webgl');
  if (!gl) {
    throw new Error("webgl is not supported in browser!!!")
  }
  // 注册 webgl 处理器
  registerGLConvProcessor(gl, canvas.width, canvas.height)
};

// 在组件挂载时初始化视频元素和事件监听器
let loadeddata_listener: () => void;
onMounted(() => {
  const video = videoElement.value;
  const canvas = videoCanvas.value;
  if (video) {
    // 设置视频源
    video.src = props.videoUrl;
    // 监听视频事件
    video.addEventListener('loadedmetadata', handleMetadataLoaded);
    loadeddata_listener = () => {
      // Ensure the video metadata is loaded
      if (video.readyState >= 2 && canvas) {
        if (!ctx) {
          ctx = canvas.getContext('2d', { willReadFrequently: true });
        }
        video.currentTime = 0.0;
        const seek_data_listener = () => {
          console.log("Seeked to: ", video.currentTime)
          // Draw the first frame onto the canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          drawVideoFrame();
          // remove the event listener
          video.removeEventListener('seeked', seek_data_listener);
        }
        video.addEventListener('seeked', seek_data_listener)
      }
    };
    video.addEventListener('loadeddata', loadeddata_listener);
    // 不自动播放视频，只显示第一帧
    video.autoplay = false;
    video.load();
  }
});

// 在组件卸载时清理事件监听器
onUnmounted(() => {
  if (videoElement.value) {
    videoElement.value.removeEventListener('loadedmetadata', handleMetadataLoaded);
    videoElement.value.removeEventListener('loadeddata', loadeddata_listener);
  }
});

// 监听 props 变化，更新视频源
watch(() => props.videoUrl, (newUrl) => {
  if (videoElement.value) {
    videoElement.value.src = newUrl;
    videoElement.value.load();
  }
});

// 监听 is_exporting 变化，开始导出视频
watch(is_exporting, async (is_export_cur) => {
  if (!is_export_cur) {
    return;
  }
  const ctx = (<OffscreenCanvas>exportCanvas).getContext('2d', { willReadFrequently: true });
  const canvas_gl = (<OffscreenCanvas>webglCanvas).getContext('webgl');
  const video = videoElement.value;
  if (!ctx || !video || !canvas_gl) {
    is_exporting.value = false;
    throw new Error("Video element or canvas context is not ready!!!")
  }
  video.pause()
  video.currentTime = 0; // set to the beginning, and request each frame.
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  // firstly set gl canvas size to video size also (remember to recover it after export)
  registerGLConvProcessor(canvas_gl, vw, vh)
  // then init muxer and encoder
  const { encoder, muxer } = initVideoEncoder(vw, vh);
  let frameNumber = 0;

  const FRAME_INTERVAL_DEFAULT = 1.0 / FPS_DEFUALT;

  const export_single_frame = () => {
    if (video.currentTime >= video.duration - FRAME_INTERVAL_DEFAULT) { // finish exporting, end of video.
      console.log("Finish exporting video!!!")
      downloadVideo(muxer, encoder, "output.mp4")
        .catch((e) => {
          console.error("Error when download video: ", e);
        }).finally(() => {
          const display_cvs = <HTMLCanvasElement>(videoCanvas.value);
          registerGLConvProcessor(canvas_gl, display_cvs.width, display_cvs.height)
          is_exporting.value = false;
        })
      return;
    }
    // renew progress
    export_progress.value = Math.floor((video.currentTime / video.duration) * 100);
    ctx.drawImage(video, 0, 0, vw, vh);
    let imgData = ctx.getImageData(0, 0, vw, vh);
    apply_filter(imgData, video.currentTime, [videoCanvas.value!.width, videoCanvas.value!.height])
    video.currentTime += FRAME_INTERVAL_DEFAULT;
    ctx.putImageData(imgData, 0, 0);

    // use web-codec to encode the frame to video
    renderCanvas2FrameEncode(<OffscreenCanvas>exportCanvas, encoder, frameNumber, FPS_DEFUALT);
    frameNumber += 1;
    video.requestVideoFrameCallback(export_single_frame);
  }
  video.requestVideoFrameCallback(export_single_frame);
});

</script>