<template>
  <view class="container">
    <!-- 游戏开始前：布局选择 -->
    <view v-if="gameData.stage === 'ready'" class="ready-screen">
      <text class="title">斗地主 AI 对战</text>
      
      <view class="layout-selector">
        <text class="selector-label">选择布局模式：</text>
        <picker 
          mode="selector" 
          :range="layoutOptions" 
          :range-key="'label'"
          :value="selectedLayoutIndex"
          @change="onLayoutChange"
        >
          <view class="picker-display">
            <text>{{ layoutOptions[selectedLayoutIndex].label }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <text class="layout-desc">{{ layoutOptions[selectedLayoutIndex].desc }}</text>
      </view>

      <button class="btn-start" @click="onStartGame">开始游戏</button>
    </view>

    <!-- 游戏进行中：动态布局 -->
    <component 
      v-else
      :is="currentLayoutComponent"
      :gameData="gameData"
      :voiceState="voiceState"
      :isRed="isRed"
      :getCardName="getCardName"
      :speak="speak"
      @play="handlePlay"
      @pass="handlePass"
      @callLandlord="handleCallLandlord"
      @passLandlord="handlePassLandlord"
      @voiceStart="startVoiceAction"
      @voiceEnd="stopVoiceAction"
      ref="layoutRef"
    />
  </view>
</template>

<script setup>
import { ref, onMounted, markRaw } from 'vue';
import { useGameCore } from '@/composables/useGameCore.js';
import { useVoiceService } from '@/composables/useVoiceService.js';
import NormalLayout from '@/layouts/NormalLayout.vue';
import FlatLayout from '@/layouts/FlatLayout.vue';
import VerticalLayout from '@/layouts/VerticalLayout.vue';
import { testAIConfiguration } from '@/services/aiService.js';

// 布局选项
const layoutOptions = [
  { value: 'normal', label: '正常模式', desc: '传统扇形手牌布局，适合视觉操作' },
  { value: 'flat', label: '平铺模式', desc: '三行固定网格，适合无障碍操作' },
  { value: 'vertical', label: '竖向模式', desc: '纵向排列布局（待实现）' }
];

const selectedLayoutIndex = ref(0);
const currentLayoutComponent = ref(null);
const layoutRef = ref(null);

// 使用游戏核心逻辑
const gameCore = useGameCore();
const { gameData, isRed, getCardName, startGame, callLandlord, passLandlord, playerPlay, playerPass, aiPlay } = gameCore;

// 使用语音服务
const voiceService = useVoiceService(gameCore);
const { voiceState, speak, processCommand, startVoiceAction: voiceStart, stopVoiceAction: voiceStop } = voiceService;

// 布局引用
const layoutComponentMap = {
  normal: markRaw(NormalLayout),
  flat: markRaw(FlatLayout),
  vertical: markRaw(VerticalLayout)
};

// 初始化
onMounted(() => {
  // 测试双AI配置
  const aiTestResult = testAIConfiguration();
  console.log('双AI配置测试结果:', aiTestResult);
  
  // 从本地存储读取上次选择的布局
  const savedLayout = uni.getStorageSync('preferredLayout');
  if (savedLayout) {
    const index = layoutOptions.findIndex(opt => opt.value === savedLayout);
    if (index !== -1) {
      selectedLayoutIndex.value = index;
    }
  }
});

// 布局选择
const onLayoutChange = (e) => {
  selectedLayoutIndex.value = e.detail.value;
  const selectedLayout = layoutOptions[selectedLayoutIndex.value].value;
  uni.setStorageSync('preferredLayout', selectedLayout);
};

// 开始游戏
const onStartGame = () => {
  const selectedLayout = layoutOptions[selectedLayoutIndex.value].value;
  currentLayoutComponent.value = layoutComponentMap[selectedLayout];
  
  const result = startGame();
  speak(result.message);
};

// 玩家出牌
const handlePlay = (selectedCards) => {
  const result = playerPlay(selectedCards, speak);
  
  if (!result.success) {
    uni.showToast({ title: result.message, icon: 'none' });
    return;
  }
  
  if (result.winner !== undefined) {
    const winnerText = result.winner === 0 ? '你' : `玩家${result.winner + 1}`;
    speak(`${winnerText}获胜！`);
    setTimeout(() => {
      uni.showModal({
        title: '游戏结束',
        content: `${winnerText}获胜！`,
        showCancel: false,
        success: () => {
          gameData.stage = 'ready';
          currentLayoutComponent.value = null;
        }
      });
    }, 1000);
    return;
  }
  
  // AI自动出牌
  if (result.nextTurn !== 0) {
    setTimeout(() => {
      aiPlay(result.nextTurn, speak).then(aiResult => {
        if (aiResult.winner !== undefined) {
          const winnerText = aiResult.winner === 0 ? '你' : `玩家${aiResult.winner + 1}`;
          speak(`${winnerText}获胜！`);
          setTimeout(() => {
            uni.showModal({
              title: '游戏结束',
              content: `${winnerText}获胜！`,
              showCancel: false,
              success: () => {
                gameData.stage = 'ready';
                currentLayoutComponent.value = null;
              }
            });
          }, 1000);
        } else if (aiResult.nextTurn !== undefined && aiResult.nextTurn !== 0) {
          setTimeout(() => aiPlay(aiResult.nextTurn, speak), 1500);
        }
      });
    }, 1500);
  }
};

// 玩家过牌
const handlePass = () => {
  const result = playerPass(speak);
  
  if (result.gameOver) {
    speak('游戏结束');
    uni.showModal({
      title: '游戏结束',
      showCancel: false,
      success: () => {
        gameData.stage = 'ready';
        currentLayoutComponent.value = null;
      }
    });
    return;
  }
  
  if (result.clearTable) {
    speak('清场，请出牌');
  }
  
  // AI自动出牌
  if (result.turn !== 0) {
    setTimeout(() => {
      aiPlay(result.turn, speak).then(aiResult => {
        if (aiResult.nextTurn !== undefined && aiResult.nextTurn !== 0) {
          setTimeout(() => aiPlay(aiResult.nextTurn, speak), 1500);
        }
      });
    }, 1000);
  }
};

// 玩家叫地主
const handleCallLandlord = () => {
  const result = callLandlord(0, speak);
  
  // 如果地主是玩家，等待玩家出牌
  if (result.playerIndex === 0) {
    speak('你是地主，请出牌');
  }
};

// 玩家不叫地主
const handlePassLandlord = () => {
  const result = passLandlord();
  
  if (result.action === 'forceLandlord') {
    callLandlord(result.playerIndex, speak);
    setTimeout(() => {
      aiPlay(result.playerIndex, speak);
    }, 2000);
  } else if (result.action === 'nextTurn' && result.turn !== 0) {
    setTimeout(() => {
      aiPlay(result.turn, speak).then(aiResult => {
        if (aiResult.aiCalled || aiResult.forced) {
          // AI成为地主，开始出牌
          setTimeout(() => {
            aiPlay(gameData.turn, speak);
          }, 2000);
        } else if (aiResult.turn !== undefined && aiResult.turn !== 0) {
          // 继续下一个AI决策
          setTimeout(() => aiPlay(aiResult.turn, speak), 1500);
        }
      });
    }, 1500);
  } else if (result.turn === 0) {
    speak('请叫地主');
  }
};

// 语音录音
const startVoiceAction = () => {
  voiceStart();
};

const stopVoiceAction = () => {
  voiceStop((text) => {
    processCommand(
      text,
      // onSelectCards
      (cards) => {
        if (layoutRef.value && layoutRef.value.setSelectedCards) {
          layoutRef.value.setSelectedCards(cards);
        } else {
          // 正常模式：直接设置 selected 属性
          gameData.players[0].cards.forEach(c => c.selected = false);
          cards.forEach(card => {
            const found = gameData.players[0].cards.find(c => c.value === card.value && c.suit === card.suit);
            if (found) found.selected = true;
          });
        }
      },
      // onPlay
      () => {
        if (layoutRef.value && layoutRef.value.getSelectedCards) {
          const selected = layoutRef.value.getSelectedCards(gameData.players[0].cards);
          handlePlay(selected);
        } else {
          const selected = gameData.players[0].cards.filter(c => c.selected);
          handlePlay(selected);
        }
      },
      // onPass
      handlePass,
      // onCallLandlord
      handleCallLandlord,
      // onPassLandlord
      handlePassLandlord
    );
  });
};
</script>

<style scoped>
.container {
  width: 100vw;
  height: 100vh;
  background: #1a5e20;
  display: flex;
  flex-direction: column;
  color: white;
}

/* 准备界面 */
.ready-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.title {
  font-size: 60rpx;
  font-weight: bold;
  margin-bottom: 80rpx;
  color: #ffeb3b;
  text-shadow: 0 4rpx 8rpx rgba(0,0,0,0.3);
}

.layout-selector {
  width: 100%;
  max-width: 600rpx;
  background: rgba(255,255,255,0.1);
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 60rpx;
}

.selector-label {
  font-size: 28rpx;
  margin-bottom: 20rpx;
  display: block;
  color: rgba(255,255,255,0.9);
}

.picker-display {
  background: white;
  color: #333;
  padding: 20rpx 30rpx;
  border-radius: 10rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 32rpx;
}

.arrow {
  color: #999;
  font-size: 24rpx;
}

.layout-desc {
  font-size: 24rpx;
  color: rgba(255,255,255,0.7);
  margin-top: 20rpx;
  display: block;
  text-align: center;
}

.btn-start {
  width: 400rpx;
  height: 100rpx;
  line-height: 100rpx;
  background: linear-gradient(135deg, #ffeb3b, #fbc02d);
  color: #333;
  font-size: 36rpx;
  font-weight: bold;
  border-radius: 50rpx;
  box-shadow: 0 8rpx 16rpx rgba(0,0,0,0.3);
  border: none;
}

.btn-start:active {
  transform: scale(0.95);
  opacity: 0.9;
}
</style>
