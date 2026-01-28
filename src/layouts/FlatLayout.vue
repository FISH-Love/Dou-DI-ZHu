<template>
  <view class="flat-container">
    <!-- 顶部信息区 (10-15%) -->
    <view class="top-info-area" @click="speakGameStatus">
      <view class="hole-cards">
        <view v-for="(card, i) in holeCards" :key="i" class="card tiny">
          <view class="inner" v-if="stage !== 'calling'">
            <text :class="isRed(card)?'red':'black'">{{card.label}}{{card.suit}}</text>
          </view>
          <view class="back" v-else></view>
        </view>
      </view>
      <text class="status-text">{{ statusText }}</text>
      <view class="player-info">
        <text>左: {{cardCounts[2]}}张</text>
        <text>右: {{cardCounts[1]}}张</text>
      </view>
    </view>

    <!-- 中部交互区 (25-30%) -->
    <view class="middle-interact-area">
      <!-- 叫地主阶段 -->
      <view v-if="stage === 'calling' && turn === 0" class="calling-stage">
        <text class="calling-prompt">请叫地主</text>
        <view class="calling-buttons">
          <button class="btn-calling btn-call" @click="onCallLandlord">抢地主</button>
          <button class="btn-calling btn-pass-call" @click="onPassLandlord">不抢</button>
        </view>
        <view class="voice-btn-wrapper">
          <view 
            class="voice-button small" 
            @touchstart="onVoiceStart" 
            @touchend="onVoiceEnd"
            :class="{recording: isRecording}"
          >
            <text class="mic-icon">🎤</text>
            <text class="hint">{{ isRecording ? '正在听...' : '长按说话' }}</text>
          </view>
        </view>
      </view>

      <!-- 出牌阶段 -->
      <view v-else class="playing-stage">
        <!-- 出牌历史 -->
        <view class="last-play-display">
          <view v-if="lastPlayedCards.length > 0" class="cards-row">
            <view v-for="(card, i) in lastPlayedCards" :key="i" class="card large-display">
              <text :class="isRed(card)?'red':'black'">{{card.label}}</text>
            </view>
          </view>
          <text v-else class="placeholder">等待出牌...</text>
        </view>

        <!-- 语音按钮 -->
        <view class="voice-btn-wrapper">
          <view 
            class="voice-button" 
            @touchstart="onVoiceStart" 
            @touchend="onVoiceEnd"
            :class="{recording: isRecording}"
          >
            <text class="mic-icon">🎤</text>
            <text class="hint">{{ isRecording ? '正在听...' : '长按说话' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部手牌区 (55-60%) - 三行平铺 -->
    <view class="bottom-hand-area">
      <text class="area-title">手牌区域（固定位置）</text>
      
      <!-- 第一行：10/J/Q/K (宽按钮) -->
      <view class="card-row row-wide">
        <view 
          v-for="(slot, index) in gridState.row1" 
          :key="slot.value"
          class="card-slot wide"
          :class="[slot.state]"
          @click="onSlotClick('row1', index)"
          @longpress="onSlotLongPress('row1', index)"
          @touchmove.stop="onSlotTouchMove('row1', index)"
        >
          <text class="card-label">{{ getCardLabel(slot.value) }}</text>
          <text class="card-count" v-if="slot.count > 0">×{{ slot.count }}</text>
          <text class="selected-badge" v-if="slot.selected > 0">已选{{ slot.selected }}</text>
        </view>
      </view>

      <!-- 第二行：3-9 (窄按钮，触感区分) -->
      <view class="card-row row-narrow">
        <view 
          v-for="(slot, index) in gridState.row2" 
          :key="slot.value"
          class="card-slot narrow"
          :class="[slot.state]"
          @click="onSlotClick('row2', index)"
          @longpress="onSlotLongPress('row2', index)"
          @touchmove.stop="onSlotTouchMove('row2', index)"
        >
          <text class="card-label">{{ getCardLabel(slot.value) }}</text>
          <text class="card-count" v-if="slot.count > 0">×{{ slot.count }}</text>
          <text class="selected-badge" v-if="slot.selected > 0">已选{{ slot.selected }}</text>
        </view>
      </view>

      <!-- 第三行：A/2/小王/大王 (宽按钮) -->
      <view class="card-row row-wide">
        <view 
          v-for="(slot, index) in gridState.row3" 
          :key="slot.value"
          class="card-slot wide power"
          :class="[slot.state]"
          @click="onSlotClick('row3', index)"
          @longpress="onSlotLongPress('row3', index)"
          @touchmove.stop="onSlotTouchMove('row3', index)"
        >
          <text class="card-label">{{ getCardLabel(slot.value) }}</text>
          <text class="card-count" v-if="slot.count > 0">×{{ slot.count }}</text>
          <text class="selected-badge" v-if="slot.selected > 0">已选{{ slot.selected }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons">
        <button class="btn-action btn-pass" @click="onPassClick" :disabled="isMustPlay">
          不出
        </button>
        <button class="btn-action btn-play" @click="onPlayClick">
          出牌
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useFlatLayoutAdapter } from '@/composables/useFlatLayoutAdapter.js';

const props = defineProps({
  gameData: { type: Object, required: true },
  voiceState: { type: Object, required: true },
  isRed: { type: Function, required: true },
  getCardName: { type: Function, required: true },
  speak: { type: Function, required: true }
});

const emit = defineEmits([
  'play', 
  'pass',
  'callLandlord',
  'passLandlord',
  'voiceStart', 
  'voiceEnd'
]);

// 使用平铺布局适配器
const handCards = computed(() => props.gameData.players[0].cards);
const adapter = useFlatLayoutAdapter(handCards);
const { gridState, cycleSelect, selectAll, resetSelection, getSelectedCards, setSelectedCards, getCardLabel } = adapter;

// 计算属性
const holeCards = computed(() => props.gameData.holeCards);
const stage = computed(() => props.gameData.stage);
const turn = computed(() => props.gameData.turn);
const statusText = computed(() => {
  if (props.gameData.stage === 'calling') return '抢地主中';
  if (props.gameData.turn === 0) return '你的回合';
  return '电脑思考';
});
const cardCounts = computed(() => props.gameData.players.map(p => p.cards.length));
const lastPlayedCards = computed(() => props.gameData.lastPlayedCards);
const isMustPlay = computed(() => props.gameData.lastPlayer === -1 || props.gameData.lastPlayer === 0);
const isRecording = computed(() => props.voiceState.isRecording);

// 防抖定时器（用于滑动探索）
let debounceTimer = null;

// 播报游戏状态
const speakGameStatus = () => {
  const landlordText = props.gameData.landlord === 0 ? '你是地主' : 
                       props.gameData.landlord === 1 ? '右边是地主' : 
                       props.gameData.landlord === 2 ? '左边是地主' : '未定地主';
  const turnText = props.gameData.turn === 0 ? '你的回合' : '电脑回合';
  props.speak(`${landlordText}，${turnText}，左边${cardCounts.value[2]}张，右边${cardCounts.value[1]}张`);
};

// 坑位点击（循环点选）
const onSlotClick = (row, index) => {
  const slot = gridState[row][index];
  
  if (slot.count === 0) {
    // 空槽
    uni.vibrateShort({ type: 'heavy' });
    props.speak('无');
    return;
  }
  
  // 循环点选
  cycleSelect(row, index);
  uni.vibrateShort({ type: 'medium' });
  
  // 播报
  if (slot.selected === 0) {
    props.speak(`取消选择${getCardLabel(slot.value)}`);
  } else {
    const countText = slot.selected === 1 ? '' : slot.selected === 2 ? '两' : slot.selected === 3 ? '三' : slot.selected;
    props.speak(`已选${countText}张${getCardLabel(slot.value)}`);
  }
};

// 坑位长按（全选）
const onSlotLongPress = (row, index) => {
  const slot = gridState[row][index];
  
  if (slot.count === 0) return;
  
  selectAll(row, index);
  uni.vibrateLong();
  
  // 播报
  const countText = slot.count === 2 ? '一对' : slot.count === 3 ? '三个' : slot.count === 4 ? '四个，炸弹' : slot.count + '张';
  props.speak(`已全选${countText}${getCardLabel(slot.value)}`);
};

// 滑动探索（防抖播报）
const onSlotTouchMove = (row, index) => {
  const slot = gridState[row][index];
  
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    if (slot.count === 0) {
      props.speak('无');
    } else {
      props.speak(getCardLabel(slot.value));
    }
  }, 200); // 200ms 防抖
};

