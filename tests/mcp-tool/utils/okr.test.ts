import * as lark from '@larksuiteoapi/node-sdk';
import {
  blockToText,
  textToBlock,
  readMyOkr,
  createProgress,
  updateProgress,
} from '../../../src/mcp-tool/utils/okr';
import { larkOkrBuiltinReadMyOkrTool } from '../../../src/mcp-tool/tools/en/builtin-tools/okr/builtin';

describe('okr utils', () => {
  const mockClient = {
    request: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('blockToText', () => {
    it('should flatten a rich-text block into plain text', () => {
      const content = {
        blocks: [
          {
            type: 'paragraph',
            paragraph: {
              elements: [
                { type: 'textRun', textRun: { text: 'hello ' } },
                { type: 'textRun', textRun: { text: 'world' } },
              ],
            },
          },
        ],
      };
      expect(blockToText(content)).toBe('hello world');
    });

    it('should return empty string for empty input', () => {
      expect(blockToText(undefined)).toBe('');
      expect(blockToText('')).toBe('');
      expect(blockToText('already text')).toBe('already text');
    });
  });

  describe('textToBlock', () => {
    it('should build a single paragraph block', () => {
      const block = textToBlock('hello');
      expect(block.blocks[0].paragraph.elements[0].textRun.text).toBe('hello');
    });
  });

  describe('readMyOkr', () => {
    it('should resolve current user id and page through the OKR list', async () => {
      mockClient.request.mockImplementation(async (opts: any) => {
        if (opts.url === '/open-apis/authen/v1/user_info') {
          return { data: { code: 0, data: { open_id: 'ou_me' } } };
        }
        return {
          data: {
            code: 0,
            data: {
              total: 1,
              okr_list: [
                {
                  id: 'okr_1',
                  name: '2026 Annual',
                  period_id: 'period_1',
                  confirm_status: 4,
                  objective_list: [
                    {
                      id: 'obj_1',
                      content: 'Ship product',
                      score: 90,
                      weight: 40,
                      progress_rate: { percent: 60, status: '0' },
                      progress_record_list: [{ id: 'pr_1' }],
                      kr_list: [
                        {
                          id: 'kr_1',
                          content: 'Launch feature',
                          score: 100,
                          kr_weight: 50,
                          progress_rate: { percent: 80, status: '1' },
                          progress_record_list: [{ id: 'pr_2' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        };
      });

      const result = await readMyOkr(mockClient as any, {}, 'test-token');

      expect(result.user_id).toBe('ou_me');
      expect(result.okr_list).toHaveLength(1);
      const obj = result.okr_list[0].objectives[0];
      expect(obj.content).toBe('Ship product');
      expect(obj.score).toBe(90);
      expect(obj.progress_percent).toBe(60);
      expect(obj.status).toBe('0');
      expect(obj.key_results[0].content).toBe('Launch feature');
      expect(obj.key_results[0].weight).toBe(50);
    });

    it('should filter by year when provided', async () => {
      mockClient.request.mockResolvedValue({
        data: {
          code: 0,
          data: {
            total: 2,
            okr_list: [
              { id: 'okr_1', name: '2026 Annual', objective_list: [] },
              { id: 'okr_2', name: '2025 Annual', objective_list: [] },
            ],
          },
        },
      });

      const result = await readMyOkr(mockClient as any, { user_id: 'ou_x', year: '2026' });

      expect(result.okr_list).toHaveLength(1);
      expect(result.okr_list[0].id).toBe('okr_1');
    });
  });

  describe('createProgress', () => {
    it('should POST a progress record with a text block', async () => {
      mockClient.request.mockResolvedValue({ data: { code: 0, data: { progress_id: 'pr_new' } } });

      const result = await createProgress(
        mockClient as any,
        { target_id: 'obj_1', target_type: 2, content: 'did work' },
        'test-token',
      );

      expect(lark.withUserAccessToken).toHaveBeenCalledWith('test-token');
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/open-apis/okr/v1/progress_records',
          data: expect.objectContaining({
            target_id: 'obj_1',
            target_type: 2,
            content: expect.objectContaining({ blocks: expect.any(Array) }),
          }),
        }),
        expect.any(Object),
      );
      expect(result.progress_id).toBe('pr_new');
    });
  });

  describe('updateProgress', () => {
    it('should PUT the updated progress content', async () => {
      mockClient.request.mockResolvedValue({ data: { code: 0, data: { progress_id: 'pr_1' } } });

      const result = await updateProgress(
        mockClient as any,
        { progress_id: 'pr_1', content: 'updated' },
        'test-token',
      );

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: '/open-apis/okr/v1/progress_records/pr_1',
          data: expect.objectContaining({ content: expect.objectContaining({ blocks: expect.any(Array) }) }),
        }),
        expect.any(Object),
      );
      expect(result.progress_id).toBe('pr_1');
    });
  });
});

describe('okr.builtin.readMyOkr handler', () => {
  const mockClient = { request: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an error when no user token and no user id', async () => {
    const result = await (larkOkrBuiltinReadMyOkrTool.customHandler as any)(mockClient, {}, {});

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).code).toBe(99991668);
  });

  it('should return okr summary with user token', async () => {
    mockClient.request.mockImplementation(async (opts: any) => {
      if (opts.url === '/open-apis/authen/v1/user_info') {
        return { data: { code: 0, data: { open_id: 'ou_me' } } };
      }
      return {
        data: {
          code: 0,
          data: {
            total: 1,
            okr_list: [{ id: 'okr_1', name: '2026 Annual', objective_list: [] }],
          },
        },
      };
    });

    const result = await (larkOkrBuiltinReadMyOkrTool.customHandler as any)(mockClient, {}, { userAccessToken: 't' });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.user_id).toBe('ou_me');
    expect(parsed.okr_list).toHaveLength(1);
  });
});
