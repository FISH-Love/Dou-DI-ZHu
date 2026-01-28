// 斗地主牌型逻辑工具类

// 牌型常量
export const CARD_TYPES = {
  SINGLE: 'S',           // 单张
  PAIR: 'P',             // 对子
  THREE: 'T',            // 三张
  THREE_WITH_ONE: 'T1',  // 三带一
  THREE_WITH_PAIR: 'T2', // 三带二
  STRAIGHT: 'ST',       // 顺子 (5张及以上)
  PAIR_STRAIGHT: 'PST', // 连对 (3对及以上)
  PLANE: 'PL',          // 飞机 (2个及以上三张)
  PLANE_WITH_WINGS: 'PW', // 飞机带翅膀
  FOUR_WITH_TWO: 'F2',   // 四带二
  FOUR_WITH_TWO_PAIRS: 'F4', // 四带两对
  BOMB: 'B',            // 炸弹
  ROCKET: 'R'           // 王炸
};

// 牌值映射
const CARD_VALUES = {
  3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
  J: 11, Q: 12, K: 13, A: 14, 2: 15, 小王: 16, 大王: 17
};

/**
 * 分析牌型
 * @param {Array} cards - 牌数组
 * @returns {Object} {type: 牌型, value: 主值, length: 长度, cards: 原始牌}
 */
export function analyzeCards(cards) {
  if (!cards || cards.length === 0) return null;
  
  const sortedCards = [...cards].sort((a, b) => a.value - b.value);
  const groups = groupByValue(sortedCards);
  const values = Object.keys(groups).map(Number).sort((a, b) => a - b);
  const counts = values.map(v => groups[v].length);
  
  // 王炸
  if (cards.length === 2 && values.includes(16) && values.includes(17)) {
    return { type: CARD_TYPES.ROCKET, value: 100, length: 2, cards };
  }
  
  // 炸弹
  if (counts.includes(4)) {
    const bombValue = values.find(v => groups[v].length === 4);
    return { type: CARD_TYPES.BOMB, value: bombValue, length: 4, cards };
  }
  
  // 单张
  if (cards.length === 1) {
    return { type: CARD_TYPES.SINGLE, value: values[0], length: 1, cards };
  }
  
  // 对子
  if (cards.length === 2 && counts[0] === 2) {
    return { type: CARD_TYPES.PAIR, value: values[0], length: 2, cards };
  }
  
  // 三张
  if (cards.length === 3 && counts[0] === 3) {
    return { type: CARD_TYPES.THREE, value: values[0], length: 3, cards };
  }
  
  // 三带一
  if (cards.length === 4 && counts.includes(3) && counts.includes(1)) {
    const threeValue = values.find(v => groups[v].length === 3);
    return { type: CARD_TYPES.THREE_WITH_ONE, value: threeValue, length: 4, cards };
  }
  
  // 三带二
  if (cards.length === 5 && counts.includes(3) && counts.includes(2)) {
    const threeValue = values.find(v => groups[v].length === 3);
    return { type: CARD_TYPES.THREE_WITH_PAIR, value: threeValue, length: 5, cards };
  }
  
  // 顺子 (5张及以上连续单牌)
  if (cards.length >= 5 && counts.every(c => c === 1) && isConsecutive(values)) {
    return { type: CARD_TYPES.STRAIGHT, value: values[0], length: cards.length, cards };
  }
  
  // 连对 (3对及以上连续对子)
  if (cards.length >= 6 && counts.every(c => c === 2) && isConsecutive(values)) {
    return { type: CARD_TYPES.PAIR_STRAIGHT, value: values[0], length: cards.length / 2, cards };
  }
  
  // 飞机 (2个及以上三张)
  const threeCount = counts.filter(c => c === 3).length;
  if (threeCount >= 2 && counts.filter(c => c === 3).length === values.length) {
    const threeValues = values.filter(v => groups[v].length === 3);
    if (isConsecutive(threeValues)) {
      return { type: CARD_TYPES.PLANE, value: threeValues[0], length: threeCount, cards };
    }
  }
  
  // 飞机带翅膀
  if (threeCount >= 2) {
    const threeValues = values.filter(v => groups[v].length === 3);
    const wingValues = values.filter(v => groups[v].length !== 3);
    
    if (isConsecutive(threeValues) && wingValues.length === threeCount) {
      // 检查翅膀是否都是单张或都是对子
      const wingCounts = wingValues.map(v => groups[v].length);
      if (wingCounts.every(c => c === 1) || wingCounts.every(c => c === 2)) {
        return { type: CARD_TYPES.PLANE_WITH_WINGS, value: threeValues[0], length: threeCount, cards };
      }
    }
  }
  
  // 四带二
  if (cards.length === 6 && counts.includes(4)) {
    const fourValue = values.find(v => groups[v].length === 4);
    const wingValues = values.filter(v => groups[v].length !== 4);
    if (wingValues.length === 2 && wingValues.every(v => groups[v].length === 1)) {
      return { type: CARD_TYPES.FOUR_WITH_TWO, value: fourValue, length: 6, cards };
    }
  }
  
  // 四带两对
  if (cards.length === 8 && counts.includes(4)) {
    const fourValue = values.find(v => groups[v].length === 4);
    const wingValues = values.filter(v => groups[v].length !== 4);
    if (wingValues.length === 2 && wingValues.every(v => groups[v].length === 2)) {
      return { type: CARD_TYPES.FOUR_WITH_TWO_PAIRS, value: fourValue, length: 8, cards };
    }
  }
  
  return null; // 无效牌型
}