// 出牌按钮
const onPlayClick = () => {
  const selected = getSelectedCards(handCards.value);
  emit('play', selected);
};

// 过牌按钮
const onPassClick = () => {
  emit('pass');
};

// 叫地主按钮
const onCallLandlord = () => {
  emit('callLandlord');
};

// 不叫地主按钮
const onPassLandlord = () => {
  emit('passLandlord');
};

// 语音按钮
const onVoiceStart = () => {
  emit('voiceStart');
};

const onVoiceEnd = () => {
  emit('voiceEnd');
};

// 监听手牌变化，自动重置选择
watch(() => props.gameData.players[0].cards.length, () => {
  resetSelection();
});

// 暴露方法给父组件（用于语音指令选牌）
defineExpose({
  setSelectedCards,
  resetSelection
});
</script>

<style scoped>
.flat-container {
  width: 100vw;
  height: 100vh;
  background: #1a5e20;
  display: flex;
  flex-direction: column;
  color: white;
  overflow: hidden;
}

/* 顶部信息区 (10-15%) */
.top-info-area {
  height: 12%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.3);
  padding: 10rpx;
}

.hole-cards {
  display: flex;
  gap: 5rpx;
}

.card.tiny {
  width: 40rpx;
  height: 60rpx;
  background: white;
  border-radius: 4rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16rpx;
}

