<template>
  <view class="side-layout-container"
    @touchstart="handleGlobalTouchStart"
    @touchmove="handleGlobalTouchMove"
    @touchend="handleGlobalTouchEnd"
    @touchcancel="handleGlobalTouchEnd"
  >
    <view class="left-hand-panel">
      <view class="hand-vertical-container">
        <view 
          v-for="(card, i) in handCards" 
          :key="i" 
          class="card vertical"
          :class="{
            'sel': card.selected, 
            'focus': touchState.focusIndex === i 
          }"
          :style="getCardStyle(i)"
        >
          <view class="card-corner">
            <text class="t-rank" :class="isRed(card)?'red':'black'">{{card.label}}</text>
            <text class="t-suit-small" :class="isRed(card)?'red':'black'">{{card.suit}}</text>
          </view>
          <view v-if="card.selected" class="sel-dot"></view>
        </view>
      </view>
    </view>

    <view class="right-table-panel">
      <view class="top-info">
        <view class="hole-cards">
          <view v-for="(card, i) in holeCards" :key="i" class="card small">
            <view class="inner" v-if="gameData.stage !== 'calling'">
              <text :class="isRed(card)?'red':'black'">{{card.label}}{{card.suit}}</text>
            </view>
            <view class="back" v-else></view>
          </view>
        </view>
        <text class="status-text">{{ statusText }}</text>
        
        <view class="voice-status-bar" :class="{active: isRecording || voiceState.isListening}">
            <text v-if="isMyTurn && voiceState.isListening">👂 自动聆听中...</text>
            <text v-else-if="touchState.isManualVoice">🎤 松手发送指令</text>
            <text v-else>按住屏幕说话</text>
        </view>
      </view>

      <view v-if="touchState.swipeActionType" class="action-feedback">
         <text class="action-icon">{{ touchState.swipeActionType === 'right' ? '🚀' : '↩️' }}</text>
         <text class="action-text">{{ getActionName(touchState.swipeActionType) }}</text>
      </view>

      <view class="opponents-area">
        <view class="player top-player" :class="{active: gameData.turn === 2}">
          <image class="head" src="/static/logo.png"></image>
          <view class="badge" v-if="gameData.landlord===2">地主</view>
          <text class="count">{{cardCounts[2]}}</text>
          <view class="bubble" v-if="gameData.passStatus[2]">不出</view>
        </view>

        <view class="player bottom-player" :class="{active: gameData.turn === 1}">
          <image class="head" src="/static/logo.png"></image>
          <view class="badge" v-if="gameData.landlord===1">地主</view>
          <text class="count">{{cardCounts[1]}}</text>
          <view class="bubble" v-if="gameData.passStatus[1]">不出</view>
        </view>
      </view>

      <view class="desk-display">
        <view class="last-cards-row">
          <view v-for="(card, i) in lastPlayedCards" :key="i" class="card medium">
            <text :class="isRed(card)?'red':'black'">{{card.label}}{{card.suit}}</text>
          </view>
        </view>
      </view>
      
      <view v-if="touchState.isManualVoice" class="voice-overlay">
         <text class="mic-icon">🎤</text>
         <text class="mic-text">正在聆听...</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, onMounted, watch } from 'vue';

const props = defineProps({
  gameData: { type: Object, required: true },
  voiceState: { type: Object, required: true },
  isRed: { type: Function, required: true },
  getCardName: { type: Function, required: true },
  speak: { type: Function, required: true }
});

const emit = defineEmits(['play', 'pass', 'callLandlord', 'passLandlord', 'voiceStart', 'voiceEnd']);

