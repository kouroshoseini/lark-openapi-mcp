import { McpTool } from '../../../../types';
import { z } from 'zod';
import { readChatMessages } from '../../../../utils/read-chat-messages';

// 工具名称类型
export type imBuiltinToolName = 'im.builtin.batchSend' | 'im.builtin.readChatMessages';

export const larkImBuiltinBatchSendTool: McpTool = {
  project: 'im',
  name: 'im.builtin.batchSend',
  accessTokens: ['tenant'],
  description: '[飞书/Lark] - 批量发送消息 - 支持给多个用户、部门批量发送消息，支持文本和卡片',
  schema: {
    data: z.object({
      msg_type: z
        .enum(['text', 'post', 'image', 'interactive', 'share_chat'])
        .describe(
          '消息类型,如果 msg_type 取值为 text、image、post 或者 share_chat，则消息内容需要传入 content 参数内。如果 msg_type 取值为 interactive，则消息内容需要传入 card 参数内。富文本类型（post）的消息，不支持使用 md 标签。',
        ),
      content: z
        .any()
        .describe(
          '消息内容，JSON 结构。该参数的取值与 msg_type 对应，例如 msg_type 取值为 text，则该参数需要传入文本类型的内容。',
        )
        .optional(),
      card: z
        .any()
        .describe(
          '卡片内容，JSON 结构。该参数的取值与 msg_type 对应，仅当 msg_type 取值为 interactive 时，需要将卡片内容传入当前参数。当 msg_type 取值不为 interactive 时，消息内容需要传入到 content 参数。',
        )
        .optional(),
      open_ids: z.array(z.string()).describe('接收者open_id列表').optional(),
      user_ids: z.array(z.string()).describe('接收者user_id列表').optional(),
      union_ids: z.array(z.string()).describe('接收者union_id列表').optional(),
      department_ids: z
        .array(z.string())
        .describe('部门 ID 列表。列表内支持传入部门 department_id 和 open_department_id')
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
    '[飞书/Lark] - 读取聊天消息 - 以用户身份（user access token）读取群聊的历史消息，返回每条消息的发送者、时间、消息类型和可读文本。支持通过 page_token 分页。',
  schema: {
    chat_id: z
      .string()
      .describe('群聊 ID。可调用 im.v1.chat.list 获取用户所在的群列表并取得 chat_id。'),
    page_size: z.number().describe('每页消息数量（1-50，默认 50）').optional(),
    page_token: z.string().describe('上一次调用返回的分页标记。首次请求可不填。').optional(),
    start_time: z.string().describe('待查询消息的起始时间戳（秒）').optional(),
    end_time: z.string().describe('待查询消息的结束时间戳（秒）').optional(),
    sort_type: z
      .enum(['ByCreateTimeAsc', 'ByCreateTimeDesc'])
      .describe('消息排序方式（默认 ByCreateTimeAsc）')
      .optional(),
    useUAT: z
      .boolean()
      .describe('该工具需要用户身份。设置为 true 以用户身份读取消息。')
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
                msg: '该工具需要用户访问令牌。请启用 OAuth（--oauth）并设置 --token-mode user_access_token，或在 auto 模式下传入 useUAT: true。',
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
