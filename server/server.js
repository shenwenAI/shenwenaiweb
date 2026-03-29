/**
 * shenwenAI 登录注册后端服务
 * 使用 Express + sql.js (纯 JS SQLite) + bcrypt
 */

var express = require('express');
var cors = require('cors');
var bcrypt = require('bcryptjs');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var nodemailer = require('nodemailer');

// ==================== 配置 ====================
var PORT = process.env.PORT || 3000;
var TOKEN_SECRET = process.env.TOKEN_SECRET || '';
var CORS_ORIGINS = (process.env.CORS_ORIGINS || '*').split(',').map(function(s) { return s.trim(); });
// Token 过期时间（毫秒），默认 7 天
var TOKEN_EXPIRE_MS = parseInt(process.env.TOKEN_EXPIRE_DAYS || '7', 10) * 24 * 60 * 60 * 1000;

// 邮件配置
var EMAIL_HOST = process.env.EMAIL_HOST || '';
var EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '465', 10);
var EMAIL_SECURE = process.env.EMAIL_SECURE !== 'false';
var EMAIL_USER = process.env.EMAIL_USER || '';
var EMAIL_PASS = process.env.EMAIL_PASS || '';
var EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;
var ADMIN_EMAIL = process.env.ADMIN_EMAIL || EMAIL_USER;

// DKIM 签名配置（用于自定义域名邮箱认证）
var DKIM_DOMAIN = process.env.DKIM_DOMAIN || '';
var DKIM_SELECTOR = process.env.DKIM_SELECTOR || 'default';
var DKIM_PRIVATE_KEY_PATH = process.env.DKIM_PRIVATE_KEY_PATH || '';

// 验证码配置
var CAPTCHA_EXPIRE_MS = 5 * 60 * 1000; // 验证码有效期5分钟

var mailerTransport = null;
if (EMAIL_HOST && EMAIL_USER && EMAIL_PASS) {
    var transportOptions = {
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_SECURE,
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    };

    // 如果配置了 DKIM，加载私钥并添加 DKIM 签名
    if (DKIM_DOMAIN && DKIM_PRIVATE_KEY_PATH) {
        try {
            var dkimKey = fs.readFileSync(DKIM_PRIVATE_KEY_PATH, 'utf8');
            transportOptions.dkim = {
                domainName: DKIM_DOMAIN,
                keySelector: DKIM_SELECTOR,
                privateKey: dkimKey
            };
            console.log('DKIM 签名已配置: ' + DKIM_SELECTOR + '._domainkey.' + DKIM_DOMAIN);
        } catch (dkimErr) {
            console.warn('警告: DKIM 私钥加载失败（' + DKIM_PRIVATE_KEY_PATH + '）: ' + dkimErr.message);
        }
    }

    mailerTransport = nodemailer.createTransport(transportOptions);
    console.log('邮件服务已配置: ' + EMAIL_HOST + ' (发件人: ' + EMAIL_FROM + ')');
} else {
    console.warn('警告: 邮件配置未设置，修改密码和联系表单功能不可用（请设置 EMAIL_HOST/EMAIL_USER/EMAIL_PASS 环境变量）');
}

if (!TOKEN_SECRET) {
    console.warn('警告: TOKEN_SECRET 未设置，使用随机密钥（重启后所有 token 将失效）');
    TOKEN_SECRET = crypto.randomBytes(32).toString('hex');
}

// ==================== 图形验证码 ====================
// 验证码存储: { [captchaId]: { code, expiresAt } }
var captchaStore = {};

// 定期清理过期验证码（每2分钟）
setInterval(function() {
    var now = Date.now();
    var keys = Object.keys(captchaStore);
    for (var i = 0; i < keys.length; i++) {
        if (now > captchaStore[keys[i]].expiresAt) {
            delete captchaStore[keys[i]];
        }
    }
}, 2 * 60 * 1000);

/**
 * 生成4位数字验证码
 */
function generateCaptchaCode() {
    return String(crypto.randomInt(1000, 10000));
}

/**
 * 生成验证码 SVG 图片
 * @param {string} code - 4位验证码
 * @returns {string} SVG 字符串
 */
