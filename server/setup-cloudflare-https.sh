#!/bin/bash
# ============================================================
# shenwenAI API - Cloudflare CDN HTTPS 配置脚本
# 通过 Cloudflare CDN 为端口 3000 的后端服务配置 HTTPS
#
# 前提条件:
#   1. 已将 Cloudflare Origin 证书上传到服务器:
#      - /etc/ssl/cloudflare/shenwenapi.578388.xyz.pem  (证书)
#      - /etc/ssl/cloudflare/shenwenapi.578388.xyz.key  (私钥)
#   2. 后端服务已在端口 3000 运行
#   3. 域名 shenwenapi.578388.xyz 已在 Cloudflare 中配置
#
# 使用方法: sudo bash setup-cloudflare-https.sh
# ============================================================

set -e

# ==================== 变量配置 ====================
DOMAIN="shenwenapi.578388.xyz"
BACKEND_PORT=3000
SSL_CERT="/etc/ssl/cloudflare/${DOMAIN}.pem"
SSL_KEY="/etc/ssl/cloudflare/${DOMAIN}.key"
NGINX_CONF="/etc/nginx/sites-available/shenwenai-auth"
NGINX_LINK="/etc/nginx/sites-enabled/shenwenai-auth"

echo "=========================================="
echo "  Cloudflare CDN HTTPS 配置脚本"
echo "  域名: ${DOMAIN}"
echo "  后端端口: ${BACKEND_PORT}"
echo "=========================================="
echo ""

# ==================== 1. 检查 root 权限 ====================
if [ "$EUID" -ne 0 ]; then
    echo "错误: 请使用 root 用户运行此脚本"
    echo "用法: sudo bash setup-cloudflare-https.sh"
    exit 1
fi

# ==================== 2. 检查 SSL 证书 ====================
echo "[1/5] 检查 SSL 证书..."
if [ ! -f "$SSL_CERT" ]; then
    echo "  错误: 证书文件不存在: $SSL_CERT"
    echo "  请先将 Cloudflare Origin 证书上传到该路径"
    exit 1
fi

if [ ! -f "$SSL_KEY" ]; then
    echo "  错误: 私钥文件不存在: $SSL_KEY"
    echo "  请先将 Cloudflare Origin 私钥上传到该路径"
    exit 1
fi

# 设置证书文件权限
chmod 644 "$SSL_CERT"
chmod 600 "$SSL_KEY"
echo "  证书文件已找到，权限已设置"

# ==================== 3. 安装并检查 Nginx ====================
echo "[2/5] 检查 Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "  Nginx 未安装，正在安装..."
    apt-get update -qq
    apt-get install -y nginx
    echo "  Nginx 安装完成"
else
    echo "  Nginx 已安装: $(nginx -v 2>&1)"
fi

# 确保 Nginx 正在运行
systemctl enable nginx
systemctl start nginx

# ==================== 4. 生成 Nginx 配置 ====================
echo "[3/5] 生成 Nginx 配置..."

# 备份已有配置
if [ -f "$NGINX_CONF" ]; then
    BACKUP="${NGINX_CONF}.bak.$(date +%Y%m%d%H%M%S)"
    cp "$NGINX_CONF" "$BACKUP"
    echo "  已备份旧配置到: $BACKUP"
fi

cat > "$NGINX_CONF" << NGINXEOF
# ============================================================
# shenwenAI API - Cloudflare CDN HTTPS 配置
# 域名: ${DOMAIN}
# 后端: http://127.0.0.1:${BACKEND_PORT}
# 证书: Cloudflare Origin 证书
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
# ============================================================

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

# ==================== HTTP → HTTPS 重定向 ====================
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # 所有 HTTP 请求重定向到 HTTPS
    return 301 https://\$host\$request_uri;
}

# ==================== HTTPS 主配置 ====================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    # ---------- Cloudflare Origin SSL 证书 ----------
    ssl_certificate     ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};

    # ---------- SSL 安全参数 ----------
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # ---------- 安全响应头 ----------
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # ---------- API 代理 → 端口 ${BACKEND_PORT} ----------
    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;

        # WebSocket 支持
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';

        # 请求头转发
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header CF-Connecting-IP \$http_cf_connecting_ip;

        proxy_cache_bypass \$http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # ---------- 根路径 - 服务状态 ----------
    location / {
        add_header Content-Type application/json always;
        return 200 '{"service":"shenwenAI Auth API","status":"ok","domain":"${DOMAIN}"}';
    }
}
NGINXEOF

echo "  Nginx 配置已生成: $NGINX_CONF"

# ==================== 5. 启用配置并测试 ====================
echo "[4/5] 启用 Nginx 配置..."

# 创建符号链接
ln -sf "$NGINX_CONF" "$NGINX_LINK"

# 删除默认站点（如果与当前配置冲突）
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "  注意: 保留默认站点配置"
fi

# 测试 Nginx 配置
echo "  测试 Nginx 配置语法..."
if nginx -t 2>&1; then
    echo "  配置语法正确"
else
    echo "  错误: Nginx 配置语法错误，请检查"
    exit 1
fi

# 重载 Nginx
systemctl reload nginx
echo "  Nginx 已重载"

# ==================== 6. 验证服务 ====================
echo "[5/5] 验证服务..."

# 检查后端端口是否在监听
if ss -tlnp | grep -q ":${BACKEND_PORT}"; then
    echo "  后端服务正在端口 ${BACKEND_PORT} 上运行"
else
    echo "  警告: 端口 ${BACKEND_PORT} 未检测到服务"
    echo "  请确保后端服务已启动 (pm2 start server.js)"
fi

# 检查 Nginx 端口
if ss -tlnp | grep -q ":443"; then
    echo "  Nginx HTTPS (443) 正在监听"
else
    echo "  警告: Nginx HTTPS 端口 443 未在监听"
fi

if ss -tlnp | grep -q ":80"; then
    echo "  Nginx HTTP (80) 正在监听"
else
    echo "  警告: Nginx HTTP 端口 80 未在监听"
fi

# ==================== 完成 ====================
echo ""
echo "=========================================="
echo "  HTTPS 配置完成！"
echo "=========================================="
echo ""
echo "  架构: 客户端 → Cloudflare CDN (HTTPS) → Nginx (443) → Node.js (:${BACKEND_PORT})"
echo ""
echo "  测试命令:"
echo "    curl -k https://127.0.0.1/api/health"
echo "    curl https://${DOMAIN}/api/health"
echo ""
echo "  ==================== Cloudflare 仪表板设置 ===================="
echo ""
echo "  请在 Cloudflare 仪表板中完成以下设置:"
echo ""
echo "  1. DNS 记录:"
echo "     - 类型: A 记录"
echo "     - 名称: shenwenapi"
echo "     - 内容: <你的服务器 IP>"
echo "     - 代理状态: 已代理（橙色云朵 ☁️）"
echo ""
echo "  2. SSL/TLS 设置:"
echo "     - 加密模式: Full (strict)"
echo "     - 最低 TLS 版本: TLS 1.2"
echo "     - 始终使用 HTTPS: 开启"
echo ""
echo "  3. 证书文件位置:"
echo "     - 证书: ${SSL_CERT}"
echo "     - 私钥: ${SSL_KEY}"
echo ""
echo "  4. Nginx 配置文件:"
echo "     - ${NGINX_CONF}"
echo ""