.status-text {
  font-size: 28rpx;
  font-weight: bold;
  margin-top: 5rpx;
}

.player-info {
  display: flex;
  gap: 40rpx;
  font-size: 24rpx;
  margin-top: 5rpx;
}

/* 中部交互区 (25-30%) */
.middle-interact-area {
  height: 28%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;
  padding: 20rpx;
}

/* 叫地主阶段 */
.calling-stage {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;
}

.calling-prompt {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffeb3b;
  text-shadow: 0 4rpx 8rpx rgba(0,0,0,0.5);
}

.calling-buttons {
  display: flex;
  gap: 30rpx;
  width: 100%;
  justify-content: center;
}

.btn-calling {
  width: 200rpx;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
  box-shadow: 0 4rpx 8rpx rgba(0,0,0,0.3);
}

.btn-call {
  background: linear-gradient(135deg, #ffeb3b, #fbc02d);
  color: #333;
}

.btn-pass-call {
  background: linear-gradient(135deg, #757575, #616161);
  color: white;
}

/* 出牌阶段 */
.playing-stage {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;
}

.last-play-display {
  min-height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cards-row {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
}

.card.large-display {
  width: 80rpx;
  height: 110rpx;
  background: white;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  font-weight: bold;
  box-shadow: 0 4rpx 8rpx rgba(0,0,0,0.3);
}

.placeholder {
  font-size: 28rpx;
  color: rgba(255,255,255,0.5);
}

.voice-btn-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
}

.voice-button {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4A90E2, #357ABD);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 16rpx rgba(0,0,0,0.4);
  transition: all 0.2s;
}

.voice-button.small {
  width: 120rpx;
  height: 120rpx;
}

.voice-button.recording {
  background: linear-gradient(135deg, #f44336, #d32f2f);
  transform: scale(1.1);
}

.mic-icon {
  font-size: 60rpx;
}

.voice-button.small .mic-icon {
  font-size: 40rpx;
}

.hint {
  font-size: 22rpx;
  margin-top: 10rpx;
}

.voice-button.small .hint {
  font-size: 18rpx;
  margin-top: 5rpx;
}

/* 底部手牌区 (55-60%) */
.bottom-hand-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20rpx;
  background: rgba(0,0,0,0.2);
}

.area-title {
  font-size: 24rpx;
  text-align: center;
  margin-bottom: 10rpx;
  color: rgba(255,255,255,0.7);
}

.card-row {
  display: flex;
  gap: 5rpx;
  margin-bottom: 10rpx;
}

.card-row.row-wide {
  height: 22%;
}

.card-row.row-narrow {
  height: 22%;
}

.card-slot {
  flex: 1;
  background: rgba(255,255,255,0.1);
  border: 2rpx solid rgba(255,255,255,0.3);
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s;
}

/* 宽按钮 (第一、三行) */
.card-slot.wide {
  min-width: 23%;
}

/* 窄按钮 (第二行，触感区分) */
.card-slot.narrow {
  min-width: 13%;
}

/* 强权区特殊样式 */
.card-slot.power {
  border-color: rgba(255, 215, 0, 0.5);
}

/* 状态样式 */
.card-slot.empty {
  background: rgba(100,100,100,0.3);
  border-color: rgba(100,100,100,0.5);
}

.card-slot.owned {
  background: rgba(76, 175, 80, 0.3);
  border-color: rgba(76, 175, 80, 0.8);
}

.card-slot.selected {
  background: rgba(255, 235, 59, 0.5);
  border-color: #ffeb3b;
  box-shadow: 0 0 20rpx #ffeb3b;
  transform: scale(1.05);
}

.card-label {
  font-size: 40rpx;
  font-weight: bold;
  color: white;
}

.card-count {
  font-size: 20rpx;
  color: rgba(255,255,255,0.8);
  margin-top: 5rpx;
}

.selected-badge {
  position: absolute;
  top: 5rpx;
  right: 5rpx;
  background: #f44336;
  color: white;
  font-size: 18rpx;
  padding: 2rpx 8rpx;
  border-radius: 10rpx;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 20rpx;
  margin-top: auto;
  padding-top: 20rpx;
}

.btn-action {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
}

.btn-pass {
  background: #757575;
  color: white;
}

.btn-pass:disabled {
  background: #424242;
  opacity: 0.5;
}

.btn-play {
  background: linear-gradient(135deg, #4caf50, #388e3c);
  color: white;
}

/* 颜色 */
.red { color: #d32f2f; }
.black { color: #212121; }
.back {
  width: 100%;
  height: 100%;
  background: #0d47a1;
  border-radius: 4rpx;
}
</style>
