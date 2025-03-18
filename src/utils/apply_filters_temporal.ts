// this file implement filters that need current_time of the video to apply.
// because animation may also hard to program , use WebGL to implement effect like glitch is a better choice.

import { GLProcessor } from "./apply_filters_webgl";
import { GlitchConfig } from "./default_config";

class GlitchGLProcessor extends GLProcessor {
  private readonly vertexsrc_glitch = `precision mediump float;
attribute vec2 a_position; // 顶点坐标
varying vec2 v_texCoord;   // 纹理坐标

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = (a_position + 1.0) / 2.0;
}`;

  private readonly fragmentsrc_glitch = `precision mediump float;
uniform sampler2D u_image; // video frame texture that input
uniform float u_time; // current time of the video
uniform vec2 u_textureSize; // resolution of the video
uniform bool colorShiftOn; // enable color shift effect!
uniform bool distortionOn;
uniform float colorShiftIntensity; // these intensity should be 0.0 ~ 1.0 !!
uniform float distortionIntensity;

uniform bool scanlineOn;
uniform float scanlineSpeed;
uniform float scanlineHeight;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// from VFX.js noise
float noise(float y, float t) {
    float n = (
        sin(y * 0.07 + t * 8.0 + sin(y * 0.5 + t * 10.0)) +
        sin(y * 0.7 + t * 2.0 + sin(y * 0.3 + t * 8.0)) * 0.7 +
        sin(y * 1.1 + t * 2.8) * 0.4
    );
    n += sin(y * 124.0 + t * 100.7) * sin(y * 877.0 - t * 38.8) * 0.3;
    return n;
}

void main(){
    vec2 uv = gl_FragCoord.xy / u_textureSize; // get uv coordinate
    vec2 uvR = uv; // seperate 3 channels from uv
    vec2 uvG = uv;
    vec2 uvB = uv;

    // prepare smaller time for noise
    float t = mod(u_time * 0.5, 30.0);

    //1. apply horizontal(vary along y) distortion.
    if (distortionOn){
      float distortionAmount = 0.02 * distortionIntensity; // distortion amount everywhere
      float noise_y = noise(uv.y, t);

      float strongDistortThres = 2.5 - distortionIntensity * 1.5; // threshold for strong distortion

      if (abs(noise_y) > strongDistortThres || distortionIntensity > 0.5) { // apply strong distortion
          float strength = (2.0 + distortionIntensity * 5.0) / u_textureSize.x;
          uvR.x += strength * noise_y;
          uvG.x += strength * noise(uv.y, t + 1.0)*0.8;
          uvB.x += strength * noise(uv.y, t + 2.0)*0.6;
      } else { // apply weak distortion everywhere
          uvR.x += distortionAmount * noise_y;
          uvG.x += distortionAmount * noise(uv.y, t + 1.0)*0.8;
          uvB.x += distortionAmount * noise(uv.y, t + 2.0)*0.6;
      }
    }

    // 2. apply color shift effect
    if (colorShiftOn) {
      float colorOffset = 0.01 * colorShiftIntensity * (1.0 + sin(u_time * 0.3));
      uvG.y += colorOffset;
      uvB.y -= colorOffset;
    }

    // 4. TODO: Random vertical jumps


    // Sample the texture with our modified coordinates
    vec4 cr = texture2D(u_image, uvR);
    vec4 cg = texture2D(u_image, uvG);
    vec4 cb = texture2D(u_image, uvB);

    vec4 finalColor = vec4(cr.r, cg.g, cb.b, 1.0);

    // 5. add black rolling scanline effect
    if(scanlineOn){
      float rollingReuslt = mod(uv.y - scanlineSpeed * u_time, scanlineHeight*4.0);
      if (rollingReuslt > 0.0 && rollingReuslt < scanlineHeight) {
        finalColor.rgb *= vec3(0.2);
      }
    }

    // 5. Add occational flashing(not time is high frequency noise producer)
    if (noise(t, 0.3) > 2.0 && colorShiftIntensity > 0.5) {
      finalColor.rgb += vec3(0.2);
    }

    gl_FragColor = finalColor;
}

`;

  private config: GlitchConfig | undefined = undefined;
  constructor(gl: WebGLRenderingContext, width: number, height: number) {
    super(gl, width, height);
    // set GL program for convolution, this is globally certain.
    this.setGLProgram(this.vertexsrc_glitch, this.fragmentsrc_glitch);
  }

  public setConfig(new_config: GlitchConfig, cur_time: number) {
    this.sendUniformSafe("u_time", cur_time);
    if (
      this.config === undefined ||
      Object.keys(this.config).some(
        (key) => (this.config as any)[key] !== (new_config as any)[key]
      )
    ) {
      this.config = Object.assign({}, new_config);
      for (const key in new_config) {
        this.sendUniformSafe(key, (new_config as any)[key]);
      }
    }
  }
}

let global_glitch_processor: GlitchGLProcessor;
export const registerGlitchProcessor = (
  gl: WebGLRenderingContext,
  width: number,
  height: number
) => {
  global_glitch_processor = new GlitchGLProcessor(gl, width, height);
};

export const apply_glitch_filter = (
  data: any,
  cur_time: number,
  config: GlitchConfig
) => {
  if (!global_glitch_processor) {
    throw new Error("glitch processor not initialized");
  }
  global_glitch_processor.setConfig(config, cur_time);
  return global_glitch_processor.renderFrame(data);
};