function generateCaptchaSvg(code) {
    var width = 120;
    var height = 40;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">';
    // 背景
    svg += '<rect width="' + width + '" height="' + height + '" fill="#f0f0f0" rx="4"/>';
    // 干扰线
    for (var i = 0; i < 4; i++) {
        var x1 = Math.floor(Math.random() * width);
        var y1 = Math.floor(Math.random() * height);
        var x2 = Math.floor(Math.random() * width);
        var y2 = Math.floor(Math.random() * height);
        var colors = ['#ccc', '#aaa', '#ddd', '#bbb'];
        svg += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + colors[i] + '" stroke-width="1"/>';
    }
    // 干扰点
    for (var j = 0; j < 20; j++) {
        var cx = Math.floor(Math.random() * width);
        var cy = Math.floor(Math.random() * height);
        var dotColors = ['#ccc', '#aaa', '#999', '#bbb'];
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="1" fill="' + dotColors[j % 4] + '"/>';
    }
    // 文字
    var charColors = ['#333', '#555', '#222', '#444'];
    for (var k = 0; k < code.length; k++) {
        var x = 15 + k * 26;
        var y = 28 + Math.floor(Math.random() * 6) - 3;
        var rotate = Math.floor(Math.random() * 20) - 10;
        var fontSize = 22 + Math.floor(Math.random() * 4);
        svg += '<text x="' + x + '" y="' + y + '" font-size="' + fontSize + '" font-weight="bold" fill="' + charColors[k % charColors.length] + '" transform="rotate(' + rotate + ' ' + x + ' ' + y + ')">' + code[k] + '</text>';
    }
    svg += '</svg>';
    return svg;
}

/**
 * 验证图形验证码
 * @param {string} captchaId - 验证码 ID
 * @param {string} captchaCode - 用户输入的验证码
 * @returns {boolean} 验证是否通过
 */
function verifyCaptcha(captchaId, captchaCode) {
    if (!captchaId || !captchaCode || !captchaCode.trim()) return false;
    var entry = captchaStore[captchaId];
    if (!entry) return false;
    // 验证码只能使用一次
    delete captchaStore[captchaId];
    if (Date.now() > entry.expiresAt) return false;
    return entry.code === captchaCode.trim();
}

// ==================== 数据库初始化 ====================
var initSqlJs = require('sql.js');

var dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

var DB_PATH = path.join(dataDir, 'users.db');
var db; // 全局数据库对象

/**
 * 将数据库保存到磁盘
 */
function saveDatabase() {
    if (db) {
        var data = db.export();
        var buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

/**
 * 初始化数据库
 */
async function initDatabase() {
    var SQL = await initSqlJs();

    // 如果数据库文件已存在，加载它
    if (fs.existsSync(DB_PATH)) {
        var fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
        console.log('已加载现有数据库');
    } else {
        db = new SQL.Database();
        console.log('已创建新数据库');
    }

    // 创建用户表
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");

    // 创建 tokens 表（带过期时间）
    db.run("CREATE TABLE IF NOT EXISTS tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, token TEXT UNIQUE NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, expires_at DATETIME NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id))");

    saveDatabase();
    console.log('数据库初始化完成');
}

// ==================== Express 应用 ====================
var app = express();

// 信任 Cloudflare 和 Nginx 反向代理，确保 req.ip 获取真实客户端 IP
app.set('trust proxy', true);

// JSON 解析（限制请求体大小，防止超大请求攻击）
app.use(express.json({ limit: '1mb' }));

// 安全响应头
app.use(function(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// CORS 跨域配置
// 支持通配符模式，如 https://*.shenwenaiweb.pages.dev
function matchCorsOrigin(origin) {
    for (var i = 0; i < CORS_ORIGINS.length; i++) {
        var allowed = CORS_ORIGINS[i];
        if (allowed === '*' || allowed === origin) return true;
        // 支持通配符子域名匹配，如 https://*.example.com
        if (allowed.indexOf('*') !== -1) {
            var pattern = allowed.replace(/\./g, '\\.').replace(/\*/g, '[a-zA-Z0-9-]+');
            if (new RegExp('^' + pattern + '$').test(origin)) return true;
        }
    }
    return false;
}

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (matchCorsOrigin(origin)) {
            callback(null, true);
        } else {
            console.log('CORS 拒绝来源:', origin);
            callback(new Error('不允许的跨域请求'));
        }
    },
    credentials: true
}));

