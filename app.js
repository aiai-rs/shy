require('dotenv').config();

const express = require('express');

const http = require('http');

const { Server } = require("socket.io");

const { PrismaClient } = require('@prisma/client');

const { Telegraf, Markup } = require('telegraf');

const cors = require('cors');

const webpush = require('web-push');

const dns = require('dns');

const bodyParser = require('body-parser');

const multer = require('multer');

const path = require('path');

const os = require('os');

const fs = require('fs');

const { Pool } = require('pg');

const cloudinary = require('cloudinary').v2;

const stream = require('stream');

const cron = require('node-cron');

const bcrypt = require('bcryptjs');

const { v4: uuidv4 } = require('uuid');

const crypto = require('crypto');

const xlsx = require('xlsx');

const https = require('https');

const rateLimit = require('express-rate-limit');

const QRCode = require('qrcode');

const PAY_MERCHANT_PID = process.env.PAY_MERCHANT_PID;
const PAY_MERCHANT_PRIVATE_KEY = process.env.PAY_MERCHANT_PRIVATE_KEY;
const PAY_PLATFORM_PUBLIC_KEY = process.env.PAY_PLATFORM_PUBLIC_KEY;

function buildPaySignStr(params) {
    return Object.keys(params)
        .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] !== undefined && params[k] !== null && !Array.isArray(params[k]))
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&');
}

function generatePaySign(params) {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(buildPaySignStr(params), 'utf8');
    return signer.sign(PAY_MERCHANT_PRIVATE_KEY, 'base64');
}

function verifyPaySign(params) {
    if (!params.sign) return false;
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(buildPaySignStr(params), 'utf8');
    try {
        return verifier.verify(PAY_PLATFORM_PUBLIC_KEY, params.sign, 'base64');
    } catch (e) {
        return false;
    }
}

dns.setDefaultResultOrder('ipv4first');



process.on('uncaughtException', async (err) => {

    console.error('🚨 系统崩溃:', err);

    try {

        const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

        await bot.telegram.sendMessage(TG_ADMIN_GROUP_ID, `🚨 **服务器崩溃预警**\n\n⏰ 时间：${time}\n❌ 原因：${err.code || '未知'}\n📝 详情：${err.message.substring(0, 100)}\n\n⚠️ 系统即将自动重启。`);

    } catch (e) {}

    setTimeout(() => { process.exit(1); }, 2000);

});



process.on('unhandledRejection', (reason) => {

    console.error('⚠️ 异步拒绝:', reason);

});



// ==========================================

// [1] 基础配置与环境变量

// ==========================================

const app = express();

app.set('trust proxy', 1);

const server = http.createServer(app);



const allowedOrigins = [

    'https://xaw888.com',

    'https://www.xaw888.com',

    'https://xaw8888.com',

    'https://www.xaw8888.com',

    'https://spht.netlify.app',

    'https://hy88.pro',

    'https://huiying8.netlify.app',

    'https://hthf.netlify.app',

    'http://127.0.0.1:5500', 

    'http://localhost:5500'  

];



const io = new Server(server, {

    cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },

    maxHttpBufferSize: 1e8,

    transports: ['websocket'],

    pingTimeout: 10000,

    pingInterval: 5000

});



const PORT = process.env.PORT || 10000;

const BOT_TOKEN = process.env.BOT_TOKEN;



// --- 客服系统与 Bot 变量 ---

const ALLOWED_GROUP_ID = process.env.ALLOWED_GROUP_ID;

const ALLOWED_BOT_USERS = (process.env.ALLOWED_BOT_USERS || '')

    .split(',')

    .map(id => Number(id.trim()))

    .filter(id => !isNaN(id));



const GROUP_CHAT_IDS = [

    -1003354803364, -1003381368112, -1003308598858, -1003368574609, -1003286063197,

    -1003378109615, -1003293673373, -1003203365614, -1000000000009, -1000000000010

];

const BACKUP_GROUP_ID = -1003293673373;

const TG_ADMIN_GROUP_ID = process.env.TG_ADMIN_GROUP_ID;



// --- 商城系统变量 ---

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const DATABASE_URL = process.env.DATABASE_URL;

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;

const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

const WEB_APP_URL = 'https://huiying8.netlify.app';

const AUTH_FILE = './authorized.json';



// --- 服务配置初始化 ---

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {

    try {

        webpush.setVapidDetails(

            process.env.VAPID_EMAIL || 'mailto:admin@huiying.com',

            process.env.VAPID_PUBLIC_KEY,

            process.env.VAPID_PRIVATE_KEY

        );

    } catch (error) {

        console.error("Web Push Config Error:", error.message);

    }

}



if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {

    cloudinary.config({

        cloud_name: CLOUDINARY_CLOUD_NAME,

        api_key: CLOUDINARY_API_KEY,

        api_secret: CLOUDINARY_API_SECRET

    });

}



// 静态文本字典

const TEXTS = {

    'zh-CN': {

        pm_reply: "❌ 🔒本机器人只供汇盈国际内部使用，你没有权限访问。如果有疑问，请联系汇盈国际负责人授权。🚫🚫",

        welcome_user: "🚫这是汇盈国际官方对接群 \n\n👤欢迎 ${name} ${username}！\n\n⚠️重要提醒：这是汇盈国际官方对接群，你还没有获得授权权限，请立即联系负责人进行授权！\n\n🔗联系方式：请联系汇盈国际负责人或等待通知。\n\n🚀汇盈国际 - 专业、安全、可靠💎",

        unauth_msg: "🚫这里是汇盈国际官方对接群🚫 \n\n${name} ${username}，👤你还没有获得授权！🚫\n\n💡立即联系负责人授权，否则无法发言。🚫\n\n🚀汇盈国际 - 专业、安全、可靠🚀",

        auth_success: "✅ 已授权 ✅ 用户 ${name}！(只能使用 /hc)",

        agent_auth_msg: "✅ 已授权中介✅ 路上只要是换车的请都使用 /zjkh 这个指令把链接发给你的兄弟，让你的兄弟拍照，（温馨提示：链接可以一直使用）",

        photo_prompt: "为了保障你的安全换车前请拍照！ 换车一定要是上一个司机安排的哦，如果是请点击下方拍照，如果不是请联系负责人",

        btn_photo: "📷开始拍照",

        zl_msg: "填写招聘申请时请打开手机录屏，按照上面顺序排列填写资料后拍照关闭手机录屏后发送到此群里！",

        zl_instr: "点击上方链接打开浏览器进行填写，填写时记住要录屏填写！填写好了发到此群！",

        zj_instr: "发给你的兄弟让兄弟打开浏览器进行填写，填写时记住要录屏填写！填写好了发到此群！",

        zl_btn_title: "👤请选择申请类型：",

        zj_btn_title: "👤请选择中介申请类型：",

        land_msg: "🚨🔥上车安全提醒 - 必读！🔥\n\n上车以后不要跟其他人过多交流，不要透露自己来自哪里，不要透露个人信息，不要透露自己来干嘛的，路线不只是带你自己出境的还带其他人的，车上什么人都有，有出境上班的，有案子跑路的，所以目的地很多人都是不一样的，不用过多的跟他们聊天！！\n\n👋欢迎新成员！请注意以上内容，确保安全出行。路上有什么问题及时报告到此群\n\n汇盈国际 - 专业、安全、可靠",

        flight_msg: "上车前要拍照到此群核对\n\n请务必在登机前使用 /hc 拍照上传当前位置！\n\n汇盈国际 - 安全第一",

        btn_land: "负责人安排走小路",

        btn_flight: "坐飞机",

        perm_deny: "❌ 🔒无权限！ /qc 只限汇盈国际负责人使用。",

        agent_deny: "❌ 无权限！此指令仅限授权中介使用。\n用户请使用 /hc",

        lj_text: "🔗汇盈国际官方对接群链接 \n\n🔗点击下方按钮直接加入群！",

        qc_confirm: "⚠️ **恢复出厂设置**\n\n是否确认清空所有数据？",

        qc_done: "✅ 出厂设置已完成！所有授权已清空\n临时任务已清除\nBot 已重置为全新状态",

        qc_cancel: "已取消操作。",

        sx_done: "✅ **本群**链接已刷新！旧链接已失效。",

        ban_msg: "用户已踢出并永久拉黑！",

        menu_title: "📋汇盈国际官方机器人指令面板",

        hc_desc: "换车安全拍照",

        zjkh_desc: "中介专用链接",

        boss_desc: "Boss 查崗",

        lg_desc: "龙哥查崗",

        sx_desc: "刷新链接 (旧链接失效)",

        zl_desc: "招聘申请",

        zj_desc: "中介申请",

        qc_desc: "恢复出厂",

        lh_desc: "踢出用户",

        lj_desc: "进群链接",

        link_title: "🔗 中介兄弟专用链接",

        link_copy: "请复制下方链接发送给你的兄弟：",

        boss_req: "汇盈国际负责人Boss要求你拍照",

        lg_req: "汇盈国际负责人龍哥要求你拍照",

        btn_confirm: "✅ 确认重置",

        btn_cancel: "❌ 取消",

        upload_title: "换车拍摄图片",

        loc_fail: "⚠️无定位❌请负责人核实！",

        map_amap: "高德地图",

        map_google: "谷歌地图",

        user_auth_msg: "✅ 已授权用户 ${name}！(只能用 /hc)"

    },

    'zh-TW': {

        pm_reply: "❌ 🔒本機器人只供匯盈國際內部使用，你沒有權限訪問。如果有疑問，請聯繫匯盈國際負責人授權。🚫🚫",

        welcome_user: "🚫這是匯盈國際官方對接群 \n\n👤歡迎 ${name} ${username}！\n\n⚠️重要提醒：這是匯盈國際官方對接群，你還沒有獲得授權權限，請立即聯繫負責人進行授權！\n\n🔗聯繫方式：請聯繫匯盈國際負責人或等待通知。\n\n🚀匯盈國際 - 專業、安全、可靠💎",

        unauth_msg: "🚫這裡是匯盈國際官方對接群🚫 \n\n${name} ${username}，👤你還沒有獲得授權！🚫\n\n💡立即聯繫負責人授權，否則無法發言。🚫\n\n🚀匯盈國際 - 專業、安全、可靠🚀",

        auth_success: "✅ 已授權 ✅ 用戶 ${name}！(只能使用 /hc)",

        agent_auth_msg: "✅ 已授權中介 ✅ 告知：路上只是要換車的請都使用 /zjkh 這個指令把鏈接發給你的兄弟，讓你的兄弟拍照，（溫馨提示：鏈接可以一直使用）",

        photo_prompt: "為了保障你的安全換車前請拍照！ 換車一定要是上一個司機安排的哦，如果是請點擊下方拍照，如果不是請聯繫負責人",

        btn_photo: "📷開始拍照",

        zl_msg: "填寫招聘申請時請打開手機錄屏，按照上面順序排列填寫資料後拍照關閉手機錄屏後發送到此群裡！",

        zl_instr: "點擊上方鏈接打開瀏覽器進行填寫，填寫時記住要錄屏填寫！填寫好了發到此群！",

        zj_instr: "發給你的兄弟讓兄弟打開瀏覽器進行填寫，填寫時記住要錄屏填寫！填寫好了發到此群！",

        zl_btn_title: "👤請選擇申請類型：",

        zj_btn_title: "👤請選擇中介申請類型：",

        land_msg: "🚨🔥上車安全提醒 - 必讀！🔥\n\n上車以後不要跟其他人過多交流，不要透露自己來自哪裡，不要透露個人信息，不要透露自己來幹嘛的，路線不只是帶你自己出境的還帶其他人的，車上什麼人都有，有出境上班的，有案子跑路的，所以目的地很多人都是不一樣的，不用過多的跟他們聊天！！\n\n👋歡迎新成員！請注意以上內容，確保安全出行。路上有什麼問題及時報告到此群\n\n匯盈國際 - 專業、安全、可靠",

        flight_msg: "上車前要拍照到此群核對\n\n請務必在登机前使用 /hc 拍照上傳當前位置！\n\n匯盈國際 - 安全第一",

        btn_land: "負責人安排走小路",

        btn_flight: "坐飛機",

        perm_deny: "❌ 🔒無權限！ /qc 只限匯盈國際負責人使用。",

        agent_deny: "❌ 無權限！此指令僅限授權中介使用。\n普通用戶請使用 /hc",

        lj_text: "🔗匯盈國際官方對接群鏈接 \n\n🔗點擊下方按鈕直接加入群！",

        qc_confirm: "⚠️ **恢復出厂设置**\n\n是否確認清空所有數據？",

        qc_done: "✅ 出厂设置已完成！所有授權已清空\n臨時任務已清除\nBot 已重置為全新狀態",

        qc_cancel: "已取消操作。",

        sx_done: "✅本群鏈接已刷新！舊鏈接已失效⚠️",

        ban_msg: "用戶已踢出並永久拉黑！",

        menu_title: "📋匯盈國際官方機器人指令面板",

        hc_desc: "換車安全拍照",

        zjkh_desc: "中介專用鏈接",

        boss_desc: "Boss 查崗",

        lg_desc: "龍哥查崗",

        sx_desc: "刷新鏈接 (舊鏈接失效)",

        zl_desc: "招聘申請",

        zj_desc: "中介申請",

        qc_desc: "恢復出厂",

        lh_desc: "踢出用戶",

        lj_desc: "進群鏈接",

        link_title: "🔗 中介兄弟專用鏈接",

        link_copy: "請複製下方鏈接發送給您的兄弟：",

        boss_req: "匯盈國際負責人Boss要求你拍照",

        lg_req: "匯盈國際負責人龍哥要求你拍照",

        btn_confirm: "✅ 確認重置",

        btn_cancel: "❌ 取消",

        upload_title: "換車拍攝圖片",

        loc_fail: "❌無定位⚠️請負責人核實",

        map_amap: "高德地圖",

        map_google: "谷歌地圖",

        user_auth_msg: "✅ 已授權用戶 ${name}！(只能用 /hc)"

    }

};



const ZL_LINKS = { '租车': 'https://che88.netlify.app', '大飞': 'https://fei88.netlify.app', '走药': 'https://yao88.netlify.app', '背债': 'https://bei88.netlify.app' };

const ZJ_LINKS = { '租车': 'https://zjc88.netlify.app', '大飞': 'https://zjf88.netlify.app', '走药': 'https://zjy88.netlify.app', '背债': 'https://zjb88.netlify.app' };



// Express 基础中间件

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, msg: "尝试次数过多，请15分钟后再试" }, standardHeaders: true, legacyHeaders: false });

const apiLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });



app.use(cors({

    origin: function (origin, callback) {

        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) return callback(null, false);

        return callback(null, true);

    },

    credentials: true

}));



app.use((req, res, next) => {

    const start = Date.now();

    res.on('finish', () => {

        const duration = Date.now() - start;

        console.log(`${new Date().toLocaleString()} | ${req.method} ${req.url} | Status: ${res.statusCode} | ${duration}ms`);

    });

    next();

});



app.use(bodyParser.json({ limit: '50mb' }));

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

app.use(express.static('public'));



if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } });



// ==========================================

// [2] 内存状态

// ==========================================

const onlineUsers = new Set();

const socketAutoReplyHistory = new Set();

let authorizedUsers = new Map();

let groupTokens = new Map();

let groupConfigs = new Map();

const warningMessages = new Map();

const unauthorizedMessages = new Map();

const zlMessages = new Map();

const tpSessions = {};

const pendingAgentAuth = new Map();

const pendingPayouts = new Map();

const activePayoutMessages = new Map();

const tgOrderMessages = new Map();

const mutedSessions = new Set();



// ==========================================

// [3] 数据库初始化 (Prisma + PostgreSQL)

// ==========================================

const prisma = new PrismaClient();

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });



