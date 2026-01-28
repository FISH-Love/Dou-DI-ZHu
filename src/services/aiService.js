// AI服务模块 - 集成双AI进行智能决策
import { AI_CONFIG, getAIPlayerConfig, loadAIConfig, initAIConfig } from '@/config/aiConfig.js';

// 初始化时加载和保存配置
loadAIConfig();
initAIConfig();

/**
 * 调用指定AI获取出牌决策
 * @param {Object} gameState - 游戏状态
 * @param {number} playerIndex - 玩家索引 (1或2)
 * @returns {Promise<Object>} - AI决策结果
 */
export async function getAIDecision(gameState, playerIndex = 1) {
  try {
    const aiConfig = getAIPlayerConfig(playerIndex);
    const aiName = playerIndex === 1 ? 'Qwen3Plus' : 'DeepSeek';
    console.log(`aiService.js - ${aiName}(${aiConfig.PERSONALITY})决策开始:`, gameState);
    
    const prompt = formatGameStateForAI(gameState, playerIndex);
    console.log('aiService.js - 生成的游戏状态信息长度:', prompt.length);
    
    const response = await callAIAPI(prompt, playerIndex);
    console.log('aiService.js - API响应:', response);
    
    const decision = parseAIResponse(response);
    console.log(`aiService.js - ${aiName}解析后的决策:`, decision);
    
    return decision;
  } catch (error) {
    console.error(`AI玩家${playerIndex}决策失败:`, error);
    return null;
  }
}

/**
 * 格式化游戏状态为AI提示词
 * @param {Object} gameState - 游戏状态
 * @param {number} playerIndex - 玩家索引
 * @returns {string} - 格式化的游戏状态信息
 */
function formatGameStateForAI(gameState, playerIndex) {
  const { currentPlayer, isLandlord, handCards, lastPlay, lastPlayer, cardCounts, stage, isFirst, possiblePlays } = gameState;
  
  // 简化的游戏状态信息（详细提示词已在阿里云百炼平台应用中配置）
  const gameStateInfo = `玩家${currentPlayer + 1}号，${isLandlord ? '地主' : '农民'}，手牌${handCards.length}张：${formatCards(handCards)}
阶段：${stage === 'calling' ? '叫地主' : '出牌'}，${isFirst ? '首出' : '跟牌'}
${lastPlay ? `上家${lastPlayer + 1}号出：${formatLastPlay(lastPlay)}` : '首出'}
各人牌数：${cardCounts.map((count, i) => `${i + 1}号${count}张`).join(', ')}
${possiblePlays && possiblePlays.length > 0 ? `可选牌型：${possiblePlays.map((play, index) => `${index + 1}.${formatCards(play.cards)}(${play.type})`).join(', ')}` : ''}`;

  return gameStateInfo;
}

/**
 * 调用指定AI的API
 * @param {string} prompt - 提示词
 * @param {number} playerIndex - 玩家索引 (1或2)
 * @returns {Promise<string>} - API响应
 */
async function callAIAPI(prompt, playerIndex) {
  const aiConfig = getAIPlayerConfig(playerIndex);
  const { API_URL, MODEL, API_KEY, APP_ID, TEMPERATURE, MAX_TOKENS, TIMEOUT } = aiConfig;
  
  if (!API_KEY) {
    throw new Error(`AI玩家${playerIndex}的API密钥未设置`);
  }
  
  // 使用阿里云百炼平台应用中的系统提示词，这里只传递游戏状态信息
  const requestBody = {
    model: MODEL,
    input: {
      prompt: prompt
    },
    parameters: {
      temperature: TEMPERATURE,
      top_p: 0.8,
      seed: 1234,
      max_tokens: MAX_TOKENS
    }
  };
  
  // 添加超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-DashScope-SSE': 'disable',
        'X-DashScope-App-ID': APP_ID
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API调用失败: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
    }
    
    const data = await response.json();
    
    // 阿里云百炼API的响应格式
    if (data.output && data.output.text !== undefined) {
      return data.output.text;
    } else if (data.result && data.result.text !== undefined) {
      return data.result.text;
    } else {
      throw new Error('API响应格式错误: ' + JSON.stringify(data));
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('API调用超时');
    }
    throw error;
  }
}

/**
 * 解析AI响应
 * @param {string} response - AI响应文本
 * @returns {Object} - 解析后的决策
 */