// ==================== 工具函数 ====================

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 验证密码强度：至少8位，包含字母和特殊符号（非空白非字母数字字符）
 */
function isValidPassword(password) {
    if (!password || password.length < 8) return false;
    if (!/[a-zA-Z]/.test(password)) return false;
    if (!/[^a-zA-Z0-9\s]/.test(password)) return false;
    return true;
}

function getExpiresAt() {
    return new Date(Date.now() + TOKEN_EXPIRE_MS).toISOString();
}

/**
 * HTML 转义，防止 XSS
 */
function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ==================== 速率限制（防暴力破解） ====================
var rateLimitMap = {};

/**
 * 简单的内存速率限制器
 * @param {number} maxAttempts - 时间窗口内最大请求数
 * @param {number} windowMs - 时间窗口（毫秒）
 */
function rateLimit(maxAttempts, windowMs) {
    return function(req, res, next) {
        var ip = req.ip || req.connection.remoteAddress || 'unknown';
        var key = req.path + ':' + ip;
        var now = Date.now();

        if (!rateLimitMap[key]) {
            rateLimitMap[key] = { count: 1, resetTime: now + windowMs };
            return next();
        }

        var entry = rateLimitMap[key];
        if (now > entry.resetTime) {
            // 时间窗口已过，重置
            entry.count = 1;
            entry.resetTime = now + windowMs;
            return next();
        }

        entry.count++;
        if (entry.count > maxAttempts) {
            var retryAfter = Math.ceil((entry.resetTime - now) / 1000);
            res.setHeader('Retry-After', retryAfter);
            return res.status(429).json({
                success: false,
                message: '请求太频繁，请 ' + retryAfter + ' 秒后重试',
                message_en: 'Too many requests, please try again in ' + retryAfter + ' seconds'
            });
        }

        next();
    };
}

// 联系表单: 每个 IP 每小时最多10次
var contactLimiter = rateLimit(10, 60 * 60 * 1000);

setInterval(function() {
    var now = Date.now();
    var keys = Object.keys(rateLimitMap);
    for (var i = 0; i < keys.length; i++) {
        if (now > rateLimitMap[keys[i]].resetTime) {
            delete rateLimitMap[keys[i]];
        }
    }
}, 10 * 60 * 1000);

// 修改密码验证码: 每个 IP 每10分钟最多5次
var changePasswordCodeLimiter = rateLimit(5, 10 * 60 * 1000);
// 登录: 每个 IP 每15分钟最多10次尝试
var loginLimiter = rateLimit(10, 15 * 60 * 1000);
// 注册: 每个 IP 每小时最多5次
var registerLimiter = rateLimit(5, 60 * 60 * 1000);
// 邮件配置验证: 每个 IP 每小时最多3次
var emailVerifyLimiter = rateLimit(3, 60 * 60 * 1000);

// ==================== 修改密码验证码存储 ====================
// 修改密码验证码存储: { [email]: { code, expiresAt, sentAt } }
var pendingPasswordChanges = {};

// 验证码有效期（毫秒），10分钟
var CODE_EXPIRE_MS = 10 * 60 * 1000;
// 重新发送验证码冷却时间（毫秒），60秒
var RESEND_COOLDOWN_MS = 60 * 1000;

// 定期清理过期验证码（每5分钟）
setInterval(function() {
    var now = Date.now();
    var pwKeys = Object.keys(pendingPasswordChanges);
    for (var j = 0; j < pwKeys.length; j++) {
        if (now > pendingPasswordChanges[pwKeys[j]].expiresAt) {
            delete pendingPasswordChanges[pwKeys[j]];
        }
    }
}, 5 * 60 * 1000);

/**
 * 生成6位数字验证码
 */
function generateVerificationCode() {
    return String(crypto.randomInt(100000, 1000000));
}