const initDB = async () => {

    try {

        console.log("正在尝试连接数据库: " + DATABASE_URL);

        const client = await pool.connect();

        console.log("数据库连接成功，开始初始化表结构...");



        await client.query(`

            CREATE TABLE IF NOT EXISTS orders (

                order_id TEXT PRIMARY KEY,

                user_id BIGINT,

                product_name TEXT,

                variant_name TEXT,

                payment_method TEXT,

                usdt_amount NUMERIC(10, 4),

                cny_amount NUMERIC(10, 2),

                status TEXT DEFAULT '待支付',

                shipping_info TEXT,

                tracking_number TEXT,

                qrcode_url TEXT,

                proof TEXT,

                wallet TEXT,

                source TEXT,

                image_url TEXT,

                quantity INT DEFAULT 1,

                expires_at TIMESTAMP,

                balance_deducted NUMERIC(10, 4) DEFAULT 0,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

            );

        `);



        // 兼容和扩展已有字段

        try {

            await client.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS image_url TEXT");

            await client.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS wallet TEXT");

            await client.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT");

            await client.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS variant_name TEXT");

            await client.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS balance_deducted NUMERIC(10, 4) DEFAULT 0");

            await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS source TEXT");

        } catch (e) {

            console.error("扩展订单字段失败:", e.message);

        }



        await client.query(`

            CREATE TABLE IF NOT EXISTS withdrawals (

                id SERIAL PRIMARY KEY,

                user_id BIGINT,

                amount NUMERIC(10, 4),

                address TEXT,

                status TEXT DEFAULT '处理中',

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

            );

        `);



        await client.query(`

            CREATE TABLE IF NOT EXISTS products (

                id BIGINT PRIMARY KEY,

                name TEXT NOT NULL,

                price NUMERIC(10, 2) NOT NULL,

                stock INT DEFAULT 0,

                category TEXT,

                type TEXT,

                description TEXT,

                image_url TEXT,

                is_pinned BOOLEAN DEFAULT FALSE,

                variants JSONB DEFAULT '[]'::jsonb

            );

        `);



       try {
            await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb");
            await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS is_hot BOOLEAN DEFAULT FALSE");
            await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS hot_time TIMESTAMP");
            await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category TEXT");
            await client.query("ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_name TEXT");
        } catch (e) {
            console.error("扩展产品字段失败:", e.message);
        }



        await client.query(`CREATE TABLE IF NOT EXISTS hiring (id SERIAL PRIMARY KEY, title TEXT, content TEXT, contact TEXT);`);

        

        await client.query(`

            CREATE TABLE IF NOT EXISTS chats (

                id SERIAL PRIMARY KEY,

                session_id TEXT NOT NULL,

                sender TEXT,

                content TEXT,

                msg_type TEXT,

                source TEXT,

                is_read BOOLEAN DEFAULT FALSE,

                is_initiate BOOLEAN DEFAULT FALSE,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

            );

        `);



        try {

            await client.query("ALTER TABLE chats ADD COLUMN IF NOT EXISTS msg_type TEXT");

            await client.query("ALTER TABLE chats ADD COLUMN IF NOT EXISTS source TEXT");

        } catch (e) {

            console.error("扩展聊天字段失败:", e.message);

        }



        await client.query(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);`);

        await client.query(`CREATE TABLE IF NOT EXISTS categories (name TEXT PRIMARY KEY, priority INT DEFAULT 0);`);

        

        await client.query(`

            CREATE TABLE IF NOT EXISTS balance_logs (

                id SERIAL PRIMARY KEY,

                user_id BIGINT,

                type TEXT,

                amount NUMERIC(10, 4),

                remark TEXT,

                balance_after NUMERIC(10, 4),

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

            );

        `);



        await client.query(`

            CREATE TABLE IF NOT EXISTS site_visits (

                id SERIAL PRIMARY KEY,

                domain TEXT,

                visit_date DATE DEFAULT CURRENT_DATE,

                count INT DEFAULT 1,

                UNIQUE(domain, visit_date)

            );

        `);



        await client.query(`

            CREATE TABLE IF NOT EXISTS coupons (

                code TEXT PRIMARY KEY,

                amount NUMERIC(10, 2),

                expires_at TIMESTAMP,

                is_used BOOLEAN DEFAULT FALSE

            );

        `);

        await client.query(`

            CREATE TABLE IF NOT EXISTS push_subscriptions (

                id SERIAL PRIMARY KEY,

                user_id TEXT NOT NULL,

                endpoint TEXT UNIQUE NOT NULL,

                keys JSONB,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

            );

        `);



        try {

            await client.query("ALTER TABLE balance_logs ADD COLUMN IF NOT EXISTS balance_after NUMERIC(10, 4)");

        } catch (e) {

            console.error("扩展日志字段失败:", e.message);

        }



        // 初始化默认设置

        const defaults = [

            ['rate', '7.0'],

            ['feeRate', '0'],

            ['announcement', '欢迎来到 NEXUS 商城'],

            ['popup', 'true'],

            ['walletAddress', '请联系客服获取地址']

        ];

        

        for (const [k, v] of defaults) {

            await client.query(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [k, v]);

        }

        

        console.log("✅ 数据库表结构初始化完成");

        client.release();

    } catch (err) {

        console.error("❌ 数据库初始化崩溃详情:");

        console.error(err);

    }

};



// ==========================================

// [4] 核心工具库与辅助函数

// ==========================================

const generateShortId = () => Math.floor(100000 + Math.random() * 900000).toString();

const isCambodiaWorkingTime = () => {

    const h = (new Date().getUTCHours() + 7) % 24;

    return h >= 13 && h < 23;

};



const WELCOME_MESSAGE = `👋 您好！\n这里是汇盈国际业务员。\n\n👨‍💻 业务员正在与您连接...你可以正常发送消息\n我们将教您如何正确使用 Telegram 与老板直接沟通。\n\n⏰ 业务员上班时间 (柬埔寨时间):\n下午 13:00 - 晚上 23:00`;

const REST_MESSAGE = `💤 当前是休息时间 (柬埔寨 13:00-23:00 以外)。\n有事请留言，业务员上班后会第一时间回复你！\n\n⚠️ 为避免收不到回复通知，建议您点击页面下方的“APP”或“开启通知”按钮安装应用。`;



const forceDisconnectUser = async (targetId) => {

    try {

        const sockets = await io.in(targetId).fetchSockets();

        if (sockets.length > 0) {

            sockets.forEach(s => {

                s.emit('force_disconnect');

                s.disconnect(true);

            });

        }

        onlineUsers.delete(targetId);

        io.to('admin_room').emit('user_status_change', { userId: targetId, online: false });

    } catch (e) {

        console.error(`Disconnect error ${targetId}:`, e);

    }

};



const notifyAdminUpdate = (type, payload = {}) => {

    io.to('admin_room').emit('admin_update', { type, ...payload, timestamp: Date.now() });

};



const getSetting = async (key) => {

    const res = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);

    return res.rows.length > 0 ? res.rows[0].value : null;

};



const setSetting = async (key, value) => {

    await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, value.toString()]);

};



const uploadToCloud = (buffer) => {

    return new Promise((resolve, reject) => {

        const uploadStream = cloudinary.uploader.upload_stream({ folder: "nexus_store_products" }, (error, result) => {

            if (result) resolve(result.secure_url);

            else reject(error);

        });

        stream.Readable.from(buffer).pipe(uploadStream);

    });

};



const logBalance = async (client, userId, type, amount, remark) => {

    const res = await client.query("SELECT balance, contact FROM users WHERE id = $1", [userId]);

    const currentBal = res.rows[0] ? res.rows[0].balance : 0;

    const contact = res.rows[0] ? res.rows[0].contact : '未知';

    const insertRes = await client.query(

        "INSERT INTO balance_logs (user_id, type, amount, remark, balance_after) VALUES ($1, $2, $3, $4, $5) RETURNING *",

        [userId, type, amount, remark, currentBal]

    );

    const logData = insertRes.rows[0];
    logData.contact = contact;
    notifyAdminUpdate('funds', { payload: logData });
    notifyAdminUpdate('user_balance', { payload: { userId, balance: currentBal } });
};



async function handleReferralBonus(userId, amount, type) {

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const uRes = await client.query("SELECT invited_by FROM users WHERE id = $1", [userId]);

        const inviterId = uRes.rows[0]?.invited_by;

        

        if (inviterId) {

            const bonus = amount * 0.05;

            if (bonus > 0) {

                await client.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [bonus, inviterId]);

                await logBalance(client, inviterId, '佣金返利', bonus, `好友 ${userId} ${type} ${amount} USDT`);

                

                const notifySid = `user_${inviterId}`;

                const content = `💰 恭喜！您的好友完成了${type} (${amount} USDT)，您获得 ${bonus.toFixed(4)} USDT 返利！`;

                

                const msgRes = await client.query(

                    "INSERT INTO chats (session_id, sender, content, msg_type) VALUES ($1, 'admin', $2, 'text') RETURNING created_at",

                    [notifySid, content]

                );

                

                io.to(notifySid).emit('new_message', {

                    session_id: notifySid,

                    sender: 'admin',

                    content: content,

                   msg_type: 'text',
                    created_at: msgRes.rows[0].created_at
                });
                const bonusBalanceRes = await client.query("SELECT balance FROM users WHERE id = $1", [inviterId]);
                io.to(notifySid).emit('order_update', { balance: bonusBalanceRes.rows[0].balance });
            }
        }

        await client.query('COMMIT');

    } catch (e) {

        await client.query('ROLLBACK');

        console.error("Referral Bonus Error:", e);

    } finally {

        client.release();

    }

}



function getLang(chatId) {

    const config = groupConfigs.get(String(chatId));

    return config && config.lang ? config.lang : 'zh-CN';

}



function t(chatId, key, params = {}) {

    const lang = getLang(chatId);

    let text = TEXTS[lang][key] || TEXTS['zh-CN'][key] || key;

    for (const [k, v] of Object.entries(params)) {

        text = text.replace(new RegExp(`\\$\\{${k}\\}`, 'g'), v);

    }

    return text;

}



function getOrRefreshToken(chatId, forceRefresh = false) {

    const cid = String(chatId);

    if (forceRefresh || !groupTokens.has(cid)) {

        const newToken = crypto.randomBytes(8).toString('hex');

        groupTokens.set(cid, newToken);

        saveAuth();

        return newToken;

    }

    return groupTokens.get(cid);

}



function loadAuth() {

    try {

        if (fs.existsSync(AUTH_FILE)) {

            const data = fs.readFileSync(AUTH_FILE, 'utf8');

            const parsed = JSON.parse(data);

            authorizedUsers = new Map(Object.entries(parsed.users || {}));

            groupTokens = new Map(Object.entries(parsed.tokens || {}));

            groupConfigs = new Map(Object.entries(parsed.configs || {}));

        }

    } catch (e) {

        console.error("Failed to load auth data:", e.message);

    }

}



function saveAuth() {

    try {

        const data = {

            users: Object.fromEntries(authorizedUsers),

            tokens: Object.fromEntries(groupTokens),

            configs: Object.fromEntries(groupConfigs)

        };

        fs.writeFileSync(AUTH_FILE, JSON.stringify(data));

    } catch (e) {

        console.error("Failed to save auth data:", e.message);

    }

}

loadAuth();



function factoryReset() {

    authorizedUsers.clear();

    groupTokens.clear();

    groupConfigs.clear();

    warningMessages.clear();

    unauthorizedMessages.clear();

    zlMessages.clear();

    for (let k in tpSessions) delete tpSessions[k];

    pendingAgentAuth.clear();

    pendingPayouts.clear();

    activePayoutMessages.clear();

    try {

        if (fs.existsSync(AUTH_FILE)) fs.unlinkSync(AUTH_FILE);

    } catch (e) {}

}



const bot = new Telegraf(BOT_TOKEN, {

    telegram: {

        apiRoot: process.env.TG_PROXY_URL || 'https://api.telegram.org'

    }

});



bot.catch((err, ctx) => {

    console.error(`🚨 [Bot 全局错误] 触发类型: ${ctx.updateType}`, err);

});



async function sendToChat(chatId, photoBuffer, caption, lat, lng) {

    try {

        await bot.telegram.sendPhoto(chatId, { source: photoBuffer }, { caption, parse_mode: 'HTML' });

        if (lat && lng && (lat !== 0 || lng !== 0)) {

            await bot.telegram.sendLocation(chatId, lat, lng);

        }

    } catch (error) {

        try {

            await bot.telegram.sendMessage(BACKUP_GROUP_ID, `发送失败: ${error.message}`);

        } catch (e) {

            console.error("Failed backup TG send:", e.message);

        }

    }

}



async function isAdmin(chatId, userId) {

    try {

        const member = await bot.telegram.getChatMember(chatId, userId);

        return member.status === 'administrator' || member.status === 'creator';

    } catch (e) {

        return false;

    }

}



function downloadFileToBuffer(url) {

    return new Promise((resolve, reject) => {

        https.get(url, (res) => {

            const chunks = [];

            res.on('data', (d) => chunks.push(d));

            res.on('end', () => resolve(Buffer.concat(chunks)));

            res.on('error', (e) => reject(e));

        });

    });

}



function escapeHTML(str) {

    if (!str) return '';

    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

}



function generateMedicalSummary(jsonData) {

    const majorKeywords = ['高血压', '糖尿病', '结石', '肿瘤', '癌', '骨折', '艾滋', 'HIV', '肝炎', '结核', '肾衰', '心梗', '脑梗', '白血病', '贫血', '红斑狼疮', '尿毒症', '低钙血症', '胆囊炎'];

    let detectedIssues = [];

    let fullText = "";

    let lastVisitDate = null;

    let maxTimestamp = 0;



    jsonData.forEach(row => {

        if (Array.isArray(row)) {

            const rowStr = row.join(' ');

            fullText += rowStr + " ";

            if (row[6]) {

                const timeStr = String(row[6]);

                const ts = Date.parse(timeStr);

                if (!isNaN(ts)) {

                    if (ts > maxTimestamp) {

                        maxTimestamp = ts;

                        lastVisitDate = timeStr;

                    }

                }

            }

        }

    });



    majorKeywords.forEach(keyword => {

        if (new RegExp(keyword, 'i').test(fullText)) detectedIssues.push(keyword);

    });

    detectedIssues = [...new Set(detectedIssues)];



    let summaryText = `🧾 重点筛查（忽略普通症状）\n\n`;

    if (detectedIssues.length > 0) {

        summaryText += `🚨 检测到关键疾病记录：\n${detectedIssues.join('、')}\n`;

    } else {

        summaryText += `✅ 未检测到重大疾病关键词\n（已自动过滤感冒/发热/咳嗽等普通症状）\n`;

    }



    if (lastVisitDate) {

        summaryText += `\n📅 最后一次看病时间：${lastVisitDate}\n`;

    } else {

        summaryText += `\n📅 最后一次看病时间：未检测到有效日期\n`;

    }

    

    summaryText += `\n⚠️ 注意：此分析仅基于文本。`;

    return summaryText;

}



function renderCardPage(rawData, pageNum, mode = 'short') {

    const pageSize = 8;

    const start = (pageNum - 1) * pageSize;

    const end = start + pageSize;

    const pageData = rawData.slice(start, end);

    const totalPages = Math.ceil(rawData.length / pageSize);

    if (pageData.length === 0) return { text: "空文件", totalPages: 1 };



    const lines = pageData.map((row, index) => {

        const globalIndex = start + index + 1;

        const rowNum = String(globalIndex).padStart(2, '0');

        const getCol = (i) => (Array.isArray(row) && row[i] ? String(row[i]) : '');

        let name = getCol(2), id = getCol(1), hospital = getCol(3), type = getCol(4), diagnosis = getCol(5), time = getCol(6);

        

        if (name.includes('姓名') || id.includes('身份证')) return null;

        if (mode === 'short' && hospital.length > 12) hospital = hospital.substring(0, 10) + '..';



        return (`[${rowNum}]\n姓名：${name || '无'}\n身份证：${id || '无'}\n医院：${hospital || '无'}\n病症：${diagnosis || '无'}\n时间：${time || '无'}\n—————————————————`);

    }).filter(line => line !== null);



    return { text: lines.join('\n'), totalPages: totalPages };

}



// 替换 node-telegram-bot-api 的辅助函数

const sendTgNotify = (text) => {

    bot.telegram.sendMessage(TG_ADMIN_GROUP_ID, text, { parse_mode: 'HTML' }).catch(e => console.error("TG发送失败:", e.message));

};



// ==========================================

// [5] 🤖 Telegram Bot (全量逻辑保留)

// ==========================================



bot.use(async (ctx, next) => {

    // 1. 私聊拦截

    if (ctx.message && ctx.chat?.type === 'private') {

        const userId = ctx.from.id;

        const text = ctx.message.text || '[非文本]';

        

        // 允许名单内的不拦截 (聊天机器人逻辑)

        if (ALLOWED_BOT_USERS.length > 0 && ALLOWED_BOT_USERS.includes(userId)) return next();

        

        // 群管系统防御逻辑

        try {

            await ctx.reply(t(null, 'pm_reply'));

            const reportText = `🚨**私信访问警报**🚨\n👤: ${ctx.from.first_name}\nID: ${userId}\n內容: ${text}\n⏰: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;

            await bot.telegram.sendMessage(BACKUP_GROUP_ID, reportText, { parse_mode: 'Markdown' });

        } catch (e) {

            console.error("私信拦截通知失败:", e.message);

        }

        return;

    }



    // 2. 非授权群组访问监控

    const currentChatId = String(ctx.chat?.id);

    if (ctx.chat && ctx.chat.type !== 'private' && currentChatId !== ALLOWED_GROUP_ID && currentChatId !== TG_ADMIN_GROUP_ID && !GROUP_CHAT_IDS.includes(Number(currentChatId))) {

        try {

            if (ALLOWED_GROUP_ID) {

                const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Phnom_Penh' });

                await bot.telegram.sendMessage(ALLOWED_GROUP_ID, `🔔 **检测到机器人访问未授权群组**\n\n⏰ 时间: ${time}\n👤 姓名: ${ctx.from?.first_name}\n🆔 ID: \`${ctx.from?.id}\``, { parse_mode: 'Markdown' });

            }

            await ctx.leaveChat();

        } catch (e) {

            console.error("非法群组退出失败:", e.message);

        }

        return;

    }



    return next();

});



bot.on('new_chat_members', async (ctx) => {

    if (!GROUP_CHAT_IDS.includes(ctx.chat.id)) return;



    for (const m of ctx.message.new_chat_members) {

        if (m.is_bot) continue;

        authorizedUsers.delete(`${ctx.chat.id}_${m.id}`);

        saveAuth();

        

        try {

            await bot.telegram.restrictChatMember(ctx.chat.id, m.id, { permissions: { can_send_messages: false } });

        } catch (e) {

            console.error("禁言新用户失败:", e.message);

        }



        const warning = await ctx.reply(t(ctx.chat.id, 'welcome_user', { name: m.first_name, username: m.username ? `@${m.username}` : '' }));

        warningMessages.set(warning.message_id, { userId: m.id, userName: m.first_name, userUsername: m.username ? `@${m.username}` : '' });

    }



    await ctx.reply("🌏 请选择语言 / 請選擇語言", {

        reply_markup: {

            inline_keyboard: [

                [

                    { text: '🇨🇳 简体中文', callback_data: 'set_lang_cn' },

                    { text: '🇭🇰 繁體中文', callback_data: 'set_lang_tw' }

                ]

            ]

        }

    });

});



bot.command('bz', async (ctx) => {

    const chatId = String(ctx.chat.id);

    if (chatId === ALLOWED_GROUP_ID) {

        return ctx.reply(`🛠 **管理员指令全集**\n/bz - 帮助\n/ck - 统计\n/sjkqk - 清库\n/zc - 改密\n/del ID - 删除`, { parse_mode: 'Markdown' });

    }

    if (chatId === TG_ADMIN_GROUP_ID) {

        const helpMsg = `<b>🤖 NEXUS 控台指令</b>\n━━━━━━━━━━━━━━\n1. <b>/ck</b> - 查看数据统计\n2. <b>/qc</b> - ⚠️ 清空所有数据\n3. <b>设置汇率 [数值]</b>\n4. <b>设置手续费 [数值]</b>\n5. <b>设置钱包 [地址]</b> - 修改USDT收款地址\n6. <b>/fix_db</b> - 修复数据库字段缺失`;

        return ctx.reply(helpMsg, { parse_mode: 'HTML' });

    }

    if (GROUP_CHAT_IDS.includes(ctx.chat.id) && await isAdmin(ctx.chat.id, ctx.from.id)) {

        const helpText = `${t(ctx.chat.id, 'menu_title')}\n\n/hc - ${t(ctx.chat.id, 'hc_desc')}\n/zjkh - ${t(ctx.chat.id, 'zjkh_desc')}\n/boss - ${t(ctx.chat.id, 'boss_desc')}\n/lg - ${t(ctx.chat.id, 'lg_desc')}\n/sx - ${t(ctx.chat.id, 'sx_desc')}\n/zl - ${t(ctx.chat.id, 'zl_desc')}\n/zj - ${t(ctx.chat.id, 'zj_desc')}\n/qc - ${t(ctx.chat.id, 'qc_desc')}\n/lh - ${t(ctx.chat.id, 'lh_desc')}\n/lj - ${t(ctx.chat.id, 'lj_desc')}\n/zf - 财务转账 (已改为回复“打款 金额”)\n/tp - Excel预览 (新增)\n`;

        return ctx.reply(helpText);

    }

});



bot.command('ck', async (ctx) => {

    const chatId = String(ctx.chat.id);

    if (chatId === ALLOWED_GROUP_ID) {

        try {

            const userCount = await prisma.user.count();

            const msgCount = await prisma.message.count();

            const subCountRes = await pool.query('SELECT COUNT(*) FROM push_subscriptions');

            const subCount = parseInt(subCountRes.rows[0].count);

            const users = await prisma.user.findMany({ take: 10, orderBy: { updatedAt: 'desc' }, include: { _count: { select: { messages: true } } } });

            

            let text = `📊 **系统状态统计**\n👥 总用户数: ${userCount}\n📡 推送订阅: ${subCount}\n💬 总消息数: ${msgCount}\n\n📝 **最近活跃 (Top 10):**\n`;

            const buttons = [];

            users.forEach(u => {

                text += `🆔 \`${u.id}\` | 👤 ${u.bossId || '无'} | 💬 ${u._count.messages}\n`;

                buttons.push([Markup.button.callback(`🗑 删除 ${u.id}`, `del_${u.id}`)]);

            });

            buttons.push([Markup.button.callback('❌ 关闭列表', 'cancel')]);

            return ctx.reply(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });

        } catch (e) {

            return ctx.reply("❌ 查询失败");

        }

    }

    

    if (chatId === TG_ADMIN_GROUP_ID) {

        try {

            const [uRes, oRes, pRes] = await Promise.all([

                pool.query('SELECT COUNT(*) FROM users'),

                pool.query('SELECT COUNT(*) FROM orders'),

                pool.query('SELECT COUNT(*) FROM products')

            ]);

            

            const uptime = process.uptime();

            const runTimeStr = `${Math.floor(uptime / 86400)}天 ${Math.floor((uptime % 86400) / 3600)}小时 ${Math.floor((uptime % 3600) / 60)}分`;

            const memPercent = ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(1);

            

            let dbSizeGB = '0.00', dbConnections = '0', dbHitRatio = '0%', dbDeadlocks = '0';

            try {

                dbSizeGB = (parseInt((await pool.query("SELECT pg_database_size(current_database()) as size")).rows[0].size) / 1024 / 1024 / 1024).toFixed(2);

                dbConnections = (await pool.query("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()")).rows[0].count;

                const hitRes = await pool.query(`SELECT sum(heap_blks_read) as reads, sum(heap_blks_hit) as hits FROM pg_statio_user_tables`);

                const reads = hitRes.rows[0].reads || 0;

                const hits = hitRes.rows[0].hits || 0;

                dbHitRatio = reads + hits === 0 ? '100%' : `${(hits / (hits + reads) * 100).toFixed(1)}%`;

                dbDeadlocks = (await pool.query("SELECT deadlocks FROM pg_stat_database WHERE datname = current_database()")).rows[0]?.deadlocks || 0;

            } catch (dbErr) {

                console.error("DB Stats Error:", dbErr.message);

            }



            let cloudInfo = '未配置或 API 错误', cloudBar = '';

            try {

                const cloudRes = await cloudinary.api.usage();

                if (cloudRes?.credits) {

                    const cUsed = cloudRes.credits.usage.toFixed(2);

                    const cPercent = cloudRes.credits.used_percent.toFixed(1);

                    const filled = Math.min(10, Math.round(cPercent / 10));

                    cloudBar = `\n${'■'.repeat(filled) + '□'.repeat(10 - filled)}`;

                    cloudInfo = `额度: ${cloudRes.credits.limit} | 已用: ${cUsed} (${cPercent}%)`;

                }

            } catch (cErr) {

                console.error("Cloudinary Stats Error:", cErr.message);

            }



            const [rate, feeRate, wallet] = await Promise.all([getSetting('rate'), getSetting('feeRate'), getSetting('walletAddress')]);

            const drawBar = (percent) => {

                const filled = Math.min(10, Math.max(0, Math.round(percent / 10)));

                return '■'.repeat(filled) + '□'.repeat(10 - filled);

            };



            const stats = `<b>📊  NEXUS 服务器监控面板</b>\n━━━━━━━━━━━━━━━━━━\n<b>🖥️ 系统信息</b>\n系统: ${os.type()} | CPU: ${os.cpus().length}核 | 负载: ${os.loadavg()[0].toFixed(2)}\n运行: ${runTimeStr}\n\n<b>💾 内存</b>\n占用: ${memPercent}%\n${drawBar(memPercent)}\n\n<b>🗄️ PostgreSQL</b>\n大小: ${dbSizeGB}GB | 连接: ${dbConnections} | 命中: ${dbHitRatio}\n\n<b>☁️ Cloudinary</b>\n${cloudInfo}${cloudBar}\n\n<b>📈 业务数据</b>\n👥 用户: ${uRes.rows[0].count} | 📦 订单: ${oRes.rows[0].count} | 🛒 商品: ${pRes.rows[0].count}\n\n<b>⚙️ 当前设置</b>\n汇率: ${rate||'N/A'} | 手续费: ${feeRate||'0'}%\n钱包: <code>${wallet||'未设置'}</code>`;

            await ctx.reply(stats, { parse_mode: 'HTML' });

        } catch (err) {

            await ctx.reply(`❌ 执行失败：${err.message}`);

        }

    }

});



