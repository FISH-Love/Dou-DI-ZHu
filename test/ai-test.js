// AI API测试脚本
import { getAIDecision } from '../src/services/aiService.js';

// 测试游戏状态
const testGameState = {
  currentPlayer: 1,
  isLandlord: false,
  handCards: [
    { value: 3, suit: '♠' },
    { value: 3, suit: '♥' },
    { value: 5, suit: '♣' },
    { value: 7, suit: '♦' },
    { value: 9, suit: '♠' },
    { value: 11, suit: '♥' },
    { value: 13, suit: '♣' }
  ],
  lastPlay: {
    type: 'S',
    value: 8,
    cards: [{ value: 8, suit: '♠' }]
  },
  lastPlayer: 0,
  cardCounts: [15, 7, 17],
  stage: 'playing',
  isFirst: false,
  possiblePlays: [
    { type: 'S', cards: [{ value: 9, suit: '♠' }] },
    { type: 'S', cards: [{ value: 11, suit: '♥' }] },
    { type: 'S', cards: [{ value: 13, suit: '♣' }] }
  ]
};

// 测试AI决策
async function testAIDecision() {
  console.log('开始测试AI决策...');
  
  try {
    const decision = await getAIDecision(testGameState);
    
    if (decision) {
      console.log('✅ AI决策成功:');
      console.log('动作:', decision.action);
      console.log('策略:', decision.strategy);
      console.log('信心度:', decision.confidence);
      console.log('出牌:', decision.cards);
    } else {
      console.log('❌ AI决策失败');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testAIDecision();