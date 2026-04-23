import { apiRequest, getToken, getBaseUrl } from '@/services/api';
import { PageResult } from '@/types/api';
import { ChatThread, ChatMessage, ChatReq, GraphConfig } from '@/types/chat';


export async function getGraphList()  {
  const res = await apiRequest('chat', {
    requireAuth: false,
  });
  const data: GraphConfig[] = await res.json();
  return data;
}


export async function getThreadList(graph: string) {
  const res = await apiRequest(`chat/${graph}`, {
    requireAuth: false,
  });
  const data: PageResult<ChatThread> = await res.json();
  return data;
}


export async function getChatHistory(graph: string, thread_id: string) {
  const res = await apiRequest(`chat/${graph}/${thread_id}`, {
    requireAuth: false,
  });
  const data: PageResult<ChatMessage> = await res.json();
  return data;
}


export async function sendMessage(
  req: ChatReq,
  onChunk: (content: string, node?: string) => void, // 收到碎片时的回调
  onDone?: () => void, // 结束时的回调
  onThreadCreated?: (thread_id: string) => void // 新建会话时回调
) {

  const token = await getToken();
  const baseUrl = getBaseUrl();

  const { graph, ...body } = req;

  const response = await fetch(`${baseUrl}/chat/${graph}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',   // 携带 Cookie（匿名用户标识）
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error('网络请求失败');
  if (!response.body) throw new Error('流数据为空');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = ""; // 用于处理不完整的行
  // 标记是否已处理 thread_id 事件
  let threadIdProcessed = false;

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

        // 处理 thread_id 事件
        if (parsed.type === 'thread_id') {
          if (!threadIdProcessed) {
            threadIdProcessed = true;
            onThreadCreated?.(parsed.thread_id);
          }
          continue; // 不是消息内容，跳过
        }

        // 处理消息内容
        const content = parsed.content;
        const node = parsed.node;
        if (Array.isArray(content)) {
          onChunk(content[0]?.text ?? '', node);
        } else if (typeof content === 'string') {
          onChunk(content, node);
        }
      } catch (e) {
        console.error("解析 SSE 数据失败", e);
      }
    }
  }
}