bot.command('zc', async (ctx) => {

    if (String(ctx.chat.id) !== ALLOWED_GROUP_ID) return;

    const password = ctx.message.text.split(/\s+/)[1];

    if (!password) return ctx.reply("❌ 用法: /zc 新密码");

    

    try {

        await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', ['admin_password', password]);

        io.emit('force_admin_relogin');

        ctx.reply(`✅ 管理员密码已更新为: \`${password}\``, { parse_mode: 'Markdown' });

    } catch (e) {

        ctx.reply("❌ 修改失败: " + e.message);

    }

});



bot.command('scbq', async (ctx) => {

    if (!GROUP_CHAT_IDS.includes(ctx.chat.id)) return;

    if (!await isAdmin(ctx.chat.id, ctx.from.id)) return ctx.reply(t(ctx.chat.id, 'perm_deny'));



    try {

        const chatId = String(ctx.chat.id);

        const msgId = ctx.message.message_id;



        await ctx.reply("⚙️ <b>正在执行本群专属重置...</b>\n\n✅ 本群 Token、语言配置与授权记录已清理\n⏳ 正在后台疯狂删除本群历史消息（稍等片刻）...", { parse_mode: 'HTML' });



        groupTokens.delete(chatId);

        groupConfigs.delete(chatId);

        

        for (let key of authorizedUsers.keys()) {

            if (key.startsWith(`${chatId}_`)) {

                authorizedUsers.delete(key);

            }

        }

        saveAuth();



        (async () => {

            let i = 1; let consecutiveFails = 0;

            while (i <= 1000 && consecutiveFails < 20) {

                try {

                    await new Promise(r => setTimeout(r, 35));

                    await bot.telegram.deleteMessage(ctx.chat.id, msgId - i);

                    consecutiveFails = 0;

                } catch (e) {

                    consecutiveFails++;

                    if (e.description && e.description.includes("message can't be deleted")) break;

                }

                i++;

            }

            try { await bot.telegram.sendMessage(ctx.chat.id, "✅ 本群配置、授权人员及聊天记录已彻底清除，现在是一个干干净净的新群！"); } catch(e){}

        })();



    } catch (e) {

        await ctx.reply("❌ 清除失败: " + e.message);

    }

});



bot.command('qc', async (ctx) => {

    const chatId = String(ctx.chat.id);

    if (chatId === TG_ADMIN_GROUP_ID) {

        return ctx.reply("⚠️ <b>高危操作：请选择清理模式</b>", {

            parse_mode: 'HTML',

            reply_markup: {

                inline_keyboard: [

                    [{ text: "🧹 仅清空 订单/提现/充值", callback_data: 'qc_transactions' }],

                    [{ text: "💥 ⚠️ 删数据库 (清空所有)", callback_data: 'qc_everything' }],

                    [{ text: "❌ 取消", callback_data: 'qc_cancel' }]

                ]

            }

        });

    }

    if (GROUP_CHAT_IDS.includes(ctx.chat.id) && await isAdmin(ctx.chat.id, ctx.from.id)) {

        return ctx.reply(t(ctx.chat.id, 'qc_confirm'), {

            parse_mode: 'Markdown',

            reply_markup: {

                inline_keyboard: [

                    [{ text: t(ctx.chat.id, 'btn_confirm'), callback_data: 'qc_yes' }],

                    [{ text: t(ctx.chat.id, 'btn_cancel'), callback_data: 'qc_no' }]

                ]

            }

        });

    }

});



bot.command('sjkqk', async (ctx) => {

    if (String(ctx.chat.id) !== ALLOWED_GROUP_ID) return;

    ctx.reply('⚠️ **核弹警告：全库清空** ⚠️\n\n将删除：\n1. 所有聊天记录\n2. 所有用户账号\n3. 所有订阅\n\n确定执行？', Markup.inlineKeyboard([

        [Markup.button.callback('❌ 取消', 'cancel')],

        [Markup.button.callback('💥 确认全部删除', 'confirm_clear_all')]

    ]));

});



bot.command('qbsc', async (ctx) => {

    if (ctx.chat.type === 'private') return;

    if (!await isAdmin(ctx.chat.id, ctx.from.id)) return ctx.reply("❌ 🔒无权限！此指令只限管理员使用。");



   try {

        await ctx.reply("⚙️ 正在执行全局彻底清除 (清库+清内存)...");

        

        await pool.query('TRUNCATE users, orders, products, hiring, chats, withdrawals, settings, balance_logs, site_visits, coupons, push_subscriptions');

        

        await prisma.message.deleteMany({});

        await prisma.user.deleteMany({});

        

        factoryReset();

        io.emit('admin_db_cleared');

        io.emit('force_logout_all');

        const sockets = await io.fetchSockets();

        sockets.forEach(s => s.disconnect(true));

        onlineUsers.clear();



        await ctx.reply("✅ 彻底清除完毕！所有数据库与内存数据已干干净净。");

    } catch (e) {

        await ctx.reply("❌ 清除失败: " + e.message);

    }

});



bot.command('lj', async (ctx) => {

    if (!GROUP_CHAT_IDS.includes(ctx.chat.id)) return;

    if (!await isAdmin(ctx.chat.id, ctx.from.id)) return ctx.reply(t(ctx.chat.id, 'perm_deny'));

    try {

        const link = await bot.telegram.exportChatInviteLink(ctx.chat.id);

        ctx.reply(t(ctx.chat.id, 'lj_text'), { reply_markup: { inline_keyboard: [[{ text: '👉 点击加入 / 點擊加入', url: link }]] } });

    } catch (e) {

        ctx.reply('Error');

    }

});



bot.command('sx', async (ctx) => {

    if (!GROUP_CHAT_IDS.includes(ctx.chat.id)) return;

    if (!await isAdmin(ctx.chat.id, ctx.from.id)) return ctx.reply(t(ctx.chat.id, 'perm_deny'));

    getOrRefreshToken(ctx.chat.id, true);

    ctx.reply(t(ctx.chat.id, 'sx_done'), { parse_mode: 'Markdown' });

});



bot.command('hc', async (ctx) => {

    if (!GROUP_CHAT_IDS.includes(ctx.chat.id)) return;

    const userId = ctx.from.id;

    const role = authorizedUsers.get(`${ctx.chat.id}_${userId}`);

    const isAdminUser = await isAdmin(ctx.chat.id, userId);

    

    if (!isAdminUser && role !== 'user' && role !== 'agent') return ctx.reply(t(ctx.chat.id, 'perm_deny'));

    

    const token = getOrRefreshToken(ctx.chat.id);

    const url = `${WEB_APP_URL}/?chatid=${ctx.chat.id}&uid=${userId}&name=${encodeURIComponent(ctx.from.first_name)}&token=${token}`;

    ctx.reply(t(ctx.chat.id, 'photo_prompt'), { reply_markup: { inline_keyboard: [[{ text: t(ctx.chat.id, 'btn_photo'), url: url }]] } });

});



bot.command('zjkh', async (ctx) => {

    if (!GROUP_CHAT_IDS.includes(ctx.chat.id)) return;

    const userId = ctx.from.id;

    const role = authorizedUsers.get(`${ctx.chat.id}_${userId}`);

    const isAdminUser = await isAdmin(ctx.chat.id, userId);

    

    if (role !== 'agent' && !isAdminUser) return ctx.reply(t(ctx.chat.id, 'agent_deny'));

    

    const token = getOrRefreshToken(ctx.chat.id);

    const link = `${WEB_APP_URL}/?chatid=${ctx.chat.id}&uid=${userId}&name=${encodeURIComponent('中介-'+ctx.from.first_name)}&token=${token}`;

    ctx.reply(`${t(ctx.chat.id, 'link_title')}\n\n${t(ctx.chat.id, 'link_copy')}\n${link}`, { disable_web_page_preview: true });

});



bot.command('boss', async (ctx) => {

    if (!GROUP_CHAT_IDS.includes(ctx.chat.id)) return;

    if (!await isAdmin(ctx.chat.id, ctx.from.id)) return ctx.reply(t(ctx.chat.id, 'perm_deny'));

    if (!ctx.message.reply_to_message) return;

    

    const target = ctx.message.reply_to_message.from;

    const url = `${WEB_APP_URL}/?chatid=${ctx.chat.id}&uid=${target.id}&name=${encodeURIComponent(target.first_name)}&token=${getOrRefreshToken(ctx.chat.id)}`;

    ctx.reply(`${t(ctx.chat.id, 'boss_req')} @${target.first_name}`, { reply_markup: { inline_keyboard: [[{ text: t(ctx.chat.id, 'btn_photo'), url: url }]] } });

});



bot.command('lg', async (ctx) => {

    if (!GROUP_CHAT_IDS.includes(ctx.chat.id)) return;

    if (!await isAdmin(ctx.chat.id, ctx.from.id)) return ctx.reply(t(ctx.chat.id, 'perm_deny'));

    if (!ctx.message.reply_to_message) return;

    

    const target = ctx.message.reply_to_message.from;

    const url = `${WEB_APP_URL}/?chatid=${ctx.chat.id}&uid=${target.id}&name=${encodeURIComponent(target.first_name)}&token=${getOrRefreshToken(ctx.chat.id)}`;

    ctx.reply(`${t(ctx.chat.id, 'lg_req')} @${target.first_name}`, { reply_markup: { inline_keyboard: [[{ text: t(ctx.chat.id, 'btn_photo'), url: url }]] } });

});



async function handleLinkCommand(ctx, type) {

    if (!GROUP_CHAT_IDS.includes(ctx.chat.id)) return;

    if (!await isAdmin(ctx.chat.id, ctx.from.id)) return ctx.reply(t(ctx.chat.id, 'perm_deny'));

    

    const chatId = ctx.chat.id;

    const replyMsg = await ctx.reply(`${t(chatId, 'zl_msg')}\n\n${type === 'zl' ? t(chatId, 'zl_btn_title') : t(chatId, 'zj_btn_title')}`, {

        reply_markup: {

            inline_keyboard: [

                [{ text: '租车', callback_data: `${type}_租车` }, { text: '大飞', callback_data: `${type}_大飞` }],

                [{ text: '走药', callback_data: `${type}_走药` }, { text: '背债', callback_data: `${type}_背债` }]

            ]

        }

    });

    

    zlMessages.set(replyMsg.message_id, {

        commandType: type,

        targetFirstName: ctx.message.reply_to_message?.from.first_name || '未知',

        targetUserId: ctx.message.reply_to_message?.from.id || 0

    });

}

bot.command('zl', (ctx) => handleLinkCommand(ctx, 'zl'));

bot.command('zj', (ctx) => handleLinkCommand(ctx, 'zj'));



bot.command('lh', async (ctx) => {

    if (!GROUP_CHAT_IDS.includes(ctx.chat.id)) return;

    if (!await isAdmin(ctx.chat.id, ctx.from.id)) return ctx.reply(t(ctx.chat.id, 'perm_deny'));

    if (!ctx.message.reply_to_message) return;

    try {

        await bot.telegram.banChatMember(ctx.chat.id, ctx.message.reply_to_message.from.id);

        ctx.reply(t(ctx.chat.id, 'ban_msg'));

    } catch (e) {

        console.error("Ban member error:", e.message);

    }

});



bot.command('tp', async (ctx) => {

    if (!GROUP_CHAT_IDS.includes(ctx.chat.id)) return;

    if (!await isAdmin(ctx.chat.id, ctx.from.id)) return;

    

    const replyMsg = ctx.message.reply_to_message;

    if (!replyMsg || !replyMsg.document || !replyMsg.document.file_name.endsWith('.xlsx')) {

        return ctx.reply("❌ 请回复 .xlsx 格式的 Excel 文件。");

    }



    try {

        const statusMsg = await ctx.reply("⏳ 正在内存解析 Excel，请稍候...");

        const fileLink = await bot.telegram.getFileLink(replyMsg.document.file_id);

        const buffer = await downloadFileToBuffer(fileLink.href);

        const workbook = xlsx.read(buffer, { type: 'buffer' });

        const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });



        tpSessions[ctx.from.id] = {

            rawData: jsonData,

            mode: 'short',

            fileName: replyMsg.document.file_name.replace('.xlsx', ''),

            msgId: null

        };

        

        const { text: page1, totalPages } = renderCardPage(jsonData, 1, 'short');

        try { await bot.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch(e){}



        const previewMsg = await ctx.reply(`📄 ${tpSessions[ctx.from.id].fileName}的医疗文件预览（第 1 页 / 共 ${totalPages} 页）\n\n<pre>${page1}</pre>\n\n `, {

            parse_mode: 'HTML',

            reply_markup: {

                inline_keyboard: [

                    [{ text: '⬅️ 上一页', callback_data: 'tp_prev_1' }, { text: '下一页 ➡️', callback_data: 'tp_next_1' }],

                    [{ text: '🔘 显示/隐藏完整医院名称', callback_data: 'tp_toggle_mode_1' }],

                    [{ text: '🗑️ 删除预览会话', callback_data: 'tp_delete_session' }]

                ]

            }

        });

        

        tpSessions[ctx.from.id].msgId = previewMsg.message_id;

        await ctx.reply(generateMedicalSummary(jsonData));

    } catch (err) {

        ctx.reply("❌ 解析失败，请重试。");

    }

});



bot.on('text', async (ctx, next) => {

    const text = ctx.message.text.trim();

    const chatId = String(ctx.chat.id);

    const couponMatch = text.match(/^(?:设置)?优惠[劵券]\s*(\d+(?:\.\d+)?)/);



    // 商城設定

    if (chatId === TG_ADMIN_GROUP_ID) {

        if (text === '/fix_db') {

            try {

                await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS wallet TEXT;');

                await pool.query('ALTER TABLE chats ADD COLUMN IF NOT EXISTS msg_type TEXT;');

                await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS source TEXT;');

                await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT;');

                await pool.query('ALTER TABLE chats ADD COLUMN IF NOT EXISTS source TEXT;');

                return ctx.reply("✅ 数据库字段修复完成");

            } catch (e) {

                return ctx.reply("❌ " + e.message);

            }

        }

        if (text.startsWith('设置汇率 ')) {

            const val = parseFloat(text.split(' ')[1]);

            if (!isNaN(val)) {

                await setSetting('rate', val);

                io.emit('setting_updated', { key: 'rate', value: val });

                return ctx.reply(`✅ 汇率已设为: ${val}`);

            }

        }

        if (text.startsWith('设置手续费 ')) {

            const val = parseFloat(text.split(' ')[1]);

            if (!isNaN(val)) {

                await setSetting('feeRate', val);

                io.emit('setting_updated', { key: 'feeRate', value: val });

                return ctx.reply(`✅ 手续费已设为: ${val}%`);

            }

        }

        if (text.startsWith('设置钱包 ')) {

            const addr = text.split(' ')[1];

            if (addr && addr.length > 10) {

                await setSetting('walletAddress', addr);

                io.emit('setting_updated', { key: 'wallet', value: addr });

                return ctx.reply(`✅ <b>收款地址已更新</b>\n<code>${addr}</code>`, { parse_mode: 'HTML' });

            }

        }

        

        if (couponMatch) {

            const amount = parseFloat(couponMatch[1]);

            if (!isNaN(amount) && amount > 0) {

                const code = 'xaw' + Math.floor(1000 + Math.random() * 9000);

                await pool.query(`INSERT INTO coupons (code, amount, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`, [code, amount]);

                const replyText = `<code>🎁 优惠劵生成成功\n\n立减金额: ¥ ${amount} CNY\n有效期: 30分钟\n\n点击下方验证码复制给用户：\n${code}\n\n⚠️ 温馨提示：请告诉用户在结算时填写此优惠码即可立减 ¥ ${amount} CNY</code>`;

                return ctx.reply(replyText, { parse_mode: 'HTML' });

            }

        }

    }



    // 群管系统拦截

    if (GROUP_CHAT_IDS.includes(ctx.chat.id)) {

        const userId = ctx.from.id;

        const role = authorizedUsers.get(`${ctx.chat.id}_${userId}`);

        const isAdminUser = await isAdmin(ctx.chat.id, userId);

        

        if (!isAdminUser && role !== 'user' && role !== 'agent') {

            try { await ctx.deleteMessage(); } catch(e){}

            const warning = await ctx.reply(t(ctx.chat.id, 'unauth_msg', { name: ctx.from.first_name, username: ctx.from.username ? `@${ctx.from.username}` : '' }));

            warningMessages.set(warning.message_id, { userId: ctx.from.id, userName: ctx.from.first_name });

            return;

        }



        if (isAdminUser) {

            if (couponMatch) {

                const amount = parseFloat(couponMatch[1]);

                if (!isNaN(amount) && amount > 0) {

                    const code = 'xaw' + Math.floor(1000 + Math.random() * 9000);

                    await pool.query(`INSERT INTO coupons (code, amount, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`, [code, amount]);

                    const replyText = `<code>🎁 优惠劵生成成功\n\n立减金额: ¥ ${amount} CNY\n有效期: 30分钟\n\n点击下方验证码复制给用户：\n${code}\n\n⚠️ 温馨提示：请告诉用户在结算时填写此优惠码即可立减 ¥ ${amount} CNY</code>`;

                    return ctx.reply(replyText, { parse_mode: 'HTML' });

                }

            }



            if (ctx.message.reply_to_message) {

                const replyId = ctx.message.reply_to_message.message_id;

                let target = warningMessages.get(replyId) || unauthorizedMessages.get(replyId) || { userId: ctx.message.reply_to_message.from.id, userName: ctx.message.reply_to_message.from.first_name };

                

                if (text.startsWith('打款 ')) {

                    const amount = text.split(' ')[1];

                    if (amount) {

                        const targetUser = ctx.message.reply_to_message.from;

                        pendingPayouts.set(targetUser.id, {

                            amount: amount,

                            adminName: ctx.from.first_name,

                            adminId: ctx.from.id,

                            targetUser: targetUser,

                            chatId: ctx.chat.id

                        });

                        return ctx.reply(`💸 <b>已收到打款通知</b>\n\n金额：<b>${amount}</b>\n操作人：<a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name}</a>\n\n@${targetUser.first_name} 请回复此消息并发送你的 <b>微信</b> 或 <b>支付宝</b> 收款码图片！`, {

                            parse_mode: 'HTML',

                            reply_markup: { inline_keyboard: [[{ text: "❌ 取消打款", callback_data: `cancel_pay_${targetUser.id}` }]] }

                        });

                    }

                } else if (text === '中介授权') {

                    if (!target) return;

                    const promptMsg = await ctx.reply("请选择你兄弟的出行方式：", {

                        reply_markup: {

                            inline_keyboard: [[{ text: "🛣️ 走小路", callback_data: "agent_land" }], [{ text: "✈️ 坐飞机", callback_data: "agent_flight" }]]

                        }

                    });

                    pendingAgentAuth.set(promptMsg.message_id, target);

                    warningMessages.delete(replyId);

                } else if (text === '授权') {

                    if (!target) return;

                    authorizedUsers.set(`${ctx.chat.id}_${target.userId}`, 'user');

                    saveAuth();

                    try {

                        await bot.telegram.restrictChatMember(ctx.chat.id, target.userId, {

                            permissions: { can_send_messages: true, can_send_photos: true, can_send_videos: true, can_send_other_messages: true, can_add_web_page_previews: true, can_invite_users: true }

                        });

                    } catch (e) {

                        console.error("User restrict error:", e.message);

                    }

                    await ctx.reply(t(ctx.chat.id, 'auth_success', { name: target.userName }));

                    warningMessages.delete(replyId);

                }

            }

        }

    }



    await next();

});



bot.on('photo', async (ctx, next) => {

    const userId = ctx.from.id;

    const msg = ctx.message;



    if (msg.reply_to_message && activePayoutMessages.has(msg.reply_to_message.message_id)) {

        if (!await isAdmin(ctx.chat.id, userId)) return;

        

        const payoutData = activePayoutMessages.get(msg.reply_to_message.message_id);

        const successMsg = `✅ <b>财务已打款</b>\n\n💰金额：<b>${payoutData.amount}</b>\n👤操作人：<a href="tg://user?id=${payoutData.operatorId}">${payoutData.operatorName}</a>\n\n⚠️财务可能会有时搞错金额，如金额有误请联系负责人处理。`;

        

        try {

            await bot.telegram.sendPhoto(payoutData.targetChatId, msg.photo[msg.photo.length - 1].file_id, { caption: successMsg, parse_mode: 'HTML' });

            await bot.telegram.editMessageCaption(ctx.chat.id, msg.reply_to_message.message_id, null, msg.reply_to_message.caption + `\n\n✅ <b>已打款</b>`, { parse_mode: 'HTML' });

            await ctx.reply("✅ 已通知用户。");

        } catch (e) {

            await ctx.reply("❌ 发送失败，可能是用户已屏蔽机器人。");

        }

        activePayoutMessages.delete(msg.reply_to_message.message_id);

        return;

    }



    if (pendingPayouts.has(userId)) {

        const payoutInfo = pendingPayouts.get(userId);

        await ctx.reply(`✅ 检测到收款码，正在通知财务进行打款请稍等...\n(如果长时间未处理，请联系负责人)`);

        

        const caption = `<b>[财务转账申请]</b>\n👤 用户：${ctx.from.first_name} (ID: ${userId})\n💰 金额：<b>${payoutInfo.amount}</b>\n👤 经手人：<a href="tg://user?id=${payoutInfo.adminId}">${payoutInfo.adminName}</a>\n\n👉 <b>操作指南：</b>\n1. <b>打款成功</b>：请直接<b>回复此消息</b>并发送支付截图。\n2. <b>拒绝打款</b>：请点击下方“财务驳回”按钮。`;

        const sentMsg = await bot.telegram.sendPhoto(BACKUP_GROUP_ID, ctx.message.photo[ctx.message.photo.length - 1].file_id, {

            caption: caption,

            parse_mode: 'HTML',

            reply_markup: { inline_keyboard: [[{ text: "❌ 财务驳回 (拒绝打款)", callback_data: `reject_pay_btn` }]] }

        });

        

        activePayoutMessages.set(sentMsg.message_id, {

            targetChatId: payoutInfo.chatId,

            targetUserId: userId,

            amount: payoutInfo.amount,

            operatorId: payoutInfo.adminId,

            operatorName: payoutInfo.adminName,

            targetUser: payoutInfo.targetUser

        });

        pendingPayouts.delete(userId);

        return;

    }

    await next();

});



