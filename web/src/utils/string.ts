
export const getInitials = (name: string) => {
  const trimmedName = name.trim();
  if (!trimmedName) return '?';

  // 尝试按空格分割（针对英文名）
  const parts = trimmedName.split(' ').filter(Boolean);

  if (parts.length >= 2) {
    // 两个或更多单词，取前两个单词的首字母（如 John Doe -> JD）
    return (parts[0][0] + parts[1][0]).toUpperCase();
  } else {
    // 只有一个单词或中文名（如 Alice -> A，张三 -> 张）
    // 简单的做法是取第一个字符
    return trimmedName[0].toUpperCase();
  }
};
