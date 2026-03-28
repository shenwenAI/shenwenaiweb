# shenwenAI 登录注册后端服务

## 简介

这是 shenwenAI 网站的登录和注册后端服务，使用 Node.js + Express + SQLite 构建。

## 功能

- 用户注册（密码 bcrypt 加密存储）
- 用户登录（Token 认证）
- 用户信息查询
- 退出登录
- 健康检查接口

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/user` | 获取当前用户信息 |
| POST | `/api/auth/logout` | 退出登录 |
| GET | `/api/health` | 健康检查 |

---

## 部署到服务器（578388.xyz）

### 第一步：SSH 连接到你的服务器

```bash
ssh root@578388.xyz
```

输入你的密码登录。

### 第二步：安装 Node.js（如果还没安装）

```bash
# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 确认安装成功
node --version
npm --version
```

### 第三步：创建项目目录并上传代码

**方法一：从 GitHub 克隆**
```bash
cd /opt
git clone https://github.com/shenwenAI/shenwenaiweb.git
cd shenwenaiweb/server
```

**方法二：手动上传**（从你本地电脑）
```bash
# 在你本地电脑运行：
scp -r server/ root@578388.xyz:/opt/shenwenai-auth/
```

### 第四步：安装依赖

```bash
cd /opt/shenwenaiweb/server    # 或 /opt/shenwenai-auth/
npm install
```

### 第五步：配置环境变量

```bash
# 复制配置模板
cp .env.example .env

# 编辑配置
nano .env
```

修改 `.env` 文件内容：
```
PORT=3000
CORS_ORIGINS=https://shenwen.578388.xyz,https://578388.xyz
TOKEN_SECRET=换成一个随机字符串比如abc123xyz456
```

**生成随机密钥**（推荐）：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 第六步：测试运行

```bash
# 先加载环境变量
export $(cat .env | xargs)

# 启动服务
node server.js
```

如果看到以下输出，说明启动成功：
```
数据库初始化完成
shenwenAI 认证服务器运行在 http://0.0.0.0:3000
```

按 `Ctrl+C` 停止。

### 第七步：使用 PM2 守护进程（保持后台运行）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
cd /opt/shenwenaiweb/server
pm2 start server.js --name shenwenai-auth

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs shenwenai-auth
```

### 第八步：配置 Nginx 反向代理

```bash
nano /etc/nginx/sites-available/shenwenai-auth
```

写入以下内容：
```nginx
server {
    listen 80;
    server_name shenwenapi.578388.xyz;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
ln -s /etc/nginx/sites-available/shenwenai-auth /etc/nginx/sites-enabled/
nginx -t          # 测试配置
systemctl reload nginx
```

### 第九步：配置 HTTPS（推荐）

```bash
# 安装 certbot
apt-get install -y certbot python3-certbot-nginx

# 获取 SSL 证书
certbot --nginx -d shenwenapi.578388.xyz

# 自动续期
certbot renew --dry-run
```

### 第十步：测试 API

```bash
# 测试健康检查
curl https://shenwenapi.578388.xyz/api/health

# 测试注册
curl -X POST https://shenwenapi.578388.xyz/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"测试用户","email":"test@example.com","password":"123456"}'

# 测试登录
curl -X POST https://shenwenapi.578388.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

---

## PM2 常用命令

```bash
pm2 status                    # 查看状态
pm2 logs shenwenai-auth       # 查看日志
pm2 restart shenwenai-auth    # 重启
pm2 stop shenwenai-auth       # 停止
pm2 delete shenwenai-auth     # 删除
```

## 数据库

用户数据存储在 `server/data/users.db`（SQLite 文件）。

**备份数据库：**
```bash
cp /opt/shenwenaiweb/server/data/users.db /opt/shenwenaiweb/server/data/users.db.backup
```

## 故障排除

1. **端口被占用**：修改 `.env` 中的 `PORT`
2. **CORS 错误**：确认 `.env` 中的 `CORS_ORIGINS` 包含你的前端域名
3. **数据库错误**：检查 `data/` 目录的写入权限（`chmod 755 data/`）
4. **PM2 问题**：`pm2 logs` 查看详细错误日志