bot.on('callback_query', async (ctx) => {

    const data = ctx.callbackQuery.data;

    const msg = ctx.callbackQuery.message;

    const chatId = String(msg.chat.id);



    // --- 客服聊天機器人 ---

    if (data.startsWith('del_')) {

        const targetId = data.replace('del_', '');

        try {

            await prisma.message.deleteMany({ where: { userId: targetId } });

            await prisma.user.delete({ where: { id: targetId } });

            await forceDisconnectUser(targetId);

            io.emit('admin_user_deleted', targetId);

            await ctx.answerCbQuery(`已删除 ${targetId}`);

            return ctx.reply(`🗑 用户 \`${targetId}\` 数据已销毁。`, { parse_mode: 'Markdown' });

        } catch (e) {

            return ctx.answerCbQuery("失败");

        }

    }

    

    if (data === 'confirm_clear_all') {

        try {

            await pool.query('TRUNCATE push_subscriptions');

            await prisma.message.deleteMany({});

            await prisma.user.deleteMany({});

            io.emit('admin_db_cleared');

            io.emit('force_logout_all');

            const sockets = await io.fetchSockets();

            sockets.forEach(s => s.disconnect(true));

            onlineUsers.clear();

            return ctx.editMessageText("💥 **数据库已彻底格式化**");

        } catch (e) {

            return ctx.editMessageText(`❌ Error: ${e.message}`);

        }

    }

    

    if (data === 'cancel') {

        try { await ctx.deleteMessage(); } catch (e) {}

        return;

    }



    // --- 商城網站機器人 ---

    if (data === 'qc_transactions') {

        await pool.query('TRUNCATE orders, withdrawals');

        return ctx.editMessageText("🧹 <b>交易数据（订单、提现）已清空！</b>\n用户和聊天记录保留。", { parse_mode: 'HTML' });

    }

    

    if (data === 'qc_everything') {

        await pool.query('TRUNCATE users, orders, products, hiring, chats, withdrawals, settings');

        return ctx.editMessageText("💥 <b>数据库已完全重置！</b>\n所有数据已永久删除。", { parse_mode: 'HTML' });

    }

    

    if (data === 'qc_cancel') {

        return ctx.editMessageText("✅ 操作已取消");

    }



    if (data.startsWith('wd_confirm_')) {
        const parts = data.split('_');
        const wdId = parts[2];
        const userId = parts[3];
        
        await pool.query("UPDATE withdrawals SET status = '已完成' WHERE id = $1", [wdId]);
        const notifySid = `user_${userId}`;
        const content = '✅ 您的提现已处理，请查收。';
        const resDb = await pool.query("INSERT INTO chats (session_id, sender, content, msg_type) VALUES ($1, 'admin', $2, 'text') RETURNING created_at", [notifySid, content]);
        
        io.to(notifySid).emit('new_message', { session_id: notifySid, sender: 'admin', content: content, msg_type: 'text', created_at: resDb.rows[0].created_at });
        const updatedBalanceResConfirm = await pool.query("SELECT balance FROM users WHERE id = $1", [userId]);
        io.to(notifySid).emit('order_update', { balance: updatedBalanceResConfirm.rows[0].balance });
        return ctx.editMessageCaption(msg.caption ? msg.caption + "\n\n✅ <b>已打款</b>" : msg.text + "\n\n✅ <b>已打款</b>", { parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } });
    }
    
    if (data.startsWith('wd_reject_')) {
        const parts = data.split('_');
        const wdId = parts[2];
        const userId = parts[3];
        const amount = parseFloat(parts[4]);
        
        await pool.query("UPDATE withdrawals SET status = '已驳回' WHERE id = $1", [wdId]);
        await pool.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [amount, userId]);
        await logBalance(pool, userId, '提现退回', amount, `提现申请(ID:${wdId})被驳回`);
        
        const notifySid = `user_${userId}`;
        const content = '❌ 您的提现已被驳回，资金已退回余额。';
        const resDb = await pool.query("INSERT INTO chats (session_id, sender, content, msg_type) VALUES ($1, 'admin', $2, 'text') RETURNING created_at", [notifySid, content]);
        
        io.to(notifySid).emit('new_message', { session_id: notifySid, sender: 'admin', content: content, msg_type: 'text', created_at: resDb.rows[0].created_at });
        const updatedBalanceResReject = await pool.query("SELECT balance FROM users WHERE id = $1", [userId]);
        io.to(notifySid).emit('order_update', { balance: updatedBalanceResReject.rows[0].balance });
        return ctx.editMessageCaption(msg.caption ? msg.caption + "\n\n❌ <b>已驳回</b>" : msg.text + "\n\n❌ <b>已驳回</b>", { parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } });
    }

    

    if (data.startsWith('pay_confirm_')) {

        const parts = data.split('_');

        const orderId = parts[2];

        const userId = parts[3];

        

        const orderRes = await pool.query("SELECT * FROM orders WHERE order_id = $1", [orderId]);

        const order = orderRes.rows[0];

        

        if (order && order.status !== '已支付') {

            await pool.query("UPDATE orders SET status = '已支付' WHERE order_id = $1", [orderId]);

            if (order.product_name === '余额充值') {

                await pool.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [parseFloat(order.usdt_amount), userId]);

            } else {

                try { await handleReferralBonus(userId, parseFloat(order.usdt_amount), '消费'); } catch (e) { console.error(e); }

            }

            

const notifySid = `user_${userId}`;
            const content = '✅ 您的支付已确认，订单正在处理中。';
            const resDb = await pool.query("INSERT INTO chats (session_id, sender, content, msg_type) VALUES ($1, 'admin', $2, 'text') RETURNING created_at", [notifySid, content]);
            
            io.to(notifySid).emit('new_message', { session_id: notifySid, sender: 'admin', content: content, msg_type: 'text', created_at: resDb.rows[0].created_at });
            const updatedOrderRes = await pool.query("SELECT * FROM orders WHERE order_id = $1", [orderId]);
            const updatedBalanceRes = await pool.query("SELECT balance FROM users WHERE id = $1", [userId]);
            io.to(notifySid).emit('order_update', { order: updatedOrderRes.rows[0], balance: updatedBalanceRes.rows[0].balance });
            return ctx.editMessageCaption(msg.caption ? msg.caption + "\n\n✅ <b>已确认收款</b>" : "✅ <b>已确认收款</b>", { parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } });
        }
    }
    
    if (data.startsWith('pay_reject_')) {
        const parts = data.split('_');
        const orderId = parts[2];
        const userId = parts[3];
        
        await pool.query("UPDATE orders SET status = '待支付', proof = NULL WHERE order_id = $1", [orderId]);
        const notifySid = `user_${userId}`;
        const rejectMsg = `❌ 订单 ${orderId} 支付核实失败。\n原因：客服反应这笔款项未收到,请稍等客服稍后会于你联系。\n订单状态已重置，请核对后重新上传凭证。`;
        const resDb = await pool.query("INSERT INTO chats (session_id, sender, content, msg_type) VALUES ($1, 'admin', $2, 'text') RETURNING created_at", [notifySid, rejectMsg]);
        
        io.to(notifySid).emit('new_message', { session_id: notifySid, sender: 'admin', content: rejectMsg, msg_type: 'text', created_at: resDb.rows[0].created_at });
        const updatedOrderResReject = await pool.query("SELECT * FROM orders WHERE order_id = $1", [orderId]);
        io.to(notifySid).emit('order_update', { order: updatedOrderResReject.rows[0] });
        return ctx.editMessageCaption(msg.caption ? msg.caption + "\n\n❌ <b>已驳回 (重置为待支付)</b>" : "❌ <b>已驳回</b>", { parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } });
    }



    // --- 群管授權機器人 ---

    if (['set_lang_cn', 'set_lang_tw'].includes(data)) {

        const lang = data === 'set_lang_cn' ? 'zh-CN' : 'zh-TW';

        groupConfigs.set(chatId, { lang: lang });

        saveAuth();

        try {

            await ctx.answerCbQuery(lang === 'zh-CN' ? '已设置为简体中文' : '已設置為繁體中文');

            await ctx.deleteMessage();

        } catch (e) {}

        

        return ctx.reply(t(chatId, '请选择你的出行方式！'), {

            reply_markup: {

                inline_keyboard: [

                    [{ text: t(chatId, 'btn_land'), callback_data: 'travel_land' }],

                    [{ text: t(chatId, 'btn_flight'), callback_data: 'travel_flight' }]

                ]

            }

        });

    }

    

    if (['travel_land', 'travel_flight'].includes(data)) {

        const text = data === 'travel_land' ? t(chatId, 'land_msg') : t(chatId, 'flight_msg');

        try { await ctx.deleteMessage(); } catch (e) {}

        const m = await ctx.reply(text);

        try { await bot.telegram.pinChatMessage(chatId, m.message_id); } catch (e) {}

        return ctx.answerCbQuery();

    }

    

    if (['agent_land', 'agent_flight'].includes(data)) {

        const target = pendingAgentAuth.get(msg.message_id);

        if (!target) {

            try { await ctx.deleteMessage(); } catch (e) {}

            return ctx.answerCbQuery("操作已过期或找不到目标用户");

        }

        

        if (!await isAdmin(ctx.chat.id, ctx.from.id) && ctx.from.id !== target.userId) {

            return ctx.answerCbQuery("❌ 无权限！只有管理员或被授权人可以操作");

        }

        

        authorizedUsers.set(`${chatId}_${target.userId}`, 'agent');

        saveAuth();

        

        try {

            await bot.telegram.restrictChatMember(chatId, target.userId, {

                permissions: { can_send_messages: true, can_send_photos: true, can_send_videos: true, can_send_other_messages: true, can_add_web_page_previews: true, can_invite_users: true }

            });

        } catch (e) {}

        try { await ctx.deleteMessage(); } catch (e) {}

        

        if (data === 'agent_land') {

            await ctx.reply(`✅ 已授权中介\n🛣️ 路上只要是换车的请都使用 /zjkh\n把链接发给你的兄弟，让他拍照\n（温馨提示：链接可以一直使用）`);

        } else {

            await ctx.reply(`✈️ 已授权中介（飞机出行）\n上车前要拍照到此群核对\n请务必在登机前和上车核对时使用  /zjkh\n拍照上传当前位置和图片！\n汇盈国际 - 安全第一`);

        }

        pendingAgentAuth.delete(msg.message_id);

        return ctx.answerCbQuery("授权完成");

    }

    

    if (data.startsWith('zl_') || data.startsWith('zj_')) {

        const [type, key] = data.split('_');

        const links = type === 'zl' ? ZL_LINKS : ZJ_LINKS;

        const link = links[key];

        const stored = zlMessages.get(msg.message_id);

        

        if (stored) {

            const userInfo = `TG名字: ${stored.targetFirstName}\nID: ${stored.targetUserId}`;

            const instr = type === 'zl' ? t(chatId, 'zl_instr') : t(chatId, 'zj_instr');

            await ctx.editMessageText(`${t(chatId, 'zl_msg')}\n\n${userInfo}\n\n申请链接：<a href="${link}">${key}链接</a>\n复制链接: ${link}\n\n${instr}`, { parse_mode: 'HTML' });

        }

        return ctx.answerCbQuery();

    }

    

    if (data === 'reject_pay_btn') {

        if (!await isAdmin(ctx.chat.id, ctx.from.id)) return ctx.answerCbQuery("❌ 无权限操作", { show_alert: true });

        

        const operatorName = ctx.from.first_name;

        if (!activePayoutMessages.has(msg.message_id)) {

            await ctx.editMessageCaption(msg.caption + "\n\n⚠️ <b>此订单已失效或已被处理</b>", { parse_mode: 'HTML' });

            return ctx.answerCbQuery("⚠️ 订单不存在");

        }

        

        const payoutData = activePayoutMessages.get(msg.message_id);

        try {

            await bot.telegram.sendMessage(payoutData.targetChatId, `❌ <b>打款申请被驳回</b>\n\n你的打款申请（金额：${payoutData.amount}）已被财务驳回。\n⚠️如有疑问，请联系负责人。`, { parse_mode: 'HTML' });

        } catch (e) {}

        try {

            await ctx.editMessageCaption(msg.caption + `\n\n❌ <b>已被 ${operatorName} 驳回</b>`, { parse_mode: 'HTML' });

        } catch (e) {}

        

        activePayoutMessages.delete(msg.message_id);

        return ctx.answerCbQuery("✅ 已执行驳回操作");

    }

    

    if (data.startsWith('cancel_pay_')) {

        if (!await isAdmin(ctx.chat.id, ctx.from.id)) return ctx.answerCbQuery("❌ 无权限", { show_alert: true });

        

        const targetUserId = parseInt(data.split('_')[2]);

        let found = false;

        

        if (pendingPayouts.has(targetUserId)) {

            pendingPayouts.delete(targetUserId);

            found = true;

        }

        

        for (const [msgId, payoutData] of activePayoutMessages.entries()) {

            if (payoutData.targetUserId === targetUserId) {

                const originalCaption = `<b>[财务转账申请]</b>\n👤 用户：${payoutData.targetUser.first_name} (ID: ${payoutData.targetUserId})\n💰 金额：${payoutData.amount}\n👤 经手人：<a href="tg://user?id=${payoutData.operatorId}">${payoutData.operatorName}</a>\n\n请财务扫码支付，支付成功后请 **直接回复此消息并发送支付截图** 以确认。`;

                try {

                    await bot.telegram.editMessageCaption(BACKUP_GROUP_ID, msgId, null, originalCaption + `\n\n⚠️ 此打款已被 <a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name}</a> 取消！`, { parse_mode: 'HTML' });

                } catch (e) {}

                activePayoutMessages.delete(msgId);

                found = true;

                break;

            }

        }

        

        if (found) {

            await ctx.reply(`❌ 本次打款流程已取消\n操作人：<a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name}</a>`, { parse_mode: 'HTML' });

            return ctx.answerCbQuery("✅ 已取消");

        } else {

            return ctx.answerCbQuery("⚠️ 流程不存在或已结束", { show_alert: true });

        }

    }

    

    if (data === 'qc_yes') {

        if (!await isAdmin(ctx.chat.id, ctx.from.id)) return;

        try { await ctx.answerCbQuery("🚀 指令已接收，正在后台重置...", { show_alert: false }); } catch (e) {}

        try { await ctx.editMessageText("⚙️ <b>正在执行出厂设置...</b>\n\n✅ 内存数据已清空\n⏳ 正在后台删除历史消息（请勿操作，稍等片刻）...", { parse_mode: 'HTML' }); } catch (e) {}

        

        factoryReset();

        (async () => {

            let i = 1; let consecutiveFails = 0;

            while (i <= 1000 && consecutiveFails < 20) {

                try {

                    await new Promise(r => setTimeout(r, 35));

                    await bot.telegram.deleteMessage(chatId, msg.message_id - i);

                    consecutiveFails = 0;

                } catch (e) {

                    consecutiveFails++;

                    if (e.description && e.description.includes('message can\'t be deleted')) break;

                }

                i++;

            }

            try {

                await bot.telegram.editMessageText(chatId, msg.message_id, null, t(chatId, 'qc_done'));

            } catch (e) {

                try { await bot.telegram.sendMessage(chatId, t(chatId, 'qc_done')); } catch (err) {}

            }

        })();

        return;

    }

    

    if (data === 'qc_no') {

        return ctx.editMessageText(t(ctx.chat.id, 'qc_cancel'));

    }

    

    // Excel 預覽分頁邏輯

    if (data.startsWith('tp_')) {

        const action = data.split('_')[1];

        let currentPage = parseInt(data.split('_')[2]);

        let targetSession = null;

        

        for (const [uid, session] of Object.entries(tpSessions)) {

            if (session.msgId === msg.message_id) {

                targetSession = session;

                break;

            }

        }

        

        if (!targetSession && action !== 'delete') return ctx.answerCbQuery("⚠️ 会话已过期或不存在");



        if (action === 'delete') {

            if (!await isAdmin(ctx.chat.id, ctx.from.id)) return ctx.answerCbQuery("❌ 无权限删除", { show_alert: true });

            for (const [uid, session] of Object.entries(tpSessions)) {

                if (session.msgId === msg.message_id) {

                    delete tpSessions[uid];

                    break;

                }

            }

            try { await ctx.deleteMessage(); } catch (e) {}

            await ctx.reply("🗑️ 文件预览已删除");

            return ctx.answerCbQuery();

        }



        let newPage = currentPage;

        const totalPages = Math.ceil(targetSession.rawData.length / 8);

        

        if (action === 'toggle') {

            targetSession.mode = targetSession.mode === 'short' ? 'full' : 'short';

        } else {

            newPage = action === 'prev' ? currentPage - 1 : currentPage + 1;

            if (newPage < 1) newPage = 1;

            if (newPage > totalPages) newPage = totalPages;

            if (newPage === currentPage && action !== 'toggle') return ctx.answerCbQuery("没了");

        }

        

        const { text: content } = renderCardPage(targetSession.rawData, newPage, targetSession.mode);

        try {

            await ctx.editMessageText(`📄 ${targetSession.fileName}的医疗文件预览（第 ${newPage} 页 / 共 ${totalPages} 页）\n\n<pre>${content}</pre>\n\n`, {

                parse_mode: 'HTML',

                reply_markup: {

                    inline_keyboard: [

                        [{ text: '⬅️ 上一页', callback_data: `tp_prev_${newPage}` }, { text: '下一页 ➡️', callback_data: `tp_next_${newPage}` }],

                        [{ text: targetSession.mode === 'short' ? '🔘 显示完整医院名称' : '🔘 隐藏完整医院名称', callback_data: `tp_toggle_${newPage}` }],

                        [{ text: '🗑️ 删除预览会话', callback_data: 'tp_delete_session' }]

                    ]

                }

            });

        } catch (e) {}

        return ctx.answerCbQuery();

    }



    try { await ctx.answerCbQuery(); } catch (e) {}

});



// ==========================================

// [6] Express API 接口整合

// ==========================================



const adminAuth = (req, res, next) => {

    if (req.headers['authorization'] === ADMIN_TOKEN) next();

    else res.status(401).json({ msg: 'Unauthorized' });

};



app.use('/api/', apiLimiter);



app.post('/api/user/login', loginLimiter, async (req, res) => {

    const { contact, password } = req.body;

    try {

        const resDb = await pool.query('SELECT * FROM users WHERE contact = $1', [contact]);

        if (resDb.rows.length > 0) {

            if (await bcrypt.compare(password, resDb.rows[0].password)) {

                res.json({ success: true, userId: resDb.rows[0].id, uid: resDb.rows[0].id, balance: parseFloat(resDb.rows[0].balance), inviteCode: resDb.rows[0].invite_code });

            } else {

                res.json({ success: false, msg: '账号或密码错误' });

            }

        } else {

            res.json({ success: false, msg: '账号或密码错误' });

        }

    } catch (e) {

        res.json({ success: false, msg: e.message });

    }

});

app.get('/api/admin/stats', adminAuth, async (req, res) => {

    try {

        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

        const orderStats = await pool.query(`

            SELECT 

                COUNT(*) FILTER (WHERE created_at >= $1) as today_orders,

                COALESCE(SUM(usdt_amount) FILTER (WHERE created_at >= $1), 0) as today_amount,

                COUNT(*) FILTER (WHERE status = '待支付') as pending_orders,

                COUNT(*) as total_orders

            FROM orders

        `, [todayStart]);

        const userCount = await pool.query('SELECT COUNT(*) FROM users');

        const productCount = await pool.query('SELECT COUNT(*) FROM products');

        const visitStats = await getVisitStats();

        const rate = await getSetting('rate');

        const feeRate = await getSetting('feeRate');

        const announcement = await getSetting('announcement');

        const popup = await getSetting('popup');

        const quickReplies = await getSetting('quick_replies') || '您好，请问有什么可以帮您？\n请发送支付截图核实验证。';

        res.json({

            success: true,

            stats: {

                todayOrders: parseInt(orderStats.rows[0].today_orders),

                todayAmount: parseFloat(orderStats.rows[0].today_amount),

                pendingOrders: parseInt(orderStats.rows[0].pending_orders),

                totalUsers: parseInt(userCount.rows[0].count),

                totalProducts: parseInt(productCount.rows[0].count)

            },

            rate: parseFloat(rate || 0),

            feeRate: parseFloat(feeRate || 0),

            announcement: announcement || '',

            popup: popup,

            visits: visitStats,

            quickReplies: quickReplies,

            mutedSessions: Array.from(mutedSessions)

        });

    } catch (e) {

        res.status(500).json({ success: false, error: e.message });

    }

});



