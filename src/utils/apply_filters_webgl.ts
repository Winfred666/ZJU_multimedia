export const MAX_KERNEL_SIZE = 25;

// Helper function to compile a shader.
function compileShader(
  gl: WebGLRenderingContext,
  source: string,
  type: number
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Failed to create shader");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader); // compile the shader into machine code
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const err = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Shader compile error: " + err);
  }
  return shader;
}

// Class encapsulating the GL processing for convolution.
export class GLProcessor {
  protected gl: WebGLRenderingContext;
  protected program: WebGLProgram | null = null;
  protected positionBuffer: WebGLBuffer | null = null;
  protected framebuffer: WebGLFramebuffer | null = null;
  protected outputTexture: WebGLTexture | null = null;
  protected inputTexture: WebGLTexture | null = null;
  protected width: number;
  protected height: number;

  constructor(gl: WebGLRenderingContext, width: number, height: number) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    this.initBuffers();
    this.initFramebuffer();
  }

  // Create a full-screen quad buffer.
  private initBuffers(): void {
    const gl = this.gl;
    this.positionBuffer = gl.createBuffer();
    if (!this.positionBuffer) {
      throw new Error("Failed to create position buffer");
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    // Full-screen quad covering clip space [-1,1]
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  }

  // Create an offscreen framebuffer and an output texture.
  private initFramebuffer(): void {
    const gl = this.gl;
    this.framebuffer = gl.createFramebuffer();
    if (!this.framebuffer) {
      throw new Error("Failed to create framebuffer");
    }
    this.outputTexture = gl.createTexture();
    if (!this.outputTexture) {
      throw new Error("Failed to create output texture");
    }
    gl.bindTexture(gl.TEXTURE_2D, this.outputTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.width,
      this.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.outputTexture,
      0
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  protected sendUniformSafe(key:string, val:any, is_integer:boolean=false){
    const gl = this.gl;
    if (!this.program) {
      throw new Error("GL program is not set");
    }
    const location = gl.getUniformLocation(this.program, key);
    if (location) {
      // if is integer, cannot decided by typeof val.
      if(is_integer){
        gl.uniform1i(location, val);
      }else if(typeof val === 'number'){
        gl.uniform1f(location, val);
      }// else if is array
      else if(val instanceof Array){
        if(val.length === 2){
          gl.uniform2f(location, val[0], val[1]);
        }else if(val.length === 4){
          gl.uniform4f(location, val[0],val[1], val[2],val[3]);
        }else{ // much longer.
          gl.uniform1fv(location, val);
        }
      } // if boolean
      else if(typeof val === 'boolean'){
        gl.uniform1i(location, val ? 1 : 0);
      }

    } else {
      throw new Error(`${key} not found in the shader program!!`);
    }
  }

  // Set (or swap) the GL program from shader sources.
  // Note: vertexShaderSource and fragmentShaderSource are provided externally
  // WARNING: do not call it frequently because compiling shaders is expensive.
  protected setGLProgram(
    vertexShaderSource: string,
    fragmentShaderSource: string
  ): void {
    const gl = this.gl;
    const vertexShader = compileShader(
      gl,
      vertexShaderSource,
      gl.VERTEX_SHADER
    );
    const fragmentShader = compileShader(
      gl,
      fragmentShaderSource,
      gl.FRAGMENT_SHADER
    );
    const program = gl.createProgram();
    if (!program) {
      throw new Error("Failed to create GL program");
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(
        "Program failed to link: " + gl.getProgramInfoLog(program)
      );
    }
    // Use the new program.
    this.program = program;
    gl.useProgram(program);

    // Bind the full-screen quad's position attribute.
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(positionLocation); // prepare again for the new program
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    // Set uniform for texture size if expected (e.g., u_textureSize).
    
    this.sendUniformSafe("u_textureSize", [this.width, this.height])
    // Additional uniforms (like convolution kernel) should be set separately(more adjustable)
  }

  // Render a frame using the current GL program.
  // The frame can be an HTMLImageElement, HTMLVideoElement, or ImageData.
  // Returns the output pixels as a Uint8Array.
  public renderFrame(frame: ImageData): Uint8Array {
    const gl = this.gl;
    if (!this.program) {
      throw new Error("GL program is not set");
    }
    // Bind the offscreen framebuffer.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, this.width, this.height);

    // Create or update the input texture.
    if (!this.inputTexture) {
      this.inputTexture = gl.createTexture();
      if (!this.inputTexture) {
        throw new Error("Failed to create input texture");
      }
      gl.bindTexture(gl.TEXTURE_2D, this.inputTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.inputTexture);
    }
    // Upload the frame to the texture.
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      frame.width,
      frame.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      frame.data
    );
    // Bind texture to texture unit 0 and assign to uniform u_image.
    const uImageLocation = gl.getUniformLocation(this.program, "u_image");
    if (uImageLocation !== null) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.inputTexture); // bind the input texture!!!
      gl.uniform1i(uImageLocation, 0);
    } else {
      throw new Error("u_image not found in the shader program!!");
    }

    // Draw the full-screen quad, in this step, the fragment shader will be executed!!
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Read back pixels from the framebuffer.
    const outputPixels = new Uint8Array(this.width * this.height * 4);
    gl.readPixels(
      0,
      0,
      this.width,
      this.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      outputPixels
    );
    // Unbind framebuffer (optional).
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // set the frame's data to the outputPixels (cover the original frame.)
    frame.data.set(outputPixels);
    return outputPixels;
  }
}

