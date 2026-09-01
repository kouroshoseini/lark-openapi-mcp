import { McpTool } from '../../../../types';
import { z } from 'zod';
import { createProgress, readMyOkr, updateProgress } from '../../../../utils/okr';

export type okrBuiltinToolName =
  | 'okr.builtin.readMyOkr'
  | 'okr.builtin.addProgress'
  | 'okr.builtin.updateProgress';

const requireUserTokenError = {
  code: 99991668,
  msg: 'This tool requires a user access token. Enable OAuth (--oauth) and set --token-mode user_access_token, or pass useUAT: true in auto mode.',
};

export const larkOkrBuiltinReadMyOkrTool: McpTool = {
  project: 'okr',
  name: 'okr.builtin.readMyOkr',
  accessTokens: ['user', 'tenant'],
  description:
    '[Feishu/Lark] - Read my OKR - Read the current user\'s OKR (objectives and key results) for a given period or year, returning each item\'s content, score, progress percent and status. If no user_id is provided, it resolves the current user via the user access token. Scores and status are read-only.',
  schema: {
    user_id: z
      .string()
      .describe('Target user id. If omitted, the current user is resolved via the user access token.')
      .optional(),
    user_id_type: z
      .enum(['open_id', 'union_id', 'user_id', 'people_admin_id'])
      .describe('User ID type (default open_id)')
      .optional(),
    year: z
      .string()
      .describe('Filter by period name containing this year (e.g. "2026").')
      .optional(),
    period_id: z.string().describe('Filter by a specific OKR period id.').optional(),
    period_ids: z.array(z.string()).describe('Filter by a list of OKR period ids (up to 10).').optional(),
    lang: z.string().describe('Request the language version of OKR (en_us/zh_cn).').optional(),
    useUAT: z.boolean().describe('This tool works best as the user. Set to true to read OKR as the user.').optional(),
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
    '[Feishu/Lark] - Add OKR progress - Create a progress record (note) on an objective or key result. This is how you update work progress on OKR items. Scores and status are read-only and cannot be changed via the API.',
  schema: {
    target_id: z.string().describe('Target id: the objective id or key result id to attach the progress to.'),
    target_type: z
      .enum(['objective', 'key_result'])
      .describe('Target type: objective or key_result (maps to 2/3).'),
    content: z.string().describe('Progress note content in plain text.'),
    source_title: z.string().describe('Source title of the progress (e.g. "Weekly report").').optional(),
    source_url: z.string().describe('Source link (must start with http/https).').optional(),
    useUAT: z.boolean().describe('Set to true to create the progress as the user.').optional(),
  },
  customHandler: async (client, params, options): Promise<any> => {
    try {
      const { userAccessToken } = options || {};
      const targetType = params.target_type === 'objective' ? 2 : 3;
      const data = await createProgress(
        client,
        { ...params, target_type: targetType },
        userAccessToken,
      );
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
    '[Feishu/Lark] - Update OKR progress - Update the content of an existing OKR progress record by progress_id.',
  schema: {
    progress_id: z.string().describe('The OKR progress record id to update.'),
    content: z.string().describe('New progress note content in plain text.'),
    useUAT: z.boolean().describe('Set to true to update the progress as the user.').optional(),
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