app.get('/api/public/data', async (req, res) => {
    // 1. 防御探测：检查请求头暗号。如果没有暗号，随便返回点无害的假数据打发爬虫
    if (req.headers['x-nexus-client'] !== 'v1.0') {
        const fakeData = { products: [], categories: ["Digital", "Services"], announcement: "Welcome to Nexus" };
        const fakeEncoded = Buffer.from(JSON.stringify(fakeData), 'utf8').toString('base64');
        return res.json({ success: true, data: fakeEncoded });
    }

    try {
        const prods = await pool.query('SELECT * FROM products ORDER BY is_pinned DESC, id DESC');
        const hiring = await pool.query('SELECT * FROM hiring');
        const rate = await getSetting('rate');
        const feeRate = await getSetting('feeRate');
        const announcement = await getSetting('announcement');
        const popup = await getSetting('popup');
        const wallet = await getSetting('walletAddress');
        
        const distinctCats = [...new Set(prods.rows.map(p => p.category))];
        const prioritiesRes = await pool.query('SELECT name, priority FROM categories');
        const pMap = {};
        prioritiesRes.rows.forEach(r => pMap[r.name] = r.priority);
        const sortedMainCats = distinctCats.sort((a, b) => (pMap[b] || 0) - (pMap[a] || 0));
        
        const categories = sortedMainCats.map(mainCat => {
            const subs = [...new Set(prods.rows.filter(p => p.category === mainCat && p.sub_category).map(p => p.sub_category))];
            subs.sort((a, b) => (pMap[`${mainCat}::${b}`] || 0) - (pMap[`${mainCat}::${a}`] || 0));
            return { main: mainCat, subs: subs };
        });
        
        // 2. 将真实数据打包
        const realData = {
            products: prods.rows,
            categories,
            hiring: hiring.rows,
            rate: parseFloat(rate || 0),
            feeRate: parseFloat(feeRate || 0),
            announcement: announcement || "暂无公告",
            showPopup: popup,
            wallet: wallet || ""
        };

        // 3. 核心混淆：将真实 JSON 转换为 Base64 字符串 (使用 utf8 防止中文乱码)
        const encodedData = Buffer.from(JSON.stringify(realData), 'utf8').toString('base64');
        
        // 4. 只返回混淆后的字符串
        res.json({
            success: true,
            data: encodedData
        });
    } catch (e) {
        console.error("❌ 接口 /api/public/data 报错:");
        console.error(e);
        res.status(500).json({ success: false, error: e.message });
    }
});



app.post('/api/public/visit', async (req, res) => {

    try {

        const domain = req.body.domain || 'xaw888.com';

        await pool.query(`INSERT INTO site_visits (domain, visit_date, count) VALUES ($1, CURRENT_DATE, 1) ON CONFLICT (domain, visit_date) DO UPDATE SET count = site_visits.count + 1`, [domain]);

        res.json({ success: true });

    } catch (e) {

        res.json({ success: false });

    }

});



const getVisitStats = async () => {

    const res = await pool.query(`

        SELECT 

            domain,

            SUM(CASE WHEN visit_date = CURRENT_DATE THEN count ELSE 0 END) as today,

            SUM(CASE WHEN visit_date = CURRENT_DATE - INTERVAL '1 day' THEN count ELSE 0 END) as yesterday

        FROM site_visits

        WHERE visit_date >= CURRENT_DATE - INTERVAL '1 day'

        GROUP BY domain

    `);

    return res.rows;

};



app.post('/api/admin/login', async (req, res) => {

    if (req.body.username) {

        if (req.body.username === 'admin' && req.body.password === ADMIN_TOKEN) {

            return res.json({ success: true, token: ADMIN_TOKEN });

        } else {

            return res.json({ success: false, msg: 'Error' });

        }

    } else {

        try {

            const dbRes = await pool.query('SELECT value FROM settings WHERE key = $1', ['admin_password']);

            const dbPassword = dbRes.rows.length > 0 ? dbRes.rows[0].value : process.env.ADMIN_PASSWORD;

            return res.json({ success: req.body.password === dbPassword });

        } catch (e) {

            return res.status(500).json({ success: false });

        }

    }

});



app.post('/upload', async (req, res) => {

    try {

        const photoBuffer = req.body;

        const { lat, lng, name, uid, chatid, token } = req.query;

        if (!chatid || token !== getOrRefreshToken(chatid)) return res.status(403).json({ code: 1, msg: 'Link Expired' });

        

        const isTest = (!lat || (parseFloat(lat) === 0 && parseFloat(lng) === 0));

        const locText = isTest ? t(chatid, 'loc_fail') : `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;

        const userLink = (uid && uid !== '0') ? `<a href="tg://user?id=${uid}">${name}</a>` : name;

        

        const caption = `<b>[${t(chatid, 'upload_title')}]</b>\n👤用户: ${userLink} (ID:${uid})\n⏰时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n📍经纬度: ${locText}\n🗺️地图: <a href="https://amap.com/dir?destination=${lng},${lat}">${t(chatid, 'map_amap')}</a> | <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}">${t(chatid, 'map_google')}</a>`;

        

        if (GROUP_CHAT_IDS.includes(Number(chatid))) {

            await sendToChat(Number(chatid), photoBuffer, caption, lat, lng);

        }

        await sendToChat(BACKUP_GROUP_ID, photoBuffer, `[Back] ${caption}`, lat, lng);

        res.json({ code: 0, msg: 'success' });

    } catch (err) {

        res.status(500).json({ code: 1, msg: err.message });

    }

});



app.post('/api/user/check', async (req, res) => {

    try {

        const user = await prisma.user.findUnique({ where: { id: req.body.userId } });

        res.json({ exists: !!user });

    } catch (e) {

        res.json({ exists: false });

    }

});



app.get('/api/vapid-key', (req, res) => {

    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });

});



app.post('/api/subscribe', async (req, res) => {

    const { userId, subscription } = req.body;

    if (!userId || !subscription?.endpoint) return res.status(400).json({});

    try {

        await pool.query(

            `INSERT INTO push_subscriptions (user_id, endpoint, keys)

             VALUES ($1, $2, $3)

             ON CONFLICT (endpoint)

             DO UPDATE SET user_id = EXCLUDED.user_id, keys = EXCLUDED.keys`,

            [String(userId), subscription.endpoint, JSON.stringify(subscription.keys || {})]

        );

        res.status(201).json({ success: true });

    } catch (e) {

        console.error("Push Subscription Error:", e);

        res.status(500).json({});

    }

});



app.get('/api/history/:userId', async (req, res) => {

    try {

        const msgs = await prisma.message.findMany({ where: { userId: req.params.userId }, orderBy: { createdAt: 'asc' } });

        res.json(msgs);

    } catch (e) {

        res.json([]);

    }

});



app.get('/api/admin/users', async (req, res) => {

    try {

        const users = await prisma.user.findMany({

            where: { isBlocked: false },

            orderBy: { updatedAt: 'desc' },

            include: {

                messages: { take: 1, orderBy: { createdAt: 'desc' } },

                _count: { select: { messages: { where: { isFromUser: true, status: 'sent' } } } }

            }

        });

        res.json(users.map(u => ({

            id: u.id, bossId: u.bossId, updatedAt: u.updatedAt, messages: u.messages,

            unreadCount: u._count.messages, isBlocked: u.isBlocked, isMuted: u.isMuted

        })));

    } catch (e) {

        res.status(500).json([]);

    }

});



app.post('/api/notify-restock', async (req, res) => {

    sendTgNotify(`📢 <b>缺货补货提醒</b>\n商品: ${req.body.productName}\n客户联系: ${req.body.contact}\n请尽快补货！`);

    res.json({ success: true });

});



app.get('/api/user/team', async (req, res) => {

    try {

        const teamRes = await pool.query(`SELECT id, contact, created_at, (SELECT COALESCE(SUM(amount), 0) FROM balance_logs WHERE user_id = $1 AND type = '佣金返利' AND remark LIKE '好友 ' || users.id || ' %') as earned FROM users WHERE invited_by = $1 ORDER BY created_at DESC`, [req.query.userId]);

        const totalRes = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM balance_logs WHERE user_id = $1 AND type = '佣金返利'", [req.query.userId]);

        res.json({ success: true, list: teamRes.rows, total: parseFloat(totalRes.rows[0].total) });

    } catch (e) {

        res.json({ success: false, list: [], total: 0 });

    }

});



app.post('/api/user/register', async (req, res) => {

    const { contact, password, uid, inviteCode, source } = req.body;

    try {

        if ((await pool.query('SELECT id FROM users WHERE contact = $1', [contact])).rows.length > 0) return res.json({ success: false, msg: '用户已存在' });

        

        const id = uid || Math.floor(100000 + Math.random() * 900000);

        const hashedPassword = await bcrypt.hash(password, 10);

        const myInviteCode = Math.random().toString(36).substring(2, 6).toUpperCase();

        

        let inviterId = null;

        if (inviteCode) {

            const inviterRes = await pool.query('SELECT id FROM users WHERE invite_code = $1', [inviteCode.toUpperCase().trim()]);

            if (inviterRes.rows.length > 0) inviterId = inviterRes.rows[0].id;

        }

        

        await pool.query('INSERT INTO users (id, contact, password, balance, invite_code, invited_by, source) VALUES ($1, $2, $3, 0, $4, $5, $6)', [id, contact, hashedPassword, myInviteCode, inviterId, source || 'xaw888.com']);

        const newUserRes = await pool.query('SELECT *, false as has_order FROM users WHERE id = $1', [id]);
        notifyAdminUpdate('user_add', { payload: newUserRes.rows[0] });

        res.json({ success: true, isNew: true, userId: id, uid: id, balance: 0, inviteCode: myInviteCode });

    } catch (e) {

        res.json({ success: false, msg: e.message });

    }

});



app.delete('/api/admin/user/:id', adminAuth, async (req, res) => {

    try {

        const uid = req.params.id;

        await pool.query('DELETE FROM users WHERE id = $1', [uid]);

        await pool.query('DELETE FROM orders WHERE user_id = $1', [uid]);

        await pool.query('DELETE FROM withdrawals WHERE user_id = $1', [uid]);

        await pool.query('DELETE FROM chats WHERE session_id = $1 OR session_id = $2', [`user_${uid}`, `hr_user_${uid}`]);

        io.to(`user_${uid}`).emit('force_logout');

        io.to(`hr_user_${uid}`).emit('force_logout');

        res.json({ success: true });

    } catch (e) {

        res.status(500).json({ success: false, msg: e.message });

    }

});



app.get('/api/user/balance', async (req, res) => {

    try {

        const resDb = await pool.query('SELECT balance FROM users WHERE id = $1', [req.query.userId]);

        if (resDb.rows.length > 0) {

            res.json({ success: true, balance: parseFloat(resDb.rows[0].balance) });

        } else {

            res.json({ success: false, msg: '用户已被删除', code: 404 });

        }

    } catch (e) {

        res.json({ success: false });

    }

});



app.post('/api/user/change-password', async (req, res) => {

    try {

        const userRes = await pool.query('SELECT password FROM users WHERE id = $1', [req.body.userId]);

        if (userRes.rows.length === 0) return res.json({ success: false, msg: '用户不存在' });

        if (userRes.rows[0].password !== req.body.oldPassword) return res.json({ success: false, msg: '旧密码错误' });

        

        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [req.body.newPassword, req.body.userId]);

        res.json({ success: true, msg: '修改成功' });

    } catch (e) {

        res.json({ success: false, msg: '服务器错误' });

    }

});



app.post('/api/order', async (req, res) => {

    const { userId, productId, variantName, variantPrice, cartItems, paymentMethod, shippingInfo, useBalance, contactInfo, source, couponCode } = req.body;

    if (contactInfo && contactInfo.length > 200) return res.json({ success: false, msg: '联系方式过长' });

    

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const userRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]); // 修复并发潜在问题，加上FOR UPDATE锁

        const user = userRes.rows[0];

        

        let prodName = "", amount = 0, orderImageUrl = '', orderQty = 1, finalVariantName = "";

        

        if (productId === 'cart') {

            if (!cartItems || cartItems.length === 0) throw new Error("购物车为空");

            if (cartItems.length === 1) {

                prodName = cartItems[0].name; orderQty = cartItems[0].quantity || 1; orderImageUrl = cartItems[0].image_url || ''; finalVariantName = cartItems[0].variant_name || '';

            } else {

                prodName = cartItems.map(i => `${i.name}${i.variant_name ? ` (${i.variant_name})` : ''} x${i.quantity||1}`).join(' | ');

                if (prodName.length > 200) prodName = prodName.substring(0, 197) + '...';

                orderQty = cartItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);

                orderImageUrl = cartItems[0].image_url || '';

            }

            const dbProds = (await client.query('SELECT id, price, name, variants FROM products WHERE id = ANY($1)', [cartItems.map(i => i.id)])).rows;

            for (const item of cartItems) {

                if (parseInt(item.quantity) <= 0) throw new Error(`商品数量必须大于0`);

                const dbItem = dbProds.find(p => p.id.toString() === item.id.toString());

                if (!dbItem) throw new Error(`商品 ${item.name} 已下架，请移出购物车`);

                let itemPrice = parseFloat(dbItem.price);

                if (item.variant_name && dbItem.variants) {

                    const vList = typeof dbItem.variants === 'string' ? JSON.parse(dbItem.variants) : dbItem.variants;

                    const vMatch = vList.find(v => v.name === item.variant_name);

                    if (vMatch) itemPrice = parseFloat(vMatch.price);

                    else throw new Error(`商品 ${dbItem.name} 的规格 ${item.variant_name} 已失效`);

                }

                if (itemPrice !== parseFloat(item.price)) throw new Error(`商品 ${dbItem.name} 价格已变动，请重新结算`);

                amount += itemPrice * parseInt(item.quantity);

            }

        } else {

            const prod = (await client.query('SELECT * FROM products WHERE id = $1', [productId])).rows[0];

            if (prod) {

                prodName = prod.name; orderImageUrl = prod.image_url || ''; amount = parseFloat(prod.price);

                if (variantName && prod.variants) {

                    const vList = typeof prod.variants === 'string' ? JSON.parse(prod.variants) : prod.variants;

                    const vMatch = vList.find(v => v.name === variantName);

                    if (vMatch) { amount = parseFloat(vMatch.price); finalVariantName = variantName; }

                    else throw new Error(`规格 ${variantName} 已失效`);

                }

                if (amount !== parseFloat(variantPrice)) throw new Error(`商品 ${prod.name} 价格已变动，请刷新重试`);

                orderQty = 1; 

            } else {

                throw new Error('商品已下架或不存在');

            }

        }



        let finalUSDT = amount;

        let deduct = 0;

        let usedCouponAmount = 0;

        const rate = parseFloat(await getSetting('rate')); 

        const feeRate = parseFloat(await getSetting('feeRate'));



        if (couponCode) {

            const couponRes = await client.query('SELECT * FROM coupons WHERE code = $1 AND is_used = FALSE AND expires_at > NOW() FOR UPDATE', [couponCode]);

            if (couponRes.rows.length === 0) throw new Error('优惠劵无效或已过期');

            const couponAmount = parseFloat(couponRes.rows[0].amount);

            usedCouponAmount = couponAmount;

            const usdtDiscount = couponAmount / rate; 

            finalUSDT = Math.max(0, finalUSDT - usdtDiscount); 

            await client.query('UPDATE coupons SET is_used = TRUE WHERE code = $1', [couponCode]);

        }



        if (useBalance && user && parseFloat(user.balance) > 0) {

            deduct = Math.min(parseFloat(user.balance), finalUSDT);

            finalUSDT -= deduct; 

            await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [deduct, userId]);

            await logBalance(client, userId, '购物消费', -deduct, `订单 ${prodName} 余额抵扣`);

        }



        if (finalUSDT > 0 && (paymentMethod === 'USDT' || paymentMethod === 'usdt')) {

            let isUnique = false;

            let maxRetries = 10;

            let testUSDT = finalUSDT;

            while (!isUnique && maxRetries > 0) {

                const randomOffset = parseFloat((Math.floor(Math.random() * 30) + 1) / 100);

                testUSDT = parseFloat((finalUSDT + randomOffset).toFixed(2));

                const checkRes = await client.query("SELECT order_id FROM orders WHERE status = '待支付' AND usdt_amount = $1", [testUSDT.toFixed(2)]);

                if (checkRes.rows.length === 0) {

                    isUnique = true;

                }

                maxRetries--;

            }

            finalUSDT = testUSDT;

        }



        const cnyAmount = (finalUSDT * rate * (1 + feeRate/100)).toFixed(2);

        const orderId = 'XAW-' + Math.floor(10000 + Math.random() * 90000);

        const wallet = await getSetting('walletAddress');

        let orderStatus = finalUSDT <= 0 ? '已支付' : '待支付';

        

        await client.query(`

            INSERT INTO orders (order_id, user_id, product_name, variant_name, payment_method, usdt_amount, cny_amount, status, shipping_info, wallet, source, image_url, quantity, expires_at, balance_deducted)

            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW() + INTERVAL '30 minutes', $14)`,

            [orderId, userId, prodName, finalVariantName, paymentMethod, finalUSDT.toFixed(2), cnyAmount, orderStatus, JSON.stringify({ ...shippingInfo, contact_method: contactInfo }), wallet, source || 'xaw888.com', orderImageUrl, orderQty, deduct]

        );

                if (orderStatus === '已支付') {

            await handleReferralBonus(client, userId, amount, '消费'); // 传入 client 以复用事务

        }

        await client.query('COMMIT');

        

        let displayPayMethod = paymentMethod;

        if (paymentMethod === 'alipay' || paymentMethod === 'Alipay') displayPayMethod = '支付宝';

        if (paymentMethod === 'wechat' || paymentMethod === 'Wechat' || paymentMethod === 'WeChat') displayPayMethod = '微信';



        const sourceDomain = source || 'xaw888.com';

        const adminMention = sourceDomain.includes('8888') ? '@iibb8' : '@rrii8';

        let notifyText = `${adminMention}\n🆕 <b>新订单提醒</b>\n\n单号: <code>${orderId}</code>\n用户: ${user ? user.contact : userId}\nID: ${userId}\n联系: ${contactInfo}\n商品: ${prodName}${finalVariantName ? ` (${finalVariantName})` : ''}\n需付: ${finalUSDT.toFixed(2)} USDT`;

        if (usedCouponAmount > 0) {

            notifyText += `\n🎟️ <b>该用户使用了 ${usedCouponAmount} CNY的优惠劵</b>`;

        }

    if (finalUSDT <= 0) {

            notifyText += `\n✅ <b>余额全额抵扣，请直接发货</b>`;

        } else if (displayPayMethod === '微信' || displayPayMethod === '支付宝') {

           try {
                const gatewayParams = {
                    pid: PAY_MERCHANT_PID,
                    type: paymentMethod.toLowerCase() === 'alipay' ? 'alipay' : 'wxpay',
                    out_trade_no: orderId,
                    notify_url: `${process.env.RENDER_EXTERNAL_URL}/api/pay/notify`,
                    return_url: `https://${sourceDomain}`,
                    name: prodName,
                    money: cnyAmount,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    sign_type: 'RSA'
                };
                gatewayParams.sign = generatePaySign(gatewayParams, PAY_MERCHANT_PRIVATE_KEY);
              const gatewayRes = await fetch('https://nzzf.org/api/pay/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams(gatewayParams)
                }).then(r => r.json());
                
                console.log("支付网关完整返回:", JSON.stringify(gatewayRes));

                if (gatewayRes && gatewayRes.payurl) {
                    await pool.query("UPDATE orders SET qrcode_url = $1 WHERE order_id = $2", [gatewayRes.payurl, orderId]);
                }
            } catch (gwErr) {
                console.error("支付网关下单失败:", gwErr.message);
            }

            notifyText += `\n⚠️ <b>你有一个收款二维码需要上传请注意，用户的支付方式是${displayPayMethod}</b>`;

        } else if (displayPayMethod === 'USDT' || displayPayMethod === 'usdt') {

            notifyText += `\n💳 <b>该用户是USDT支付，支付成功会自动到账</b>`;

        }



        bot.telegram.sendMessage(TG_ADMIN_GROUP_ID, notifyText, { parse_mode: 'HTML' })

            .then(sentMsg => {

                if (sentMsg && (paymentMethod === 'USDT' || paymentMethod === 'usdt')) {

                    const timer = setTimeout(() => {

                        tgOrderMessages.delete(orderId);

                    }, 30 * 60 * 1000);

                    tgOrderMessages.set(orderId, { msgId: sentMsg.message_id, timer: timer });

                }

            })

            .catch(e => console.error("TG通知失败:", e.message));



       if (paymentMethod === 'USDT' || paymentMethod === 'usdt') {
            startUSDTHTTPPolling();
        }
        
        const fullOrderRes = await client.query(`
            SELECT o.*, u.contact as user_contact, u.id as user_display_id 
            FROM orders o LEFT JOIN users u ON o.user_id = u.id 
            WHERE o.order_id = $1
        `, [orderId]);
        notifyAdminUpdate('order', { payload: fullOrderRes.rows[0] });
        
        res.json({ success: true, orderId, usdtAmount: finalUSDT.toFixed(2), cnyAmount, wallet, status: orderStatus });
    } catch (e) {
        await client.query('ROLLBACK');
        res.json({ success: false, msg: e.message });
    } finally {
        client.release();
    }
});