/**
 * 发送修改密码验证码邮件
 */
async function sendChangePasswordEmail(email, name, code) {
    if (!mailerTransport) {
        throw new Error('邮件服务未配置');
    }
    var subject = 'shenwenAI 修改密码验证码 / Password Change Verification Code';
    var html = [
        '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">',
        '  <h2 style="color:#2563eb;margin-bottom:8px;">shenwenAI</h2>',
        '  <p style="color:#374151;">您好 ' + name + '，/ Hello ' + name + ',</p>',
        '  <p style="color:#374151;">您正在修改账户密码，验证码是：<br>You are changing your account password. The verification code is:</p>',
        '  <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2563eb;text-align:center;padding:16px 0;">' + code + '</div>',
        '  <p style="color:#6b7280;font-size:13px;">验证码有效期10分钟。<br>The code is valid for 10 minutes.</p>',
        '  <p style="color:#6b7280;font-size:13px;">如果您没有请求修改密码，请忽略此邮件并确保账户安全。<br>If you did not request a password change, please ignore this email and secure your account.</p>',
        '</div>'
    ].join('\n');

    await mailerTransport.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: subject,
        html: html
    });
}

// ==================== API 路由 ====================

// 验证码获取: 每个 IP 每分钟最多20次
var captchaLimiter = rateLimit(20, 60 * 1000);

/**
 * GET /api/captcha - 获取图形验证码
 */
app.get('/api/captcha', captchaLimiter, function(req, res) {
    var code = generateCaptchaCode();
    var captchaId = crypto.randomBytes(16).toString('hex');
    captchaStore[captchaId] = { code: code, expiresAt: Date.now() + CAPTCHA_EXPIRE_MS };
    var svg = generateCaptchaSvg(code);
    res.json({ success: true, captchaId: captchaId, svg: svg });
});

/**
 * POST /api/auth/register - 用户注册（使用图形验证码）
 */
app.post('/api/auth/register', registerLimiter, async function(req, res) {
    try {
        var name = (req.body.name || '').trim();
        var email = (req.body.email || '').trim();
        var password = req.body.password;
        var captchaId = (req.body.captchaId || '').trim();
        var captchaCode = (req.body.captchaCode || '').trim();

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: '请填写所有字段', message_en: 'Please fill in all fields' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ success: false, message: '邮箱格式不正确', message_en: 'Invalid email format' });
        }
        if (!isValidPassword(password)) {
            return res.status(400).json({ success: false, message: '密码须至少8位，包含字母和特殊符号', message_en: 'Password must be at least 8 characters and contain letters and special characters' });
        }
        if (name.length > 50) {
            return res.status(400).json({ success: false, message: '用户名不能超过50个字符', message_en: 'Username cannot exceed 50 characters' });
        }

        // 图形验证码验证
        if (!verifyCaptcha(captchaId, captchaCode)) {
            return res.status(403).json({ success: false, message: '验证码错误或已过期，请重新获取', message_en: 'Captcha is incorrect or expired, please refresh' });
        }

        // 检查邮箱是否已注册
        var stmt = db.prepare('SELECT id FROM users WHERE email = ?');
        stmt.bind([email]);
        if (stmt.step()) {
            stmt.free();
            return res.status(409).json({ success: false, message: '该邮箱已注册', message_en: 'This email is already registered' });
        }
        stmt.free();

        // 对密码进行哈希
        var salt = await bcrypt.genSalt(10);
        var hashedPassword = await bcrypt.hash(password, salt);

        db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);

        var result = db.exec('SELECT last_insert_rowid() as id');
        var userId = result[0].values[0][0];

        var token = generateToken();
        db.run('INSERT INTO tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [userId, token, getExpiresAt()]);

        saveDatabase();
        console.log('新用户注册:', email);

        res.status(201).json({
            success: true,
            message: '注册成功！我们还在搭建云端模型，请赞助我们算力，我们会在网站中发布你的帐号名。',
            message_en: 'Registration successful! We are still building our cloud models. Please sponsor our computing power and we will publish your account name on our website.',
            user: { name: name, email: email },
            token: token
        });
    } catch (err) {
        console.error('注册错误:', err);
        res.status(500).json({ success: false, message: '服务器错误，请稍后重试', message_en: 'Server error, please try again later' });
    }
});