/**
 * 比较两个牌型的大小
 * @param {Object} type1 - 牌型1
 * @param {Object} type2 - 牌型2
 * @returns {number} 1: type1 > type2, -1: type1 < type2, 0: 相等
 */
export function compareCards(type1, type2) {
  if (!type1 || !type2) return 0;
  
  // 王炸最大
  if (type1.type === CARD_TYPES.ROCKET) return 1;
  if (type2.type === CARD_TYPES.ROCKET) return -1;
  
  // 炸弹大于其他牌型
  if (type1.type === CARD_TYPES.BOMB && type2.type !== CARD_TYPES.BOMB) return 1;
  if (type2.type === CARD_TYPES.BOMB && type1.type !== CARD_TYPES.BOMB) return -1;
  
  // 相同牌型比较主值
  if (type1.type === type2.type) {
    if (type1.value > type2.value) return 1;
    if (type1.value < type2.value) return -1;
    return 0;
  }
  
  // 不同牌型无法比较
  return 0;
}

/**
 * 检查是否可以出牌
 * @param {Object} playType - 要出的牌型
 * @param {Object} lastType - 上家出的牌型
 * @param {boolean} isFirst - 是否是第一个出牌
 * @returns {boolean}
 */
export function canPlay(playType, lastType, isFirst = false) {
  if (!playType) return false;
  
  // 第一个出牌或者上家没出牌，任何有效牌型都可以
  if (isFirst || !lastType) return true;
  
  // 王炸可以打任何牌
  if (playType.type === CARD_TYPES.ROCKET) return true;
  
  // 炸弹可以打非炸弹牌型
  if (playType.type === CARD_TYPES.BOMB && lastType.type !== CARD_TYPES.BOMB) return true;
  
  // 相同牌型才能比较
  if (playType.type !== lastType.type) return false;
  
  // 相同牌型比较大小
  return compareCards(playType, lastType) > 0;
}

/**
 * 获取所有可能的出牌组合
 * @param {Array} cards - 手牌
 * @param {Object} lastType - 上家出的牌型
 * @param {boolean} isFirst - 是否是第一个出牌
 * @returns {Array} 所有可能的出牌组合
 */