// Example usage:
// Assume 'gl' is your global WebGLRenderingContext, and you have vertexShaderSource and fragmentShaderSource strings.
// const processor = new GLProcessor(gl, videoWidth, videoHeight);
// processor.setGLProgram(vertexShaderSource, fragmentShaderSource);
// In your animation loop, for each new frame:
// const processedData: Uint8Array = processor.renderFrame(videoElement);

class GLConvolutionProcessor extends GLProcessor {
  private _kernel: number[];
  private _kernelSize: number;
  private vertexsrc_convolution= 
`// WebGL 1.0
precision mediump float;

attribute vec2 a_position; // 顶点坐标
varying vec2 v_texCoord;   // 纹理坐标

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = (a_position + 1.0) / 2.0;;
}`;

  private fragmentsrc_convolution = 
`// WebGL 1.0
precision mediump float;

varying vec2 v_texCoord; // 纹理坐标

uniform vec2 u_textureSize; // 纹理尺寸

uniform float u_kernel[${MAX_KERNEL_SIZE*MAX_KERNEL_SIZE}]; // 卷积核，最大尺寸为25*25
uniform int u_kernelSize; // 卷积核尺寸
uniform sampler2D u_image; // 输入纹理

void main(){
  vec4 ret_color = vec4(0.0);
  vec2 onePixel = vec2(1.0, 1.0) / u_textureSize; // 一个像素的大小
  for(int i = 0; i < 25; i++){
    for(int j = 0; j < 25; j++){
      if(i >= u_kernelSize || j >= u_kernelSize) continue; // 超出卷积核尺寸的部分不处理
      vec2 offset = onePixel * vec2(float(i - u_kernelSize / 2), float(j - u_kernelSize / 2));
      ret_color += texture2D(u_image, v_texCoord + offset) * u_kernel[j * 25 + i];
    }
  }
  ret_color.a = 1.0;
  gl_FragColor = ret_color;
}
`;

  constructor(gl: WebGLRenderingContext, width: number, height: number) {
    super(gl, width, height);
    this._kernel = [];
    this._kernelSize = 0; // just default value
    // set GL program for convolution, this is globally certain.
    this.setGLProgram(this.vertexsrc_convolution, this.fragmentsrc_convolution);
  }

  public setKernel(kernel: number[], kernelSize: number): void {
    // if kernel and kernelSize is the same, no need to update the shader program
    if (this._kernelSize === kernelSize) {
      // check if the kernel array is the same by compare diagonal elements
      let same = true;
      for (let i = 0; i < kernelSize; i++) {
        if (this._kernel[i*i] !== kernel[i*i]) {
          same = false;
          break;
        }
      }
      if (same) return; // no need to update the shader program
    }
    // console.log("reset kernel of WebGL!!")
    this._kernel = kernel;
    this._kernelSize = kernelSize;
    this.sendUniformSafe("u_kernel[0]",kernel)
    this.sendUniformSafe("u_kernelSize",kernelSize, true)
  }

  get kernel(): number[] {
    return this._kernel;
  }

  get kernelSize(): number {
    return this._kernelSize;
  }
}

let global_conv_processor: GLConvolutionProcessor | undefined;

export const registerGLConvProcessor = (
  gl: WebGLRenderingContext,
  width: number,
  height: number
) => {
  global_conv_processor = new GLConvolutionProcessor(gl, width, height);
};

// now only expose an apply filter function
export const apply_conv_filter = (imgData:any, kernel: number[], kernelSize: number) => {
  if (!global_conv_processor) {
    throw new Error("GLConvolutionProcessor not registered");
  }
  global_conv_processor.setKernel(kernel, kernelSize);
  return global_conv_processor.renderFrame(imgData);
}