/**
 * POST /api/auth/login - 用户登录（使用图形验证码）
 */
app.post('/api/auth/login', loginLimiter, async function(req, res) {
    try {
        var email = req.body.email;
        var password = req.body.password;
        var captchaId = (req.body.captchaId || '').trim();
        var captchaCode = (req.body.captchaCode || '').trim();

        if (!email || !password) {
            return res.status(400).json({ success: false, message: '请填写所有字段', message_en: 'Please fill in all fields' });
        }

        // 图形验证码验证
        if (!verifyCaptcha(captchaId, captchaCode)) {
            return res.status(403).json({ success: false, message: '验证码错误或已过期，请重新获取', message_en: 'Captcha is incorrect or expired, please refresh' });
        }

        var stmt = db.prepare('SELECT id, name, email, password FROM users WHERE email = ?');
        stmt.bind([email]);
        if (!stmt.step()) {
            stmt.free();
            return res.status(401).json({ success: false, message: '邮箱或密码错误', message_en: 'Invalid email or password' });
        }
        var row = stmt.getAsObject();
        stmt.free();

        // 异步密码验证
        var valid = await bcrypt.compare(password, row.password);
        if (!valid) {
            return res.status(401).json({ success: false, message: '邮箱或密码错误', message_en: 'Invalid email or password' });
        }

        var token = generateToken();
        db.run('INSERT INTO tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [row.id, token, getExpiresAt()]);
        saveDatabase();

        console.log('用户登录:', email);

        res.json({
            success: true,
            message: '登录成功！',
            message_en: 'Login successful!',
            user: { name: row.name, email: row.email },
            token: token
        });
    } catch (err) {
        console.error('登录错误:', err);
        res.status(500).json({ success: false, message: '服务器错误，请稍后重试', message_en: 'Server error, please try again later' });
    }
});

/**
 * GET /api/auth/user - 获取当前用户信息（验证 token）
 */
app.get('/api/auth/user', function(req, res) {
    try {
        var authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: '未登录', message_en: 'Not logged in' });
        }

        var token = authHeader.slice(7);
        var stmt = db.prepare(
            'SELECT users.name, users.email FROM tokens JOIN users ON tokens.user_id = users.id WHERE tokens.token = ? AND tokens.expires_at > datetime(?)'
        );
        stmt.bind([token, new Date().toISOString()]);

        if (!stmt.step()) {
            stmt.free();
            return res.status(401).json({ success: false, message: '登录已过期，请重新登录', message_en: 'Session expired, please log in again' });
        }

        var row = stmt.getAsObject();
        stmt.free();

        res.json({ success: true, user: { name: row.name, email: row.email } });
    } catch (err) {
        console.error('验证错误:', err);
        res.status(500).json({ success: false, message: '服务器错误', message_en: 'Server error' });
    }
});

/**
 * POST /api/auth/logout - 退出登录
 */
app.post('/api/auth/logout', function(req, res) {
    try {
        var authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            var token = authHeader.slice(7);
            db.run('DELETE FROM tokens WHERE token = ?', [token]);
            saveDatabase();
        }
        res.json({ success: true, message: '已退出登录', message_en: 'Logged out' });
    } catch (err) {
        console.error('退出错误:', err);
        res.status(500).json({ success: false, message: '服务器错误', message_en: 'Server error' });
    }
});

/**
 * POST /api/auth/send-change-password-code - 发送修改密码验证码（需要登录）
 */