export function getAllPossiblePlays(cards, lastType = null, isFirst = false) {
  const possiblePlays = [];
  
  // 如果不是第一个出牌且上家出了牌，需要找能打过上家的牌
  if (!isFirst && lastType) {
    // 根据上家牌型找对应的牌
    switch (lastType.type) {
      case CARD_TYPES.SINGLE:
        findSingles(cards, lastType).forEach(play => possiblePlays.push(play));
        break;
      case CARD_TYPES.PAIR:
        findPairs(cards, lastType).forEach(play => possiblePlays.push(play));
        break;
      case CARD_TYPES.THREE:
        findThrees(cards, lastType).forEach(play => possiblePlays.push(play));
        break;
      case CARD_TYPES.THREE_WITH_ONE:
        findThreeWithOnes(cards, lastType).forEach(play => possiblePlays.push(play));
        break;
      case CARD_TYPES.THREE_WITH_PAIR:
        findThreeWithPairs(cards, lastType).forEach(play => possiblePlays.push(play));
        break;
      case CARD_TYPES.STRAIGHT:
        findStraights(cards, lastType).forEach(play => possiblePlays.push(play));
        break;
      case CARD_TYPES.PAIR_STRAIGHT:
        findPairStraights(cards, lastType).forEach(play => possiblePlays.push(play));
        break;
      case CARD_TYPES.PLANE:
        findPlanes(cards, lastType).forEach(play => possiblePlays.push(play));
        break;
      case CARD_TYPES.PLANE_WITH_WINGS:
        findPlanesWithWings(cards, lastType).forEach(play => possiblePlays.push(play));
        break;
      case CARD_TYPES.FOUR_WITH_TWO:
        findFourWithTwos(cards, lastType).forEach(play => possiblePlays.push(play));
        break;
      case CARD_TYPES.FOUR_WITH_TWO_PAIRS:
        findFourWithTwoPairs(cards, lastType).forEach(play => possiblePlays.push(play));
        break;
      case CARD_TYPES.BOMB:
        findBombs(cards, lastType).forEach(play => possiblePlays.push(play));
        break;
    }
    
    // 王炸总是可以出
    findRockets(cards).forEach(play => possiblePlays.push(play));
    
    // 如果上家不是炸弹，可以出更大的炸弹
    if (lastType.type !== CARD_TYPES.BOMB) {
      findBombs(cards).forEach(play => possiblePlays.push(play));
    }
  } else {
    // 第一个出牌，所有可能的牌型
    findAllPossibleTypes(cards).forEach(play => possiblePlays.push(play));
  }
  
  return possiblePlays;
}

// 辅助函数
function groupByValue(cards) {
  const groups = {};
  cards.forEach(card => {
    if (!groups[card.value]) groups[card.value] = [];
    groups[card.value].push(card);
  });
  return groups;
}

function isConsecutive(values) {
  if (values.length < 2) return false;
  // 2和王不能参与顺子
  if (values.some(v => v >= 15)) return false;
  
  for (let i = 1; i < values.length; i++) {
    if (values[i] - values[i-1] !== 1) return false;
  }
  return true;
}

// 查找各种牌型的函数
function findSingles(cards, lastType) {
  const result = [];
  const groups = groupByValue(cards);
  
  Object.keys(groups).forEach(value => {
    if (parseInt(value) > lastType.value) {
      result.push(analyzeCards(groups[value]));
    }
  });
  
  return result;
}

function findPairs(cards, lastType) {
  const result = [];
  const groups = groupByValue(cards);
  
  Object.keys(groups).forEach(value => {
    if (groups[value].length >= 2 && parseInt(value) > lastType.value) {
      result.push(analyzeCards(groups[value].slice(0, 2)));
    }
  });
  
  return result;
}

function findThrees(cards, lastType) {
  const result = [];
  const groups = groupByValue(cards);
  
  Object.keys(groups).forEach(value => {
    if (groups[value].length >= 3 && parseInt(value) > lastType.value) {
      result.push(analyzeCards(groups[value].slice(0, 3)));
    }
  });
  
  return result;
}

