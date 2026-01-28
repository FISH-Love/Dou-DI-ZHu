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
            'focus': touchState.focusIndex === i // 新增：手指滑过的高亮态
          }"
          :style="getCardStyle(i)"
        >
          <view class="card-corner">
            <text class="t-rank" :class="isRed(card)?'red':'black'">{{card.label}}</text>
            <text class="t-suit-small" :class="isRed(card)?'red':'black'">{{card.suit}}</text>
          </view>
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
            <text v-if="isMyTurn && voiceState.isListening">👂 正在听...</text>
            <text v-else-if="touchState.isManualVoice">🎤 松手发送</text>
            <text v-else-if="!isMyTurn">按住屏幕说话</text>
        </view>
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
         <text class="mic-text">正在聆听指令...</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, onMounted, watch } from 'vue';
import { analyzeCards, canPlay } from '@/utils/cardLogic.js';

const props = defineProps({
  gameData: { type: Object, required: true },
  voiceState: { type: Object, required: true },
  isRed: { type: Function, required: true },
  getCardName: { type: Function, required: true },
  speak: { type: Function, required: true }
});

const emit = defineEmits(['play', 'pass', 'callLandlord', 'passLandlord', 'voiceStart', 'voiceEnd']);

// --- 基础计算 ---
const holeCards = computed(() => props.gameData.holeCards);
const handCards = computed(() => props.gameData.players[0].cards);
const cardCounts = computed(() => props.gameData.players.map(p => p.cards.length));
const lastPlayedCards = computed(() => props.gameData.lastPlayedCards);
const isMustPlay = computed(() => props.gameData.lastPlayer === -1 || props.gameData.lastPlayer === 0);
const isRecording = computed(() => props.voiceState.isRecording);
const isMyTurn = computed(() => (props.gameData.stage === 'calling' || props.gameData.stage === 'playing') && props.gameData.turn === 0);

const statusText = computed(() => {
  if (props.gameData.stage === 'calling') return '抢地主阶段';
  if (props.gameData.turn === 0) return '您的回合 (自动听)';
  return '对手回合 (按住说)';
});

// --- 触摸状态 (含防误触逻辑) ---
const touchState = reactive({
    startY: 0,
    startX: 0,
    startTime: 0,
    
    // 轴向锁定状态: 'none' | 'vertical'(选牌) | 'horizontal'(动作)
    axisLock: 'none', 
    
    focusIndex: -1, // 当前手指按住的那张牌(高亮但不一定选中)
    lastFeedbackIndex: -1, // 上一次语音播报的索引(防抖)
    
    windowHeight: 0,
    windowWidth: 0,
    isManualVoice: false
});

onMounted(() => {
    const sys = uni.getSystemInfoSync();
    touchState.windowHeight = sys.windowHeight;
    touchState.windowWidth = sys.windowWidth;
});

// --- 监听回合变化，控制语音策略 ---
watch(() => isMyTurn.value, (newVal) => {
    if (newVal) {
        // 轮到我：开启自动录音
        if (!props.voiceState.isListening) {
            emit('voiceStart'); 
        }
    } else {
        // 没轮到我：关闭自动录音
        emit('voiceEnd'); 
    }
}, { immediate: true });


// --- 核心逻辑1：动态布局计算 ---
const getCardStyle = (index) => {
    const count = handCards.value.length;
    // 动态调整卡牌高度：牌少时高一点，牌多时矮一点
    let cardHeightPx = 80; 
    if (count < 10) cardHeightPx = 100;
    if (count > 15) cardHeightPx = 60;
    
    const totalH = touchState.windowHeight;
    const paddingY = 40; 
    
    if (count <= 1) return { top: '40%', position: 'absolute', left: '10px' };

    const availableH = totalH - paddingY;
    const step = (availableH - cardHeightPx) / (count - 1);
    const top = (paddingY / 2) + step * index;

    return {
        position: 'absolute',
        top: `${top}px`,
        left: '10rpx',
        height: `${cardHeightPx}px`, // 动态高度
        zIndex: index
    };
};

// --- 核心逻辑2：Y轴映射索引 ---
const getCardIndexFromTouch = (clientY) => {
    const count = handCards.value.length;
    if (count === 0) return -1;
    const segmentHeight = touchState.windowHeight / count;
    let index = Math.floor(clientY / segmentHeight);
    if (index < 0) index = 0;
    if (index >= count) index = count - 1;
    return index;
};

// --- 触摸事件处理 (优化版) ---

