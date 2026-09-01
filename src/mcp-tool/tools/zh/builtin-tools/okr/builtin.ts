import { McpTool } from '../../../../types';
import { z } from 'zod';
import { createProgress, readMyOkr, updateProgress } from '../../../../utils/okr';

export type okrBuiltinToolName =
  | 'okr.builtin.readMyOkr'
  | 'okr.builtin.addProgress'
  | 'okr.builtin.updateProgress';

const requireUserTokenError = {
  code: 99991668,
  msg: '该工具需要用户访问令牌。请启用 OAuth（--oauth）并设置 --token-mode user_access_token，或在 auto 模式下传入 useUAT: true。',
};

export const larkOkrBuiltinReadMyOkrTool: McpTool = {
  project: 'okr',
  name: 'okr.builtin.readMyOkr',
  accessTokens: ['user', 'tenant'],
  description:
    '[飞书/Lark] - 读取我的 OKR - 读取当前用户在指定周期或年份的 OKR（目标与关键结果），返回每个条目的内容、得分、进度百分比和状态。未提供 user_id 时通过用户访问令牌解析当前用户。得分与状态为只读。',
  schema: {
    user_id: z.string().describe('目标用户 id。省略时通过用户访问令牌解析当前用户。').optional(),
    user_id_type: z
      .enum(['open_id', 'union_id', 'user_id', 'people_admin_id'])
      .describe('用户 ID 类型（默认 open_id）')
      .optional(),
    year: z.string().describe('按周期名称中包含的年份过滤（如 "2026"）。').optional(),
    period_id: z.string().describe('按指定 OKR 周期 id 过滤。').optional(),
    period_ids: z.array(z.string()).describe('按 OKR 周期 id 列表过滤（最多 10 个）。').optional(),
    lang: z.string().describe('请求 OKR 的语言版本（en_us/zh_cn）。').optional(),
    useUAT: z.boolean().describe('该工具以用户身份使用效果最佳。设置为 true 以用户身份读取 OKR。').optional(),
  },
  customHandler: async (client, params, options): Promise<any> => {
    try {
      const { userAccessToken } = options || {};
      if (!userAccessToken && !params.user_id) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: JSON.stringify(requireUserTokenError) }],
        };
      }
      const data = await readMyOkr(client, params, userAccessToken);
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

export const larkOkrBuiltinAddProgressTool: McpTool = {
  project: 'okr',
  name: 'okr.builtin.addProgress',
  accessTokens: ['user', 'tenant'],
  description:
    '[飞书/Lark] - 新增 OKR 进展 - 在目标或关键结果上创建一条进展记录（笔记），用于更新 OKR 条目上的工作进展。得分与状态为只读，无法通过 API 修改。',
  schema: {
    target_id: z.string().describe('目标 id：要添加进展的目标或关键结果 id。'),
    target_type: z
      .enum(['objective', 'key_result'])
      .describe('目标类型：objective（目标，映射为 2）或 key_result（关键结果，映射为 3）。'),
    content: z.string().describe('进展笔记内容（纯文本）。'),
    source_title: z.string().describe('进展来源标题（如 "周报"）。').optional(),
    source_url: z.string().describe('来源链接（必须以 http/https 开头）。').optional(),
    useUAT: z.boolean().describe('设置为 true 以用户身份创建进展。').optional(),
  },
  customHandler: async (client, params, options): Promise<any> => {
    try {
      const { userAccessToken } = options || {};
      const targetType = params.target_type === 'objective' ? 2 : 3;
      const data = await createProgress(client, { ...params, target_type: targetType }, userAccessToken);
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

export const larkOkrBuiltinUpdateProgressTool: McpTool = {
  project: 'okr',
  name: 'okr.builtin.updateProgress',
  accessTokens: ['user', 'tenant'],
  description:
    '[飞书/Lark] - 更新 OKR 进展 - 按 progress_id 更新已有 OKR 进展记录的内容。',
  schema: {
    progress_id: z.string().describe('要更新的 OKR 进展记录 id。'),
    content: z.string().describe('新的进展笔记内容（纯文本）。'),
    useUAT: z.boolean().describe('设置为 true 以用户身份更新进展。').optional(),
  },
  customHandler: async (client, params, options): Promise<any> => {
    try {
      const { userAccessToken } = options || {};
      const data = await updateProgress(client, params, userAccessToken);
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

export const okrBuiltinTools = [
  larkOkrBuiltinReadMyOkrTool,
  larkOkrBuiltinAddProgressTool,
  larkOkrBuiltinUpdateProgressTool,
];
