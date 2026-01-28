<template>
  <view class="normal-container">
    <view class="status-bar"></view>
    
    <!-- 上半区域：触摸录音层 -->
    <view class="voice-touch-area" @touchstart="onVoiceStart" @touchend="onVoiceEnd">
      <!-- 顶部底牌 -->
      <view class="top-section">
        <view class="hole-cards">
          <view v-for="(card, i) in holeCards" :key="i" class="card small">
            <view class="inner" v-if="stage !== 'calling'">
              <text :class="isRed(card)?'red':'black'">{{card.label}}{{card.suit}}</text>
            </view>
            <view class="back" v-else></view>
          </view>
        </view>
        <text class="game-status">{{ statusText }}</text>
      </view>

      <!-- 牌桌 -->
      <view class="table-area">
        <!-- 电脑A -->
        <view class="player left" :class="{active: turn === 2}">
          <view class="badge" v-if="landlord===2">地主</view>
          <image class="head" src="/static/logo.png"></image>
          <text class="count">牌: {{cardCounts[2]}}</text>
          <view class="bubble" v-if="passStatus[2]">不出</view>
        </view>

        <!-- 电脑B -->
        <view class="player right" :class="{active: turn === 1}">
          <view class="badge" v-if="landlord===1">地主</view>
          <image class="head" src="/static/logo.png"></image>
          <text class="count">牌: {{cardCounts[1]}}</text>
          <view class="bubble" v-if="passStatus[1]">不出</view>
        </view>

        <!-- 出牌展示 -->
        <view class="desk">
          <view class="row">
            <view v-for="(card, i) in lastPlayedCards" :key="i" class="card medium">
              <text :class="isRed(card)?'red':'black'">{{card.label}}{{card.suit}}</text>
            </view>
          </view>
        </view>
        
        <!-- 录音状态遮罩 -->
        <view class="recording-overlay" v-if="isRecording">
          <view class="mic-icon">🎤</view>
          <text>正在听指令...</text>
        </view>
      </view>
    </view>

    <!-- 底部 -->
    <view class="bottom-section">
      <!-- 操作按钮 -->
      <view class="btns">
        <block v-if="stage==='calling' && turn===0">
          <button class="btn gold" @click="onCallLandlord">抢地主</button>
          <button class="btn" @click="onPassLandlord">不抢</button>
        </block>

        <block v-if="stage==='playing' && turn===0">
          <button class="btn red-btn" @click="onPassClick" :disabled="isMustPlay">不出</button>
          <button class="btn green-btn" @click="onPlayClick">出牌</button>
        </block>
      </view>

      <!-- 玩家手牌 -->
      <view class="hand">
        <view 
          v-for="(card, i) in handCards" 
          :key="i" 
          class="card large"
          :class="{sel: card.selected}"
          :style="{zIndex: i, marginLeft: i===0?'0':'-70rpx'}"
          @click="toggleCard(i)"
        >
          <view class="content">
            <text class="t-rank" :class="isRed(card)?'red':'black'">{{card.label}}</text>
            <text class="t-suit" :class="isRed(card)?'red':'black'">{{card.suit}}</text>
          </view>
        </view>
      </view>
      <view class="safe-area"></view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  gameData: { type: Object, required: true },
  voiceState: { type: Object, required: true },
  isRed: { type: Function, required: true }
});

const emit = defineEmits([
  'play',
  'pass',
  'callLandlord',
  'passLandlord',
  'voiceStart',
  'voiceEnd'
]);

// 计算属性
const holeCards = computed(() => props.gameData.holeCards);
const stage = computed(() => props.gameData.stage);
const turn = computed(() => props.gameData.turn);
const landlord = computed(() => props.gameData.landlord);
const passStatus = computed(() => props.gameData.passStatus);
const lastPlayedCards = computed(() => props.gameData.lastPlayedCards);
const handCards = computed(() => props.gameData.players[0].cards);
const cardCounts = computed(() => props.gameData.players.map(p => p.cards.length));
const isRecording = computed(() => props.voiceState.isRecording);

const statusText = computed(() => {
  if (props.gameData.stage === 'calling') return '抢地主中';
  if (props.gameData.turn === 0) return '你的回合';
  return '电脑思考';
});

