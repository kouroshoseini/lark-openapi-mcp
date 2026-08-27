import * as lark from '@larksuiteoapi/node-sdk';
import { readChatMessages } from '../../../src/mcp-tool/utils/read-chat-messages';
import { larkImBuiltinReadChatMessagesTool } from '../../../src/mcp-tool/tools/en/builtin-tools/im/buildin';

describe('readChatMessages', () => {
  const mockClient = {
    request: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call the API with user token and parse messages', async () => {
    mockClient.request.mockResolvedValueOnce({
      data: {
        code: 0,
        msg: 'success',
        data: {
          has_more: false,
          page_token: 'next-token',
          items: [
            {
              message_id: 'om_1',
              msg_type: 'text',
              create_time: '1615380573411',
              deleted: false,
              chat_id: 'oc_1',
              sender: { id: 'ou_1', id_type: 'open_id', sender_type: 'user' },
              body: { content: '{"text":"hello world"}' },
              mentions: [{ key: '@_user_1', id: 'ou_9', name: 'Tom' }],
            },
          ],
        },
      },
    });

    const result = await readChatMessages(mockClient as any, { chat_id: 'oc_1' }, 'test-token');

    expect(lark.withUserAccessToken).toHaveBeenCalledWith('test-token');
    expect(mockClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/open-apis/im/v1/messages',
        params: expect.objectContaining({ container_id_type: 'chat', container_id: 'oc_1' }),
      }),
      expect.any(Object),
    );
    expect(result.has_more).toBe(false);
    expect(result.page_token).toBe('next-token');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].text).toBe('hello world');
    expect(result.messages[0].sender.id).toBe('ou_1');
    expect(result.messages[0].mentions[0].name).toBe('Tom');
  });

  it('should not pass a user token when none provided', async () => {
    mockClient.request.mockResolvedValueOnce({ data: { code: 0, data: { items: [] } } });

    await readChatMessages(mockClient as any, { chat_id: 'oc_1' });

    expect(mockClient.request).toHaveBeenCalledTimes(1);
    expect(mockClient.request).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should extract post content and fall back for non-JSON content', async () => {
    mockClient.request.mockResolvedValueOnce({
      data: {
        code: 0,
        data: {
          items: [
            {
              message_id: 'om_p',
              msg_type: 'post',
              body: {
                content: JSON.stringify({
                  title: 'T',
                  content: [[{ tag: 'text', text: 'line1' }], [{ tag: 'text', text: 'line2' }]],
                }),
              },
            },
            { message_id: 'om_bad', msg_type: 'text', body: { content: 'not json' } },
          ],
        },
      },
    });

    const result = await readChatMessages(mockClient as any, { chat_id: 'oc_1' }, 't');

    expect(result.messages[0].text).toBe('T\nline1\nline2');
    expect(result.messages[1].text).toBe('not json');
  });
});

describe('im.builtin.readChatMessages handler', () => {
  const mockClient = {
    request: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an error when no user access token is available', async () => {
    const result = await (larkImBuiltinReadChatMessagesTool.customHandler as any)(
      mockClient,
      { chat_id: 'oc_1' },
      {},
    );

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).code).toBe(99991668);
  });

  it('should return parsed messages with user access token', async () => {
    mockClient.request.mockResolvedValueOnce({
      data: {
        code: 0,
        data: {
          has_more: false,
          items: [
            {
              message_id: 'om_1',
              msg_type: 'text',
              body: { content: '{"text":"hi"}' },
            },
          ],
        },
      },
    });

    const result = await (larkImBuiltinReadChatMessagesTool.customHandler as any)(
      mockClient,
      { chat_id: 'oc_1' },
      { userAccessToken: 'test-token' },
    );

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.messages[0].text).toBe('hi');
  });
});
