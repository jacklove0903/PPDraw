// 基础词库（MVP 版本，后续扩展）

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Word {
  word: string;
  difficulty: Difficulty;
  category: string;
}

export const WORDS: Word[] = [
  // 动物
  { word: '猫', difficulty: 'easy', category: '动物' },
  { word: '狗', difficulty: 'easy', category: '动物' },
  { word: '兔子', difficulty: 'easy', category: '动物' },
  { word: '大象', difficulty: 'easy', category: '动物' },
  { word: '熊猫', difficulty: 'easy', category: '动物' },
  { word: '长颈鹿', difficulty: 'medium', category: '动物' },
  { word: '袋鼠', difficulty: 'medium', category: '动物' },
  { word: '海豚', difficulty: 'medium', category: '动物' },
  { word: '犀牛', difficulty: 'hard', category: '动物' },
  { word: '考拉', difficulty: 'hard', category: '动物' },

  // 食物
  { word: '苹果', difficulty: 'easy', category: '食物' },
  { word: '香蕉', difficulty: 'easy', category: '食物' },
  { word: '披萨', difficulty: 'easy', category: '食物' },
  { word: '汉堡', difficulty: 'easy', category: '食物' },
  { word: '面条', difficulty: 'medium', category: '食物' },
  { word: '寿司', difficulty: 'medium', category: '食物' },
  { word: '冰淇淋', difficulty: 'medium', category: '食物' },
  { word: '饺子', difficulty: 'hard', category: '食物' },

  // 生活物品
  { word: '雨伞', difficulty: 'easy', category: '物品' },
  { word: '手机', difficulty: 'easy', category: '物品' },
  { word: '电视', difficulty: 'easy', category: '物品' },
  { word: '钟表', difficulty: 'easy', category: '物品' },
  { word: '眼镜', difficulty: 'medium', category: '物品' },
  { word: '钥匙', difficulty: 'medium', category: '物品' },
  { word: '吉他', difficulty: 'medium', category: '物品' },
  { word: '显微镜', difficulty: 'hard', category: '物品' },

  // 自然
  { word: '太阳', difficulty: 'easy', category: '自然' },
  { word: '月亮', difficulty: 'easy', category: '自然' },
  { word: '彩虹', difficulty: 'easy', category: '自然' },
  { word: '闪电', difficulty: 'medium', category: '自然' },
  { word: '火山', difficulty: 'medium', category: '自然' },
  { word: '龙卷风', difficulty: 'hard', category: '自然' },

  // 交通
  { word: '汽车', difficulty: 'easy', category: '交通' },
  { word: '飞机', difficulty: 'easy', category: '交通' },
  { word: '自行车', difficulty: 'easy', category: '交通' },
  { word: '火车', difficulty: 'medium', category: '交通' },
  { word: '热气球', difficulty: 'medium', category: '交通' },
  { word: '潜水艇', difficulty: 'hard', category: '交通' },
];

/** 随机抽取 n 个不重复的词 */
export function pickRandomWords(n: number): Word[] {
  const pool = [...WORDS];
  const result: Word[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}
