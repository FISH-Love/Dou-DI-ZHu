// utils/h5-recorder.js
import Recorder from 'recorder-core'
// 必须引入 wav 引擎
import 'recorder-core/src/engine/wav'

class H5Recorder {
  constructor() {
    this.rec = null;
  }

  // 开始录音
  start() {
    return new Promise((resolve, reject) => {
      this.rec = Recorder({
        type: "wav",
        sampleRate: 16000, // 百度要求 16000
        bitRate: 16,       // 百度要求 16bit
        onProcess: (buffers, powerLevel, bufferDuration, bufferSampleRate) => {
          // 可在此扩展波形动画数据
        }
      });

      this.rec.open(() => {
        this.rec.start();
        console.log("录音环境已就绪，开始录音...");
        resolve();
      }, (msg, isUserNotAllow) => {
        console.error((isUserNotAllow ? "用户拒绝了权限：" : "无法录音：") + msg);
        reject(msg);
      });
    });
  }

  // 停止录音并返回结果
  stop() {
    return new Promise((resolve, reject) => {
      if (!this.rec) {
        reject("未开始录音");
        return;
      }

      this.rec.stop((blob, duration) => {
        // 将 Blob 转换为 Base64，且去掉 Base64 的 Data-URI 前缀
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1]; 
          resolve({
            base64: base64,
            size: blob.size,
            duration: duration
          });
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(blob);
        
        // 关闭并释放资源
        this.rec.close();
        this.rec = null;
      }, (msg) => {
        console.error("录音停止失败:" + msg);
        reject(msg);
      });
    });
  }
}

export default new H5Recorder();