const handleGlobalTouchStart = (e) => {
    const touch = e.touches[0];
    touchState.startX = touch.clientX;
    touchState.startY = touch.clientY;
    touchState.axisLock = 'none'; // 重置锁定
    touchState.focusIndex = -1;
    touchState.isManualVoice = false;

    // 1. 自己的回合：全屏皆可操作 (除了手动录音)
    if (isMyTurn.value) {
        // 初始点击也触发一次选牌定位
        updateFocusIndex(touch.clientY);
        return;
    }

    // 2. 别人的回合：分区操作
    const leftZone = touchState.windowWidth * 0.25;
    if (touch.clientX < leftZone) {
        // 左侧：仅读牌
        updateFocusIndex(touch.clientY);
    } else {
        // 右侧：按住说话
        touchState.isManualVoice = true;
        emit('voiceStart');
        uni.vibrateShort({ type: 'medium' });
    }
};

const handleGlobalTouchMove = (e) => {
    const touch = e.touches[0];
    
    // A. 如果是手动录音模式，不处理任何游戏逻辑
    if (touchState.isManualVoice) return;

    // B. 别人的回合：仅处理左侧读牌，无动作
    if (!isMyTurn.value) {
        if (touch.clientX < (touchState.windowWidth * 0.25)) {
            updateFocusIndex(touch.clientY);
            playCardFeedback(); // 仅播报，不选
        }
        return;
    }

    // C. 自己的回合：核心防误触逻辑
    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;

    // --- 轴向锁定算法 ---
    if (touchState.axisLock === 'none') {
        // 只有移动超过一定距离才开始判断方向
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            // 如果 Y轴移动 大于 X轴移动的一半 -> 认为是选牌 (垂直操作权重更高，因为手牌是垂直的)
            if (Math.abs(deltaY) > Math.abs(deltaX) * 0.8) {
                touchState.axisLock = 'vertical';
            } else {
                touchState.axisLock = 'horizontal';
            }
        }
    }

    // --- 根据锁定状态执行逻辑 ---
    
    // 1. 垂直锁定：专心选牌/读牌
    if (touchState.axisLock === 'vertical') {
        updateFocusIndex(touch.clientY);
        playCardFeedback();
    } 
    // 2. 水平锁定：专心处理出牌动作
    else if (touchState.axisLock === 'horizontal') {
        // 触发阈值
        const ACTION_THRESHOLD = 80;
        
        // 向右滑 -> 出牌 (Positive)
        if (deltaX > ACTION_THRESHOLD) {
            triggerAction('play');
            // 重置一下避免重复触发，或者等待touchend
            touchState.axisLock = 'triggered'; 
        }
        // 向左滑 -> 取消/不出 (Negative)
        else if (deltaX < -ACTION_THRESHOLD) {
            triggerAction('pass');
            touchState.axisLock = 'triggered';
        }
    }
};

const handleGlobalTouchEnd = (e) => {
    // 结束手动录音
    if (touchState.isManualVoice) {
        emit('voiceEnd');
        touchState.isManualVoice = false;
        return;
    }

    // 结束选牌：确认选择
    if (isMyTurn.value && touchState.axisLock === 'vertical' && touchState.focusIndex !== -1) {
        toggleSelection(touchState.focusIndex);
    }
    
    // 如果是轻触(没有明显移动)，视为点击选牌
    if (isMyTurn.value && touchState.axisLock === 'none') {
        // 需要重新计算一下最后的落点索引
        const touch = e.changedTouches[0];
        const idx = getCardIndexFromTouch(touch.clientY);
        toggleSelection(idx);
    }

    touchState.focusIndex = -1;
    touchState.lastFeedbackIndex = -1;
    touchState.axisLock = 'none';
};

// --- 辅助逻辑 ---

const updateFocusIndex = (y) => {
    const idx = getCardIndexFromTouch(y);
    touchState.focusIndex = idx;
};

// 语音播报防抖 (手指在同一张牌上滑动时不重复播报)
const playCardFeedback = () => {
    const idx = touchState.focusIndex;
    if (idx !== -1 && idx !== touchState.lastFeedbackIndex) {
        touchState.lastFeedbackIndex = idx;
        const card = handCards.value[idx];
        if (card) {
            uni.vibrateShort({ type: 'light' });
            props.speak(props.getCardName(card));
        }
    }
};

