<script>
export default {
  onLaunch: function() {
    console.log('游戏启动');
  }
}
</script>

<style>
/* 全局重置 */
page {
  width: 100%;
  height: 100%;
  background-color: #1a5e20; /* 牌桌墨绿色 */
  overflow: hidden;
  font-family: "Helvetica Neue", Helvetica, sans-serif;
}

view, text {
  box-sizing: border-box;
}

/* 适配微信小程序底部安全区 */
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 统一按钮点击效果 */
button:active {
  opacity: 0.8;
  transform: scale(0.98);
}
</style>