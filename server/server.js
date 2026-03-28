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

// ==================== 配置 ====================
var PORT = process.env.PORT || 3000;
var TOKEN_SECRET = process.env.TOKEN_SECRET || '';
var CORS_ORIGINS = (process.env.CORS_ORIGINS || '*').split(',').map(function(s) { return s.trim(); });
// Token 过期时间（毫秒），默认 7 天
var TOKEN_EXPIRE_MS = parseInt(process.env.TOKEN_EXPIRE_DAYS || '7', 10) * 24 * 60 * 60 * 1000;

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

// JSON 解析
app.use(express.json());

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

// ==================== API 路由 ====================

/**
 * POST /api/auth/register - 用户注册
 */
app.post('/api/auth/register', async function(req, res) {
    try {
        var name = req.body.name;
        var email = req.body.email;
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

        // 异步密码加密
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
 * POST /api/auth/login - 用户登录
 */
app.post('/api/auth/login', async function(req, res) {
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