function findThreeWithOnes(cards, lastType) {
  const result = [];
  const groups = groupByValue(cards);
  
  Object.keys(groups).forEach(value => {
    if (groups[value].length >= 3 && parseInt(value) > lastType.value) {
      const three = groups[value].slice(0, 3);
      const singles = [];
      
      Object.keys(groups).forEach(v => {
        if (v !== value) {
          for (let i = 0; i < Math.min(groups[v].length, 1); i++) {
            singles.push(groups[v][i]);
          }
        }
      });
      
      if (singles.length > 0) {
        result.push(analyzeCards([...three, singles[0]]));
      }
    }
  });
  
  return result;
}

function findThreeWithPairs(cards, lastType) {
  const result = [];
  const groups = groupByValue(cards);
  
  Object.keys(groups).forEach(value => {
    if (groups[value].length >= 3 && parseInt(value) > lastType.value) {
      const three = groups[value].slice(0, 3);
      const pairs = [];
      
      Object.keys(groups).forEach(v => {
        if (v !== value && groups[v].length >= 2) {
          pairs.push(groups[v].slice(0, 2));
        }
      });
      
      pairs.forEach(pair => {
        result.push(analyzeCards([...three, ...pair]));
      });
    }
  });
  
  return result;
}

function findStraights(cards, lastType) {
  const result = [];
  const groups = groupByValue(cards);
  const values = Object.keys(groups).map(Number).filter(v => v < 15).sort((a, b) => a - b);
  
  for (let i = 0; i <= values.length - lastType.length; i++) {
    if (values[i] > lastType.value) {
      const straightValues = values.slice(i, i + lastType.length);
      if (isConsecutive(straightValues)) {
        const straightCards = straightValues.map(v => groups[v][0]);
        result.push(analyzeCards(straightCards));
      }
    }
  }
  
  return result;
}

function findPairStraights(cards, lastType) {
  const result = [];
  const groups = groupByValue(cards);
  const values = Object.keys(groups).filter(v => groups[v].length >= 2).map(Number).filter(v => v < 15).sort((a, b) => a - b);
  
  for (let i = 0; i <= values.length - lastType.length; i++) {
    if (values[i] > lastType.value) {
      const straightValues = values.slice(i, i + lastType.length);
      if (isConsecutive(straightValues)) {
        const straightCards = [];
        straightValues.forEach(v => {
          straightCards.push(...groups[v].slice(0, 2));
        });
        result.push(analyzeCards(straightCards));
      }
    }
  }
  
  return result;
}

function findPlanes(cards, lastType) {
  const result = [];
  const groups = groupByValue(cards);
  const threeValues = Object.keys(groups).filter(v => groups[v].length >= 3).map(Number).sort((a, b) => a - b);
  
  for (let i = 0; i <= threeValues.length - lastType.length; i++) {
    if (threeValues[i] > lastType.value) {
      const planeValues = threeValues.slice(i, i + lastType.length);
      if (isConsecutive(planeValues)) {
        const planeCards = [];
        planeValues.forEach(v => {
          planeCards.push(...groups[v].slice(0, 3));
        });
        result.push(analyzeCards(planeCards));
      }
    }
  }
  
  return result;
}

function findPlanesWithWings(cards, lastType) {
  const result = [];
  const groups = groupByValue(cards);
  const threeValues = Object.keys(groups).filter(v => groups[v].length >= 3).map(Number).sort((a, b) => a - b);
  
  for (let i = 0; i <= threeValues.length - lastType.length; i++) {
    if (threeValues[i] > lastType.value) {
      const planeValues = threeValues.slice(i, i + lastType.length);
      if (isConsecutive(planeValues)) {
        const planeCards = [];
        planeValues.forEach(v => {
          planeCards.push(...groups[v].slice(0, 3));
        });
        
        // 找翅膀
        const remainingCards = cards.filter(card => !planeCards.includes(card));
        const remainingGroups = groupByValue(remainingCards);
        
        // 单张翅膀
        const singleWings = [];
        Object.keys(remainingGroups).forEach(v => {
          singleWings.push(remainingGroups[v][0]);
        });
        
        if (singleWings.length >= lastType.length) {
          const wings = singleWings.slice(0, lastType.length);
          result.push(analyzeCards([...planeCards, ...wings]));
        }
        
        // 对子翅膀
        const pairWings = [];
        Object.keys(remainingGroups).forEach(v => {
          if (remainingGroups[v].length >= 2) {
            pairWings.push(...remainingGroups[v].slice(0, 2));
          }
        });
        
        if (pairWings.length >= lastType.length * 2) {
          const wings = pairWings.slice(0, lastType.length * 2);
          result.push(analyzeCards([...planeCards, ...wings]));
        }
      }
    }
  }
  
  return result;
}

