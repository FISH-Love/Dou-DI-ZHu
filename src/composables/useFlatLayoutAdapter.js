// 平铺模式数据适配器
// 将线性手牌数组转换为三行固定网格结构

import { reactive, watch } from 'vue';

export function useFlatLayoutAdapter(handCards) {
  // 三行布局定义
  const LAYOUT_ROWS = {
    row1: [10, 11, 12, 13],           // 10/J/Q/K
    row2: [3, 4, 5, 6, 7, 8, 9],      // 3-9
    row3: [14, 15, 16, 17]            // A/2/小王/大王
  };

  // 网格状态
  const gridState = reactive({
    row1: [],
    row2: [],
    row3: []
  });

  // 统计手牌中某个值的数量
  const countInHand = (value, cards) => {
    return cards.filter(card => card.value === value).length;
  };

  // 映射单行数据
  const mapRow = (positions, cards) => {
    return positions.map(value => {
      const count = countInHand(value, cards);
      return {
        value: value,
        count: count,
        selected: 0,  // 当前选中数量 (0 到 count 循环)
        state: count > 0 ? 'owned' : 'empty'
      };
    });
  };

  // 转换手牌为网格结构
  const transformToGrid = (cards) => {
    gridState.row1 = mapRow(LAYOUT_ROWS.row1, cards);
    gridState.row2 = mapRow(LAYOUT_ROWS.row2, cards);
    gridState.row3 = mapRow(LAYOUT_ROWS.row3, cards);
  };

  // 监听手牌变化，自动更新网格
  watch(() => handCards.value, (newCards) => {
    if (newCards) {
      transformToGrid(newCards);
    }
  }, { immediate: true, deep: true });

  // 循环点选：0 -> 1 -> ... -> count -> 0
  const cycleSelect = (row, index) => {
    const slot = gridState[row][index];
    if (slot.count === 0) return; // 空槽不可选
    
    slot.selected = (slot.selected + 1) % (slot.count + 1);
    slot.state = slot.selected > 0 ? 'selected' : 'owned';
  };

  // 长按全选
  const selectAll = (row, index) => {
    const slot = gridState[row][index];
    if (slot.count === 0) return;
    
    slot.selected = slot.count;
    slot.state = 'selected';
  };

  // 重置所有选择
  const resetSelection = () => {
    ['row1', 'row2', 'row3'].forEach(row => {
      gridState[row].forEach(slot => {
        slot.selected = 0;
        slot.state = slot.count > 0 ? 'owned' : 'empty';
      });
    });
  };

  // 获取当前选中的牌（返回原始卡牌对象数组）
  const getSelectedCards = (allCards) => {
    const selected = [];
    
    ['row1', 'row2', 'row3'].forEach(row => {
      gridState[row].forEach(slot => {
        if (slot.selected > 0) {
          // 从手牌中找出对应值的牌
          const cardsOfValue = allCards.filter(card => card.value === slot.value);
          selected.push(...cardsOfValue.slice(0, slot.selected));
        }
      });
    });
    
    return selected;
  };

  // 根据卡牌数组设置选中状态（用于语音指令）
  const setSelectedCards = (cards) => {
    resetSelection();
    
    // 统计每个值需要选中的数量
    const selectCounts = {};
    cards.forEach(card => {
      selectCounts[card.value] = (selectCounts[card.value] || 0) + 1;
    });
    
    // 更新网格状态
    ['row1', 'row2', 'row3'].forEach(row => {
      gridState[row].forEach(slot => {
        if (selectCounts[slot.value]) {
          slot.selected = Math.min(selectCounts[slot.value], slot.count);
          slot.state = 'selected';
        }
      });
    });
  };

  // 获取牌面名称（用于TTS）
  const getCardLabel = (value) => {
    const labels = {
      3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
      10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
      16: '小王', 17: '大王'
    };
    return labels[value] || '';
  };

  return {
    gridState,
    LAYOUT_ROWS,
    transformToGrid,
    cycleSelect,
    selectAll,
    resetSelection,
    getSelectedCards,
    setSelectedCards,
    getCardLabel
  };
}
