// AI玩家配置
export const AI_PLAYERS = {
  1: {
    name: 'AI玩家1',
    personality: 'aggressive', // 激进型
    description: '喜欢叫地主，主动出牌，善于压制对手',
    systemPrompt: '你是激进型AI玩家，倾向于叫地主和主动出牌。优先选择压制性强的牌型。'
  },
  2: {
    name: 'AI玩家2', 
    personality: 'conservative', // 保守型
    description: '谨慎叫地主，善于配合队友，保存实力',
    systemPrompt: '你是保守型AI玩家，谨慎叫地主，善于配合队友。优先选择最小能压制的牌型。'
  }
};

// 获取AI玩家配置
export function getAIPlayerConfig(playerIndex) {
  return AI_PLAYERS[playerIndex] || AI_PLAYERS[1];
}