// --- 数据计算 ---
const holeCards = computed(() => props.gameData.holeCards);
const handCards = computed(() => props.gameData.players[0].cards);
const cardCounts = computed(() => props.gameData.players.map(p => p.cards.length));
const lastPlayedCards = computed(() => props.gameData.lastPlayedCards);
const isMustPlay = computed(() => props.gameData.lastPlayer === -1 || props.gameData.lastPlayer === 0);
const isRecording = computed(() => props.voiceState.isRecording);
const isMyTurn = computed(() => (props.gameData.stage === 'calling' || props.gameData.stage === 'playing') && props.gameData.turn === 0);

const statusText = computed(() => {
  if (props.gameData.stage === 'calling') return '叫地主阶段：右滑叫，左滑不叫';
  if (props.gameData.turn === 0) return '出牌阶段：右滑出牌，左滑取消';
  return '对手回合';
});

const getActionName = (type) => {
    if (props.gameData.stage === 'calling') {
        return type === 'right' ? '抢地主' : '不抢';
    }
    return type === 'right' ? '确认出牌' : '重置/不出';
};

const touchState = reactive({
    startY: 0, startX: 0,
    startTime: 0,
    isTap: true,
    swipeActionType: null,
    axisLock: 'none', // 'none', 'horizontal', 'vertical'
    focusIndex: -1,
    lastProcessedIndex: -1,
    windowHeight: 0,
    windowWidth: 0,
    isManualVoice: false
});

onMounted(() => {
    const sys = uni.getSystemInfoSync();
    touchState.windowHeight = sys.windowHeight;
    touchState.windowWidth = sys.windowWidth;
});

// --- 核心触摸逻辑 ---

const handleGlobalTouchStart = (e) => {
    const touch = e.touches[0];
    touchState.startX = touch.clientX;
    touchState.startY = touch.clientY;
    touchState.startTime = Date.now();
    touchState.isTap = true;
    touchState.axisLock = 'none';
    touchState.swipeActionType = null;
    touchState.lastProcessedIndex = -1;
    touchState.isManualVoice = false;

    // 如果不在自己的回合，右侧大面积区域长按作为手动语音触发
    if (!isMyTurn.value) {
        const leftZone = touchState.windowWidth * 0.3;
        if (touch.clientX > leftZone) {
            touchState.isManualVoice = true;
            emit('voiceStart');
            uni.vibrateShort({ type: 'medium' });
        } else {
            updateFocusOnly(touch.clientY);
        }
    } else {
        // 自己回合，如果是抢地主阶段，触碰任何位置都准备判定滑动
        // 如果是出牌阶段，触碰左侧才读牌
        if (props.gameData.stage === 'playing' && touch.clientX < touchState.windowWidth * 0.4) {
             updateFocusOnly(touch.clientY);
        }
    }
};

const handleGlobalTouchMove = (e) => {
    const touch = e.touches[0];
    if (touchState.isManualVoice) return;

    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // 1. 确定意图阶段 (Axis Locking)
    if (touchState.axisLock === 'none') {
        if (absX > 15 || absY > 15) {
            touchState.isTap = false;
            
            // 【修复关键】：如果是抢地主阶段，极大优先判定为横向滑动
            const horizontalBias = props.gameData.stage === 'calling' ? 0.6 : 1.5;
            
            if (absX > absY * horizontalBias) {
                touchState.axisLock = 'horizontal';
            } else {
                touchState.axisLock = 'vertical';
            }
        }
        return;
    }

    // 2. 执行意图阶段
    if (touchState.axisLock === 'horizontal') {
        const THRESHOLD = 60; // 滑动判定阈值
        if (deltaX > THRESHOLD) {
            touchState.swipeActionType = 'right';
        } else if (deltaX < -THRESHOLD) {
            touchState.swipeActionType = 'left';
        } else {
            touchState.swipeActionType = null;
        }
        touchState.focusIndex = -1; // 横滑时取消手牌高亮
    } else if (touchState.axisLock === 'vertical') {
        // 只有出牌阶段或者非己方回合读牌时，才处理垂直选牌
        handleTouchRead(touch.clientY);
    }
};

