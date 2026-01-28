# 斗地主 AI 对战项目概要

## 项目简介

本项目是一个基于 UniApp (Vue3 + Vite) 开发的斗地主游戏，集成了先进的 AI 智能体（通过阿里云百炼平台调用 DeepSeek 和 Qwen 模型）作为电脑玩家，以及百度智能云语音技术（ASR & TTS），实现了语音交互打牌和智能决策对战功能。

## 核心功能

### 1. 多布局模式系统
- **正常模式**：传统扇形手牌布局，适合视觉操作
- **平铺模式**：三行固定网格布局，专为视障用户设计
  - 固定位置空间记忆（第一行：10/J/Q/K，第二行：3-9，第三行：A/2/小王/大王）
  - 循环点选机制（单击 0→1→2→...→count→0）
  - 长按全选（震动 + TTS 播报）
  - 滑动探索（防抖 TTS 播报）
  - 高对比度配色 + 震动反馈
- **竖向模式**：纵向排列布局（占位，待实现）
- 布局选择在游戏开始前进行，用户偏好会被保存

### 2. 游戏对战
- **三人斗地主规则**：完整的斗地主游戏逻辑，包括发牌、叫地主、出牌、牌型判断、胜负判定。
- **智能出牌提示**：自动识别玩家可出的牌型。
- **胜负判定**：自动判断游戏结束条件。

### 3. AI 智能决策系统
项目引入了双 AI 策略，模拟不同性格的对手：
- **激进型 AI (Qwen3Plus)**：
  - 由 `QWEN_PLAYER` 配置，使用 `通义千问-Max` 模型。
  - 性格激进，倾向于主动叫地主和进攻。
  - 创造性较高 (`TEMPERATURE: 0.8`)。
- **保守型 AI (DeepSeek)**：
  - 由 `DEEPSEEK_PLAYER` 配置，使用 `DeepSeek-V3.1` 模型。
  - 性格稳健，决策更加理性保守。
  - 稳定性高 (`TEMPERATURE: 0.6`)。

**AI 能力包括：**
- **智能叫地主**：根据手牌强度分析是否叫地主。
- **策略出牌**：分析场上局势（上家牌型、自己手牌、剩余牌数），做出最优出牌或过牌决策。
- **备用策略**：当 AI API 调用失败或超时时，自动降级为本地规则算法（如首出最小单张、能压则压等），保障游戏流畅进行。

### 4. 语音交互 (ASR & TTS)
- **语音控制**：
  - 玩家可以通过按住屏幕上半区域进行语音指令输入。
  - 支持指令：叫地主/不抢、出牌（如"对三"、"王炸"、"顺子"）、过/不出、查询手牌（"复述"、"报牌"）。
- **语音播报**：
  - 游戏过程中的关键信息（如"你是地主"、"游戏结束"、玩家出牌内容）通过 TTS 进行语音播报。
- **技术实现**：
  - 使用 `recorder-core` 实现 H5 端高质量录音 (16kHZ/16bit/WAV)。
  - 集成百度智能云 ASR (语音识别) 和 TTS (语音合成) API。

## 架构设计

### 分层架构
项目采用分层架构设计，实现了游戏逻辑与视图的完全分离：

```
┌─────────────────────────────────────┐
│   游戏核心层 (useGameCore)           │
│   - 游戏状态管理                     │
│   - AI 决策调用                      │
│   - 牌型逻辑处理                     │
│   - 流程控制                         │
└─────────────────────────────────────┘
              ↕ (数据接口)
┌─────────────────────────────────────┐
│   服务层 (useVoiceService)           │
│   - 语音录音控制                     │
│   - 语音识别处理                     │
│   - 语音播报服务                     │
└─────────────────────────────────────┘
              ↕ (事件通信)
┌─────────────────────────────────────┐
│   布局层 (Layout Components)         │
│   ├─ NormalLayout (正常模式)        │
│   ├─ FlatLayout (平铺模式)          │
│   └─ VerticalLayout (竖向模式)      │
└─────────────────────────────────────┘
```

