import * as lark from '@larksuiteoapi/node-sdk';

const MAX_PAGES = 20;

/**
 * Flatten an OKR rich-text content_block into readable plain text.
 */
export const blockToText = (content: any): string => {
  if (!content) return '';
  if (typeof content === 'string') return content;

  const blocks = content.blocks || [];
  const lines: string[] = [];

  for (const block of blocks) {
    const paragraph = block?.paragraph;
    if (!paragraph) continue;

    const parts: string[] = [];
    for (const el of paragraph.elements || []) {
      if (el?.type === 'textRun') {
        parts.push(el.textRun?.text ?? '');
      } else if (el?.type === 'docsLink') {
        parts.push(el.docsLink?.title || el.docsLink?.url || '');
      } else if (el?.type === 'person') {
        parts.push(`@${el.person?.openId || ''}`);
      }
    }
    if (parts.length) lines.push(parts.join(''));
  }

  return lines.join('\n');
};

/**
 * Build a minimal single-paragraph rich-text content_block from a plain string.
 */
export const textToBlock = (text: string): any => ({
  blocks: [
    {
      type: 'paragraph',
      paragraph: {
        elements: [{ type: 'textRun', textRun: { text } }],
      },
    },
  ],
});

/**
 * Resolve the current user's id via the authen user_info API (requires user_access_token).
 */
export const resolveMyUserId = async (client: lark.Client, userAccessToken?: string): Promise<string | undefined> => {
  if (!userAccessToken) return undefined;

  const response = await client.request(
    { method: 'GET', url: '/open-apis/authen/v1/user_info' },
    lark.withUserAccessToken(userAccessToken),
  );

  const body = response.data ?? {};
  return body.data?.open_id ?? body.data?.user_id;
};

export interface ReadMyOkrParams {
  user_id?: string;
  user_id_type?: 'open_id' | 'union_id' | 'user_id' | 'people_admin_id';
  year?: string;
  period_id?: string;
  period_ids?: string[];
  lang?: string;
}

const summarizeObjective = (obj: any) => ({
  id: obj.id,
  content: obj.content,
  score: obj.score,
  weight: obj.weight,
  progress_percent: obj.progress_rate?.percent,
  status: obj.progress_rate?.status,
  progress_report: obj.progress_report,
  deadline: obj.deadline,
  progress_records: (obj.progress_record_list || []).map((p: any) => p.id),
  key_results: (obj.kr_list || []).map((kr: any) => ({
    id: kr.id,
    content: kr.content,
    score: kr.score,
    weight: kr.kr_weight ?? kr.weight,
    progress_percent: kr.progress_rate?.percent,
    status: kr.progress_rate?.status,
    deadline: kr.deadline,
    progress_records: (kr.progress_record_list || []).map((p: any) => p.id),
  })),
});

const summarizeOkr = (okr: any) => ({
  id: okr.id,
  name: okr.name,
  period_id: okr.period_id,
  permission: okr.permission,
  confirm_status: okr.confirm_status,
  objectives: (okr.objective_list || []).map(summarizeObjective),
});

/**
 * Read the current user's OKR list (objectives and key results with scores,
 * progress and status), optionally filtered by period or year.
 */
export const readMyOkr = async (
  client: lark.Client,
  params: ReadMyOkrParams,
  userAccessToken?: string,
): Promise<any> => {
  const { user_id_type = 'open_id', year, period_id, period_ids, lang } = params;

  let userId = params.user_id;
  if (!userId) {
    userId = await resolveMyUserId(client, userAccessToken);
  }

  const limit = 10;
  const allOkr: any[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const requestOptions = {
      method: 'GET',
      url: `/open-apis/okr/v1/users/${userId}/okrs`,
      params: {
        user_id_type,
        offset: String(allOkr.length),
        limit: String(limit),
        lang,
        period_ids,
      },
    };

    const response = userAccessToken
      ? await client.request(requestOptions, lark.withUserAccessToken(userAccessToken))
      : await client.request(requestOptions);

    const body = response.data ?? {};
    const data = body.data ?? {};
    const list = data.okr_list || [];
    allOkr.push(...list);

    if (list.length < limit) break;
    if (data.total != null && allOkr.length >= data.total) break;
  }

  let okrList = allOkr;
  if (period_id) {
    okrList = okrList.filter((okr) => okr.period_id === period_id);
  }
  if (year) {
    okrList = okrList.filter((okr) => String(okr.name).includes(year));
  }

  return {
    user_id: userId,
    user_id_type,
    okr_list: okrList.map(summarizeOkr),
  };
};

export interface CreateProgressParams {
  target_id: string;
  target_type: number;
  content: string | any;
  source_title?: string;
  source_url?: string;
  user_id_type?: 'open_id' | 'union_id' | 'user_id';
}

/**
 * Create an OKR progress record on an objective or key result.
 */
export const createProgress = async (
  client: lark.Client,
  params: CreateProgressParams,
  userAccessToken?: string,
): Promise<any> => {
  const { target_id, target_type, content, source_title, source_url, user_id_type } = params;

  const data = {
    source_title: source_title || 'MCP progress',
    source_url: source_url || 'https://open.feishu.cn',
    target_id,
    target_type,
    content: typeof content === 'string' ? textToBlock(content) : content,
  };

  const requestOptions = {
    method: 'POST',
    url: '/open-apis/okr/v1/progress_records',
    params: { user_id_type },
    data,
  };

  const response = userAccessToken
    ? await client.request(requestOptions, lark.withUserAccessToken(userAccessToken))
    : await client.request(requestOptions);

  const body = response.data ?? {};
  return body.data ?? body;
};

export interface UpdateProgressParams {
  progress_id: string;
  content: string | any;
  user_id_type?: 'open_id' | 'union_id' | 'user_id';
}

/**
 * Update an OKR progress record by progress id.
 */
export const updateProgress = async (
  client: lark.Client,
  params: UpdateProgressParams,
  userAccessToken?: string,
): Promise<any> => {
  const { progress_id, content, user_id_type } = params;

  const data = {
    content: typeof content === 'string' ? textToBlock(content) : content,
  };

  const requestOptions = {
    method: 'PUT',
    url: `/open-apis/okr/v1/progress_records/${progress_id}`,
    params: { user_id_type },
    data,
  };

  const response = userAccessToken
    ? await client.request(requestOptions, lark.withUserAccessToken(userAccessToken))
    : await client.request(requestOptions);

  const body = response.data ?? {};
  return body.data ?? body;
};