const handleGlobalTouchEnd = (e) => {
    if (touchState.isManualVoice) {
        emit('voiceEnd');
        touchState.isManualVoice = false;
        return;
    }

    if (!isMyTurn.value) {
        resetTouch();
        return;
    }

    // 处理结果
    if (touchState.isTap) {
        // 点击逻辑：仅在出牌阶段有效
        if (props.gameData.stage === 'playing') {
            const touch = e.changedTouches[0];
            const idx = getCardIndexFromTouch(touch.clientY);
            toggleSelection(idx);
        }
    } else if (touchState.swipeActionType) {
        // 滑动逻辑：抢地主和出牌阶段通用
        triggerAction(touchState.swipeActionType);
    }

    resetTouch();
};

const resetTouch = () => {
    setTimeout(() => {
        touchState.focusIndex = -1;
        touchState.lastProcessedIndex = -1;
        touchState.swipeActionType = null;
        touchState.axisLock = 'none';
    }, 50);
};

// --- 功能辅助函数 ---

const getCardIndexFromTouch = (clientY) => {
    const count = handCards.value.length;
    if (count === 0) return -1;
    // 盲人模式建议将垂直空间均分给手牌数量
    const segmentHeight = touchState.windowHeight / count;
    let index = Math.floor(clientY / segmentHeight);
    return Math.max(0, Math.min(count - 1, index));
};

const updateFocusOnly = (clientY) => {
    touchState.focusIndex = getCardIndexFromTouch(clientY);
};

const handleTouchRead = (clientY) => {
    const idx = getCardIndexFromTouch(clientY);
    touchState.focusIndex = idx;
    if (idx !== -1 && idx !== touchState.lastProcessedIndex) {
        touchState.lastProcessedIndex = idx;
        const card = handCards.value[idx];
        if (card) {
            uni.vibrateShort({ type: 'light' });
            props.speak(props.getCardName(card));
        }
    }
};

const toggleSelection = (idx) => {
    if (idx === -1) return;
    const card = handCards.value[idx];
    if (card) {
        card.selected = !card.selected;
        uni.vibrateShort({ type: 'light' });
        props.speak((card.selected ? '选' : '退') + props.getCardName(card));
    }
};

const triggerAction = (type) => {
    uni.vibrateShort({ type: 'heavy' }); 
    if (props.gameData.stage === 'calling') {
        type === 'right' ? emit('callLandlord') : emit('passLandlord');
    } else {
        if (type === 'right') {
            const selectedCards = handCards.value.filter(c => c.selected);
            if (selectedCards.length > 0) emit('play', selectedCards);
            else props.speak("请先点选要出的牌");
        } else {
            const hasSelection = handCards.value.some(c => c.selected);
            if (hasSelection) {
                handCards.value.forEach(c => c.selected = false);
                props.speak("已重置选择");
            } else if (!isMustPlay.value) {
                emit('pass');
            } else {
                props.speak("本轮你必须出牌");
            }
        }
    }
};

// --- 布局样式算法 ---
const getCardStyle = (index) => {
    const count = handCards.value.length;
    const availableH = touchState.windowHeight - 40;
    let cardHeight = Math.min(120, availableH / count + 15);
    const step = count <= 1 ? 0 : (availableH - cardHeight) / (count - 1);
    const top = 20 + step * index;

    return {
        position: 'absolute',
        top: `${top}px`,
        left: '10rpx',
        width: '90%',
        height: `${cardHeight}px`,
        zIndex: index
    };
};
</script>

<style scoped>
.side-layout-container {
    width: 100vw; height: 100vh; background: #1a5e20;
    display: flex; flex-direction: row; color: white; overflow: hidden;
}

/* 左侧手牌区 */
.left-hand-panel {
    width: 25vw; height: 100vh;
    background: rgba(0,0,0,0.4); 
    border-right: 2rpx solid rgba(255,255,255,0.15);
    position: relative; z-index: 10;
}
.hand-vertical-container { width: 100%; height: 100%; position: relative; }