### 核心 Composables
- **useGameCore**: 提供游戏核心逻辑，所有布局共享同一套游戏状态
- **useVoiceService**: 提供语音服务，支持录音、识别、播报
- **useFlatLayoutAdapter**: 平铺模式专用，将线性手牌转换为三行网格结构

### 布局系统
- 所有布局组件通过统一的 props 接收游戏状态
- 通过 emit 事件与父组件通信
- 布局切换在游戏开始前进行，运行时不可切换
- 用户偏好通过 localStorage 持久化

## 技术栈

- **前端框架**: UniApp, Vue 3
- **构建工具**: Vite
- **AI 服务**: 阿里云百炼平台 (DeepSeek-V3.1, Qwen-Max)
- **语音服务**: 百度智能云 (ASR, TTS)
- **状态管理**: Vue Reactivity API
- **样式**: SCSS

## 项目结构

```
doudizhu/
├── document/               # 项目文档
│   ├── AI_Integration_Complete.md       # AI集成完成说明
│   ├── DeepSeek_AI_Integration_Guide.md # DeepSeek AI集成指南
│   ├── Doudizhu_AI_Prompt.md            # AI 提示词设计
│   ├── UniApp_Baidu_ASR_TTS_Integration_Guide.md # 语音集成指南
│   └── 平铺模式需求文档.md               # 无障碍平铺模式需求
├── src/
│   ├── composables/        # 可复用逻辑 (Composition API)
│   │   ├── useGameCore.js          # 游戏核心逻辑 (状态管理、流程控制、AI调用)
│   │   ├── useVoiceService.js      # 语音服务 (录音、识别、播报)
│   │   └── useFlatLayoutAdapter.js # 平铺模式数据适配器
│   ├── layouts/            # 布局组件 (多模式支持)
│   │   ├── NormalLayout.vue   # 正常模式 (传统扇形手牌)
│   │   ├── FlatLayout.vue     # 平铺模式 (无障碍三行网格)
│   │   └── VerticalLayout.vue # 竖向模式 (占位，待实现)
│   ├── config/
│   │   ├── aiConfig.js     # AI 模型及 API 密钥配置 (双AI配置)
│   │   └── aiPlayers.js    # AI 玩家配置
│   ├── pages/
│   │   └── index/
│   │       └── index.vue   # 游戏主界面 (布局容器 + 布局选择器)
│   ├── services/
│   │   ├── aiService.js    # AI 服务封装 (API 调用、提示词构建、响应解析)
│   │   └── baiduAuth.js    # 百度语音服务封装 (Token 管理、ASR/TTS 调用)
│   └── utils/
│       ├── cardLogic.js    # 核心牌型逻辑 (牌型判断、大小比较、出牌搜索)
│       └── h5-recorder.js  # H5 录音工具类
├── test/
│   └── ai-test.js          # AI 功能测试脚本
├── package.json            # 项目依赖
└── vite.config.js          # Vite 配置 (含跨域代理)
```

## 快速开始

1.  **安装依赖**:
    ```bash
    npm install
    ```

2.  **配置密钥**:
    - 确保 `src/config/aiConfig.js` 中已配置阿里云百炼 API Key 和 App ID。
    - 确保 `src/services/baiduAuth.js` 中已配置百度云 API Key 和 Secret Key。

3.  **运行项目 (H5)**:
    ```bash
    npm run dev:h5
    ```

## 关键配置说明

- **AI 配置 (`src/config/aiConfig.js`)**:
  可在此调整 AI 模型参数（如 `TEMPERATURE`）、API 地址和超时时间。
  支持分别配置 Player 1 (Qwen) 和 Player 2 (DeepSeek)。

- **跨域代理 (`vite.config.js`)**:
  配置了 `/baidu-auth`, `/baidu-asr`, `/baidu-tts`, `/dashscope` 等代理，解决本地 H5 开发时的跨域问题。