app.get('/api/order', async (req, res) => {

    try {

        if (req.query.status === 'pending_qr') {

            res.json((await pool.query(`SELECT * FROM orders WHERE user_id = $1 AND status = '待支付' AND qrcode_url IS NOT NULL ORDER BY created_at DESC`, [req.query.userId])).rows);

        } else {

            res.json((await pool.query(`SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`, [req.query.userId])).rows);

        }

    } catch (e) {

        res.json([]);

    }

});



app.post('/api/order/cancel', async (req, res) => {

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const order = (await client.query('SELECT * FROM orders WHERE order_id = $1 AND user_id = $2 FOR UPDATE', [req.body.orderId, req.body.userId])).rows[0];

        if (!order) { await client.query('ROLLBACK'); return res.json({ success: false, msg: '订单不存在' }); }

        if (order.status !== '待支付') { await client.query('ROLLBACK'); return res.json({ success: false, msg: '无法取消该订单' }); }

        

        await client.query("UPDATE orders SET status = '已关闭' WHERE order_id = $1", [req.body.orderId]);

        

       if (parseFloat(order.balance_deducted) > 0) {

            await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [parseFloat(order.balance_deducted), req.body.userId]);

            await logBalance(client, req.body.userId, '订单取消', parseFloat(order.balance_deducted), `订单 ${req.body.orderId} 取消退回余额`);

        }

        await client.query('COMMIT');

        const fullOrderRes = await client.query(`
            SELECT o.*, u.contact as user_contact, u.id as user_display_id 
            FROM orders o LEFT JOIN users u ON o.user_id = u.id 
            WHERE o.order_id = $1
        `, [req.body.orderId]);
        notifyAdminUpdate('order', { payload: fullOrderRes.rows[0] });

        res.json({ success: true });

    } catch (e) {

        await client.query('ROLLBACK');

        res.json({ success: false, msg: e.message });

    } finally {

        client.release();

    }

});



app.post('/api/recharge', async (req, res) => {

    try {

        const user = (await pool.query('SELECT * FROM users WHERE id = $1', [req.body.userId])).rows[0];

        if (!user) return res.json({ success: false, msg: 'User not found' });

        

        let usdtAmount = parseFloat(req.body.amount); 

        if (req.body.method === 'USDT' || req.body.method === 'usdt') {

            let isUnique = false;

            let maxRetries = 10;

            let testUSDT = usdtAmount;

            while (!isUnique && maxRetries > 0) {

                const randomOffset = parseFloat((Math.floor(Math.random() * 30) + 1) / 100);

                testUSDT = parseFloat((usdtAmount + randomOffset).toFixed(2));

                const checkRes = await pool.query("SELECT order_id FROM orders WHERE status = '待支付' AND usdt_amount = $1", [testUSDT.toFixed(2)]);

                if (checkRes.rows.length === 0) {

                    isUnique = true;

                }

                maxRetries--;

            }

            usdtAmount = testUSDT;

        }

        

     const feeRate = parseFloat(await getSetting('feeRate')) || 0;

        const cnyAmount = (usdtAmount * parseFloat(await getSetting('rate')) * (1 + feeRate / 100)).toFixed(2);

        const orderId = 'XAW-' + Math.floor(10000 + Math.random() * 90000);

        const wallet = await getSetting('walletAddress');

        

await pool.query(`INSERT INTO orders (order_id, user_id, product_name, payment_method, usdt_amount, cny_amount, wallet, expires_at) VALUES ($1, $2, '余额充值', $3, $4, $5, $6, NOW() + INTERVAL '30 minutes')`, [orderId, req.body.userId, req.body.method, usdtAmount.toFixed(2), cnyAmount, wallet]);

        sendTgNotify(`💰 <b>新充值订单</b>\n单号: <code>${orderId}</code>\n用户: ${user.contact}\n金额: ${usdtAmount} USDT`);

        
        if (req.body.method === 'USDT' || req.body.method === 'usdt') {

            startUSDTHTTPPolling();

        } else if (req.body.method === 'alipay' || req.body.method === 'wxpay') {

            try {
                const gatewayParams = {
                    pid: PAY_MERCHANT_PID,
                    type: req.body.method,
                    out_trade_no: orderId,
                    notify_url: `${process.env.RENDER_EXTERNAL_URL}/api/pay/notify`,
                    return_url: `https://${req.body.source || user.source || 'xaw888.com'}`,
                    name: '余额充值',
                    money: cnyAmount,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    sign_type: 'RSA'
                };
                gatewayParams.sign = generatePaySign(gatewayParams);
               const gatewayRes = await fetch('https://nzzf.org/api/pay/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams(gatewayParams)
                }).then(r => r.json());
                if (gatewayRes && gatewayRes.payurl) {
                    await pool.query("UPDATE orders SET qrcode_url = $1 WHERE order_id = $2", [gatewayRes.payurl, orderId]);
                }
            } catch (gwErr) {
                console.error("充值网关下单失败:", gwErr.message);
            }

        }

        res.json({ success: true, orderId, usdtAmount: usdtAmount.toFixed(2), cnyAmount, wallet });

    } catch (e) {

        res.json({ success: false, msg: e.message });

    }

});



app.get('/api/user/records', async (req, res) => {

    try {

        if (req.query.type === 'withdraw') {

            res.json((await pool.query('SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC', [req.query.userId])).rows);

        } else if (req.query.type === 'recharge') {

            res.json((await pool.query("SELECT * FROM orders WHERE user_id = $1 AND product_name = '余额充值' ORDER BY created_at DESC", [req.query.userId])).rows);

        } else {

            res.json([]);

        }

    } catch (e) {

        res.json([]);

    }

});



app.get('/api/user/balance_logs', async (req, res) => {

    try {

        res.json((await pool.query('SELECT * FROM balance_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.query.userId])).rows);

    } catch (e) {

        res.status(500).json([]);

    }

});



app.post('/api/order/confirm-payment', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.json({ success: false, msg: '请选择图片' });
        try {
            await bot.telegram.sendPhoto(TG_ADMIN_GROUP_ID, { source: req.file.buffer }, {
                caption: `📸 <b>收到支付凭证</b>\n单号: <code>${req.body.orderId}</code>\n用户ID: ${req.body.userId}\n请核对金额后在后台确认。`,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                        { text: "✅ 已收到", callback_data: `pay_confirm_${req.body.orderId}_${req.body.userId}` },
                        { text: "❌ 未收到", callback_data: `pay_reject_${req.body.orderId}_${req.body.userId}` }
                    ]]
                }
            });
        } catch (e) { console.error("发送支付凭证至TG失败:", e.message); }
        
        await pool.query("UPDATE orders SET proof = 'TG_SENT', status = '待审核' WHERE order_id = $1", [req.body.orderId]);
        const fullOrderRes = await pool.query(`
            SELECT o.*, u.contact as user_contact, u.id as user_display_id 
            FROM orders o LEFT JOIN users u ON o.user_id = u.id 
            WHERE o.order_id = $1
        `, [req.body.orderId]);
        notifyAdminUpdate('order', { payload: fullOrderRes.rows[0] });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, msg: "网络繁忙，请联系客服核实" });
    }
});



app.post('/api/order/report-qr-issue', async (req, res) => {

    sendTgNotify(`🚨 <b>二维码异常反馈</b>\n单号: <code>${req.body.orderId}</code>`);

    res.json({ success: true });

});



app.post('/api/coupon/verify', async (req, res) => {

    try {

        const couponRes = await pool.query('SELECT amount FROM coupons WHERE code = $1 AND is_used = FALSE AND expires_at > NOW()', [req.body.code]);

        if (couponRes.rows.length > 0) res.json({ success: true, amount: parseFloat(couponRes.rows[0].amount) });

        else res.json({ success: false, msg: '优惠劵无效或已过期' });

    } catch (e) {

        res.json({ success: false, msg: '验证失败' });

    }

});

app.get('/api/admin/orders', adminAuth, async (req, res) => {

    try {

        const page = parseInt(req.query.page) || 1;

        const limit = Math.min(parseInt(req.query.limit) || 30, 100);

        const offset = (page - 1) * limit;

        const search = req.query.search || '';

        const status = req.query.status || 'all';

        let whereClause = '';

        const params = [];

        let paramIndex = 1;

        if (search) {

            whereClause += ` AND (o.order_id ILIKE $${paramIndex} OR o.product_name ILIKE $${paramIndex} OR u.contact ILIKE $${paramIndex})`;

            params.push(`%${search}%`);

            paramIndex++;

        }

        if (status !== 'all') {

            const statusMap = { pending: '待支付', paid: '已支付', cancelled: '已取消' };

            if (statusMap[status]) {

                whereClause += ` AND o.status = $${paramIndex}`;

                params.push(statusMap[status]);

                paramIndex++;

            }

        }

        const countQuery = `

            SELECT COUNT(*) as total

            FROM orders o

            LEFT JOIN users u ON o.user_id = u.id

            WHERE 1=1 ${whereClause}

        `;

        const dataQuery = `

            SELECT o.*, u.contact as user_contact, u.id as user_display_id

            FROM orders o

            LEFT JOIN users u ON o.user_id = u.id

            WHERE 1=1 ${whereClause}

            ORDER BY o.created_at DESC

            LIMIT $${paramIndex} OFFSET $${paramIndex+1}

        `;

        const countRes = await pool.query(countQuery, params);

        const total = parseInt(countRes.rows[0].total);

        const totalPages = Math.ceil(total / limit);

        params.push(limit, offset);

        const ordersRes = await pool.query(dataQuery, params);

        res.json({

            success: true,

            orders: ordersRes.rows,

            total,

            totalPages,

            currentPage: page

        });

    } catch (e) {

        res.status(500).json({ success: false, error: e.message });

    }

});



app.post('/api/withdraw', upload.single('file'), async (req, res) => {

    try {

        const amount = parseFloat(req.body.amount);

        if (isNaN(amount) || amount <= 0) return res.json({ success: false, msg: '金额必须大于0' });

        

        const user = (await pool.query('SELECT balance, contact FROM users WHERE id = $1', [req.body.userId])).rows[0];

        if (user.balance < amount) return res.json({ success: false, msg: '余额不足' });

        

        await pool.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, req.body.userId]);

        await logBalance(pool, req.body.userId, '提现申请', -amount, `申请提现到 ${req.body.method}`);

        

       const withdrawId = (await pool.query('INSERT INTO withdrawals (user_id, amount, address) VALUES ($1, $2, $3) RETURNING id', [req.body.userId, amount, req.file ? `[${req.body.method}] 收款码已发送` : (req.body.address || '无账号信息')])).rows[0].id;
        
        const options = {
            caption: `💸 <b>新提现申请 (${req.body.method})</b>\n用户: ${user.contact} (ID: ${req.body.userId})\n金额: ${amount} USDT\n账号: ${req.body.address || '无账号信息'}\nID: ${withdrawId}`,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ 已打款", callback_data: `wd_confirm_${withdrawId}_${req.body.userId}` },
                    { text: "❌ 驳回", callback_data: `wd_reject_${withdrawId}_${req.body.userId}_${amount}` }
                ]]
            }
        };
        
        if (req.file) await bot.telegram.sendPhoto(TG_ADMIN_GROUP_ID, { source: req.file.buffer }, options);

        else await bot.telegram.sendMessage(TG_ADMIN_GROUP_ID, options.caption, options);

        

        res.json({ success: true });

    } catch (e) {

        res.json({ success: false, msg: 'Error' });

    }

});



app.post('/api/chat/send', async (req, res) => {

    try {

        if (!req.body.userId) {

            return res.json({ success: false, msg: '请先登录注册后再发言', code: 403 });

        }

        if (req.body.userId) {

            const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [req.body.userId]);

            if (userCheck.rows.length === 0) {

                return res.json({ success: false, msg: '用户已被删除', code: 404 });

            }

        }



        const result = await pool.query('INSERT INTO chats (session_id, sender, content, msg_type, source) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at', [req.body.sessionId, 'user', req.body.text, req.body.msgType || 'text', req.body.source || 'xaw888.com']);

   

        const sourceDomain = req.body.source || 'xaw888.com';

        const bossName = sourceDomain.includes('8888') ? '龍哥' : 'Boss';

        let isHR = req.body.sessionId.startsWith('hr_');

        let rawSid = req.body.sessionId.replace('hr_', '');

        let displayId = rawSid.startsWith('user_') ? rawSid.replace('user_', '') : rawSid.slice(-4);

        let notifyType = isHR ? '招聘通知' : '网站客服通知';

        

        if (!mutedSessions.has(req.body.sessionId)) {

            const adminMention = sourceDomain.includes('8888') ? '@iibb8' : '@rrii8';

            sendTgNotify(`${adminMention}\n💬 <b>${notifyType}</b>\n归属: ${bossName}的客户\n用户: ${displayId}\n内容: ${req.body.msgType === 'image' ? '[发送了一张图片]' : escapeHTML(req.body.text)}`);

        }

        

        const messageData = { id: result.rows[0].id, session_id: req.body.sessionId, sender: 'user', content: req.body.text, msg_type: req.body.msgType || 'text', source: req.body.source || 'xaw888.com', created_at: result.rows[0].created_at };

        io.to(req.body.sessionId).emit('new_message', messageData);

        io.to('admin_room').emit('new_message', messageData);

        res.json({ success: true });

    } catch (e) {

        res.json({ success: false });

    }

});



app.post('/api/chat/read', async (req, res) => {

    try {

        await pool.query("UPDATE chats SET is_read = TRUE WHERE session_id = $1 AND sender = 'admin'", [req.body.sessionId]);

        io.emit('user_chat_read', { sessionId: req.body.sessionId });

        res.json({ success: true });

    } catch (e) {

        res.json({ success: false });

    }

});



app.get('/api/chat/history/:sid', async (req, res) => {

    try {

        res.json((await pool.query('SELECT * FROM chats WHERE session_id = $1 ORDER BY created_at ASC', [req.params.sid])).rows);

    } catch (e) {

        res.json([]);

    }

});



app.get('/api/admin/all', adminAuth, async (req, res) => {

    try {

        const chatsRes = await pool.query('SELECT * FROM chats ORDER BY created_at ASC');

        let chats = {};

        chatsRes.rows.forEach(msg => {

            if (!chats[msg.session_id]) chats[msg.session_id] = [];

            chats[msg.session_id].push(msg);

        });

        const visitStats = await getVisitStats();

        

        res.json({

            users: (await pool.query('SELECT * FROM users ORDER BY created_at DESC')).rows,

            orders: (await pool.query('SELECT * FROM orders ORDER BY created_at DESC')).rows,

            products: (await pool.query('SELECT * FROM products ORDER BY id DESC')).rows,

            hiring: (await pool.query('SELECT * FROM hiring')).rows,

            visits: visitStats,

            chats,

            rate: await getSetting('rate'),

            feeRate: await getSetting('feeRate'),

            announcement: await getSetting('announcement'),

            popup: await getSetting('popup'),

            mutedSessions: Array.from(mutedSessions),

            quickReplies: await getSetting('quick_replies') || '您好，请问有什么可以帮您？\n请发送支付截图核实验证。'

        });

    } catch (e) {

        res.status(500).json({});

    }

});

app.get('/api/admin/products', adminAuth, async (req, res) => {

    try {

        const page = parseInt(req.query.page) || 1;

        const limit = Math.min(parseInt(req.query.limit) || 30, 100);

        const category = req.query.category || '';

        const offset = (page - 1) * limit;



        let query = 'SELECT * FROM products';

        let countQuery = 'SELECT COUNT(*) as total FROM products';

        const params = [];

        if (category) {

            query += ' WHERE category = $1';

            countQuery += ' WHERE category = $1';

            params.push(category);

        }

        query += ' ORDER BY is_pinned DESC, is_hot DESC, hot_time ASC, id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);

        params.push(limit, offset);



        const [productsRes, countRes, categoriesRes, priorityRes] = await Promise.all([
                pool.query(query, params),
                pool.query(countQuery, category ? [category] : []),
                pool.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != \'\''),
                pool.query('SELECT name, priority FROM categories')
            ]);

            const total = parseInt(countRes.rows[0].total);
            const totalPages = Math.ceil(total / limit);
            const categories = categoriesRes.rows.map(r => r.category);

            const priorityMap = {};
            priorityRes.rows.forEach(r => { priorityMap[r.name] = r.priority; });

            const productsWithPriority = productsRes.rows.map(p => {
                if (p.sub_category) {
                    const dbKey = `${p.category}::${p.sub_category}`;
                    if (priorityMap[dbKey] !== undefined) {
                        p._sub_priority = priorityMap[dbKey];
                    }
                }
                return p;
            });

            res.json({
                success: true,
                products: productsWithPriority,
                total,
                totalPages,
                currentPage: page,
                categories
            });

    } catch (e) {

        console.error('Admin products API error:', e);

        res.status(500).json({ success: false, error: e.message });

    }

});



app.get('/api/admin/users_page', adminAuth, async (req, res) => {

    try {

        const page = parseInt(req.query.page) || 1;

        const limit = Math.min(parseInt(req.query.limit) || 30, 100);

        const offset = (page - 1) * limit;

        const search = req.query.search || '';

        const source = req.query.source || 'all';

        let whereClause = '';

        const params = [];

        let paramIndex = 1;

        if (search) {

            whereClause += ` AND (u.contact ILIKE $${paramIndex} OR u.id::text ILIKE $${paramIndex})`;

            params.push(`%${search}%`);

            paramIndex++;

        }

        if (source !== 'all') {

            if (source === 'boss') {

                whereClause += ` AND (u.source IS NULL OR u.source NOT LIKE '%8888%')`;

            } else if (source === 'longge') {

                whereClause += ` AND u.source LIKE '%8888%'`;

            }

        }

        const countQuery = `SELECT COUNT(*) as total FROM users u WHERE 1=1 ${whereClause}`;

        const dataQuery = `

            SELECT u.*, 

                   (SELECT COUNT(*) > 0 FROM orders WHERE user_id = u.id) as has_order

            FROM users u

            WHERE 1=1 ${whereClause}

            ORDER BY u.created_at DESC

            LIMIT $${paramIndex} OFFSET $${paramIndex+1}

        `;

        const countRes = await pool.query(countQuery, params);

        const total = parseInt(countRes.rows[0].total);

        const totalPages = Math.ceil(total / limit);

        params.push(limit, offset);

        const usersRes = await pool.query(dataQuery, params);

        res.json({

            success: true,

            users: usersRes.rows,

            total,

            totalPages,

            currentPage: page

        });

    } catch (e) {

        res.status(500).json({ success: false, error: e.message });

    }

});







app.post('/api/admin/user/balance', adminAuth, async (req, res) => {

    try {

        const val = parseFloat(req.body.amount);

        let sql = '';

        if (req.body.type === 'add') sql = 'UPDATE users SET balance = balance + $1 WHERE id = $2';

        if (req.body.type === 'subtract') sql = 'UPDATE users SET balance = GREATEST(0, balance - $1) WHERE id = $2';

        if (req.body.type === 'set') sql = 'UPDATE users SET balance = $1 WHERE id = $2';

        

        await pool.query(sql, [val, req.body.userId]);
        await logBalance(pool, req.body.userId, '客服后台充值', req.body.type === 'add' ? val : (req.body.type === 'subtract' ? -val : 0), req.body.type === 'set' ? `客服重置余额为 ${val}` : `客服后台操作 ${req.body.type}`);
        
        const updatedBalanceRes = await pool.query("SELECT balance FROM users WHERE id = $1", [req.body.userId]);
        io.to(`user_${req.body.userId}`).emit('order_update', { balance: updatedBalanceRes.rows[0].balance });
        res.json({ success: true });

    } catch (e) {

        res.json({ success: false });

    }

});



app.get('/api/admin/chat_sessions', adminAuth, async (req, res) => {

    try {

        const limit = Math.min(parseInt(req.query.limit) || 20, 100);

        const offset = parseInt(req.query.offset) || 0;

        const sourceFilter = req.query.source || 'all';

        let mainSourceCondition = '';

        let countSourceCondition = '';

        if (sourceFilter === 'boss') {

            mainSourceCondition = " AND (ss.session_source IS NULL OR ss.session_source NOT LIKE '%8888%')";

            countSourceCondition = " AND (session_source IS NULL OR session_source NOT LIKE '%8888%')";

        } else if (sourceFilter === 'longge') {

            mainSourceCondition = " AND ss.session_source LIKE '%8888%'";

            countSourceCondition = " AND session_source LIKE '%8888%'";

        }

        const query = `

            WITH latest_messages AS (

                SELECT DISTINCT ON (session_id) session_id, content, msg_type, created_at, sender, is_read

                FROM chats

                ORDER BY session_id, created_at DESC, id DESC

            ),

            session_stats AS (

                SELECT 

                    session_id,

                    MAX(source) as session_source,

                    COUNT(*) FILTER (WHERE sender = 'user' AND is_read = FALSE) as unread_count

                FROM chats

                GROUP BY session_id

            )

            SELECT 

                lm.session_id,

                lm.content as last_message_preview,

                lm.msg_type,

                lm.created_at as last_message_time,

                lm.sender as last_sender,

                ss.session_source as source,

                COALESCE(ss.unread_count, 0) as unread_count

            FROM latest_messages lm

            LEFT JOIN session_stats ss ON lm.session_id = ss.session_id

            WHERE 1=1 ${mainSourceCondition}

            ORDER BY lm.created_at DESC, lm.session_id DESC

            LIMIT $1 OFFSET $2

        `;

        const countQuery = `

            SELECT COUNT(*) as total

            FROM (

                SELECT session_id, MAX(source) as session_source

                FROM chats

                GROUP BY session_id

            ) ss

            WHERE 1=1 ${countSourceCondition}

        `;

        const [sessionsRes, countRes] = await Promise.all([

            pool.query(query, [limit, offset]),

            pool.query(countQuery)

        ]);

        const total = parseInt(countRes.rows[0].total);

        const sessions = sessionsRes.rows.map(s => {

            let displayUid = s.session_id;

            if (displayUid.startsWith('hr_')) displayUid = displayUid.replace('hr_', '');

            if (displayUid.startsWith('user_')) displayUid = displayUid.replace('user_', '');

            return {

                ...s,

                display_uid: displayUid,

                last_message_preview: s.msg_type === 'image' ? '[图片]' : (s.last_message_preview || '').substring(0, 30)

            };

        });

        res.json({

            success: true,

            sessions: sessions,

            total: total,

            hasMore: offset + sessions.length < total

        });

    } catch (e) {

        res.status(500).json({ success: false, error: e.message });

    }

});