/* 垂直卡牌 */
.card.vertical {
    background: #fdfdfd; 
    border-radius: 8rpx;
    box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.5);
    transition: transform 0.1s;
    display: flex; justify-content: flex-start; padding: 6rpx;
    border-left: 8rpx solid #bdbdbd; 
}
.card.vertical.sel {
    background: #fff9c4; border-left-color: #fbc02d;
    transform: translateX(20rpx); z-index: 1000 !important;
}
.card.vertical.focus { background: #e0e0e0; }
.sel-dot {
    width: 16rpx; height: 16rpx; background: #f44336;
    border-radius: 50%; position: absolute; right: 10rpx; top: 50%; transform: translateY(-50%);
}

.card-corner { display: flex; flex-direction: column; align-items: center; width: 44rpx;}
.t-rank { font-size: 38rpx; font-weight: 900; line-height: 1; color: #333; }
.t-suit-small { font-size: 26rpx; margin-top: 4rpx; }
.red { color: #d32f2f; } .black { color: #212121; }

/* 右侧桌面 */
.right-table-panel { flex: 1; height: 100vh; display: flex; flex-direction: column; position: relative; }

.top-info { height: 15%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
.hole-cards { display: flex; gap: 8rpx; }
.card.small { width: 40rpx; height: 56rpx; background: white; border-radius: 4rpx; display: flex; justify-content: center; align-items: center; font-size: 20rpx; }
.back { width: 100%; height: 100%; background: #3f51b5; }
.status-text { font-size: 24rpx; opacity: 0.6; margin-top: 8rpx; }

.voice-status-bar {
    position: absolute; top: 10rpx; right: 10rpx;
    background: rgba(0,0,0,0.3); padding: 4rpx 12rpx; border-radius: 20rpx;
    font-size: 20rpx; opacity: 0.7; transition: all 0.3s;
    display: flex; align-items: center; gap: 4rpx;
}
.voice-status-bar.active { background: #4caf50; opacity: 1; }

.opponents-area { flex: 1; position: relative; }
.player { position: absolute; display: flex; flex-direction: column; align-items: center; opacity: 0.6; }
.player.active { opacity: 1; transform: scale(1.1); }
.top-player { right: 30rpx; top: 10%; }
.bottom-player { right: 30rpx; bottom: 10%; }
.head { width: 70rpx; height: 70rpx; border-radius: 50%; background: #ddd; }
.badge { position: absolute; top: 0; right: 0; background: #ff9800; font-size: 18rpx; padding: 2rpx 4rpx; }
.count { font-size: 22rpx; background: rgba(0,0,0,0.6); padding: 2rpx 10rpx; border-radius: 10rpx; margin-top: 4rpx; }
.bubble { position: absolute; left: -80rpx; top: 20rpx; background: rgba(0,0,0,0.8); font-size: 24rpx; padding: 6rpx 12rpx; border-radius: 8rpx;}

.desk-display { height: 25%; display: flex; justify-content: center; align-items: center; }
.card.medium { width: 80rpx; height: 110rpx; background: white; border-radius: 8rpx; display: flex; justify-content: center; align-items: center; font-size: 38rpx; font-weight: bold; margin-left: -30rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.3); }

/* 滑动动作反馈遮罩 */
.action-feedback {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.7); padding: 30rpx 50rpx; border-radius: 20rpx;
    display: flex; flex-direction: column; align-items: center; pointer-events: none; z-index: 1500;
}
.action-icon { font-size: 80rpx; margin-bottom: 10rpx; }
.action-text { font-size: 32rpx; font-weight: bold; }

/* 语音遮罩 */
.voice-overlay {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 2000;
}
.mic-icon { font-size: 80rpx; color: #4caf50; margin-bottom: 20rpx; }
.mic-text { font-size: 32rpx; font-weight: bold; }
</style>
