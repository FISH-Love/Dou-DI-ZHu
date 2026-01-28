// AI配置文件
export const AI_CONFIG = {
  // Qwen3Plus 激进型AI配置
  QWEN_PLAYER: {
    API_URL: '/dashscope/api/v1/services/aigc/text-generation/generation',
    MODEL: '通义千问-Max-2025-01-25',  // 激进型AI模型
    API_KEY: 'sk-55f54cb4e2b348ebaa890db1d6380515',
    APP_ID: '1a069bb181464b2b9fea2d7e37ba2a40', // 激进型玩家APP-ID
    TEMPERATURE: 0.8, // 稍高的创造性
    MAX_TOKENS: 800,
    TIMEOUT: 30000,
    PERSONALITY: 'aggressive'
  },
  
  // DeepSeek 保守型AI配置
  DEEPSEEK_PLAYER: {
    API_URL: '/dashscope/api/v1/services/aigc/text-generation/generation',
    MODEL: 'DeepSeek-V3.1',  // 保守型AI模型
    API_KEY: 'sk-55f54cb4e2b348ebaa890db1d6380515',
    APP_ID: '36aa53a96ea549509b459558aa0106eb', // 保守型玩家APP-ID
    TEMPERATURE: 0.6, // 较低的创造性，更稳定
    MAX_TOKENS: 800,
    TIMEOUT: 30000,
    PERSONALITY: 'conservative'
  },
  
  // AI决策配置
  DECISION: {
    ENABLE_AI: true, // 是否启用AI决策
    FALLBACK_ENABLED: true, // 是否启用备用策略
    RETRY_COUNT: 1, // API调用失败重试次数
    THINKING_TIME: 2000 // AI思考时间（毫秒）
  }
};

// 获取AI玩家配置
export function getAIPlayerConfig(playerIndex) {
  if (playerIndex === 1) {
    return AI_CONFIG.QWEN_PLAYER;
  } else if (playerIndex === 2) {
    return AI_CONFIG.DEEPSEEK_PLAYER;
  }
  throw new Error(`无效的AI玩家索引: ${playerIndex}`);
}

// 设置AI玩家API配置
export function setAIPlayerConfig(playerIndex, apiKey, appId) {
  if (playerIndex === 1) {
    AI_CONFIG.QWEN_PLAYER.API_KEY = apiKey;
    AI_CONFIG.QWEN_PLAYER.APP_ID = appId;
    localStorage.setItem('qwen_api_key', apiKey);
    localStorage.setItem('qwen_app_id', appId);
  } else if (playerIndex === 2) {
    AI_CONFIG.DEEPSEEK_PLAYER.API_KEY = apiKey;
    AI_CONFIG.DEEPSEEK_PLAYER.APP_ID = appId;
    localStorage.setItem('deepseek_api_key', apiKey);
    localStorage.setItem('deepseek_app_id', appId);
  }
}

// 从本地存储加载API配置
export function loadAIConfig() {
  const qwenApiKey = localStorage.getItem('qwen_api_key');
  const qwenAppId = localStorage.getItem('qwen_app_id');
  const deepseekApiKey = localStorage.getItem('deepseek_api_key');
  const deepseekAppId = localStorage.getItem('deepseek_app_id');
  
  if (qwenApiKey && qwenAppId) {
    AI_CONFIG.QWEN_PLAYER.API_KEY = qwenApiKey;
    AI_CONFIG.QWEN_PLAYER.APP_ID = qwenAppId;
  }
  
  if (deepseekApiKey && deepseekAppId) {
    AI_CONFIG.DEEPSEEK_PLAYER.API_KEY = deepseekApiKey;
    AI_CONFIG.DEEPSEEK_PLAYER.APP_ID = deepseekAppId;
  }
}

// 初始化保存配置到本地存储
export function initAIConfig() {
  // 保存Qwen3Plus配置
  localStorage.setItem('qwen_api_key', AI_CONFIG.QWEN_PLAYER.API_KEY);
  localStorage.setItem('qwen_app_id', AI_CONFIG.QWEN_PLAYER.APP_ID);
  
  // 保存DeepSeek配置
  localStorage.setItem('deepseek_api_key', AI_CONFIG.DEEPSEEK_PLAYER.API_KEY);
  localStorage.setItem('deepseek_app_id', AI_CONFIG.DEEPSEEK_PLAYER.APP_ID);
  
  console.log('AI配置已初始化并保存到本地存储');
}