import * as lark from '@larksuiteoapi/node-sdk';

const safeJsonParse = (text: string | undefined): any => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * Best-effort extraction of readable text from a message body content string.
 */
const extractText = (content: string | undefined, msgType: string): string => {
  const parsed = safeJsonParse(content);
  if (!parsed) return content || '';

  switch (msgType) {
    case 'text':
      return parsed.text || '';
    case 'post': {
      // Rich text: { title, content: [[ {tag, text}, ... ], ...] }
      const lines: string[] = [];
      if (parsed.title) lines.push(parsed.title);
      for (const block of parsed.content || []) {
        const texts = (block || [])
          .map((segment: any) => segment?.text || '')
          .filter((t: string) => t !== '');
        if (texts.length) lines.push(texts.join(''));
      }
      return lines.join('\n');
    }
    case 'image':
      return parsed.image_key ? `[image: ${parsed.image_key}]` : '[image]';
    case 'file':
      return parsed.file_key ? `[file: ${parsed.file_key}]` : '[file]';
    case 'audio':
      return '[audio]';
    case 'media':
      return parsed.file_key ? `[media: ${parsed.file_key}]` : '[media]';
    case 'sticker':
      return '[sticker]';
    case 'interactive':
      return '[card]';
    case 'share_chat':
      return '[shared chat]';
    default:
      return JSON.stringify(parsed);
  }
};

export interface ReadChatMessagesParams {
  chat_id: string;
  page_size?: number;
  page_token?: string;
  start_time?: string;
  end_time?: string;
  sort_type?: 'ByCreateTimeAsc' | 'ByCreateTimeDesc';
}

/**
 * Read chat history of a group chat as the user (user_access_token).
 */
export const readChatMessages = async (
  client: lark.Client,
  params: ReadChatMessagesParams,
  userAccessToken?: string,
) => {
  const { chat_id, page_size, page_token, start_time, end_time, sort_type } = params;

  const requestOptions = {
    method: 'GET',
    url: '/open-apis/im/v1/messages',
    params: {
      container_id_type: 'chat',
      container_id: chat_id,
      page_size,
      page_token,
      start_time,
      end_time,
      sort_type,
    },
  };

  const response = userAccessToken
    ? await client.request(requestOptions, lark.withUserAccessToken(userAccessToken))
    : await client.request(requestOptions);

  const body = response.data ?? {};
  const data = body.data ?? {};

  const messages = (data.items || []).map((item: any) => ({
    message_id: item.message_id,
    root_id: item.root_id,
    parent_id: item.parent_id,
    thread_id: item.thread_id,
    chat_id: item.chat_id,
    msg_type: item.msg_type,
    create_time: item.create_time,
    update_time: item.update_time,
    deleted: item.deleted,
    updated: item.updated,
    sender: {
      id: item.sender?.id,
      id_type: item.sender?.id_type,
      sender_type: item.sender?.sender_type,
    },
    mentions: (item.mentions || []).map((m: any) => ({
      key: m.key,
      id: m.id,
      name: m.name,
    })),
    text: extractText(item.body?.content, item.msg_type),
  }));

  return {
    has_more: data.has_more ?? false,
    page_token: data.page_token,
    messages,
  };
};
