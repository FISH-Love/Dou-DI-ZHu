# DeepSeek AI集成使用说明

## 功能概述
本项目已成功集成DeepSeek AI（通过阿里云百炼平台）来控制斗地主游戏中的两个AI玩家，实现智能决策。

## 配置步骤

### 1. 获取API密钥
1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
2. 注册并登录账号
3. 在控制台中获取API密钥（格式：sk-xxxxxxxx）

### 2. 配置API密钥
#### 方法一：游戏内配置
1. 启动游戏
2. 在主界面点击"AI设置"按钮
3. 输入你的API密钥
4. 点击确认

#### 方法二：代码配置
编辑 `src/config/aiConfig.js` 文件：
```javascript
API_KEY: '你的实际API密钥'
```

### 3. 启用AI功能
- 默认情况下AI功能已启用
- 如果未配置API密钥，游戏会提示配置或使用简单AI策略

## AI决策流程

### 1. 游戏状态分析
AI会分析以下信息：
- 当前玩家手牌
- 上家出牌情况
- 游戏阶段（叫地主/出牌）
- 其他玩家剩余牌数

### 2. 决策生成
AI根据以下策略生成决策：
- **叫地主阶段**：基于手牌强度决定是否叫地主
- **出牌阶段**：选择最优牌型进行出牌或跳过

### 3. 备用策略
当AI API调用失败时，系统会自动切换到备用策略：
- 首出：出最小的单张
- 跟牌：选择能压制的最小牌型
- 无法压制：自动跳过

## 技术实现

### 核心文件
- `src/services/aiService.js` - AI服务模块
- `src/config/aiConfig.js` - AI配置文件
- `src/pages/index/index.vue` - 游戏主界面（集成AI决策）

### 关键函数
- `getAIDecision()` - 获取AI决策
- `formatGameStateForAI()` - 格式化游戏状态
- `callDeepSeekAPI()` - 调用DeepSeek API
- `getFallbackDecision()` - 备用策略

## 配置参数

### API配置
```javascript
DASHSCOPE: {
  API_URL: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  MODEL: 'deepseek-chat',
  TEMPERATURE: 0.7,    // AI创造性（0-1）
  MAX_TOKENS: 1000,    // 最大响应长度
  TIMEOUT: 5000        // 请求超时时间（毫秒）
}
```

### 决策配置
```javascript
DECISION: {
  ENABLE_AI: true,        // 启用AI决策
  FALLBACK_ENABLED: true, // 启用备用策略
  RETRY_COUNT: 1,         // API失败重试次数
  THINKING_TIME: 2000     // AI思考时间（毫秒）
}
```

## 使用提示

### 1. API密钥安全
- 请妥善保管API密钥
- 不要将密钥提交到代码仓库
- 建议使用环境变量管理密钥

### 2. 网络要求
- 需要稳定的网络连接
- API调用可能需要几秒钟时间
- 网络不稳定时会自动使用备用策略

### 3. 性能优化
- AI思考时间可通过配置调整
- 建议根据设备性能调整超时时间
- 可随时切换到简单AI模式

## 故障排除

### 常见问题
1. **API调用失败**
   - 检查网络连接
   - 验证API密钥是否正确
   - 确认账户余额充足

2. **AI决策异常**
   - 查看控制台错误信息
   - 检查游戏状态格式是否正确
   - 系统会自动切换到备用策略

3. **配置丢失**
   - API密钥存储在本地
   - 清除浏览器数据会丢失配置
   - 需要重新配置

### 调试模式
在浏览器控制台可以看到详细的AI决策过程：
- 游戏状态分析
- API请求和响应
- 决策结果和策略说明

## 更新日志
- v1.0: 初始版本，集成DeepSeek AI
- 支持智能叫地主和出牌决策
- 实现备用策略机制
- 添加配置界面和错误处理