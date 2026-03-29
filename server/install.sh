#!/bin/bash
# ============================================================
# shenwenAI 认证后端 - 一键下载并部署脚本
# 在全新服务器上运行此脚本即可完成下载和部署
#
# 使用方法:
#   curl -fsSL https://raw.githubusercontent.com/shenwenAI/shenwenaiweb/main/server/install.sh | bash
#   或者:
#   wget -qO- https://raw.githubusercontent.com/shenwenAI/shenwenaiweb/main/server/install.sh | bash
# ============================================================

set -e

echo "=========================================="
echo "  shenwenAI 认证后端 - 一键下载并部署"
echo "=========================================="
echo ""

# 检查是否是 root
if [ "$EUID" -ne 0 ]; then
    echo "请使用 root 用户运行此脚本"
    echo "用法: sudo bash install.sh"
    echo "  或: curl -fsSL https://raw.githubusercontent.com/shenwenAI/shenwenaiweb/main/server/install.sh | sudo bash"
    exit 1
fi

# ==================== 1. 安装基础工具 ====================
echo "[1/7] 安装基础工具..."
apt-get update -qq
apt-get install -y -qq git curl > /dev/null 2>&1
echo "  基础工具就绪"

# ==================== 2. 安装 Node.js ====================
echo "[2/7] 检查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  Node.js 已安装: $NODE_VERSION"
else
    echo "  正在安装 Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs > /dev/null 2>&1
    echo "  Node.js 安装完成: $(node --version)"
fi

# ==================== 3. 下载代码 ====================
echo "[3/7] 下载 shenwenAI 代码..."
PROJECT_DIR="/opt/shenwenai-auth"
REPO_URL="https://github.com/shenwenAI/shenwenaiweb.git"

if [ -d "$PROJECT_DIR" ]; then
    echo "  项目目录已存在，更新代码..."
    # 备份 .env
    if [ -f "$PROJECT_DIR/.env" ]; then
        cp "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.backup.$(date +%Y%m%d%H%M%S)"
        echo "  已备份现有 .env 文件"
    fi
    # 备份数据库
    if [ -f "$PROJECT_DIR/data/users.db" ]; then
        cp "$PROJECT_DIR/data/users.db" "$PROJECT_DIR/data/users.db.backup.$(date +%Y%m%d%H%M%S)"
        echo "  已备份现有数据库"
    fi
    # 从 git 更新
    TEMP_DIR=$(mktemp -d)
    git clone --depth 1 "$REPO_URL" "$TEMP_DIR" > /dev/null 2>&1
    cp "$TEMP_DIR/server/server.js" "$PROJECT_DIR/"
    cp "$TEMP_DIR/server/package.json" "$PROJECT_DIR/"
    cp "$TEMP_DIR/server/.env.example" "$PROJECT_DIR/"
    if [ -f "$TEMP_DIR/server/send-email.js" ]; then
        cp "$TEMP_DIR/server/send-email.js" "$PROJECT_DIR/"
    fi
    rm -rf "$TEMP_DIR"
    echo "  代码已更新"
else
    mkdir -p "$PROJECT_DIR"
    TEMP_DIR=$(mktemp -d)
    git clone --depth 1 "$REPO_URL" "$TEMP_DIR" > /dev/null 2>&1
    cp "$TEMP_DIR/server/server.js" "$PROJECT_DIR/"
    cp "$TEMP_DIR/server/package.json" "$PROJECT_DIR/"
    cp "$TEMP_DIR/server/.env.example" "$PROJECT_DIR/"
    if [ -f "$TEMP_DIR/server/send-email.js" ]; then
        cp "$TEMP_DIR/server/send-email.js" "$PROJECT_DIR/"
    fi
    # 复制辅助脚本
    for script in deploy.sh setup-email.sh setup-cloudflare-https.sh setup-website-proxy.sh upgrade.sh; do
        if [ -f "$TEMP_DIR/server/$script" ]; then
            cp "$TEMP_DIR/server/$script" "$PROJECT_DIR/"
        fi
    done
    rm -rf "$TEMP_DIR"
    echo "  代码已下载到 $PROJECT_DIR"
fi

# ==================== 4. 安装依赖 ====================
echo "[4/7] 安装 npm 依赖..."
cd "$PROJECT_DIR"
npm install --production > /dev/null 2>&1
echo "  依赖安装完成"

# ==================== 5. 配置环境变量 ====================
echo "[5/7] 配置环境变量..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
    TOKEN_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    cat > "$PROJECT_DIR/.env" << ENVEOF
PORT=3000
CORS_ORIGINS=https://578388.xyz,https://shenwen.578388.xyz,https://shenwenapi.578388.xyz,https://shenwenaiweb.pages.dev,https://*.shenwenaiweb.pages.dev
TOKEN_SECRET=$TOKEN_SECRET
TOKEN_EXPIRE_DAYS=7

# 图形验证码无需额外配置
ENVEOF
    echo "  .env 文件已生成（TOKEN_SECRET 已自动生成）"
    echo ""
else
    echo "  .env 文件已存在，跳过"
fi

# ==================== 6. 安装 PM2 并启动服务 ====================
echo "[6/7] 启动服务..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 > /dev/null 2>&1
fi

cd "$PROJECT_DIR"

# 加载环境变量
set -a
source .env
set +a

# 停止旧进程（如果有）
pm2 delete shenwenai-auth 2>/dev/null || true

# 启动服务
pm2 start server.js --name shenwenai-auth --env production
pm2 startup 2>/dev/null || true
pm2 save > /dev/null 2>&1

echo "  服务已启动"

# ==================== 7. 配置 Nginx ====================
echo "[7/7] 配置 Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "  正在安装 Nginx..."
    apt-get install -y -qq nginx > /dev/null 2>&1
fi

if [ ! -f /etc/nginx/sites-available/shenwenai-auth ]; then
    cat > /etc/nginx/sites-available/shenwenai-auth << 'NGINXEOF'
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

    # HTTP 请求重定向到 HTTPS（Cloudflare 处理 SSL 终止）
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name shenwenapi.578388.xyz;

    # Cloudflare Origin 证书（需手动从 Cloudflare 仪表板生成并放置）
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
NGINXEOF
    ln -sf /etc/nginx/sites-available/shenwenai-auth /etc/nginx/sites-enabled/
    nginx -t 2>/dev/null && systemctl reload nginx
    echo "  Nginx 配置完成"
else
    echo "  Nginx 配置已存在，跳过"
fi

# ==================== 完成 ====================
echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "  服务地址: http://localhost:3000"
echo "  项目目录: $PROJECT_DIR"
echo ""
echo "  测试命令:"
echo "    curl http://localhost:3000/api/health"
echo ""
echo "  PM2 命令:"
echo "    pm2 status                    # 查看状态"
echo "    pm2 logs shenwenai-auth       # 查看日志"
echo "    pm2 restart shenwenai-auth    # 重启"
echo ""
echo "  ==================== 重要配置 ===================="
echo ""
echo "  1. Cloudflare HTTPS 配置:"
echo "     a) 在 Cloudflare 仪表板设置 DNS A 记录指向服务器 IP（已代理/橙色云朵）"
echo "     b) SSL/TLS 加密模式设置为 Full (strict)"
echo "     c) 生成 Origin 证书并保存到:"
echo "        /etc/ssl/cloudflare/shenwenapi.578388.xyz.pem  (证书)"
echo "        /etc/ssl/cloudflare/shenwenapi.578388.xyz.key  (私钥)"
echo "     d) 重载 Nginx: nginx -t && systemctl reload nginx"
echo ""
