import { PageParams } from '@/types/api'


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


export const getParams = (params?: PageParams) => {
  if (!params) return '';

  const filtered = Object.entries(params || {})
    .filter(([k, v]) => !!k && !!v && !!String(v).trim())
    .reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {});

   const query = new URLSearchParams(filtered).toString();

   return !!query ? `?${query}` : '';
};


export const copyToClipboard = async (text: string) => {
  try {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard API 失败，尝试降级方案', err);
  }

  // 降级方案：创建临时 textarea 执行复制
  let res = true;
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    res = document.execCommand('copy');
  } catch (err) {
    console.warn('document.execCommand 失败：', err);
    res = false;
  } finally {
    document.body.removeChild(textArea);
  }
  return res;
};