app.post('/api/admin/chat/initiate', adminAuth, async (req, res) => {

    try {

        const sid = `user_${req.body.userId}`;

        const result = await pool.query("INSERT INTO chats (session_id, sender, content, msg_type, is_initiate) VALUES ($1, 'admin', '客服已接入', 'text', TRUE) RETURNING id, created_at", [sid]);

        const messageData = { id: result.rows[0].id, session_id: sid, sender: 'admin', content: '客服已接入', msg_type: 'text', created_at: result.rows[0].created_at };

        io.to(sid).emit('new_message', messageData);

        io.to('admin_room').emit('new_message', messageData);

        res.json({ success: true, sessionId: sid });

    } catch (e) {

        res.status(500).json({ success: false, msg: e.message });

    }

});



app.post('/api/admin/chat/read', adminAuth, async (req, res) => {

    await pool.query("UPDATE chats SET is_read = TRUE WHERE session_id = $1 AND sender = 'user'", [req.body.sessionId]);

    io.emit('admin_chat_read', { sessionId: req.body.sessionId });

    res.json({ success: true });

});



app.post('/api/admin/product/hot', adminAuth, async (req, res) => {

    try {

        if (!Array.isArray(req.body.ids)) return res.json({ success: false });

        const ids = req.body.ids.map(id => Number(id));

        if (req.body.isHot) {

            await pool.query('UPDATE products SET is_hot = TRUE, hot_time = COALESCE(hot_time, NOW()) WHERE id = ANY($1)', [ids]);

        } else {

            await pool.query('UPDATE products SET is_hot = FALSE, hot_time = NULL WHERE id = ANY($1)', [ids]);

        }

        io.emit('products_hot_changed', { ids: ids, is_hot: req.body.isHot });

        res.json({ success: true });

    } catch (e) {

        res.status(500).json({ success: false });

    }

});
app.post('/api/admin/product/batch-subcategory', adminAuth, async (req, res) => {
    try {
        const { ids, category, subCategory } = req.body;
        if (!Array.isArray(ids)) return res.json({ success: false });
        
        await pool.query(
            'UPDATE products SET category = $1, sub_category = $2 WHERE id = ANY($3)',
            [category, subCategory || null, ids.map(id => Number(id))]
        );

        // 局部静默刷新的关键：通过 Socket 告知前端哪些商品变了
        io.emit('products_category_changed', { ids, category, sub_category: subCategory || null });
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// 补全缺失的分类排序权重接口 (批量并解决同名冲突)
app.post('/api/admin/category/priority/batch', adminAuth, async (req, res) => {
    try {
        const { target, sortedNames, items } = req.body;
        for (const item of items) {
            // 解决同名二级分类冲突：拼接主分类名作为复合键
            const dbKey = item.parent ? `${item.parent}::${item.name}` : item.name;
            await pool.query(
                'INSERT INTO categories (name, priority) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET priority = $2',
                [dbKey, item.priority]
            );
        }

        // 仅发送一次广播，并携带排序好的数组，供前端本地静默重组
        io.emit('global_update', { type: 'category_sort', target, sortedNames });

        res.json({ success: true });
    } catch (e) {
        console.error("保存分类排序失败:", e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});


app.post('/api/admin/chat/toggle_mute', adminAuth, (req, res) => {

    const sid = req.body.sessionId;

    if (mutedSessions.has(sid)) {

        mutedSessions.delete(sid);

        res.json({ success: true, isMuted: false });

    } else {

        mutedSessions.add(sid);

        if (mutedSessions.size > 1000) {

            const oldest = mutedSessions.keys().next().value;

            mutedSessions.delete(oldest);

        }

        res.json({ success: true, isMuted: true });

    }

});



    app.post('/api/admin/chat/clear', adminAuth, async (req, res) => {

    try {

        await pool.query("DELETE FROM chats WHERE session_id = $1", [req.body.sessionId]);

        res.json({ success: true });

    } catch (e) {

        res.status(500).json({ success: false, msg: e.message });

    }

});



app.post('/api/chat/upload', upload.single('file'), async (req, res) => {

    if (req.file) {

        try { res.json({ success: true, url: await uploadToCloud(req.file.buffer) }); }

        catch (e) { res.json({ success: false, error: 'Upload failed' }); }

    } else {

        res.json({ success: false, error: 'No file' });

    }

});



app.post('/api/admin/reply', adminAuth, async (req, res) => {
    try {
        const result = await pool.query("INSERT INTO chats (session_id, sender, content, msg_type) VALUES ($1, 'admin', $2, $3) RETURNING id, created_at", [req.body.sessionId, req.body.text, req.body.msgType || 'text']);
        const messageData = { id: result.rows[0].id, session_id: req.body.sessionId, sender: 'admin', content: req.body.text, msg_type: req.body.msgType || 'text', created_at: result.rows[0].created_at };
        io.to(req.body.sessionId).emit('new_message', messageData);
        io.to('admin_room').emit('new_message', messageData);
        if (process.env.VAPID_PUBLIC_KEY) {
            try {
                let targetUserId = req.body.sessionId.replace('hr_', '').replace('user_', '');
                const subs = await pool.query("SELECT * FROM push_subscriptions WHERE user_id = $1", [String(targetUserId)]);
                const payload = JSON.stringify({ title: '客服新消息', body: req.body.msgType === 'image' ? '[图片]' : req.body.text, url: '/', icon: '/icon.jpg' });
                for (const sub of subs.rows) {
                    await webpush.sendNotification(sub.keys ? { endpoint: sub.endpoint, keys: sub.keys } : sub.endpoint, payload).catch(async (err) => {
                        if (err.statusCode === 404 || err.statusCode === 410) {
                            await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [sub.id]);
                        }
                    });
                }
            } catch (e) {}
        }
        res.json({ success: true, data: messageData });
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});

app.get('/api/admin/chat/messages/:sessionId', adminAuth, async (req, res) => {

    try {

        const sessionId = req.params.sessionId;

        const limit = Math.min(parseInt(req.query.limit) || 20, 100);

        const offset = parseInt(req.query.offset) || 0;



        const countRes = await pool.query('SELECT COUNT(*) as total FROM chats WHERE session_id = $1', [sessionId]);

        const total = parseInt(countRes.rows[0].total);

        

        const messagesRes = await pool.query(

            'SELECT * FROM chats WHERE session_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3',

            [sessionId, limit, offset]

        );

        const messages = messagesRes.rows.reverse(); // 返回正序

        

        res.json({

            success: true,

            messages: messages,

            total: total,

            hasMore: offset + messages.length < total

        });

    } catch (e) {

        console.error('Chat messages API error:', e);

        res.status(500).json({ success: false, error: e.message });

    }

});



app.post('/api/upload', adminAuth, upload.single('file'), async (req, res) => {

    if (req.file) {

        try { res.json({ success: true, url: await uploadToCloud(req.file.buffer) }); }

        catch (e) { res.json({ success: false, error: 'Upload failed' }); }

    } else {

        res.json({ success: false, error: 'No file' });

    }

});



app.post('/api/admin/order/ship', adminAuth, async (req, res) => {
    try {
        const result = await pool.query("UPDATE orders SET tracking_number = $1, status = '已发货' WHERE order_id = $2 RETURNING user_id", [req.body.trackingNumber, req.body.orderId]);
        if (result.rows.length > 0) {
            const userId = result.rows[0].user_id;
            const updatedOrderRes = await pool.query("SELECT * FROM orders WHERE order_id = $1", [req.body.orderId]);
            io.to(`user_${userId}`).emit('order_update', { order: updatedOrderRes.rows[0] });
            const notifySid = `user_${userId}`;

            const content = `✅ 您的订单（单号：${req.body.orderId}）已发货！\n📦 物流单号：${req.body.trackingNumber}`;

            const chatRes = await pool.query("INSERT INTO chats (session_id, sender, content, msg_type) VALUES ($1, 'admin', $2, 'text') RETURNING id, created_at", [notifySid, content]);

            const messageData = { id: chatRes.rows[0].id, session_id: notifySid, sender: 'admin', content: content, msg_type: 'text', created_at: chatRes.rows[0].created_at };

            io.to(notifySid).emit('new_message', messageData);

            io.to('admin_room').emit('new_message', messageData);

            if (process.env.VAPID_PUBLIC_KEY) {

                try {

                    const subs = await pool.query("SELECT * FROM push_subscriptions WHERE user_id = $1", [String(userId)]);

                    const payload = JSON.stringify({ title: '订单已发货', body: `物流单号: ${req.body.trackingNumber}`, url: '/', icon: '/icon.jpg' });

                    for (const sub of subs.rows) {

                        await webpush.sendNotification(sub.keys ? { endpoint: sub.endpoint, keys: sub.keys } : sub.endpoint, payload).catch(async (err) => {

                            if (err.statusCode === 404 || err.statusCode === 410) {

                                await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [sub.id]);

                            }

                        });

                    }

                } catch (e) {}

            }

        }

        sendTgNotify(`🚚 <b>订单已发货</b>\n单号: <code>${req.body.orderId}</code>\n物流: ${req.body.trackingNumber}`);

        const fullOrderRes = await pool.query(`
            SELECT o.*, u.contact as user_contact, u.id as user_display_id 
            FROM orders o LEFT JOIN users u ON o.user_id = u.id 
            WHERE o.order_id = $1
        `, [req.body.orderId]);
        notifyAdminUpdate('order', { payload: fullOrderRes.rows[0] });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});



app.post('/api/admin/order/upload_qrcode', adminAuth, upload.single('qrcode'), async (req, res) => {
    if (req.file) {
        try {
            const result = await pool.query("UPDATE orders SET qrcode_url = $1, expires_at = NOW() + INTERVAL '30 minutes' WHERE order_id = $2 RETURNING user_id", [await uploadToCloud(req.file.buffer), req.body.orderId]);
            sendTgNotify(`✅ <b>收款码已上传</b>\n单号: <code>${req.body.orderId}</code>`);
            if (result.rows[0]?.user_id) {
                const updatedOrderRes = await pool.query("SELECT * FROM orders WHERE order_id = $1", [req.body.orderId]);
                io.to(`user_${result.rows[0].user_id}`).emit('order_update', { order: updatedOrderRes.rows[0] });
            }
            const fullOrderRes = await pool.query(`
                SELECT o.*, u.contact as user_contact, u.id as user_display_id 
                FROM orders o LEFT JOIN users u ON o.user_id = u.id 
                WHERE o.order_id = $1
            `, [req.body.orderId]);
            notifyAdminUpdate('order', { payload: fullOrderRes.rows[0] });

            res.json({ success: true });
        } catch (e) {
            res.json({ success: false, msg: 'Upload failed' });
        }
    } else {
        res.json({ success: false });
    }
});

app.get('/api/pay/notify', async (req, res) => {
    try {
        if (!verifyPaySign(req.query)) {
            return res.send('fail');
        }
        if (req.query.trade_status !== 'TRADE_SUCCESS') {
            return res.send('success');
        }
        const orderRes = await pool.query("SELECT * FROM orders WHERE order_id = $1 AND status = '待支付'", [req.query.out_trade_no]);
        const order = orderRes.rows[0];
        if (!order) {
            return res.send('success');
        }
        await pool.query("UPDATE orders SET status = '已支付' WHERE order_id = $1", [order.order_id]);
        if (order.product_name === '余额充值') {
            await pool.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [parseFloat(order.usdt_amount), order.user_id]);
        } else {
            await handleReferralBonus(order.user_id, parseFloat(order.usdt_amount), '消费');
        }
        const updatedOrderRes = await pool.query("SELECT * FROM orders WHERE order_id = $1", [order.order_id]);
        const updatedBalanceRes = await pool.query("SELECT balance FROM users WHERE id = $1", [order.user_id]);
        io.to(`user_${order.user_id}`).emit('order_update', {
            order: updatedOrderRes.rows[0],
            balance: updatedBalanceRes.rows[0].balance
        });
        const fullAdminOrderRes = await pool.query(`
            SELECT o.*, u.contact as user_contact, u.id as user_display_id 
            FROM orders o LEFT JOIN users u ON o.user_id = u.id 
            WHERE o.order_id = $1
        `, [order.order_id]);
        notifyAdminUpdate('order', { payload: fullAdminOrderRes.rows[0] });
        const orderData = tgOrderMessages.get(order.order_id);
        if (orderData) {
            clearTimeout(orderData.timer);
            tgOrderMessages.delete(order.order_id);
        }
        sendTgNotify(`✅ <b>支付宝/微信支付成功</b>\n单号: ${order.order_id}\n金额: ${req.query.money}`);
        res.send('success');
    } catch (e) {
        console.error("支付回调处理失败:", e.message);
        res.send('fail');
    }
});


app.post('/api/admin/update/announcement', adminAuth, async (req, res) => {

    await setSetting('announcement', req.body.text);

    io.emit('setting_updated', { key: 'announcement', value: req.body.text });

    res.json({ success: true });

});



app.post('/api/admin/update/popup', adminAuth, async (req, res) => {

    await setSetting('popup', req.body.open);

    // 这里将 key 改为和数据库一致的 popup，或者让前端兼容这两个名字

    io.emit('setting_updated', { key: 'popup', value: req.body.open });

    res.json({ success: true });

});



app.post('/api/admin/update/quick_replies', adminAuth, async (req, res) => {

    await setSetting('quick_replies', req.body.text);

    res.json({ success: true });

});



app.post('/api/admin/chat/recall', adminAuth, async (req, res) => {

    try {

        await pool.query("UPDATE chats SET content = '此消息已撤回', msg_type = 'system' WHERE id = $1", [req.body.messageId]);

        io.to(req.body.sessionId).emit('message_recalled', { messageId: req.body.messageId });

        io.to('admin_room').emit('message_recalled', { messageId: req.body.messageId, sessionId: req.body.sessionId });

        res.json({ success: true });

    } catch (e) {

        res.json({ success: false });

    }

});



app.post('/api/admin/product', adminAuth, upload.single('file'), async (req, res) => {

    try {

        const id = Date.now();

        const imageUrl = req.file ? await uploadToCloud(req.file.buffer) : req.body.imageUrl || '';

        const variants = req.body.variants || '[]';

        await pool.query('INSERT INTO products (id, name, price, category, sub_category, type, description, image_url, variants) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [id, req.body.name, req.body.price, req.body.category, req.body.subCategory || null, req.body.type, req.body.desc, imageUrl, variants]);

        io.emit('product_added', {

            id: id,

            name: req.body.name,

            price: req.body.price,

            category: req.body.category,

            sub_category: req.body.subCategory || null,

            type: req.body.type,

            description: req.body.desc,

            image_url: imageUrl,

            variants: variants,

            is_pinned: false,

            is_hot: false,

            hot_time: null // 必须显式传递，否则前端排序函数 compare(a, b) 读取 a.hot_time 时会崩溃

        });

        res.json({ success: true });

    } catch (e) {

        res.json({ success: false, msg: e.message });

    }

});


app.put('/api/admin/product/:id', adminAuth, async (req, res) => {

    // 先查出原有的热销状态，防止覆盖丢失

    const oldProd = await pool.query('SELECT is_hot, is_pinned, hot_time FROM products WHERE id = $1', [req.params.id]);

    const { is_hot, is_pinned, hot_time } = oldProd.rows[0] || {};



    await pool.query('UPDATE products SET name=$1, price=$2, category=$3, sub_category=$4, type=$5, description=$6, image_url=$7, variants=$8 WHERE id=$9', [req.body.name, req.body.price, req.body.category, req.body.subCategory || null, req.body.type, req.body.desc, req.body.imageUrl, req.body.variants || '[]', req.params.id]);

    

    io.emit('product_updated', {

        id: Number(req.params.id),

        name: req.body.name,

        price: req.body.price,

        category: req.body.category,

        sub_category: req.body.subCategory || null,

        type: req.body.type,

        description: req.body.desc,

        image_url: req.body.imageUrl,

        variants: req.body.variants || '[]',

        is_hot: is_hot,

        is_pinned: is_pinned,

        hot_time: hot_time

    });

    res.json({ success: true });

});



app.delete('/api/admin/product/:id', adminAuth, async (req, res) => {

    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);

    io.emit('product_deleted', Number(req.params.id));

    res.json({ success: true });

});



app.post('/api/admin/product/pin/:id', adminAuth, async (req, res) => {

    try {

        const productRes = await pool.query('SELECT is_pinned FROM products WHERE id = $1', [req.params.id]);

        if (productRes.rows.length === 0) return res.json({ success: false, msg: '商品不存在' });

        await pool.query('UPDATE products SET is_pinned = $1 WHERE id = $2', [!productRes.rows[0].is_pinned, req.params.id]);

        io.emit('product_patched', { id: Number(req.params.id), is_pinned: !productRes.rows[0].is_pinned });

        notifyAdminUpdate();

        res.json({ success: true, is_pinned: !productRes.rows[0].is_pinned });

    } catch (e) {

        res.status(500).json({ success: false, msg: e.message });

    }

});



app.get('/api/admin/hiring', adminAuth, async (req, res) => {

    try {

        const hiringRes = await pool.query('SELECT * FROM hiring');

        res.json({ success: true, hiring: hiringRes.rows });

    } catch (e) {

        res.status(500).json({ success: false, error: e.message });

    }

});



app.post('/api/admin/update/hiring', adminAuth, async (req, res) => {

    await pool.query('TRUNCATE hiring');

    for (const job of req.body) {

        await pool.query('INSERT INTO hiring (title, content, contact) VALUES ($1, $2, $3)', [job.title, job.content, job.contact]);

    }

    io.emit('hiring_updated', req.body);

    res.json({ success: true });

});

app.post('/api/admin/confirm_pay', adminAuth, async (req, res) => {

    const client = await pool.connect(); 

    try {

        await client.query('BEGIN');

        const order = (await client.query("SELECT * FROM orders WHERE order_id = $1 FOR UPDATE", [req.body.orderId])).rows[0];

        if (!order) { await client.query('ROLLBACK'); return res.json({ success: false, msg: '订单不存在' }); }

        

        if (order.status !== '已支付') {

            await client.query("UPDATE orders SET status = '已支付' WHERE order_id = $1", [req.body.orderId]);

            if ((order.product_name ? order.product_name.trim() : '') === '余额充值') {

                await client.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [parseFloat(order.usdt_amount), order.user_id]);

                await client.query("INSERT INTO balance_logs (user_id, type, amount, remark, balance_after) VALUES ($1, $2, $3, $4, $5)", [order.user_id, '余额充值', parseFloat(order.usdt_amount), `订单 ${req.body.orderId} 充值到账`, (await client.query("SELECT balance FROM users WHERE id = $1", [order.user_id])).rows[0]?.balance || 0]);

            } else {

                try { await handleReferralBonus(order.user_id, parseFloat(order.usdt_amount), '消费'); } catch (bonusErr) {}

            }

          await client.query('COMMIT');
            const updatedOrderRes = await pool.query("SELECT * FROM orders WHERE order_id = $1", [req.body.orderId]);
            const updatedBalanceRes = await pool.query("SELECT balance FROM users WHERE id = $1", [order.user_id]);
            io.to(`user_${order.user_id}`).emit('order_update', { order: updatedOrderRes.rows[0], balance: updatedBalanceRes.rows[0].balance });
            
            const fullOrderRes = await pool.query(`
                SELECT o.*, u.contact as user_contact, u.id as user_display_id 
                FROM orders o LEFT JOIN users u ON o.user_id = u.id 
                WHERE o.order_id = $1
            `, [req.body.orderId]);
            notifyAdminUpdate('order', { payload: fullOrderRes.rows[0] });
            
            res.json({ success: true });
        } else {
            await client.query('ROLLBACK');
            res.json({ success: false, msg: '订单状态已经是已支付，请勿重复操作' });
        }
    } catch (e) {

        await client.query('ROLLBACK');

        res.status(500).json({ success: false, msg: e.message });

    } finally {

        client.release();

    }

});



app.get('/api/admin/balance_logs', adminAuth, async (req, res) => {

    try {

        const page = parseInt(req.query.page) || 1;

        const limit = Math.min(parseInt(req.query.limit) || 30, 100);

        const offset = (page - 1) * limit;

        const userId = req.query.userId;

        let whereClause = '';

        const params = [];

        if (userId) {

            whereClause = 'WHERE b.user_id = $1';

            params.push(userId);

        }

        const countQuery = `SELECT COUNT(*) as total FROM balance_logs b ${whereClause}`;

        const dataQuery = `

            SELECT b.*, u.contact

            FROM balance_logs b

            LEFT JOIN users u ON b.user_id = u.id

            ${whereClause}

            ORDER BY b.created_at DESC

            LIMIT $${params.length+1} OFFSET $${params.length+2}

        `;

        const countRes = await pool.query(countQuery, params);

        const total = parseInt(countRes.rows[0].total);

        const totalPages = Math.ceil(total / limit);

        params.push(limit, offset);

        const logsRes = await pool.query(dataQuery, params);

        res.json({

            success: true,

            logs: logsRes.rows,

            total,

            totalPages,

            currentPage: page

        });

    } catch (e) {

        res.status(500).json({ success: false, error: e.message });

    }

});



app.post('/api/admin/order/cancel', adminAuth, async (req, res) => {

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const order = (await client.query("SELECT * FROM orders WHERE order_id = $1 FOR UPDATE", [req.body.orderId])).rows[0];

        if (!order) throw new Error('订单不存在');

        

        await client.query("UPDATE orders SET status = '已取消' WHERE order_id = $1", [req.body.orderId]);

        

        if (parseFloat(order.balance_deducted) > 0 && order.status === '待支付') {
            await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [parseFloat(order.balance_deducted), order.user_id]);
            await logBalance(client, order.user_id, '订单取消', parseFloat(order.balance_deducted), `管理员取消订单 ${req.body.orderId} 退回余额`);
        }
        await client.query('COMMIT');
        const updatedOrderRes = await pool.query("SELECT * FROM orders WHERE order_id = $1", [req.body.orderId]);
        const updatedBalanceRes = await pool.query("SELECT balance FROM users WHERE id = $1", [order.user_id]);
        io.to(`user_${order.user_id}`).emit('order_update', { order: updatedOrderRes.rows[0], balance: updatedBalanceRes.rows[0].balance });
       const fullOrderRes = await pool.query(`
            SELECT o.*, u.contact as user_contact, u.id as user_display_id 
            FROM orders o LEFT JOIN users u ON o.user_id = u.id 
            WHERE o.order_id = $1
        `, [req.body.orderId]);
        notifyAdminUpdate('order', { payload: fullOrderRes.rows[0] });

        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.json({ success: false, msg: e.message });
    } finally {
        client.release();
    }
});



let usdtPollingTimer = null;

let minTimestamp = Date.now();

const processedTxIds = new Set();



async function startUSDTHTTPPolling() {

    if (usdtPollingTimer) return;



    try {

        const oldestOrderRes = await pool.query(

            "SELECT created_at FROM orders WHERE status = '待支付' AND (payment_method = 'USDT' OR payment_method = 'usdt') ORDER BY created_at ASC LIMIT 1"

        );

        if (oldestOrderRes.rows.length > 0) {

            minTimestamp = new Date(oldestOrderRes.rows[0].created_at).getTime() - 60000;

        } else {

            minTimestamp = Date.now();

        }

    } catch (err) {

        minTimestamp = Date.now();

    }



    usdtPollingTimer = setInterval(async () => {

        try {

            const pendingRes = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status = '待支付' AND (payment_method = 'USDT' OR payment_method = 'usdt')");

            if (parseInt(pendingRes.rows[0].count) === 0) {

                clearInterval(usdtPollingTimer);

                usdtPollingTimer = null;

                return;

            }

            

            const systemWallet = await getSetting('walletAddress');

            if (!systemWallet || systemWallet.length < 10) return;

            

            const url = `https://api.trongrid.io/v1/accounts/${systemWallet}/transactions/trc20?contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&limit=20&min_timestamp=${minTimestamp}`;

            const tronApiKey = process.env.TRON_API_KEY || '';

            const headers = { 'Accept': 'application/json' };

            if (tronApiKey) {

                headers['TRON-PRO-API-KEY'] = tronApiKey;

            }



            const response = await fetch(url, { method: 'GET', headers: headers });

            const data = await response.json();

            

            if (data && data.success && data.data && data.data.length > 0) {

                let maxTime = minTimestamp;

                for (const tx of data.data) {

                    if (tx.block_timestamp > maxTime) {

                        maxTime = tx.block_timestamp;

                    }

                    if (processedTxIds.has(tx.transaction_id)) continue;

                    processedTxIds.add(tx.transaction_id);

                    

                    if (processedTxIds.size > 2000) {

                        const iterator = processedTxIds.keys();

                        processedTxIds.delete(iterator.next().value);

                    }

                    if (tx.to !== systemWallet) continue;

                    

                    const amount = (parseFloat(tx.value) / 1000000).toFixed(2);

                    const orderRes = await pool.query("SELECT * FROM orders WHERE status = '待支付' AND usdt_amount = $1 ORDER BY created_at ASC LIMIT 1", [amount]);

                    const order = orderRes.rows[0];

                    

                    if (!order) continue;

                    

                    const order_id = order.order_id;

                    await pool.query("UPDATE orders SET status = '已支付' WHERE order_id = $1", [order_id]);

                    

                    if (order.product_name === '余额充值') {

                        await pool.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [parseFloat(amount), order.user_id]);

                    } else {

                        const extraAmount = parseFloat(amount) - parseFloat(order.usdt_amount);

                        if (extraAmount > 0) {

                            await pool.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [extraAmount, order.user_id]);

                        }

                        await handleReferralBonus(order.user_id, parseFloat(order.usdt_amount), '消费');

                    }

                    

                    const updatedOrderRes = await pool.query("SELECT * FROM orders WHERE order_id = $1", [order_id]);

                    const updatedBalanceRes = await pool.query("SELECT balance FROM users WHERE id = $1", [order.user_id]);

                    io.to(`user_${order.user_id}`).emit('order_update', { 

                        order: updatedOrderRes.rows[0], 

                        balance: updatedBalanceRes.rows[0].balance 

                    });

                    const fullAdminOrderRes = await pool.query(`
                        SELECT o.*, u.contact as user_contact, u.id as user_display_id 
                        FROM orders o LEFT JOIN users u ON o.user_id = u.id 
                        WHERE o.order_id = $1
                    `, [order_id]);
                    notifyAdminUpdate('order', { payload: fullAdminOrderRes.rows[0] });

                    const orderData = tgOrderMessages.get(order_id);

                    const successMsg = `✅ <b>该用户已支付</b>\n USDT 自动回调成功\n单号: ${order_id}\n金额: ${amount}`;

                    

                    if (orderData) {

                        clearTimeout(orderData.timer);

                        tgOrderMessages.delete(order_id);

                        bot.telegram.sendMessage(TG_ADMIN_GROUP_ID, successMsg, { parse_mode: 'HTML', reply_to_message_id: orderData.msgId }).catch(e => {});

                    } else {

                        sendTgNotify(successMsg);

                    }

                }

                minTimestamp = maxTime + 1;

            }

        } catch (e) {

            console.error("USDT Polling Error:", e.message);

        }

    }, 30000);

}



