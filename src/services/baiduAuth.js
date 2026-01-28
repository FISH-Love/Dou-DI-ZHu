// services/baiduAuth.js

const AK = 'EkfYCj1AaMvyrlDDMS7QSmM2';
const SK = 'gokF5pHjOFIkVGIiIvkQioD6xn8lyu32';

let accessToken = '';
let tokenExpiresTime = 0;

// Base URLs configuration
let AUTH_URL = 'https://aip.baidubce.com/oauth/2.0/token';
let ASR_URL = 'https://vop.baidu.com/server_api';
let TTS_URL = 'https://tsn.baidu.com/text2audio';

// #ifdef H5
AUTH_URL = '/baidu-auth/oauth/2.0/token';
ASR_URL = '/baidu-asr/server_api';
TTS_URL = '/baidu-tts/text2audio';
// #endif

// 1. 获取百度 Token
export const getToken = () => {
  return new Promise((resolve, reject) => {
    if (accessToken && Date.now() < tokenExpiresTime) {
      resolve(accessToken);
      return;
    }
    uni.request({
      url: AUTH_URL,
      method: 'POST',
      data: {
        grant_type: 'client_credentials',
        client_id: AK,
        client_secret: SK
      },
      header: { 'Content-Type': 'application/x-www-form-urlencoded' },
      success: (res) => {
        if (res.statusCode !== 200) {
          console.error('[Baidu Auth Error]', res.data);
          reject('Token获取失败: ' + (res.data?.error_description || '状态码 ' + res.statusCode));
          return;
        }
        if (res.data && res.data.access_token) {
          accessToken = res.data.access_token;
          tokenExpiresTime = Date.now() + (res.data.expires_in * 1000) - 3600000;
          resolve(accessToken);
        } else {
          reject('Token获取失败');
        }
      },
      fail: (err) => reject(err)
    });
  });
};

// 2. 语音转文字 (ASR)
export const voice2Text = async (base64Audio, len) => {
  const token = await getToken();
  return new Promise((resolve, reject) => {
    uni.request({
      url: ASR_URL,
      method: 'POST',
      data: {
        format: 'wav',
        rate: 16000,
        channel: 1,
        cuid: 'doudizhu_mp_user',
        token: token,
        dev_pid: 1537,
        speech: base64Audio,
        len: len
      },
      success: (res) => {
        if (res.data && res.data.err_no === 0) {
          resolve(res.data.result[0]);
        } else {
          reject('识别失败: ' + (res.data.err_msg || '未知错误'));
        }
      },
      fail: (err) => reject(err)
    });
  });
};

// 3. 文字转语音 (TTS)
export const text2Voice = async (text) => {
  const token = await getToken();
  return new Promise((resolve, reject) => {
    uni.request({
      url: TTS_URL,
      method: 'POST',
      header: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: {
        tex: encodeURIComponent(text),
        lan: 'zh',
        cuid: 'doudizhu_mp_host',
        ctp: 1,
        tok: token,
        spd: 5, per: 4 // 4为精品女生
      },
      responseType: 'arraybuffer', // 必须要求返回二进制流
      success: (res) => {
        if (res.statusCode !== 200) {
          reject('TTS请求失败');
          return;
        }
        
        // #ifdef H5
        const blob = new Blob([res.data], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        resolve(url);
        // #endif

        // #ifndef H5
        // 小程序特有：将二进制流写入本地文件
        const fs = uni.getFileSystemManager();
        const filePath = `${wx.env.USER_DATA_PATH}/temp_voice.mp3`;
        
        fs.writeFile({
          filePath: filePath,
          data: res.data,
          encoding: 'binary',
          success: () => resolve(filePath), // 返回本地路径给音频组件播放
          fail: (err) => reject(err)
        });
        // #endif
      },
      fail: (err) => reject(err)
    });
  });
};