function parseAIResponse(response) {
  try {
    console.log('aiService.js - AI原始响应:', response);
    console.log('aiService.js - 响应类型:', typeof response);
    console.log('aiService.js - 响应长度:', response?.length);
    
    // 尝试解析JSON格式响应
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    console.log('aiService.js - JSON匹配结果:', jsonMatch);
    
    if (jsonMatch) {
      const decision = JSON.parse(jsonMatch[0]);
      console.log('aiService.js - 解析后的JSON:', decision);
      
      // 验证必要字段
      if (!decision.action || !decision.strategy) {
        throw new Error('AI响应缺少必要字段');
      }
      
      // 确保cards是数组
      if (!decision.cards || !Array.isArray(decision.cards)) {
        decision.cards = [];
      }
      
      return {
        action: decision.action,
        cards: decision.cards,
        strategy: decision.strategy,
        confidence: decision.confidence || 0.5
      };
    }
    
    // 如果没有JSON格式，尝试从文本中提取决策信息
    // 查找决策相关的关键词
    const actionMatch = response.match(/(?:action|动作|行为)["：:]?\s*["']?(\w+)["']?/i);
    const action = actionMatch ? actionMatch[1].toLowerCase() : null;
    
    // 查找策略说明
    const strategyMatch = response.match(/(?:strategy|策略|说明)["：:]?\s*["']?([^,\n}]+)/i);
    let strategy = strategyMatch ? strategyMatch[1].trim() : 'AI分析后做出的决策';
    
    // 如果没有找到明确的策略，使用响应的一部分作为策略
    if (!strategy || strategy.length < 5) {
      // 提取响应中的关键部分作为策略
      const lines = response.split('\n').filter(line => line.trim().length > 0);
      for (let line of lines) {
        if (line.includes('决策') || line.includes('选择') || line.includes('决定')) {
          strategy = line.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '').trim();
          break;
        }
      }
      if (!strategy || strategy.length < 5) {
        strategy = response.substring(0, 50) + '...';
      }
    }
    
    // 如果动作是pass或类似词汇，则返回pass
    if (action && (action.includes('pass') || action.includes('过') || action.includes('不出'))) {
      return {
        action: 'pass',
        cards: [],
        strategy: strategy,
        confidence: 0.5
      };
    }
    
    // 如果动作是call或叫地主相关
    if (action && (action.includes('call') || action.includes('叫') || action.includes('抢'))) {
      return {
        action: 'call',
        cards: [],
        strategy: strategy,
        confidence: 0.5
      };
    }
    
    // 如果动作是play或出牌相关
    if (action && (action.includes('play') || action.includes('出'))) {
      // 尝试从文本中提取牌面信息
      const cards = extractCardsFromText(response);
      return {
        action: 'play',
        cards: cards,
        strategy: strategy,
        confidence: 0.5
      };
    }
    
    // 如果没有明确的动作，尝试从文本中推断
    if (response.toLowerCase().includes('不出') || response.toLowerCase().includes('过')) {
      return {
        action: 'pass',
        cards: [],
        strategy: strategy,
        confidence: 0.5
      };
    }
    
    if (response.toLowerCase().includes('叫') || response.toLowerCase().includes('抢')) {
      return {
        action: 'call',
        cards: [],
        strategy: strategy,
        confidence: 0.5
      };
    }
    
    // 如果包含具体的牌面信息，尝试解析为出牌
    const extractedCards = extractCardsFromText(response);
    if (extractedCards.length > 0) {
      return {
        action: 'play',
        cards: extractedCards,
        strategy: strategy,
        confidence: 0.5
      };
    }
    
    // 默认返回pass
    return {
      action: 'pass',
      cards: [],
      strategy: strategy,
      confidence: 0.5
    };
    
  } catch (error) {
    console.error('解析AI响应失败:', error);
    console.error('原始响应:', response);
    
    // 发生错误时返回默认决策
    return {
      action: 'pass',
      cards: [],
      strategy: '解析AI响应失败，选择不出牌',
      confidence: 0.1
    };
  }
}

/**
 * 从文本中提取牌面信息
 * @param {string} text - 包含牌面信息的文本
 * @returns {Array} - 提取到的牌对象数组
 */
function extractCardsFromText(text) {
  const cards = [];
  const cardMap = {
    '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15, '小王': 16, '大王': 17
  };
  
  // 查找牌面的正则表达式模式
  const patterns = [
    /(?:出牌|选择|打出|跟牌|对|单|三|四)[：:]?\s*([^\n，。]+)/i,
    /(?:牌面|手牌|组合)[：:]?\s*([^\n，。]+)/,
    /(?:对子|单张|三张|炸弹)[：:]?\s*([^\n，。]+)/
  ];
  
  let matchedText = '';
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      matchedText = match[1];
      break;
    }
  }
  
  if (!matchedText) {
    // 如果没有找到特定模式，尝试查找数字和字母
    const cardTexts = text.match(/(?:\d+|[JQKA小王大王])/g);
    if (cardTexts) {
      matchedText = cardTexts.join(',');
    }
  }
  
  if (matchedText) {
    // 分割牌面字符串
    const parts = matchedText.split(/[,，、\s]+/).filter(p => p.trim());
    
    for (const part of parts) {
      const cleanPart = part.trim().replace(/[^\dJQKA小王大王]/g, '');
      if (cleanPart in cardMap) {
        cards.push({ value: cardMap[cleanPart], selected: true });
      }
    }
  }
  
  return cards;
}

/**
 * 格式化牌面为可读字符串
 * @param {Array} cards - 牌数组
 * @returns {string} - 格式化的牌面字符串
 */
function formatCards(cards) {
  if (!cards || cards.length === 0) return '无';
  
  return cards.map(card => {
    const valueNames = {
      3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
      11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2', 16: '小王', 17: '大王'
    };
    return valueNames[card.value] || card.value;
  }).join(', ');
}

