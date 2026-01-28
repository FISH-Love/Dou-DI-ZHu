// 游戏核心逻辑 Composable
// 提供游戏状态管理、流程控制、AI调用等核心功能
// 所有布局模式共享此逻辑

import { reactive, computed } from 'vue';
import { analyzeCards, canPlay, getAllPossiblePlays } from '@/utils/cardLogic.js';
import { getAIDecision } from '@/services/aiService.js';

export function useGameCore() {
  // 游戏状态
  const gameData = reactive({
    stage: 'ready', // ready | calling | playing
    turn: -1, // 当前回合玩家 (0=玩家, 1=AI1, 2=AI2)
    landlord: -1, // 地主 (-1=未定, 0=玩家, 1=AI1, 2=AI2)
    holeCards: [], // 底牌
    lastPlayedCards: [], // 上家出的牌
    lastType: null, // 上家牌型
    lastPlayer: -1, // 上家玩家索引
    passStatus: [false, false, false], // 各玩家是否过牌
    callingRound: 0, // 叫地主轮次
    hasCalled: [false, false, false], // 是否已叫过地主
    winner: -1, // 获胜者
    players: [
      { id: 0, cards: [] }, // 玩家
      { id: 1, cards: [] }, // AI1
      { id: 2, cards: [] }  // AI2
    ]
  });

  // 计算属性
  const statusText = computed(() => {
    if (gameData.stage === 'calling') return '抢地主中';
    if (gameData.turn === 0) return '你的回合';
    return '电脑思考';
  });

  const isMustPlay = computed(() => {
    return gameData.lastPlayer === -1 || gameData.lastPlayer === 0;
  });

  // 工具函数
  const isRed = (card) => card.suit === '♥' || card.suit === '♦';

  const getCardName = (card) => {
    if (card.value === 17) return "大王";
    if (card.value === 16) return "小王";
    if (card.value === 15) return "2";
    if (card.value === 14) return "A";
    if (card.value === 13) return "K";
    if (card.value === 12) return "Q";
    if (card.value === 11) return "J";
    if (card.value === 10) return "10";
    return card.value.toString();
  };

  // 开始游戏
  const startGame = () => {
    const deck = [];
    const suits = ['♠', '♥', '♣', '♦'];
    const ranks = [
      {l:'3',v:3},{l:'4',v:4},{l:'5',v:5},{l:'6',v:6},{l:'7',v:7},
      {l:'8',v:8},{l:'9',v:9},{l:'10',v:10},{l:'J',v:11},{l:'Q',v:12},
      {l:'K',v:13},{l:'A',v:14},{l:'2',v:15}
    ];
    
    suits.forEach(s => ranks.forEach(r => 
      deck.push({suit:s, label:r.l, value:r.v, selected:false})
    ));
    deck.push(
      {suit:'', label:'小王', value:16, selected:false},
      {suit:'', label:'大王', value:17, selected:false}
    );
    deck.sort(() => Math.random() - 0.5);

    gameData.players.forEach((p, i) => {
      p.cards = deck.slice(i*17+3, (i+1)*17+3).sort((a,b)=>b.value-a.value);
    });
    gameData.holeCards = deck.slice(0, 3);
    gameData.stage = 'calling';
    gameData.turn = 0;
    gameData.callingRound = 0;
    gameData.hasCalled = [false, false, false];
    gameData.winner = -1;
    gameData.lastPlayedCards = [];
    gameData.lastType = null;
    gameData.lastPlayer = -1;
    gameData.passStatus = [false, false, false];
    
    return { success: true, message: '请叫地主' };
  };

  // 叫地主
  const callLandlord = (playerIndex, speakCallback) => {
    gameData.landlord = playerIndex;
    gameData.players[playerIndex].cards.push(...gameData.holeCards);
    gameData.players[playerIndex].cards.sort((a,b)=>b.value-a.value);
    gameData.stage = 'playing';
    gameData.turn = playerIndex;
    gameData.hasCalled = [false, false, false];
    gameData.callingRound = 0;
    
    const message = playerIndex === 0 ? "你是地主" : "电脑是地主";
    if (speakCallback) speakCallback(message);
    
    return { success: true, playerIndex, message };
  };

  // 不叫地主
  const passLandlord = () => {
    gameData.hasCalled[gameData.turn] = true;
    
    // 所有人都决策过，默认1号玩家为地主
    if (gameData.hasCalled.every(called => called)) {
      return { action: 'forceLandlord', playerIndex: 1 };
    }
    
    // 轮到下一个玩家
    gameData.turn = (gameData.turn + 1) % 3;
    return { action: 'nextTurn', turn: gameData.turn };
  };

  // 执行出牌
  const executePlay = (playerIndex, cards, playType) => {
    const player = gameData.players[playerIndex];
    player.cards = player.cards.filter(c => !cards.includes(c));
    
    gameData.lastPlayedCards = cards;
    gameData.lastType = playType;
    gameData.lastPlayer = playerIndex;
    gameData.passStatus = [false, false, false];
    
    // 检查是否获胜
    if (player.cards.length === 0) {
      gameData.winner = playerIndex;
      return { success: true, winner: playerIndex };
    }
    
    // 下一个玩家
    gameData.turn = (gameData.turn + 1) % 3;
    return { success: true, nextTurn: gameData.turn };
  };

  // 玩家出牌
  const playerPlay = (selectedCards, speakCallback) => {
    if (selectedCards.length === 0) {
      return { success: false, message: '请选牌' };
    }
    
    const playType = analyzeCards(selectedCards);
    if (!playType) {
      if (speakCallback) speakCallback("无效牌型");
      return { success: false, message: '无效牌型' };
    }
    
    const lastType = gameData.lastType ? analyzeCards(gameData.lastPlayedCards) : null;
    const isFirst = !gameData.lastType || gameData.lastPlayer === 0;
    
    if (!canPlay(playType, lastType, isFirst)) {
      if (speakCallback) speakCallback("牌太小或者不合规则");
      return { success: false, message: '牌太小或者不合规则' };
    }
    
    return executePlay(0, selectedCards, playType);
  };

  // 玩家过牌
  const playerPass = (speakCallback) => {
    gameData.passStatus[0] = true;
    if (speakCallback) speakCallback("过");
    
    const result = nextTurn();
    return { success: true, ...result };
  };

  // 下一回合
  const nextTurn = () => {
    if (gameData.players.some(p => p.cards.length === 0)) {
      return { gameOver: true };
    }
    
    gameData.turn = (gameData.turn + 1) % 3;
    
    // 检查是否所有人都pass了
    const activePlayers = [0, 1, 2].filter(i => i !== gameData.lastPlayer);
    const allPassed = activePlayers.every(i => gameData.passStatus[i]);
    
    if (allPassed || gameData.turn === gameData.lastPlayer) {
      gameData.lastPlayedCards = [];
      gameData.lastType = null;
      gameData.passStatus = [false, false, false];
      return { clearTable: true, turn: gameData.turn };
    }
    
    return { turn: gameData.turn };
  };

  // 格式化游戏状态供AI使用
  const formatGameStateForAI = (playerIndex) => {
    const player = gameData.players[playerIndex];
    const lastType = gameData.lastType ? analyzeCards(gameData.lastPlayedCards) : null;
    const isFirst = !gameData.lastType || gameData.lastPlayer === playerIndex;
    
    return {
      currentPlayer: playerIndex + 1,
      isLandlord: gameData.landlord === playerIndex,
      handCards: [...player.cards],
      lastPlay: lastType,
      lastPlayer: gameData.lastPlayer,
      cardCounts: gameData.players.map(p => p.cards.length),
      stage: gameData.stage,
      isFirst: isFirst,
      possiblePlays: getAllPossiblePlays(player.cards, lastType, isFirst)
    };
  };

  // AI出牌逻辑
  const aiPlay = async (playerIndex, speakCallback) => {
    const player = gameData.players[playerIndex];
    
    // 叫地主阶段
    if (gameData.stage === 'calling') {
      try {
        const gameState = formatGameStateForAI(playerIndex);
        const aiDecision = await getAIDecision(gameState, playerIndex);
        
        if (aiDecision && aiDecision.action === 'call') {
          const result = callLandlord(playerIndex, speakCallback);
          if (speakCallback) speakCallback(`玩家${playerIndex + 1}叫地主 (${aiDecision.strategy})`);
          return { ...result, aiCalled: true };
        } else {
          gameData.hasCalled[playerIndex] = true;
          
          if (gameData.hasCalled.every(called => called)) {
            const result = callLandlord(1, speakCallback);
            return { ...result, forced: true };
          }
          
          gameData.turn = (gameData.turn + 1) % 3;
          if (speakCallback) speakCallback(`玩家${playerIndex + 1}不叫地主`);
          return { action: 'pass_call', turn: gameData.turn };
        }
      } catch (error) {
        console.error('AI叫地主决策失败:', error);
        const result = passLandlord();
        if (speakCallback) speakCallback(`玩家${playerIndex + 1}不叫地主`);
        return result;
      }
    }
    
    // 出牌阶段
    const lastType = gameData.lastType ? analyzeCards(gameData.lastPlayedCards) : null;
    const isFirst = !gameData.lastType || gameData.lastPlayer === playerIndex;
    const possiblePlays = getAllPossiblePlays(player.cards, lastType, isFirst);
    
    // 尝试AI决策
    try {
      const gameState = formatGameStateForAI(playerIndex);
      const aiDecision = await getAIDecision(gameState, playerIndex);
      
      if (aiDecision) {
        if (aiDecision.action === 'pass') {
          gameData.passStatus[playerIndex] = true;
          if (speakCallback) speakCallback(`玩家${playerIndex + 1}跳过 (${aiDecision.strategy})`);
          
          const result = nextTurn();
          if (result.clearTable && speakCallback) {
            speakCallback('清场，请出牌');
          }
          return { action: 'pass', ...result };
        } else if (aiDecision.action === 'play' && aiDecision.cards.length > 0) {
          const aiPlayType = analyzeCards(aiDecision.cards);
          const isValidPlay = possiblePlays.some(play => 
            play.type === aiPlayType.type && 
            play.value === aiPlayType.value &&
            play.cards.length === aiPlayType.cards.length
          );
          
          if (isValidPlay) {
            const selectedCards = aiDecision.cards.map(aiCard => 
              player.cards.find(card => card.value === aiCard.value && card.suit === aiCard.suit)
            ).filter(card => card);
            
            if (selectedCards.length === aiDecision.cards.length) {
              const playType = analyzeCards(selectedCards);
              if (playType && canPlay(playType, lastType, isFirst)) {
                const result = executePlay(playerIndex, selectedCards, playType);
                const cardNames = selectedCards.map(card => getCardName(card)).join(' ');
                if (speakCallback) speakCallback(`玩家${playerIndex + 1}出${cardNames} (${aiDecision.strategy})`);
                return { action: 'play', cards: selectedCards, ...result };
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('AI决策失败，使用备用策略:', error);
    }
    
    // 备用策略
    if (possiblePlays.length === 0) {
      gameData.passStatus[playerIndex] = true;
      if (speakCallback) speakCallback(`玩家${playerIndex + 1}跳过`);
      
      const result = nextTurn();
      if (result.clearTable && speakCallback) {
        speakCallback('清场，请出牌');
      }
      return { action: 'pass', ...result };
    }
    
    const selectedPlay = possiblePlays[0];
    const result = executePlay(playerIndex, selectedPlay.cards, selectedPlay);
    const cardNames = selectedPlay.cards.map(card => getCardName(card)).join(' ');
    if (speakCallback) speakCallback(`玩家${playerIndex + 1}出${cardNames}`);
    return { action: 'play', cards: selectedPlay.cards, ...result };
  };

  return {
    gameData,
    statusText,
    isMustPlay,
    isRed,
    getCardName,
    startGame,
    callLandlord,
    passLandlord,
    playerPlay,
    playerPass,
    aiPlay,
    formatGameStateForAI
  };
}