app.post('/api/auth/send-change-password-code', changePasswordCodeLimiter, async function(req, res) {
    try {
        var authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: '未登录', message_en: 'Not logged in' });
        }
        var token = authHeader.slice(7);
        var stmt = db.prepare(
            'SELECT users.id, users.name, users.email FROM tokens JOIN users ON tokens.user_id = users.id WHERE tokens.token = ? AND tokens.expires_at > datetime(?)'
        );
        stmt.bind([token, new Date().toISOString()]);
        if (!stmt.step()) {
            stmt.free();
            return res.status(401).json({ success: false, message: '登录已过期，请重新登录', message_en: 'Session expired, please log in again' });
        }
        var user = stmt.getAsObject();
        stmt.free();

        if (!mailerTransport) {
            return res.status(503).json({ success: false, message: '邮件服务暂不可用，请联系管理员', message_en: 'Email service is unavailable, please contact the administrator' });
        }

        // 防止冷却期内重复发送
        var existing = pendingPasswordChanges[user.email];
        if (existing && Date.now() <= existing.expiresAt && existing.sentAt && Date.now() - existing.sentAt < RESEND_COOLDOWN_MS) {
            var waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000);
            return res.status(429).json({ success: false, message: '请等待 ' + waitSec + ' 秒后再重新发送', message_en: 'Please wait ' + waitSec + ' seconds before resending' });
        }

        var code = generateVerificationCode();
        pendingPasswordChanges[user.email] = {
            code: code,
            userId: user.id,
            sentAt: Date.now(),
            expiresAt: Date.now() + CODE_EXPIRE_MS
        };

        await sendChangePasswordEmail(user.email, user.name, code);
        console.log('已发送修改密码验证码至:', user.email);

        res.json({
            success: true,
            message: '验证码已发送至您的邮箱，请在10分钟内完成修改',
            message_en: 'Verification code sent to your email. Please complete the password change within 10 minutes.'
        });
    } catch (err) {
        console.error('发送修改密码验证码错误:', err);
        res.status(500).json({ success: false, message: '发送验证码失败，请稍后重试', message_en: 'Failed to send verification code, please try again later' });
    }
});

/**
 * POST /api/auth/change-password - 修改密码（需要登录和验证码）
 */
app.post('/api/auth/change-password', async function(req, res) {
    try {
        var authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: '未登录', message_en: 'Not logged in' });
        }
        var token = authHeader.slice(7);
        var stmt = db.prepare(
            'SELECT users.id, users.name, users.email FROM tokens JOIN users ON tokens.user_id = users.id WHERE tokens.token = ? AND tokens.expires_at > datetime(?)'
        );
        stmt.bind([token, new Date().toISOString()]);
        if (!stmt.step()) {
            stmt.free();
            return res.status(401).json({ success: false, message: '登录已过期，请重新登录', message_en: 'Session expired, please log in again' });
        }
        var user = stmt.getAsObject();
        stmt.free();

        var newPassword = req.body.newPassword;
        var code = (req.body.code || '').trim();

        if (!newPassword || !code) {
            return res.status(400).json({ success: false, message: '请填写所有字段', message_en: 'Please fill in all fields' });
        }
        if (!isValidPassword(newPassword)) {
            return res.status(400).json({ success: false, message: '密码须至少8位，包含字母和特殊符号', message_en: 'Password must be at least 8 characters and contain letters and special characters' });
        }

        // 验证验证码
        var pending = pendingPasswordChanges[user.email];
        if (!pending) {
            return res.status(400).json({ success: false, message: '请先获取验证码', message_en: 'Please request a verification code first' });
        }
        if (Date.now() > pending.expiresAt) {
            delete pendingPasswordChanges[user.email];
            return res.status(400).json({ success: false, message: '验证码已过期，请重新获取', message_en: 'Verification code expired, please request a new one' });
        }
        if (pending.code !== code) {
            return res.status(400).json({ success: false, message: '验证码错误', message_en: 'Incorrect verification code' });
        }

        var salt = await bcrypt.genSalt(10);
        var hashedPassword = await bcrypt.hash(newPassword, salt);
        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

        // 清除验证码记录
        delete pendingPasswordChanges[user.email];

        saveDatabase();
        console.log('用户修改密码:', user.email);

        res.json({
            success: true,
            message: '密码已成功修改',
            message_en: 'Password changed successfully'
        });
    } catch (err) {
        console.error('修改密码错误:', err);
        res.status(500).json({ success: false, message: '服务器错误，请稍后重试', message_en: 'Server error, please try again later' });
    }
});

/**
 * POST /api/contact - 联系管理员（发邮件给站长）
 */
