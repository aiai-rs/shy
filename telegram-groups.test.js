const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Execute the real configuration and registered handlers without starting the
// database, webhook, HTTP server, or making requests to Telegram.
const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
function section(start, end) {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from + start.length);
    assert.ok(from >= 0 && to > from, `Missing application section: ${start}`);
    return source.slice(from, to);
}

function harness(env = { GROUP_CHAT_IDS: '-5123456789' }) {
    const handlers = new Map();
    const calls = [];
    const state = {
        process: { env }, console,
        authorizedUsers: new Map(), warningMessages: new Map(),
        unauthorizedMessages: new Map(), pendingTravelAuthorizations: new Map(),
        saveAuth() {}, clearPendingAuthorizationTimer() {},
        clearPendingTravelForUser() {}, schedulePendingAuthorizationReminder() {},
        escapeHTML: value => String(value), t: (chatId, key) => key,
        isAdmin: async (chatId, userId) => userId === 1,
        getOrRefreshToken: () => 'valid-token',
        safeTokenEqual: (actual, expected) => actual === expected,
        isAllowedImageBuffer: () => true, rawUploadLimiter() {},
        sendToChat: async (...args) => calls.push(['sendToChat', ...args]),
        app: { post: (route, ...args) => handlers.set(route, args.at(-1)) },
        bot: {
            use: handler => handlers.set('middleware', handler),
            on: (event, handler) => handlers.set(event, handler),
            hears: (text, handler) => handlers.set(text, handler),
            telegram: {
                sendMessage: async (...args) => calls.push(['sendMessage', ...args]),
                restrictChatMember: async (...args) => calls.push(['restrictChatMember', ...args]),
                setChatPermissions: async (...args) => calls.push(['setChatPermissions', ...args]),
                getChatMember: async () => ({ status: 'member' })
            }
        }
    };
    vm.createContext(state);
    vm.runInContext(section('// --- 客服系统与 Bot 变量 ---', '// --- 商城系统变量 ---'), state);
    vm.runInContext(section('const makeAuthorizationKey', 'function clearPendingAuthorizationTimer'), state);
    vm.runInContext(section('bot.use(async (ctx, next)', "bot.on('new_chat_members'"), state);
    vm.runInContext(section("bot.on('new_chat_members'", "bot.command('lang'"), state);
    vm.runInContext(section("bot.hears('/用户失联'", 'let telegramWebhookPath'), state);
    vm.runInContext(section("bot.hears('/解锁'", "bot.hears('/本群解散清除无关人员'"), state);
    vm.runInContext(section("bot.on('text'", "bot.on('photo'"), state);
    vm.runInContext(section("app.post('/upload'", "app.post('/api/user/check'"), state);
    return { state, handlers, calls, evaluate: code => vm.runInContext(code, state) };
}

function context(type = 'group', id = -5123456789) {
    const replies = [];
    const ctx = {
        chat: { id, type }, from: { id: 1, first_name: 'Admin' },
        message: { text: '授权', reply_to_message: { message_id: 10, from: { id: 2, first_name: 'Member' } } },
        reply: async text => { replies.push(text); return { message_id: 100 + replies.length }; },
        deleteMessage: async () => { ctx.deleted = true; },
        leaveChat: async () => { ctx.left = true; },
        replies
    };
    return ctx;
}

test('new ordinary and supergroup IDs extend the existing whitelist and deduplicate', () => {
    const h = harness({ GROUP_CHAT_IDS: ' -5123456789，-1009999999999, -5123456789\n-5234567890 ' });
    assert.equal(h.evaluate('GROUP_CHAT_IDS.length'), 23);
    for (const id of [-5123456789, -5234567890, -1009999999999, -1003354803364, -1003293673373]) {
        assert.equal(h.evaluate(`GROUP_CHAT_IDS.includes(${id})`), true);
    }
});

test('missing and empty configuration retain all original groups', () => {
    for (const env of [{}, { GROUP_CHAT_IDS: ' ,，\n ' }]) {
        const h = harness(env);
        assert.equal(h.evaluate('GROUP_CHAT_IDS.length'), 20);
    }
});

test('all ten requested groups are usable without Render environment changes', async () => {
    const h = harness({});
    const groupIds = [
        -5226016076, -5491654794, -5404416503, -5412404896, -5284646576,
        -5220763076, -5390136680, -5205876648, -5351887171, -5597761544
    ];
    for (const id of groupIds) {
        const ctx = context('group', id);
        let continued = false;
        await h.handlers.get('middleware')(ctx, () => { continued = true; });
        assert.equal(continued, true, `Group ${id} must pass the whitelist`);
        assert.equal(ctx.left, undefined);
        await h.handlers.get('text')(ctx, async () => {});
        assert.equal(h.state.authorizedUsers.get(`${id}_2`), 'user');
        const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
        await h.handlers.get('/upload')({ body: Buffer.from('image'), query: { chatid: String(id), token: 'valid-token' } }, res);
        assert.equal(res.statusCode, 200, `Group ${id} must accept valid upload links`);
    }
});

test('invalid, positive, zero, fractional, and unsafe IDs fail configuration', () => {
    for (const id of ['5123456789', '0', '-0', '-5.2', '-5abc', '-5e9', '-9007199254740992']) {
        assert.throws(() => harness({ GROUP_CHAT_IDS: id }), /GROUP_CHAT_IDS 包含无效群 ID/);
    }
});