function findFourWithTwos(cards, lastType) {
  const result = [];
  const groups = groupByValue(cards);
  
  Object.keys(groups).forEach(value => {
    if (groups[value].length >= 4 && parseInt(value) > lastType.value) {
      const four = groups[value].slice(0, 4);
      const singles = [];
      
      Object.keys(groups).forEach(v => {
        if (v !== value) {
          for (let i = 0; i < Math.min(groups[v].length, 1); i++) {
            singles.push(groups[v][i]);
          }
        }
      });
      
      if (singles.length >= 2) {
        result.push(analyzeCards([...four, singles[0], singles[1]]));
      }
    }
  });
  
  return result;
}

function findFourWithTwoPairs(cards, lastType) {
  const result = [];
  const groups = groupByValue(cards);
  
  Object.keys(groups).forEach(value => {
    if (groups[value].length >= 4 && parseInt(value) > lastType.value) {
      const four = groups[value].slice(0, 4);
      const pairs = [];
      
      Object.keys(groups).forEach(v => {
        if (v !== value && groups[v].length >= 2) {
          pairs.push(...groups[v].slice(0, 2));
        }
      });
      
      if (pairs.length >= 4) {
        result.push(analyzeCards([...four, pairs[0], pairs[1], pairs[2], pairs[3]]));
      }
    }
  });
  
  return result;
}

function findBombs(cards, lastType = null) {
  const result = [];
  const groups = groupByValue(cards);
  
  Object.keys(groups).forEach(value => {
    if (groups[value].length >= 4) {
      const bomb = analyzeCards(groups[value].slice(0, 4));
      if (!lastType || bomb.value > lastType.value) {
        result.push(bomb);
      }
    }
  });
  
  return result;
}

function findRockets(cards) {
  const result = [];
  const groups = groupByValue(cards);
  
  if (groups[16] && groups[17]) {
    result.push(analyzeCards([groups[16][0], groups[17][0]]));
  }
  
  return result;
}

function findAllPossibleTypes(cards) {
  const result = [];
  
  // 单张
  const groups = groupByValue(cards);
  Object.keys(groups).forEach(value => {
    result.push(analyzeCards(groups[value].slice(0, 1)));
  });
  
  // 对子
  Object.keys(groups).forEach(value => {
    if (groups[value].length >= 2) {
      result.push(analyzeCards(groups[value].slice(0, 2)));
    }
  });
  
  // 三张
  Object.keys(groups).forEach(value => {
    if (groups[value].length >= 3) {
      result.push(analyzeCards(groups[value].slice(0, 3)));
    }
  });
  
  // 炸弹
  result.push(...findBombs(cards));
  
  // 王炸
  result.push(...findRockets(cards));
  
  // 顺子
  const values = Object.keys(groups).map(Number).filter(v => v < 15).sort((a, b) => a - b);
  for (let len = 5; len <= values.length; len++) {
    for (let i = 0; i <= values.length - len; i++) {
      const straightValues = values.slice(i, i + len);
      if (isConsecutive(straightValues)) {
        const straightCards = straightValues.map(v => groups[v][0]);
        result.push(analyzeCards(straightCards));
      }
    }
  }
  
  return result;
}