app.post('/api/contact', contactLimiter, async function(req, res) {
    try {
        var senderName = (req.body.name || '').trim();
        var senderEmail = (req.body.email || '').trim();
        var subject = (req.body.subject || '').trim();
        var message = (req.body.message || '').trim();

        if (!senderName || !senderEmail || !message) {
            return res.status(400).json({ success: false, message: '请填写姓名、邮箱和消息', message_en: 'Please fill in name, email and message' });
        }
        if (!isValidEmail(senderEmail)) {
            return res.status(400).json({ success: false, message: '邮箱格式不正确', message_en: 'Invalid email format' });
        }
        if (senderName.length > 100) {
            return res.status(400).json({ success: false, message: '姓名不能超过100个字符', message_en: 'Name cannot exceed 100 characters' });
        }
        if (subject.length > 200) {
            return res.status(400).json({ success: false, message: '主题不能超过200个字符', message_en: 'Subject cannot exceed 200 characters' });
        }
        if (message.length > 5000) {
            return res.status(400).json({ success: false, message: '消息不能超过5000个字符', message_en: 'Message cannot exceed 5000 characters' });
        }

        if (!mailerTransport) {
            return res.status(503).json({ success: false, message: '邮件服务暂不可用，请联系管理员', message_en: 'Email service is unavailable, please contact the administrator' });
        }
        if (!ADMIN_EMAIL) {
            return res.status(503).json({ success: false, message: '管理员邮箱未配置', message_en: 'Admin email is not configured' });
        }

        var emailSubject = subject ? '[shenwenAI 联系] ' + subject : '[shenwenAI 联系] 来自 ' + senderName + ' 的消息';
        var html = [
            '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">',
            '  <h2 style="color:#2563eb;margin-bottom:8px;">shenwenAI 联系消息</h2>',
            '  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">',
            '    <tr><td style="padding:6px 0;color:#6b7280;width:80px;">姓名：</td><td style="padding:6px 0;color:#111827;">' + escapeHtml(senderName) + '</td></tr>',
            '    <tr><td style="padding:6px 0;color:#6b7280;">邮箱：</td><td style="padding:6px 0;color:#111827;">' + escapeHtml(senderEmail) + '</td></tr>',
            subject ? '    <tr><td style="padding:6px 0;color:#6b7280;">主题：</td><td style="padding:6px 0;color:#111827;">' + escapeHtml(subject) + '</td></tr>' : '',
            '  </table>',
            '  <div style="background:#f9fafb;border-left:4px solid #2563eb;padding:16px;border-radius:4px;white-space:pre-wrap;color:#374151;line-height:1.6;">',
            escapeHtml(message),
            '  </div>',
            '  <p style="color:#6b7280;font-size:12px;margin-top:16px;">此邮件由 shenwenAI 网站联系表单自动发送，发件人 IP：' + (req.ip || 'unknown') + '</p>',
            '</div>'
        ].join('\n');

        await mailerTransport.sendMail({
            from: EMAIL_FROM,
            to: ADMIN_EMAIL,
            replyTo: senderEmail,
            subject: emailSubject,
            html: html
        });

        console.log('联系表单邮件已发送，来自:', senderEmail);

        res.json({
            success: true,
            message: '消息已发送，感谢您的联系！',
            message_en: 'Message sent successfully, thank you for contacting us!'
        });
    } catch (err) {
        console.error('联系表单邮件发送错误:', err);
        res.status(500).json({ success: false, message: '发送失败，请稍后重试', message_en: 'Failed to send message, please try again later' });
    }
});

/**
 * POST /api/email/verify-config - 验证邮件配置（仅管理员使用，需 TOKEN_SECRET）
 * 发送一封测试邮件到管理员邮箱，确认 SMTP + DKIM 设置正确
 */
