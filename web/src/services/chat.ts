import { apiRequest, getToken, getBaseUrl } from '@/services/api';
import { PageResult } from '@/types/api';
import { ChatThread, ChatMessage } from '@/types/chat';


export async function getGraphList()  {
  const res = await apiRequest('chat')
  const data: string[] = await res.json()
  return data
}


export async function getThreadList(graph: string) {
  const res = await apiRequest(`chat/${graph}`)
  const data: PageResult<ChatThread> = await res.json()
  return data
}


export async function getChatHistory(graph: string, thread_id: string) {
  const res = await apiRequest(`chat/${graph}/${thread_id}`)
  const data: PageResult<ChatMessage> = await res.json()
  return data
}


export async function sendMessage(
  graph: string,
  thread_id: string,
  message: string,
  onChunk: (content: string, node?: string) => void, // 收到碎片时的回调
  onDone?: () => void // 结束时的回调
) {

  const token = await getToken();
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}/chat/${graph}/${thread_id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) throw new Error('网络请求失败');
  if (!response.body) throw new Error('流数据为空');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = ""; // 用于处理不完整的行

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // 1. 解码当前块并加入缓冲区
    buffer += decoder.decode(value, { stream: true });

    // 2. 按 SSE 规范的双换行符分割消息
    const parts = buffer.split("\n\n");

    // 留下最后一个可能不完整的行在 buffer 中
    buffer = parts.pop() || "";

    for (const part of parts) {
      const line = part.trim();
      if (!line || !line.startsWith("data: ")) continue;

      const data = line.replace("data: ", "");

      // 3. 检查结束标记
      if (data === "[DONE]") {
        onDone?.();
        return;
      }

      // 4. 解析 JSON 并回调
      try {
        const parsed = JSON.parse(data);
        const content = parsed.content;
        const node = parsed.node;
        const type = parsed.type;
        if (type === 'ai') {
          if (Array.isArray(content)) {
            onChunk(content[0]?.text ?? '', node);
          } else if (typeof content === 'string') {
            onChunk(content, node);
          }
        }
      } catch (e) {
        console.error("解析 SSE 数据失败", e);
      }
    }
  }
}
