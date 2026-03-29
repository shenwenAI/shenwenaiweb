# shenwenAI 登录注册后端服务

## 简介

这是 shenwenAI 网站的登录和注册后端服务，使用 Node.js + Express + SQLite 构建。

## 功能

- 用户注册（密码 bcrypt 加密存储，图形验证码）
- 用户登录（Token 认证，图形验证码）
- 用户信息查询
- 退出登录
- 修改密码（邮件验证码）
- 联系表单
- 健康检查接口

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/captcha` | 获取图形验证码 |
| POST | `/api/auth/register` | 用户注册（图形验证码） |
| POST | `/api/auth/login` | 用户登录（图形验证码） |
| GET | `/api/auth/user` | 获取当前用户信息 |
| POST | `/api/auth/logout` | 退出登录 |
| POST | `/api/auth/send-change-password-code` | 发送修改密码验证码 |
| POST | `/api/auth/change-password` | 修改密码 |
| POST | `/api/contact` | 联系管理员 |
| GET | `/api/health` | 健康检查 |

---

## 部署到服务器（578388.xyz）

### 一键下载并部署（推荐）

在全新服务器上运行以下命令即可完成下载和部署：

```bash
curl -fsSL https://raw.githubusercontent.com/shenwenAI/shenwenaiweb/main/server/install.sh | sudo bash
```

或者使用 wget：

```bash
wget -qO- https://raw.githubusercontent.com/shenwenAI/shenwenaiweb/main/server/install.sh | sudo bash
```

脚本会自动完成：
- 安装 Node.js 20.x、Git、Nginx
- 从 GitHub 下载最新代码
- 安装 npm 依赖
- 生成安全的 TOKEN_SECRET
- 使用 PM2 启动并守护服务
- 配置 Nginx 反向代理（Cloudflare HTTPS）

### 手动部署步骤

<details>
<summary>点击展开手动部署步骤</summary>

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
TOKEN_SECRET=（用下面的命令生成）
```

**⚠️ 必须生成安全的随机密钥**：
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

### 第八步：一键配置 Cloudflare CDN HTTPS（推荐）

**前提条件**：已将 Cloudflare Origin 证书上传到服务器：
- 证书: `/etc/ssl/cloudflare/shenwenapi.578388.xyz.pem`
- 私钥: `/etc/ssl/cloudflare/shenwenapi.578388.xyz.key`

```bash
# 一键配置 HTTPS（自动安装 Nginx、生成配置、启用 SSL）
sudo bash setup-cloudflare-https.sh
```

该脚本会自动完成：
- 验证 SSL 证书文件存在并设置正确权限
- 安装 Nginx（如未安装）
- 生成 Nginx 配置（Cloudflare IP 还原 + HTTPS + 反向代理到端口 3000）
- 启用配置并重载 Nginx
- 验证服务状态

<details>
<summary>手动配置方法（如果不使用脚本）</summary>

```bash
nano /etc/nginx/sites-available/shenwenai-auth
```

写入以下内容：
```nginx
# ==================== Cloudflare 真实 IP 还原 ====================
# Cloudflare IPv4 地址段
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;
# Cloudflare IPv6 地址段
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;
real_ip_header CF-Connecting-IP;

server {
    listen 80;
    server_name shenwenapi.578388.xyz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name shenwenapi.578388.xyz;

    # Cloudflare Origin 证书
    ssl_certificate /etc/ssl/cloudflare/shenwenapi.578388.xyz.pem;
    ssl_certificate_key /etc/ssl/cloudflare/shenwenapi.578388.xyz.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        add_header Content-Type application/json;
        return 200 '{"service":"shenwenAI Auth API","status":"ok"}';
    }
}
```

启用配置：
```bash
ln -s /etc/nginx/sites-available/shenwenai-auth /etc/nginx/sites-enabled/
nginx -t          # 测试配置
systemctl reload nginx
```

</details>

### 第八步（可选）：一键配置网站反向代理至 8443 端口

如果需要将静态网站通过 Nginx 反向代理在 8443 端口提供服务（当 443 端口已被 API 后端占用时），可以运行：

**前提条件**：已将 Cloudflare Origin 证书上传到服务器：
- 证书: `/etc/ssl/cloudflare/shenwen.578388.xyz.pem`
- 私钥: `/etc/ssl/cloudflare/shenwen.578388.xyz.key`

```bash
# 一键配置网站反向代理至 8443 端口
sudo bash setup-website-proxy.sh

# 自定义域名
DOMAIN=example.com sudo bash setup-website-proxy.sh
```

该脚本会自动完成：
- 安装 Git、Nginx 等基础工具
- 验证 SSL 证书文件存在并设置正确权限
- 从 GitHub 下载最新网站静态文件到 `/var/www/shenwenai-web`
- 生成 Nginx 配置（Cloudflare IP 还原 + HTTPS 端口 8443 + 静态文件服务）
- 配置 Gzip 压缩和静态资源缓存
- 启用配置并重载 Nginx
- 验证端口 8443 监听状态

