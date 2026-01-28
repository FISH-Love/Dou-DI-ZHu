import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

export default defineConfig({
  plugins: [uni()],
  server: {
    proxy: {
      // 百度鉴权接口
      '/baidu-auth': {
        target: 'https://aip.baidubce.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/baidu-auth/, '')
      },
      // 语音识别接口
      '/baidu-asr': {
        target: 'https://vop.baidu.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/baidu-asr/, '')
      },
      // 语音合成接口
      '/baidu-tts': {
        target: 'https://tsn.baidu.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/baidu-tts/, '')
      },
      // 阿里云百炼标准API接口
      '/dashscope': {
        target: 'https://dashscope.aliyuncs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dashscope/, '')
      }
    }
  }
});