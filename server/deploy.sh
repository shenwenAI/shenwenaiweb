#!/bin/bash
# ============================================================
# shenwenAI 认证后端 - 一键部署脚本
# 在你的服务器上运行此脚本即可完成部署
# 使用方法: bash deploy.sh
# ============================================================

set -e

echo "=========================================="
echo "  shenwenAI 认证后端 - 一键部署"
echo "=========================================="
echo ""

# 检查是否是 root
if [ "$EUID" -ne 0 ]; then
    echo "请使用 root 用户运行此脚本"
    echo "用法: sudo bash deploy.sh"
    exit 1
fi

# ==================== 1. 安装 Node.js ====================
echo "[1/6] 检查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  Node.js 已安装: $NODE_VERSION"
else
    echo "  正在安装 Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo "  Node.js 安装完成: $(node --version)"
fi

# ==================== 2. 创建项目目录 ====================
echo "[2/6] 设置项目目录..."
PROJECT_DIR="/opt/shenwenai-auth"
mkdir -p "$PROJECT_DIR"

# 复制文件（如果从 git 仓库运行）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/server.js" ]; then
    cp "$SCRIPT_DIR/server.js" "$PROJECT_DIR/"
    cp "$SCRIPT_DIR/package.json" "$PROJECT_DIR/"
    cp "$SCRIPT_DIR/.env.example" "$PROJECT_DIR/"
    echo "  文件已复制到 $PROJECT_DIR"
elif [ -f "$SCRIPT_DIR/../server/server.js" ]; then
    cp "$SCRIPT_DIR/../server/server.js" "$PROJECT_DIR/"
    cp "$SCRIPT_DIR/../server/package.json" "$PROJECT_DIR/"
    cp "$SCRIPT_DIR/../server/.env.example" "$PROJECT_DIR/"
    echo "  文件已复制到 $PROJECT_DIR"
else
    echo "  请确保 server.js, package.json, .env.example 在当前目录"
    exit 1
fi

# ==================== 3. 安装依赖 ====================
echo "[3/6] 安装 npm 依赖..."
cd "$PROJECT_DIR"
npm install --production
echo "  依赖安装完成"

# ==================== 4. 配置环境变量 ====================
echo "[4/6] 配置环境变量..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
    TOKEN_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    cat > "$PROJECT_DIR/.env" << ENVEOF
PORT=3000
CORS_ORIGINS=https://578388.xyz,https://shenwen.578388.xyz,https://shenwenapi.578388.xyz,http://578388.xyz
TOKEN_SECRET=$TOKEN_SECRET
TOKEN_EXPIRE_DAYS=7
ENVEOF
    echo "  .env 文件已生成（TOKEN_SECRET 已自动生成）"
else
    echo "  .env 文件已存在，跳过"
fi

# ==================== 5. 安装 PM2 并启动服务 ====================
echo "[5/6] 启动服务..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
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
pm2 save

echo "  服务已启动"

# ==================== 6. 配置 Nginx ====================
echo "[6/6] 配置 Nginx..."
if command -v nginx &> /dev/null; then
    # 检查是否已有配置
    if [ ! -f /etc/nginx/sites-available/shenwenai-auth ]; then
        cat > /etc/nginx/sites-available/shenwenai-auth << 'NGINXEOF'
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
NGINXEOF
        ln -sf /etc/nginx/sites-available/shenwenai-auth /etc/nginx/sites-enabled/
        nginx -t && systemctl reload nginx
        echo "  Nginx 配置完成"
    else
        echo "  Nginx 配置已存在，跳过"
    fi
else
    echo "  Nginx 未安装，跳过（你可以手动安装: apt install nginx）"
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
echo "    pm2 status          # 查看状态"
echo "    pm2 logs shenwenai-auth  # 查看日志"
echo "    pm2 restart shenwenai-auth  # 重启"
echo ""
echo "  如果你需要 HTTPS，运行:"
echo "    apt install certbot python3-certbot-nginx"
echo "    certbot --nginx -d shenwenapi.578388.xyz"
echo ""