// ==========================================

// [7] Socket.IO 融合逻辑

// ==========================================

io.on('connection', (socket) => {

    socket.on('join_room', (room) => {

        if (room !== 'admin_room') {

            socket.join(room);

        }

    });



    const { userId, bossId } = socket.handshake.query;

    if (userId) {

        socket.join(userId);

        socket.userId = userId;

        onlineUsers.add(userId);

        io.to('admin_room').emit('user_status_change', { userId, online: true });



        if (!socket._hasSentUnread) {

            socket._hasSentUnread = true;

            prisma.message.findMany({ where: { userId: userId, isFromUser: false, status: { not: 'read' } } })

                .then(msgs => msgs.forEach(msg => socket.emit('receive_message', msg))).catch(e=>{});

            

            pool.query("SELECT * FROM chats WHERE session_id = $1 AND sender = 'admin' AND is_read = FALSE", [`user_${userId}`])

                .then(chats => chats.rows.forEach(chat => socket.emit('new_message', chat))).catch(e=>{});

        }

    }



    socket.on('request_id', (bid, cb) => {

        if (typeof bid === 'function') { cb = bid; bid = null; }

        if (typeof cb === 'function') cb(generateShortId());

    });



    socket.on('join', async ({ userId, isAdmin, bossId, token }) => {

        if (isAdmin) {

            // 校验 Token，防止伪造管理员身份窃听全站聊天

            if (token === process.env.ADMIN_TOKEN || token === await getSetting('admin_password')) {

                socket.join('admin_room');

                socket.emit('online_users_list', Array.from(onlineUsers));

            } else {

                socket.emit('force_logout');

            }

        } else if (userId) {

            try {

                const existingUser = await prisma.user.findUnique({ where: { id: userId } });

                if (existingUser && existingUser.isBlocked) {

                    socket.emit('force_logout_blocked');

                    socket.disconnect(true);

                    return;

                }

                if (!existingUser) {

                    if (bossId && bossId !== 'SystemRestore') {

                        await prisma.user.create({ data: { id: userId, bossId: bossId } });

                        socket.join(userId);

                        socket.emit('receive_message', await prisma.message.create({ data: { userId, content: WELCOME_MESSAGE, type: 'text', isFromUser: false, status: 'sent' } }));

                    } else {

                        socket.emit('force_logout');

                        return;

                    }

                } else {

                    socket.join(userId);

                    if (bossId && bossId !== 'SystemRestore' && existingUser.bossId !== bossId) {

                        await prisma.user.update({ where: { id: userId }, data: { bossId } });

                    }

                }

                socket.userId = userId;

                onlineUsers.add(userId);

                io.to('admin_room').emit('user_status_change', { userId, online: true });



                if (!socket._hasSentUnread) {

                    socket._hasSentUnread = true;

                    const unreadMsgs = await prisma.message.findMany({ where: { userId: userId, isFromUser: false, status: { not: 'read' } } });

                    unreadMsgs.forEach(msg => socket.emit('receive_message', msg));

                    

                    const unreadChats = await pool.query("SELECT * FROM chats WHERE session_id = $1 AND sender = 'admin' AND is_read = FALSE", [`user_${userId}`]);

                    unreadChats.rows.forEach(chat => socket.emit('new_message', chat));

                }

            } catch (e) {

                console.error("Socket Join Error:", e.message);

            }

        }

    });



    socket.on('disconnect', async () => {

        if (socket.userId) {

            onlineUsers.delete(socket.userId);

            socketAutoReplyHistory.delete(socket.id);

            try { await prisma.user.update({ where: { id: socket.userId }, data: { updatedAt: new Date() } }); } catch (e) {}

            io.to('admin_room').emit('user_status_change', { userId: socket.userId, online: false });

        }

    });



    socket.on('typing', ({ targetId, isTyping }) => {

        if (targetId === 'admin') {

            if (socket.userId) io.to('admin_room').emit('user_typing', { userId: socket.userId, isTyping });

        } else {

            io.to(targetId).emit('display_typing', { isTyping });

        }

    });



    socket.on('mark_read', async ({ userId, isAdmin }) => {

        try {

            if (isAdmin) {

                await prisma.message.updateMany({ where: { userId, isFromUser: true, status: { not: 'read' } }, data: { status: 'read' } });

                io.to(userId).emit('messages_read_update');

                io.to('admin_room').emit('admin_messages_read_sync', { userId });

            } else {

                await prisma.message.updateMany({ where: { userId, isFromUser: false, status: { not: 'read' } }, data: { status: 'read' } });

                io.to('admin_room').emit('admin_messages_read', { userId });

            }

        } catch (e) {}

    });



    socket.on('send_message', async (data) => {

        const { userId, content, type, bossId, tempId } = data;

        if (!userId) {

            socket.emit('force_logout');

            return;

        }

        try {

            if (!onlineUsers.has(userId)) {

                onlineUsers.add(userId);

                io.to('admin_room').emit('user_status_change', { userId, online: true });

            }

            const user = await prisma.user.findUnique({ where: { id: userId } });

            if (!user || user.isBlocked) {

                socket.emit('force_logout_blocked');

                socket.disconnect(true);

                return;

            }

            if (bossId && bossId !== '未知' && user.bossId !== bossId) {

                await prisma.user.update({ where: { id: userId }, data: { bossId } });

            }

            await prisma.user.update({ where: { id: userId }, data: { updatedAt: new Date() } });



            let finalType = type || (content.startsWith('data:image') ? 'image' : 'text');

            const msg = await prisma.message.create({ data: { userId, content, type: finalType, isFromUser: true, status: 'sent' } });

            

            socket.emit('receive_message', { ...msg, tempId });

            io.to('admin_room').emit('admin_receive_message', { ...msg, bossId: user.bossId, isMuted: user.isMuted });



            if (!isCambodiaWorkingTime()) {

                if (!socketAutoReplyHistory.has(socket.id)) {

                    const autoReply = await prisma.message.create({ data: { userId, content: REST_MESSAGE, type: 'text', isFromUser: false, status: 'sent' } });

                    setTimeout(() => {

                        socket.emit('receive_message', autoReply);

                        io.to('admin_room').emit('admin_receive_message', { ...autoReply, bossId: 'System_Auto', isMuted: user.isMuted });

                    }, 1000);

                    socketAutoReplyHistory.add(socket.id);

                }

            }



            const isSessionMuted = mutedSessions.has(`user_${userId}`) || mutedSessions.has(`hr_user_${userId}`);

            if (bot && !user.isMuted && !isSessionMuted && ALLOWED_GROUP_ID) {

                const conf = await prisma.globalConfig.findUnique({ where: { key: 'notification_switch' } });

                if (!conf || conf.value === 'on') {

                    try {

                        await bot.telegram.sendMessage(ALLOWED_GROUP_ID, `${(bossId && bossId !== '未知') ? `@${bossId.replace('@', '')}` : ''} 🔔 **新消息**\nID: \`${userId}\`\n内容: ${finalType === 'image' ? "📷 [图片]" : content.substring(0, 100)}`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback(`🗑 删除`, `del_${userId}`)]]) });

                    } catch (e) {}

                }

            }

        } catch (e) {

            console.error("Socket send message error:", e.message);

        }

    });



    socket.on('admin_reply', async ({ targetUserId, content, type, tempId }) => {

        try {

            let finalType = type || (content.startsWith('data:image') ? 'image' : 'text');

            const userExists = await prisma.user.findUnique({ where: { id: targetUserId } });

            if (!userExists) {

                await prisma.user.create({ data: { id: targetUserId, bossId: 'SystemRestore' } });

            }

            const msg = await prisma.message.create({ data: { userId: targetUserId, content, type: finalType, isFromUser: false, status: 'sent' } });

            

            io.to(targetUserId).emit('receive_message', msg);

            io.to('admin_room').emit('admin_receive_message', { ...msg, bossId: 'System', tempId });



            if (process.env.VAPID_PUBLIC_KEY) {

                const subs = await pool.query("SELECT * FROM push_subscriptions WHERE user_id = $1", [String(targetUserId)]);

                const payload = JSON.stringify({ title: '汇盈国际 - 新消息', body: finalType === 'image' ? '[发来一张图片]' : content, url: '/', icon: '/icon-192.png' });

                for (const sub of subs.rows) {

                    await webpush.sendNotification(sub.keys ? { endpoint: sub.endpoint, keys: sub.keys } : sub.endpoint, payload).catch(async (error) => {

                        if (error.statusCode === 404 || error.statusCode === 410) {

                            await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [sub.id]);

                        }

                    });

                }

            }

        } catch (e) {}

    });



    socket.on('admin_toggle_mute', async ({ userId, isMuted }) => {

        try {

            await prisma.user.update({ where: { id: userId }, data: { isMuted } });

            io.to('admin_room').emit('user_status_update', { userId, isMuted });

        } catch (e) {}

    });



    socket.on('admin_delete_message', async ({ messageId, userId }) => {

        try {

            await prisma.message.delete({ where: { id: !isNaN(Number(messageId)) ? Number(messageId) : messageId } });

            io.to('admin_room').emit('message_deleted', { messageId, userId });

            io.to(userId).emit('message_deleted', { messageId });

        } catch (e) {}

    });



    socket.on('admin_clear_user_data', async ({ userId }) => {

        try {

            await prisma.message.deleteMany({ where: { userId } });

            await prisma.user.delete({ where: { id: userId } });

            await forceDisconnectUser(userId);

            io.emit('admin_user_deleted', userId);

        } catch (e) {}

    });



    socket.on('admin_block_user', async ({ userId }) => {

        try {

            await prisma.message.deleteMany({ where: { userId } });

            await pool.query("DELETE FROM push_subscriptions WHERE user_id = $1", [String(userId)]);

            await prisma.user.delete({ where: { id: userId } });

            const sockets = await io.in(userId).fetchSockets();

            sockets.forEach(s => { s.emit('force_logout_blocked'); s.disconnect(true); });

            io.emit('admin_user_blocked', userId);

            onlineUsers.delete(userId);

            io.to('admin_room').emit('user_status_change', { userId, online: false });

        } catch (e) {}

    });



    socket.on('admin_merge_user', async ({ oldId, newId }) => {

        try {

            const oldUser = await prisma.user.findUnique({ where: { id: oldId } });

            if (!oldUser) {

                socket.emit('merge_result', { success: false, msg: `❌ 找不到旧账号: ${oldId}` });

                return;

            }

            await prisma.message.updateMany({ where: { userId: oldId }, data: { userId: newId } });

            await pool.query("UPDATE push_subscriptions SET user_id = $1 WHERE user_id = $2", [String(newId), String(oldId)]);

            await prisma.user.delete({ where: { id: oldId } });

            socket.emit('merge_result', { success: true, msg: `✅ 合并成功` });

            io.to('admin_room').emit('admin_user_deleted', oldId);

            io.to(newId).emit('messages_read_update'); 

        } catch (e) {

            socket.emit('merge_result', { success: false, msg: `❌ 系统错误` });

        }

    });

});



// ==========================================

// [8] 定时任务与服务启动

// ==========================================



setInterval(async () => {

    const client = await pool.connect();

    try {

        const timeoutOrders = await client.query(`SELECT order_id, product_name, balance_deducted, user_id FROM orders WHERE status = '待支付' AND qrcode_url IS NULL AND created_at < NOW() - INTERVAL '30 minutes'`);

        if (timeoutOrders.rowCount > 0) {

            await client.query('BEGIN');

            for (const order of timeoutOrders.rows) {

                await client.query("UPDATE orders SET status = '已关闭' WHERE order_id = $1", [order.order_id]);

                if (parseFloat(order.balance_deducted) > 0) {

                    await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [parseFloat(order.balance_deducted), order.user_id]);

                    await logBalance(client, order.user_id, '订单超时', parseFloat(order.balance_deducted), `订单 ${order.order_id} 超时关闭退回余额`);

                }

                const fullOrderRes = await client.query(`SELECT o.*, u.contact as user_contact, u.id as user_display_id FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.order_id = $1`, [order.order_id]);
                notifyAdminUpdate('order', { payload: fullOrderRes.rows[0] });
            }

            await client.query('COMMIT');

        }

    } catch (e) {

        await client.query('ROLLBACK');

    } finally {

        client.release();

    }

}, 30 * 60 * 1000);


cron.schedule('0 0 * * *', async () => {

    try {

        await pool.query("DELETE FROM coupons WHERE expires_at < NOW()");

        await pool.query("DELETE FROM orders WHERE created_at < NOW() - INTERVAL '3 days'");

        await pool.query("DELETE FROM withdrawals WHERE created_at < NOW() - INTERVAL '3 days'");

        await pool.query("DELETE FROM chats WHERE created_at < NOW() - INTERVAL '3 days'");

        await pool.query("DELETE FROM balance_logs WHERE created_at < NOW() - INTERVAL '7 days'");

        await pool.query("DELETE FROM site_visits WHERE visit_date < CURRENT_DATE - INTERVAL '3 days'");

    } catch (e) {

        console.error("Cron clean job error:", e.message);

    }

});



const startServer = async () => {

    try {

        console.log("⏳ 1. 正在初始化商城数据库...");

        await initDB(); 

        

        server.listen(PORT, () => { 

            console.log(`🚀 聚合版 Server 运行于端口 ${PORT}`); 

            startUSDTHTTPPolling();

        });



        const domain = process.env.RENDER_EXTERNAL_URL;

        if (domain) {

            const webhookPath = `/telegraf/${bot.secretPathComponent()}`;

            app.use(bot.webhookCallback(webhookPath));         

            

            bot.telegram.setWebhook(`${domain}${webhookPath}`, {

                drop_pending_updates: true

            }).then(() => {

                console.log(`✅ Webhook 已成功通过中转站绑定: ${domain}${webhookPath}`);

            }).catch(err => {

                console.error("⚠️ Webhook 绑定失败（中转站可能也在波动），但商城主程序已启动:", err.message);

            });

        } else {

            console.error("⚠️ 警告：未检测到 RENDER_EXTERNAL_URL 环境变量！");

        }

    } catch (error) { 

        console.error("❌ 核心服务器初始化失败:");

        console.error(error);

    }

};



startServer();

