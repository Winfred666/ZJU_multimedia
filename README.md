# ZJU_multimedia

2025 ZJU “多媒体技术” 课程项目，simple_video_filter base on vue3，给视频添加滤镜。
可部署的 webapp，能够实现指定视频片段和矩形蒙版范围的的全局黑白滤镜、马赛克滤镜，并形成处理队列。支持视频和声音导出。

Done list:

- 网页中的 canvas 视频播放器 [canvas_player](src/components/VideoCanvas.vue)
- 一些像素滤波器，如马赛克和色调变化 [basic_filter](src/utils/apply_filters_basic.ts)
- 基于 webGL 的卷积滤波器，如高斯模糊、锐化 [webGL_Processor](src/utils/apply_filters_webgl.ts)
- 滤镜参数调整 UI [FilterConfiger](src/components/FilterConfiger.vue)
- 基于 vuedraggable_next 的拖拽式滤镜队列编辑[所有滤镜](src/components/DragAppliable.vue) , [当前滤镜队列](src/components/DragCurrent.vue)

- 基于 mp4-muxer 的 mp4 导出，默认 bitrate 为高清， fps=30。 [mp4_encoder](src/utils/mp4_encoder.ts) 

- 基于 fabric.js 的矩形蒙版编辑，不可旋转 [zone_editor](src/utils/zone_editor.ts)

- 支持单轨单声道声音导出，多声道会 downmix 到单声道 [mp4_encoder](src/utils/mp4_encoder.ts)

TODO list:

- 更多的滤镜蒙版，形状和变换更自由，如圆形甚至画笔

- 滤镜蒙版加入 tween 补间动画，需要一个动画系统，比较困难 

- 统一使用 webGL shader 编写滤镜

- 一些基于时间的艺术化滤镜，如老电视，故障特效等

- 性能优化，如视频暂停时冻结画布等。

- 键盘事件侦听，加入快捷键

- 导出 .mp4 时比特率、codec 支持自定义


## Customize configuration

该项目使用 Vue 3 + TypeScript + Vite，See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```
