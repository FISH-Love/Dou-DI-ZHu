// 语音服务 Composable
// 提供录音、语音识别、语音播报功能
// 所有布局模式共享此服务

import { reactive, onMounted, onUnmounted } from 'vue';
import { voice2Text, text2Voice } from '@/services/baiduAuth.js';
import H5Recorder from '@/utils/h5-recorder.js';
import { analyzeCards, canPlay, getAllPossiblePlays } from '@/utils/cardLogic.js';

export function useVoiceService(gameCore) {
  const voiceState = reactive({
    isRecording: false
  });

  // 音频上下文
  const innerAudioContext = uni.createInnerAudioContext();
  
  // 录音管理器（非H5）
  let recorderManager;
  // #ifndef H5
  recorderManager = uni.getRecorderManager();
  // #endif

  // 组件卸载时销毁
  onUnmounted(() => {
    if (innerAudioContext) {
      innerAudioContext.stop();
      innerAudioContext.destroy();
    }
  });

  // 语音播报
  const speak = async (text) => {
    try {
      const localPath = await text2Voice(text);
      innerAudioContext.stop();
      innerAudioContext.src = localPath;
      innerAudioContext.play();
    } catch (e) {
      console.error('语音播报失败:', e);
    }
  };

  // 播报当前手牌
  const speakCurrentHand = () => {
    const myCards = gameCore.gameData.players[0].cards;
    if (myCards.length === 0) {
      speak("你没有手牌");
      return;
    }

    const groups = {};
    myCards.forEach(card => {
      const key = card.value;
      if (!groups[key]) groups[key] = [];
      groups[key].push(card);
    });

    const sortedValues = Object.keys(groups).map(Number).sort((a, b) => b - a);
    let description = "你当前的手牌是：";
    const parts = [];

    sortedValues.forEach(val => {
      const cards = groups[val];
      const count = cards.length;
      const cardName = gameCore.getCardName(cards[0]);
      
      if (count === 1) {
        parts.push(cardName);
      } else if (count === 2) {
        parts.push(`一对${cardName}`);
      } else if (count === 3) {
        parts.push(`三个${cardName}`);
      } else if (count === 4) {
        parts.push(`四个${cardName}`);
      }
    });

    description += parts.join("，");
    speak(description);
  };

  // 解析语音指令为牌型
  const parseVoiceToCards = (text) => {
    const myCards = gameCore.gameData.players[0].cards;
    const lastType = gameCore.gameData.lastType ? analyzeCards(gameCore.gameData.lastPlayedCards) : null;
    const isFirst = !gameCore.gameData.lastType || gameCore.gameData.lastPlayer === 0;
    
    const possiblePlays = getAllPossiblePlays(myCards, lastType, isFirst);
    
    const parseCardValues = (text) => {
      const values = [];
      const cardMap = {
        '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15, '小王': 16, '大王': 17,
        '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, 
        '勾': 11, '圈': 12, '凯': 13, '尖': 14
      };
      
      for (let name in cardMap) {
        if (text.includes(name)) {
          values.push(cardMap[name]);
        }
      }
      
      return values;
    };
    
    const targetValues = parseCardValues(text);
    let bestMatch = null;
    let bestScore = 0;
    
    possiblePlays.forEach(play => {
      let score = 0;
      const playValues = play.cards.map(card => card.value);
      
      if ((text.includes('王炸') || text.includes('火箭')) && play.type === 'R') {
        score = 100;
      } else if (text.includes('炸弹') && play.type === 'B') {
        score = 90;
      } else if (text.includes('对') && play.type === 'P') {
        score = 80;
        if (targetValues.length > 0) {
          let matchCount = targetValues.filter(val => playValues.includes(val)).length;
          if (matchCount > 0) score += matchCount * 10;
        }
      } else if (text.includes('三') && play.type === 'T') {
        score = 75;
        if (targetValues.length > 0) {
          let matchCount = targetValues.filter(val => playValues.includes(val)).length;
          if (matchCount > 0) score += matchCount * 10;
        }
      } else if (text.includes('三带一') && play.type === 'T1') {
        score = 70;
      } else if ((text.includes('三带二') || text.includes('三带一对')) && play.type === 'T2') {
        score = 70;
      } else if (text.includes('顺子') && play.type === 'ST') {
        score = 60;
      } else if (text.includes('连对') && play.type === 'PST') {
        score = 60;
      } else if (text.includes('飞机') && (play.type === 'PL' || play.type === 'PW')) {
        score = 60;
      } else if (text.includes('四带二') && (play.type === 'F2' || play.type === 'F4')) {
        score = 60;
      } else if (targetValues.length > 0 && !text.includes('对') && !text.includes('三') && 
                 !text.includes('带') && !text.includes('顺') && !text.includes('飞机') && 
                 !text.includes('炸弹') && !text.includes('王炸')) {
        let matchCount = targetValues.filter(val => playValues.includes(val)).length;
        if (matchCount === targetValues.length && targetValues.length === playValues.length) {
          score = 100;
        } else if (matchCount > 0) {
          score = matchCount * 20;
        }
      } else if (play.type === 'S' && !text.includes('对') && !text.includes('三') && 
                 !text.includes('带') && !text.includes('顺') && !text.includes('飞机') && 
                 !text.includes('炸弹') && !text.includes('王炸')) {
        score = 30;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = play;
      }
    });
    
    return bestMatch ? bestMatch.cards : [];
  };

  // 处理语音指令
  const processCommand = (text, onSelectCards, onPlay, onPass, onCallLandlord, onPassLandlord) => {
    console.log('收到语音指令:', text);
    
    // 复述牌面
    if (text.includes('复述') || text.includes('报牌') || text.includes('念牌') || text.includes('手牌')) {
      speakCurrentHand();
      return;
    }
    
    // 叫地主阶段
    if (gameCore.gameData.stage === 'calling') {
      if (text.includes('不叫') || text.includes('不抢')) {
        if (gameCore.gameData.turn === 0 && onPassLandlord) onPassLandlord();
      } else if (text.includes('叫') || text.includes('抢')) {
        if (gameCore.gameData.turn === 0 && onCallLandlord) onCallLandlord();
      } else {
        uni.showToast({ title: `识别为: "${text}" (请说叫地主/不抢)`, icon: 'none' });
      }
      return;
    }

    // 出牌阶段
    if (gameCore.gameData.stage === 'playing' && gameCore.gameData.turn === 0) {
      if (text.includes('不出') || text.includes('过') || text.includes('要不起')) {
        if (onPass) onPass();
        return;
      }
      
      const cardsToPlay = parseVoiceToCards(text);
      if (cardsToPlay.length > 0) {
        if (onSelectCards) onSelectCards(cardsToPlay);
        
        const playType = analyzeCards(cardsToPlay);
        const lastType = gameCore.gameData.lastType ? analyzeCards(gameCore.gameData.lastPlayedCards) : null;
        const isFirst = !gameCore.gameData.lastType || gameCore.gameData.lastPlayer === 0;
        
        if (playType && canPlay(playType, lastType, isFirst)) {
          if (onPlay) onPlay();
        } else {
          speak("牌型不匹配或太小");
          if (onSelectCards) onSelectCards([]); // 清空选择
        }
      } else {
        if (text.includes('出') || text.includes('打') || text.includes('大')) {
          if (onPlay) onPlay();
        } else {
          uni.showToast({ title: `无法识别牌型: "${text}"`, icon: 'none' });
        }
      }
    }
  };

  // 开始录音
  const startVoiceAction = () => {
    console.log('开始录音...');
    voiceState.isRecording = true;
    // #ifdef H5
    H5Recorder.start().catch(err => {
      console.error('录音启动失败:', err);
      voiceState.isRecording = false;
      uni.showToast({ title: '录音启动失败', icon: 'none' });
    });
    // #endif
    // #ifndef H5
    recorderManager.start({ format: 'wav', sampleRate: 16000, numberOfChannels: 1 });
    // #endif
  };

  // 停止录音
  const stopVoiceAction = async (onCommandProcessed) => {
    console.log('停止录音，开始识别...');
    voiceState.isRecording = false;
    // #ifdef H5
    try {
      const res = await H5Recorder.stop();
      console.log('录音数据:', res);
      uni.showLoading({ title: '解析中...' });
      const text = await voice2Text(res.base64, res.size);
      console.log('识别结果:', text);
      uni.hideLoading();
      if (onCommandProcessed) onCommandProcessed(text);
    } catch (e) {
      console.error('语音识别过程出错:', e);
      uni.hideLoading();
      uni.showToast({ title: '识别失败', icon: 'none' });
    }
    // #endif
    // #ifndef H5
    recorderManager.stop();
    // #endif
  };

  // 初始化录音管理器（非H5）
  onMounted(() => {
    // #ifndef H5
    recorderManager.onStop(async (res) => {
      const { tempFilePath } = res;
      const fs = uni.getFileSystemManager();
      
      fs.readFile({
        filePath: tempFilePath,
        encoding: 'base64',
        success: async (fileRes) => {
          fs.getFileInfo({
            filePath: tempFilePath,
            success: async (info) => {
              try {
                uni.showLoading({ title: '解析中...' });
                const text = await voice2Text(fileRes.data, info.size);
                uni.hideLoading();
                // 这里需要外部传入处理函数
                console.log('识别结果:', text);
              } catch (e) {
                uni.hideLoading();
                uni.showToast({ title: '识别失败', icon: 'none' });
              }
            }
          });
        }
      });
    });
    // #endif
  });

  return {
    voiceState,
    speak,
    speakCurrentHand,
    parseVoiceToCards,
    processCommand,
    startVoiceAction,
    stopVoiceAction
  };
}
