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

var mailerTransport = null;
if (EMAIL_HOST && EMAIL_USER && EMAIL_PASS) {
    mailerTransport = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_SECURE,
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    });
    console.log('邮件服务已配置: ' + EMAIL_HOST);
} else {
    console.warn('警告: 邮件配置未设置，注册验证码功能不可用（请设置 EMAIL_HOST/EMAIL_USER/EMAIL_PASS 环境变量）');
}

if (!TOKEN_SECRET) {
    console.warn('警告: TOKEN_SECRET 未设置，使用随机密钥（重启后所有 token 将失效）');
    TOKEN_SECRET = crypto.randomBytes(32).toString('hex');
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
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (CORS_ORIGINS.indexOf(origin) !== -1 || CORS_ORIGINS.indexOf('*') !== -1) {
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

function getExpiresAt() {
    return new Date(Date.now() + TOKEN_EXPIRE_MS).toISOString();
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

// 定期清理过期的速率限制记录（每10分钟）
setInterval(function() {
    var now = Date.now();
    var keys = Object.keys(rateLimitMap);
    for (var i = 0; i < keys.length; i++) {
        if (now > rateLimitMap[keys[i]].resetTime) {
            delete rateLimitMap[keys[i]];
        }
    }
}, 10 * 60 * 1000);

// 登录: 每个 IP 每15分钟最多10次尝试
var loginLimiter = rateLimit(10, 15 * 60 * 1000);
// 注册: 每个 IP 每小时最多5次
var registerLimiter = rateLimit(5, 60 * 60 * 1000);
// 发送验证码: 每个 IP 每10分钟最多5次
var sendCodeLimiter = rateLimit(5, 10 * 60 * 1000);

// ==================== 邮箱验证码存储 ====================
// 结构: { [email]: { code, name, password, expiresAt } }
var pendingVerifications = {};

// 验证码有效期（毫秒），10分钟
var CODE_EXPIRE_MS = 10 * 60 * 1000;

// 定期清理过期验证码（每5分钟）
setInterval(function() {
    var now = Date.now();
    var keys = Object.keys(pendingVerifications);
    for (var i = 0; i < keys.length; i++) {
        if (now > pendingVerifications[keys[i]].expiresAt) {
            delete pendingVerifications[keys[i]];
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
 * 发送双语验证码邮件
 */
async function sendVerificationEmail(email, name, code) {
    if (!mailerTransport) {
        throw new Error('邮件服务未配置');
    }
    var subject = 'shenwenAI 注册验证码 / Registration Verification Code';
    var html = [
        '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">',
        '  <h2 style="color:#2563eb;margin-bottom:8px;">shenwenAI</h2>',
        '  <p style="color:#374151;">您好 ' + name + '，/ Hello ' + name + ',</p>',
        '  <p style="color:#374151;">您的注册验证码是：<br>Your registration verification code is:</p>',
        '  <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2563eb;text-align:center;padding:16px 0;">' + code + '</div>',
        '  <p style="color:#6b7280;font-size:13px;">验证码有效期10分钟，请尽快完成注册。<br>The code is valid for 10 minutes. Please complete registration promptly.</p>',
        '  <p style="color:#6b7280;font-size:13px;">如果您没有在 shenwenAI 进行注册，请忽略此邮件。<br>If you did not register at shenwenAI, please ignore this email.</p>',
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

/**
 * POST /api/auth/send-code - 发送注册验证码
 */
app.post('/api/auth/send-code', sendCodeLimiter, async function(req, res) {
    try {
        var name = (req.body.name || '').trim();
        var email = (req.body.email || '').trim();
        var password = req.body.password;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: '请填写所有字段', message_en: 'Please fill in all fields' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ success: false, message: '邮箱格式不正确', message_en: 'Invalid email format' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: '密码长度至少6位', message_en: 'Password must be at least 6 characters' });
        }
        if (name.length > 50) {
            return res.status(400).json({ success: false, message: '用户名不能超过50个字符', message_en: 'Username cannot exceed 50 characters' });
        }

        // 检查邮箱是否已注册
        var stmt = db.prepare('SELECT id FROM users WHERE email = ?');
        stmt.bind([email]);
        if (stmt.step()) {
            stmt.free();
            return res.status(409).json({ success: false, message: '该邮箱已注册', message_en: 'This email is already registered' });
        }
        stmt.free();

        if (!mailerTransport) {
            return res.status(503).json({ success: false, message: '邮件服务暂不可用，请联系管理员', message_en: 'Email service is unavailable, please contact the administrator' });
        }

        var code = generateVerificationCode();
        // 对密码哈希后存入待验证队列（避免明文密码在内存停留过久）
        var salt = await bcrypt.genSalt(10);
        var hashedPassword = await bcrypt.hash(password, salt);
        // 若该邮箱已有未过期验证码且发送时间不足60秒，拒绝重复发送
        var existing = pendingVerifications[email];
        if (existing && Date.now() <= existing.expiresAt && existing.sentAt && Date.now() - existing.sentAt < 60 * 1000) {
            var waitSec = Math.ceil((60 * 1000 - (Date.now() - existing.sentAt)) / 1000);
            return res.status(429).json({ success: false, message: '请等待 ' + waitSec + ' 秒后再重新发送', message_en: 'Please wait ' + waitSec + ' seconds before resending' });
        }
        pendingVerifications[email] = {
            code: code,
            name: name,
            hashedPassword: hashedPassword,
            sentAt: Date.now(),
            expiresAt: Date.now() + CODE_EXPIRE_MS
        };

        await sendVerificationEmail(email, name, code);
        console.log('已发送注册验证码至:', email);

        res.json({
            success: true,
            message: '验证码已发送至您的邮箱，请在10分钟内完成注册',
            message_en: 'Verification code sent to your email. Please complete registration within 10 minutes.'
        });
    } catch (err) {
        console.error('发送验证码错误:', err);
        res.status(500).json({ success: false, message: '发送验证码失败，请稍后重试', message_en: 'Failed to send verification code, please try again later' });
    }
});

/**
 * POST /api/auth/register - 用户注册（需要验证码）
 */
app.post('/api/auth/register', registerLimiter, async function(req, res) {
    try {
        var name = (req.body.name || '').trim();
        var email = (req.body.email || '').trim();
        var password = req.body.password;
        var code = (req.body.code || '').trim();

        if (!name || !email || !password || !code) {
            return res.status(400).json({ success: false, message: '请填写所有字段', message_en: 'Please fill in all fields' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ success: false, message: '邮箱格式不正确', message_en: 'Invalid email format' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: '密码长度至少6位', message_en: 'Password must be at least 6 characters' });
        }
        if (name.length > 50) {
            return res.status(400).json({ success: false, message: '用户名不能超过50个字符', message_en: 'Username cannot exceed 50 characters' });
        }

        // 验证验证码
        var pending = pendingVerifications[email];
        if (!pending) {
            return res.status(400).json({ success: false, message: '请先获取验证码', message_en: 'Please request a verification code first' });
        }
        if (Date.now() > pending.expiresAt) {
            delete pendingVerifications[email];
            return res.status(400).json({ success: false, message: '验证码已过期，请重新获取', message_en: 'Verification code expired, please request a new one' });
        }
        if (pending.code !== code) {
            return res.status(400).json({ success: false, message: '验证码错误', message_en: 'Incorrect verification code' });
        }

        // 检查邮箱是否已注册
        var stmt = db.prepare('SELECT id FROM users WHERE email = ?');
        stmt.bind([email]);
        if (stmt.step()) {
            stmt.free();
            delete pendingVerifications[email];
            return res.status(409).json({ success: false, message: '该邮箱已注册', message_en: 'This email is already registered' });
        }
        stmt.free();

        // 使用已哈希的密码（来自发送验证码时）
        var hashedPassword = pending.hashedPassword;

        db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);

        var result = db.exec('SELECT last_insert_rowid() as id');
        var userId = result[0].values[0][0];

        var token = generateToken();
        db.run('INSERT INTO tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [userId, token, getExpiresAt()]);

        // 注册成功，清除验证码记录
        delete pendingVerifications[email];

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
 * POST /api/auth/login - 用户登录
 */
app.post('/api/auth/login', loginLimiter, async function(req, res) {
    try {
        var email = req.body.email;
        var password = req.body.password;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: '请填写所有字段', message_en: 'Please fill in all fields' });
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