> **注意**: 8443 是 Cloudflare 支持的 HTTPS 端口之一（443, 2053, 2083, 2087, 2096, 8443）。
> 配置完成后，需要在 Cloudflare Origin Rules 中设置 Origin Port 为 8443。

### 第十步：配置 Cloudflare 仪表板

1. **Cloudflare DNS 设置**：
   - 登录 [Cloudflare 仪表板](https://dash.cloudflare.com)
   - 为 `shenwenapi.578388.xyz` 添加 A 记录，指向你的服务器 IP
   - 确保代理状态为 **已代理**（橙色云朵图标）

2. **Cloudflare SSL/TLS 设置**：
   - 进入 SSL/TLS 页面，加密模式选择 **Full (strict)**
   - 最低 TLS 版本: TLS 1.2
   - 始终使用 HTTPS: 开启

3. **证书文件位置**（已上传到服务器）：
   ```
   /etc/ssl/cloudflare/shenwenapi.578388.xyz.pem  (证书)
   /etc/ssl/cloudflare/shenwenapi.578388.xyz.key  (私钥)
   ```

### 第十一步：测试 API

```bash
# 测试健康检查
curl https://shenwenapi.578388.xyz/api/health

# 测试注册（需先获取验证码）
# 1. 获取验证码
curl https://shenwenapi.578388.xyz/api/captcha
# 2. 使用返回的 captchaId 和验证码进行注册
curl -X POST https://shenwenapi.578388.xyz/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"测试用户","email":"test@example.com","password":"Test@123!","captchaId":"<captchaId>","captchaCode":"<code>"}'

# 测试登录（需先获取验证码）
curl -X POST https://shenwenapi.578388.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123!","captchaId":"<captchaId>","captchaCode":"<code>"}'
```

</details>

---

## 图形验证码

登录和注册使用服务器端生成的4位数字图形验证码（SVG），无需任何第三方服务配置。

- 验证码有效期：5分钟
- 验证码为一次性使用，提交后自动失效
- 获取验证码接口有速率限制（每 IP 每分钟最多20次）

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
5. **Cloudflare 521 错误**：确认 Nginx 和后端服务正在运行（`pm2 status` 和 `systemctl status nginx`）
6. **Cloudflare 525 SSL 错误**：检查 Origin 证书是否正确配置在 `/etc/ssl/cloudflare/` 目录
7. **速率限制不准确**：确认 Nginx 配置了 Cloudflare `set_real_ip_from` 和 `real_ip_header CF-Connecting-IP`

---

## 自定义域名邮箱配置（Custom Domain Email Setup）

使用自定义域名邮箱（如 `noreply@578388.xyz`）发送验证码邮件，可以提升品牌形象和邮件送达率。

### 一键配置（推荐）

```bash
cd /opt/shenwenaiweb/server
sudo bash setup-email.sh
```

该脚本会自动完成：
- 安装所需依赖（openssl、dnsutils）
- 交互式选择 SMTP 服务并输入配置
- 生成 DKIM 密钥对
- 更新 `.env` 文件
- 输出需要添加的 DNS 记录
- 测试 SMTP 连接并发送测试邮件
- 重启服务

### 手动配置

<details>
<summary>点击展开手动配置步骤</summary>

#### 概述

配置步骤：
1. 选择 SMTP 服务（自建或第三方）
2. 配置域名 DNS 记录（SPF、DKIM、DMARC）
3. 生成 DKIM 密钥对
4. 更新 `.env` 配置
5. 测试验证

#### 第一步：选择 SMTP 服务

可以使用以下任一种方式：

| 方式 | 适用场景 | 示例 |
|------|---------|------|
| 域名邮箱服务商 | 最简单，推荐 | 腾讯企业邮、阿里企业邮、Zoho Mail |
| 第三方发信服务 | 大量发信 | Amazon SES、Mailgun、SendGrid |
| 自建 SMTP | 完全控制 | Postfix、HMailServer |

#### 第二步：配置域名 DNS 记录

在域名 DNS 管理面板（如 Cloudflare）添加以下记录：

##### 1. MX 记录（可选，仅收信需要）

| 类型 | 名称 | 内容 | 优先级 |
|------|------|------|--------|
| MX | @ | mail.578388.xyz | 10 |

##### 2. SPF 记录（必须）

SPF 指定哪些服务器可以代表你的域名发送邮件：

| 类型 | 名称 | 内容 |
|------|------|------|
| TXT | @ | `v=spf1 mx a ip4:你的服务器IP ~all` |

> 根据你使用的 SMTP 服务调整 `include:` 部分。常用值：
> - 腾讯企业邮: `include:spf.mail.qq.com`
> - 阿里企业邮: `include:spf.mail.alibaba.com`
> - Amazon SES: `include:amazonses.com`
> - Mailgun: `include:mailgun.org`

##### 3. DKIM 记录（推荐）

DKIM 使用公钥/私钥对邮件进行签名验证。生成密钥后需添加：

| 类型 | 名称 | 内容 |
|------|------|------|
| TXT | `default._domainkey` | `v=DKIM1; k=rsa; p=你的DKIM公钥` |

> `default` 是 DKIM 选择器（selector），可自定义，需与 `.env` 中的 `DKIM_SELECTOR` 一致。

##### 4. DMARC 记录（推荐）

DMARC 告诉收件方如何处理未通过 SPF/DKIM 验证的邮件：

| 类型 | 名称 | 内容 |
|------|------|------|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:admin@578388.xyz; pct=100` |

#### 第三步：生成 DKIM 密钥对

```bash
# 在服务器上生成 DKIM RSA 密钥对
mkdir -p /etc/dkim
openssl genrsa -out /etc/dkim/private.key 2048
openssl rsa -in /etc/dkim/private.key -pubout -out /etc/dkim/public.key
chmod 600 /etc/dkim/private.key

# 提取公钥内容（去掉头尾行），用于 DNS TXT 记录
cat /etc/dkim/public.key | grep -v '^-' | tr -d '\n'
```

将提取的公钥内容填入上面的 DKIM DNS TXT 记录中的 `p=` 字段。

#### 第四步：更新 `.env` 配置

```bash
nano /opt/shenwenaiweb/server/.env
```

添加或修改以下配置：

```env
# SMTP 配置（以腾讯企业邮为例）
EMAIL_HOST=smtp.exmail.qq.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=noreply@578388.xyz
EMAIL_PASS=你的邮箱密码或授权码

# 发件人（自定义显示名称）
EMAIL_FROM=shenwenAI <noreply@578388.xyz>

# DKIM 签名（可选但推荐）
DKIM_DOMAIN=578388.xyz
DKIM_SELECTOR=default
DKIM_PRIVATE_KEY_PATH=/etc/dkim/private.key

# 管理员邮箱
ADMIN_EMAIL=admin@578388.xyz
```

配置完成后重启服务：
```bash
pm2 restart shenwenai-auth
```

#### 第五步：测试邮件配置

#### 方法一：使用 API 测试接口

```bash
# 发送测试邮件（需要 TOKEN_SECRET 作为身份验证）
curl -X POST https://shenwenapi.578388.xyz/api/email/verify-config \
  -H "Content-Type: application/json" \
  -d '{"secret":"你的TOKEN_SECRET值","to":"test@example.com"}'
```

#### 方法二：使用命令行工具

```bash
cd /opt/shenwenaiweb/server
node send-email.js --to admin@578388.xyz --subject "测试自定义域名邮箱" --message "这是一封测试邮件"
```

#### 方法三：验证 DNS 记录

```bash
# 检查 SPF 记录
dig TXT 578388.xyz +short

# 检查 DKIM 记录
dig TXT default._domainkey.578388.xyz +short

# 检查 DMARC 记录
dig TXT _dmarc.578388.xyz +short
```

#### 常见 SMTP 服务配置示例

<details>
<summary>腾讯企业邮</summary>

```env
EMAIL_HOST=smtp.exmail.qq.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=noreply@你的域名
EMAIL_PASS=你的邮箱密码
EMAIL_FROM=shenwenAI <noreply@你的域名>
```
</details>

<details>
<summary>阿里企业邮</summary>

```env
EMAIL_HOST=smtp.mxhichina.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=noreply@你的域名
EMAIL_PASS=你的邮箱密码
EMAIL_FROM=shenwenAI <noreply@你的域名>
```
</details>

<details>
<summary>Zoho Mail</summary>

```env
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=noreply@你的域名
EMAIL_PASS=你的邮箱密码
EMAIL_FROM=shenwenAI <noreply@你的域名>
```
</details>

<details>
<summary>Amazon SES</summary>

```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=你的SES_SMTP用户名
EMAIL_PASS=你的SES_SMTP密码
EMAIL_FROM=shenwenAI <noreply@你的域名>
```
</details>

<details>
<summary>Mailgun</summary>

```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=postmaster@你的域名
EMAIL_PASS=你的Mailgun_SMTP密码
EMAIL_FROM=shenwenAI <noreply@你的域名>
```
</details>

#### 邮件相关故障排除

1. **邮件进入垃圾箱**：检查 SPF、DKIM、DMARC DNS 记录是否正确配置
2. **SMTP 连接失败**：确认 EMAIL_HOST/EMAIL_PORT/EMAIL_SECURE 配置正确，服务器防火墙允许 465/587 端口出站
3. **DKIM 签名失败**：确认私钥文件路径正确且有读取权限（`chmod 600`），公钥已正确添加到 DNS
4. **发件人地址被拒绝**：确认 EMAIL_FROM 地址与 SMTP 账户授权的发件人地址一致
5. **邮件发送速率限制**：各 SMTP 服务商有每日发送限额，请参考对应服务商文档

</details>
