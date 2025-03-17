import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  console.log(`Vite is running in ${mode} mode.`);
  const baseURL =
    mode === "production"
      ? "https://Winfred666.github.io/ZJU_multimedia/"
      : "/";
  // WARNING: Change this to your repo name
  return {
    base: baseURL,
    // define url to provide the base path.
    plugins: [vue(), tailwindcss()],
    define: {
      "process.env.BASE_URL": JSON.stringify(baseURL),
    },
    assetsInclude: ["/**/*.js"],
    resolve: {
      alias: {
        "@": "/src", // 确保 "@" 指向项目根目录下的 "src" 文件夹
      },
    },
  };
});
