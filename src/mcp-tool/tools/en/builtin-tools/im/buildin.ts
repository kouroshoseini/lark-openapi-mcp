import { McpTool } from '../../../../types';
import { z } from 'zod';
import { readChatMessages } from '../../../../utils/read-chat-messages';

export type imBuiltinToolName = 'im.builtin.batchSend' | 'im.builtin.readChatMessages';

export const larkImBuiltinBatchSendTool: McpTool = {
  project: 'im',
  name: 'im.builtin.batchSend',
  accessTokens: ['tenant'],
  description:
    '[Feishu/Lark] - Batch send messages - Supports batch sending messages to multiple users and departments, supports text and card',
  schema: {
    data: z.object({
      msg_type: z
        .enum(['text', 'post', 'image', 'interactive', 'share_chat'])
        .describe(
          'Message type. If msg_type is text, image, post, or share_chat, the message content should be passed in the content parameter. If msg_type is interactive, the message content should be passed in the card parameter. Rich text type (post) messages do not support md tags.',
        ),
      content: z
        .any()
        .describe(
          'Message content, JSON structure. The value of this parameter corresponds to msg_type. For example, if msg_type is text, this parameter should be the text content.',
        )
        .optional(),
      card: z
        .any()
        .describe(
          'Card content, JSON structure. The value of this parameter corresponds to msg_type. Only when msg_type is interactive, the card content should be passed in this parameter. When msg_type is not interactive, the message content should be passed in the content parameter.',
        )
        .optional(),
      open_ids: z.array(z.string()).describe('List of recipient open_ids').optional(),
      user_ids: z.array(z.string()).describe('List of recipient user_ids').optional(),
      union_ids: z.array(z.string()).describe('List of recipient union_ids').optional(),
      department_ids: z
        .array(z.string())
        .describe('List of department IDs. The list supports both department_id and open_department_id')
        .optional(),
    }),
  },
  customHandler: async (client, params): Promise<any> => {
    try {
      const { data } = params;
      const response = await client.request({
        method: 'POST',
        url: '/open-apis/message/v4/batch_send',
        data,
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(response.data ?? response),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify((error as any)?.response?.data || error),
          },
        ],
      };
    }
  },
};

export const larkImBuiltinReadChatMessagesTool: McpTool = {
  project: 'im',
  name: 'im.builtin.readChatMessages',
  accessTokens: ['user'],
  description:
    '[Feishu/Lark] - Read chat messages - Read the chat history (messages) of a group chat as the user (user access token), returning parsed sender, time, message type and readable text for each message. Supports pagination via page_token.',
  schema: {
    chat_id: z
      .string()
      .describe(
        'Group chat ID. Call im.v1.chat.list to discover the groups the user is in and obtain the chat_id.',
      ),
    page_size: z.number().describe('Number of messages per page (1-50, default 50)').optional(),
    page_token: z
      .string()
      .describe('Pagination token returned by a previous call. Omit for the first page.')
      .optional(),
    start_time: z.string().describe('Start timestamp in seconds for the messages to query').optional(),
    end_time: z.string().describe('End timestamp in seconds for the messages to query').optional(),
    sort_type: z
      .enum(['ByCreateTimeAsc', 'ByCreateTimeDesc'])
      .describe('Message sorting (default ByCreateTimeAsc)')
      .optional(),
    useUAT: z
      .boolean()
      .describe('This tool requires user identity. Set to true to read messages as the user.')
      .optional(),
  },
  customHandler: async (client, params, options): Promise<any> => {
    try {
      const { userAccessToken } = options || {};
      if (!userAccessToken) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                code: 99991668,
                msg: 'This tool requires a user access token. Enable OAuth (--oauth) and set --token-mode user_access_token, or pass useUAT: true in auto mode.',
              }),
            },
          ],
        };
      }
      const data = await readChatMessages(client, params, userAccessToken);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify((error as any)?.response?.data || (error as any)?.message || error),
          },
        ],
      };
    }
  },
};

export const imBuiltinTools = [larkImBuiltinBatchSendTool, larkImBuiltinReadChatMessagesTool];