const isMustPlay = computed(() => {
  return props.gameData.lastPlayer === -1 || props.gameData.lastPlayer === 0;
});

// 事件处理
const toggleCard = (index) => {
  if (props.gameData.turn === 0) {
    props.gameData.players[0].cards[index].selected = !props.gameData.players[0].cards[index].selected;
  }
};

const onPlayClick = () => {
  const selected = handCards.value.filter(c => c.selected);
  emit('play', selected);
};

const onPassClick = () => {
  emit('pass');
};

const onCallLandlord = () => {
  emit('callLandlord');
};

const onPassLandlord = () => {
  emit('passLandlord');
};

const onVoiceStart = () => {
  emit('voiceStart');
};

const onVoiceEnd = () => {
  emit('voiceEnd');
};
</script>

<style scoped>
.normal-container { 
  width: 100vw; 
  height: 100vh; 
  background: #1a5e20; 
  display: flex; 
  flex-direction: column; 
  color: white; 
}

.status-bar { height: 80rpx; }

.voice-touch-area { 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  position: relative; 
}

.top-section { 
  height: 150rpx; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
}

.hole-cards { 
  display: flex; 
  gap: 10rpx; 
  background: rgba(0,0,0,0.2); 
  padding: 10rpx; 
  border-radius: 10rpx; 
}

.table-area { flex: 1; position: relative; }

.player { 
  position: absolute; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
}

.player.left { left: 20rpx; top: 50rpx; }
.player.right { right: 20rpx; top: 50rpx; }
.player.active .head { 
  border: 4rpx solid #ffeb3b; 
  box-shadow: 0 0 20rpx #ffeb3b; 
}

.head { 
  width: 100rpx; 
  height: 100rpx; 
  border-radius: 50%; 
  border: 4rpx solid white; 
  background: white; 
}

.badge { 
  background: #f57f17; 
  font-size: 20rpx; 
  padding: 2rpx 10rpx; 
  border-radius: 4rpx; 
}

.desk { 
  position: absolute; 
  left: 50%; 
  top: 40%; 
  transform: translate(-50%,-50%); 
}

.row { 
  display: flex; 
  justify-content: center; 
  width: 300rpx; 
}

.bottom-section { padding-bottom: 40rpx; }

.btns { 
  display: flex; 
  justify-content: center; 
  gap: 20rpx; 
  margin-bottom: 20rpx; 
}

.btn { 
  height: 70rpx; 
  line-height: 70rpx; 
  padding: 0 30rpx; 
  border-radius: 35rpx; 
  font-size: 26rpx; 
  background: white; 
  color: #333; 
}

.gold { background: #ffeb3b; }
.red-btn { background: #f44336; color: white; }
.green-btn { background: #4caf50; color: white; }

.card { 
  background: white; 
  border-radius: 8rpx; 
  box-shadow: 0 2rpx 5rpx rgba(0,0,0,0.3); 
  position: relative; 
}

.card.small { 
  width: 50rpx; 
  height: 70rpx; 
  font-size: 20rpx; 
  display: flex; 
  align-items: center; 
  justify-content: center;
}

.card.medium { 
  width: 80rpx; 
  height: 110rpx; 
  margin-left: -30rpx; 
  color: #333; 
  display: flex; 
  align-items: center; 
  justify-content: center;
}

.card.large { 
  width: 120rpx; 
  height: 170rpx; 
  border: 1rpx solid #999; 
}

.card.sel { transform: translateY(-30rpx); }

.content { padding: 10rpx; color: #333; }

.t-rank { 
  font-size: 32rpx; 
  font-weight: bold; 
  display: block; 
}

.red { color: #d32f2f; }
.black { color: #212121; }

.back { 
  width: 100%; 
  height: 100%; 
  background: #0d47a1; 
  border-radius: 8rpx; 
}

.hand { 
  display: flex; 
  justify-content: center; 
  align-items: flex-end; 
  height: 200rpx; 
  padding: 0 40rpx; 
}

.recording-overlay {
  position: absolute;
  left: 50%; 
  top: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.7);
  padding: 30rpx 50rpx;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #fff;
  z-index: 100;
}

.mic-icon { font-size: 60rpx; margin-bottom: 10rpx; }
</style>