// 切换选中状态
const toggleSelection = (idx) => {
    if (idx < 0 || idx >= handCards.value.length) return;
    const card = handCards.value[idx];
    card.selected = !card.selected;
    
    const prefix = card.selected ? '选 ' : '退 ';
    props.speak(prefix + props.getCardName(card));
    
    // 简单的出牌提示
    checkPlayable();
};

const triggerAction = (type) => {
    uni.vibrateShort({ type: 'heavy' });
    if (type === 'play') {
        const hasSelection = handCards.value.some(c => c.selected);
        if (hasSelection) {
            emit('play', handCards.value.filter(c => c.selected));
        } else {
            // 如果向右滑但没选牌，且是叫地主阶段 -> 抢地主
            if (props.gameData.stage === 'calling') emit('callLandlord');
            else props.speak("请先选牌");
        }
    } else if (type === 'pass') {
        const hasSelection = handCards.value.some(c => c.selected);
        if (hasSelection) {
            handCards.value.forEach(c => c.selected = false);
            props.speak("已取消");
        } else {
            // 如果没选牌且向左滑 -> 不出/不抢
             if (props.gameData.stage === 'calling') emit('passLandlord');
             else {
                 if (!isMustPlay.value) emit('pass');
                 else props.speak("必须出牌");
             }
        }
    }
};

const checkPlayable = () => {
    const sel = handCards.value.filter(c => c.selected);
    if (sel.length === 0) return;
    const playType = analyzeCards(sel);
    // 这里可以加逻辑：如果选中了合法的牌，发出轻微提示音
};
</script>

<style scoped>
.side-layout-container {
    width: 100vw; height: 100vh; background: #1a5e20;
    display: flex; flex-direction: row; color: white; overflow: hidden;
}

/* 左侧手牌区 */
.left-hand-panel {
    width: 20vw; height: 100vh;
    background: rgba(0,0,0,0.4); 
    border-right: 2rpx solid rgba(255,255,255,0.15);
    position: relative; z-index: 10;
}
.hand-vertical-container { width: 100%; height: 100%; position: relative; }

/* 垂直卡牌 */
.card.vertical {
    width: 95%; height: 80px; /* 高度会被JS覆盖 */
    background: #fdfdfd; border-radius: 8rpx;
    box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.5);
    transition: transform 0.1s, background-color 0.1s;
    display: flex; justify-content: flex-start; padding: 6rpx;
    border-left: 6rpx solid #ccc; /* 增加左侧粗边框方便触摸识别 */
}
/* 选中状态 */
.card.vertical.sel {
    background: #fff9c4; border-left-color: #fbc02d;
    transform: translateX(20rpx); /* 向右凸起 */
    z-index: 1000 !important;
}
/* 触摸高亮态 (Focus) */
.card.vertical.focus {
    background: #e0e0e0;
}

.card-corner { display: flex; flex-direction: column; align-items: center; width: 40rpx;}
.t-rank { font-size: 36rpx; font-weight: 900; line-height: 1; color: #333; }
.t-suit-small { font-size: 24rpx; margin-top: 4rpx; }
.red { color: #d32f2f; } .black { color: #212121; }

/* 右侧桌面 */
.right-table-panel { width: 80vw; height: 100vh; display: flex; flex-direction: column; position: relative; }

.top-info { height: 15%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
.hole-cards { display: flex; gap: 8rpx; }
.card.small { width: 40rpx; height: 56rpx; background: white; border-radius: 4rpx; display: flex; justify-content: center; align-items: center; font-size: 20rpx; }
.back { width: 100%; height: 100%; background: #3f51b5; }
.status-text { font-size: 24rpx; opacity: 0.6; margin-top: 8rpx; }

/* 语音状态条 */
.voice-status-bar {
    position: absolute; top: 10rpx; right: 10rpx;
    background: rgba(0,0,0,0.3); padding: 4rpx 12rpx; border-radius: 20rpx;
    font-size: 20rpx; opacity: 0.7; transition: all 0.3s;
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

.desk-display { height: 25%; display: flex; justify-content: center; align-items: center; }
.card.medium { width: 80rpx; height: 110rpx; background: white; border-radius: 8rpx; display: flex; justify-content: center; align-items: center; font-size: 38rpx; font-weight: bold; margin-left: -30rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.3); }

/* 全屏语音遮罩 */
.voice-overlay {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 2000;
}
.mic-icon { font-size: 80rpx; color: #4caf50; margin-bottom: 20rpx; }
.mic-text { font-size: 32rpx; font-weight: bold; }
</style>