app.post('/api/email/verify-config', emailVerifyLimiter, async function(req, res) {
    try {
        var secret = (req.body.secret || '').trim();
        var secretBuf = Buffer.from(secret);
        var expectedBuf = Buffer.from(TOKEN_SECRET);
        if (!secret || secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
            return res.status(403).json({ success: false, message: '权限不足', message_en: 'Access denied' });
        }

        if (!mailerTransport) {
            return res.status(503).json({
                success: false,
                message: '邮件服务未配置',
                message_en: 'Email service is not configured',
                hint: '请在 .env 中设置 EMAIL_HOST / EMAIL_USER / EMAIL_PASS',
                hint_en: 'Please set EMAIL_HOST / EMAIL_USER / EMAIL_PASS in .env'
            });
        }

        // 验证 SMTP 连接
        await mailerTransport.verify();

        // 发送测试邮件
        var testTo = (req.body.to || ADMIN_EMAIL || '').trim();
        if (!testTo) {
            return res.status(400).json({ success: false, message: '请指定收件人或设置 ADMIN_EMAIL', message_en: 'Please specify a recipient or set ADMIN_EMAIL' });
        }

        var hasDkim = !!(DKIM_DOMAIN && DKIM_PRIVATE_KEY_PATH);
        var info = await mailerTransport.sendMail({
            from: EMAIL_FROM,
            to: testTo,
            subject: 'shenwenAI 邮件配置测试 / Email Configuration Test',
            html: [
                '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">',
                '  <h2 style="color:#2563eb;margin-bottom:8px;">shenwenAI</h2>',
                '  <p style="color:#374151;">邮件配置测试成功！<br>Email configuration test passed!</p>',
                '  <table style="width:100%;border-collapse:collapse;margin:16px 0;">',
                '    <tr><td style="padding:4px 8px;color:#6b7280;">SMTP:</td><td style="padding:4px 8px;color:#111827;">' + EMAIL_HOST + ':' + EMAIL_PORT + '</td></tr>',
                '    <tr><td style="padding:4px 8px;color:#6b7280;">发件人:</td><td style="padding:4px 8px;color:#111827;">' + escapeHtml(EMAIL_FROM) + '</td></tr>',
                '    <tr><td style="padding:4px 8px;color:#6b7280;">DKIM:</td><td style="padding:4px 8px;color:#111827;">' + (hasDkim ? '✅ 已启用 (' + DKIM_SELECTOR + '._domainkey.' + DKIM_DOMAIN + ')' : '❌ 未配置') + '</td></tr>',
                '  </table>',
                '  <p style="color:#6b7280;font-size:13px;">发送时间: ' + new Date().toISOString() + '</p>',
                '</div>'
            ].join('\n')
        });

        res.json({
            success: true,
            message: '测试邮件发送成功',
            message_en: 'Test email sent successfully',
            details: {
                messageId: info.messageId,
                from: EMAIL_FROM,
                to: testTo,
                smtp: EMAIL_HOST + ':' + EMAIL_PORT,
                dkim: hasDkim ? DKIM_SELECTOR + '._domainkey.' + DKIM_DOMAIN : 'not configured'
            }
        });
    } catch (err) {
        console.error('邮件配置验证失败:', err);
        res.status(500).json({
            success: false,
            message: '邮件配置验证失败: ' + err.message,
            message_en: 'Email configuration verification failed: ' + err.message
        });
    }
});

/**
 * GET /api/health - 健康检查
 */
app.get('/api/health', function(req, res) {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// ==================== 启动服务器 ====================
initDatabase().then(function() {
    app.listen(PORT, '0.0.0.0', function() {
        console.log('shenwenAI 认证服务器运行在 http://0.0.0.0:' + PORT);
        console.log('允许的跨域来源: ' + CORS_ORIGINS.join(', '));
    });
}).catch(function(err) {
    console.error('数据库初始化失败:', err);
    process.exit(1);
});

// 定时清理过期 token（每小时）
setInterval(function() {
    try {
        if (db) {
            db.run('DELETE FROM tokens WHERE expires_at < datetime(?)', [new Date().toISOString()]);
            saveDatabase();
        }
    } catch (e) { /* ignore */ }
}, 60 * 60 * 1000);

// 优雅关闭
process.on('SIGINT', function() {
    console.log('正在关闭服务器...');
    saveDatabase();
    process.exit(0);
});

process.on('SIGTERM', function() {
    console.log('正在关闭服务器...');
    saveDatabase();
    process.exit(0);
});