test('special group environment variables are trimmed', () => {
    const h = harness({ ALLOWED_GROUP_ID: ' -5123456789 ', TG_ADMIN_GROUP_ID: ' -5234567890\n' });
    assert.equal(h.evaluate('ALLOWED_GROUP_ID'), '-5123456789');
    assert.equal(h.evaluate('TG_ADMIN_GROUP_ID'), '-5234567890');
});

test('whitelisted and special groups reach handlers without leaving', async () => {
    const h = harness({ GROUP_CHAT_IDS: '-5123456789', ALLOWED_GROUP_ID: ' -5234567890 ', TG_ADMIN_GROUP_ID: '-5345678901' });
    for (const id of [-5123456789, -1003354803364, -5234567890, -5345678901]) {
        const ctx = context('group', id);
        let continued = false;
        await h.handlers.get('middleware')(ctx, () => { continued = true; });
        assert.equal(continued, true);
        assert.equal(ctx.left, undefined);
    }
});

test('unlisted negative IDs are still rejected', async () => {
    const h = harness();
    const ctx = context('group', -5999999999);
    let continued = false;
    await h.handlers.get('middleware')(ctx, () => { continued = true; });
    assert.equal(ctx.left, true);
    assert.equal(continued, false);
});

for (const type of ['group', 'supergroup']) {
    test(`${type}: joining members are welcomed; only supergroups call individual mute`, async () => {
        const h = harness();
        const ctx = context(type);
        ctx.message.new_chat_members = [{ id: 2, first_name: 'Member' }, { id: 3, is_bot: true }];
        await h.handlers.get('new_chat_members')(ctx);
        assert.equal(ctx.replies.length, 1);
        assert.equal(h.calls.filter(c => c[0] === 'restrictChatMember').length, type === 'supergroup' ? 1 : 0);
    });

    test(`${type}: admins can authorize members`, async () => {
        const h = harness();
        const ctx = context(type);
        await h.handlers.get('text')(ctx, async () => {});
        assert.equal(h.state.authorizedUsers.get('-5123456789_2'), 'user');
        assert.ok(ctx.replies.some(reply => reply.includes('已完成授权')));
        assert.equal(h.calls.filter(c => c[0] === 'restrictChatMember').length, type === 'supergroup' ? 1 : 0);
        if (type === 'group') assert.ok(ctx.replies.some(reply => reply.includes('普通群不支持单独禁言')));
    });

    test(`${type}: unauthorized messages are still deleted`, async () => {
        const h = harness();
        const ctx = context(type);
        ctx.from = { id: 2, first_name: 'Member' };
        ctx.message = { text: 'hello' };
        await h.handlers.get('text')(ctx, async () => {});
        assert.equal(ctx.deleted, true);
        assert.equal(ctx.replies[0], 'unauth_msg');
    });

    test(`${type}: group lock and unlock avoid unsupported individual permission calls`, async () => {
        const h = harness();
        h.state.authorizedUsers.set('-5123456789_2', 'user');
        for (const command of ['/用户失联', '/解锁']) {
            await h.handlers.get(command)(context(type));
        }
        assert.equal(h.calls.filter(c => c[0] === 'setChatPermissions').length, 2);
        assert.equal(h.calls.filter(c => c[0] === 'restrictChatMember').length, type === 'supergroup' ? 2 : 0);
    });

    test(`${type}: failed group permission changes do not announce success`, async () => {
        const h = harness();
        h.state.bot.telegram.setChatPermissions = async () => { throw new Error('Not enough rights'); };
        for (const [command, failure] of [['/用户失联', '锁定失败'], ['/解锁', '解锁失败']]) {
            const ctx = context(type);
            await h.handlers.get(command)(ctx);
            assert.equal(ctx.replies.length, 1);
            assert.ok(ctx.replies[0].includes(failure));
        }
    });
}

test('supergroup authorization failures do not grant a role', async () => {
    const h = harness();
    h.state.bot.telegram.restrictChatMember = async () => { throw new Error('Not enough rights'); };
    const ctx = context('supergroup');
    await h.handlers.get('text')(ctx, async () => {});
    assert.equal(h.state.authorizedUsers.has('-5123456789_2'), false);
    assert.ok(ctx.replies.some(reply => reply.includes('授权失败')));
});

test('non-admins cannot authorize another member', async () => {
    const h = harness();
    h.state.authorizedUsers.set('-5123456789_3', 'user');
    const ctx = context();
    ctx.from = { id: 3, first_name: 'Member' };
    await h.handlers.get('text')(ctx, async () => {});
    assert.equal(h.state.authorizedUsers.has('-5123456789_2'), false);
});

test('upload accepts configured negative IDs and retains group and token checks', async () => {
    for (const [chatid, token, expectedStatus] of [
        ['-5123456789', 'valid-token', 200],
        ['-1003354803364', 'valid-token', 200],
        ['-5999999999', 'valid-token', 403],
        ['-5123456789', 'wrong-token', 403]
    ]) {
        const h = harness();
        const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
        await h.handlers.get('/upload')({ body: Buffer.from('image'), query: { chatid, token } }, res);
        assert.equal(res.statusCode, expectedStatus);
        const sends = h.calls.filter(c => c[0] === 'sendToChat');
        assert.equal(sends.length, expectedStatus === 200 ? 2 : 0);
        if (expectedStatus === 200) assert.equal(sends[0][1], Number(chatid));
    }
});