/**
 * 格式化上家出牌信息
 * @param {Object} lastPlay - 上家出牌信息
 * @returns {string} - 格式化的出牌信息
 */
function formatLastPlay(lastPlay) {
  if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) return '无';
  
  const typeNames = {
    'S': '单张', 'P': '对子', 'T': '三张', 'T1': '三带一', 'T2': '三带二',
    'ST': '顺子', 'PST': '连对', 'PL': '飞机', 'PW': '飞机带翅膀',
    'F2': '四带二', 'F4': '四带二对', 'B': '炸弹', 'R': '王炸'
  };
  
  const typeName = typeNames[lastPlay.type] || lastPlay.type;
  const cardsStr = formatCards(lastPlay.cards);
  
  return `${typeName}: ${cardsStr}`;
}

/**
 * 获取牌的显示名称
 * @param {Object} card - 牌对象
 * @returns {string} - 牌的显示名称
 */
function getCardDisplayName(card) {
  const names = {
    3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2', 16: '小王', 17: '大王'
  };
  return names[card.value] || card.value;
}

/**
 * 获取牌型名称
 * @param {string} type - 牌型代码
 * @returns {string} - 牌型名称
 */
function getCardTypeName(type) {
  const typeNames = {
    'S': '单张',
    'P': '对子',
    'T': '三张',
    'T1': '三带一',
    'T2': '三带二',
    'ST': '顺子',
    'PST': '连对',
    'PL': '飞机',
    'PW': '飞机带翅膀',
    'F2': '四带二',
    'F4': '四带二对',
    'B': '炸弹',
    'R': '王炸'
  };
  return typeNames[type] || type;
}

/**
 * 从字符串解析牌面
 * @param {string} cardStr - 牌面字符串
 * @returns {Array} - 牌对象数组
 */
function parseCardsFromString(cardStr) {
  const cards = [];
  const cardMap = {
    '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15, '小王': 16, '大王': 17
  };
  
  // 分割牌面字符串
  const parts = cardStr.split(/[,，、\s]+/).filter(p => p.trim());
  
  parts.forEach(part => {
    const value = cardMap[part.trim()];
    if (value) {
      cards.push({ value, selected: true });
    }
  });
  
  return cards;
}

/**
 * 获取可选牌型分析
 * @param {Object} gameState - 游戏状态
 * @returns {string} - 可选牌型分析文本
 */
function getPossiblePlaysAnalysis(gameState) {
  // 这里可以集成现有的getAllPossiblePlays函数
  // 返回当前可选牌型的分析
  return '请根据手牌和上家出牌分析所有可能的出牌方案。';
}

/**
 * 测试双AI配置
 * @returns {Object} - 测试结果
 */
export function testAIConfiguration() {
  try {
    const qwenConfig = getAIPlayerConfig(1);
    const deepseekConfig = getAIPlayerConfig(2);
    
    console.log('=== 双AI配置测试 ===');
    console.log('Qwen3Plus配置:', {
      model: qwenConfig.MODEL,
      appId: qwenConfig.APP_ID,
      personality: qwenConfig.PERSONALITY,
      temperature: qwenConfig.TEMPERATURE
    });
    
    console.log('DeepSeek配置:', {
      model: deepseekConfig.MODEL,
      appId: deepseekConfig.APP_ID,
      personality: deepseekConfig.PERSONALITY,
      temperature: deepseekConfig.TEMPERATURE
    });
    
    // 验证必要配置
    const qwenValid = qwenConfig.API_KEY && qwenConfig.APP_ID;
    const deepseekValid = deepseekConfig.API_KEY && deepseekConfig.APP_ID;
    
    console.log('Qwen3Plus配置有效:', qwenValid);
    console.log('DeepSeek配置有效:', deepseekValid);
    
    return {
      success: qwenValid && deepseekValid,
      qwenValid,
      deepseekValid,
      qwenConfig: {
        model: qwenConfig.MODEL,
        appId: qwenConfig.APP_ID,
        personality: qwenConfig.PERSONALITY
      },
      deepseekConfig: {
        model: deepseekConfig.MODEL,
        appId: deepseekConfig.APP_ID,
        personality: deepseekConfig.PERSONALITY
      }
    };
  } catch (error) {
    console.error('AI配置测试失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 简单备用AI策略（当API调用失败时使用）
 * @param {Object} gameState - 游戏状态
 * @returns {Object} - 备用决策
 */
export function getFallbackDecision(gameState) {
  const { handCards, lastPlay } = gameState;
  
  // 如果没有上家出牌，出最小的单张
  if (!lastPlay || lastPlay.cards.length === 0) {
    const sortedCards = [...handCards].sort((a, b) => a.value - b.value);
    return {
      action: 'play',
      cards: [sortedCards[0]],
      strategy: '备用策略：出最小单张'
    };
  }
  
  // 默认不出
  return {
    action: 'pass',
    cards: [],
    strategy: '备用策略：不出'
  };
}