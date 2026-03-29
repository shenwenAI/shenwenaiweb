#!/bin/bash
# ============================================================
# shenwenAI 网站 - 一键配置反向代理至 8443 端口
# 通过 Cloudflare CDN 为静态网站配置 HTTPS（端口 8443）
#
# 8443 是 Cloudflare 支持的 HTTPS 端口之一，可在 443 端口
# 已被其他服务（如 API 后端）占用时使用。
#
# Cloudflare 支持的 HTTPS 端口:
#   443, 2053, 2083, 2087, 2096, 8443
#
# 前提条件:
#   1. 已将 Cloudflare Origin 证书上传到服务器:
#      - /etc/ssl/cloudflare/<域名>.pem  (证书)
#      - /etc/ssl/cloudflare/<域名>.key  (私钥)
#   2. 域名已在 Cloudflare 中配置并开启代理（橙色云朵）
#   3. Cloudflare SSL/TLS 加密模式设为 Full (strict)
#
# 使用方法:
#   sudo bash setup-website-proxy.sh
#
# 自定义域名:
#   DOMAIN=example.com sudo bash setup-website-proxy.sh
# ============================================================

set -euo pipefail

# 注意: 此脚本仅支持 Debian/Ubuntu 系统（使用 apt-get 安装软件包）

# ==================== 变量配置 ====================
DOMAIN="${DOMAIN:-shenwen.578388.xyz}"
LISTEN_PORT=8443
WEB_ROOT="/var/www/shenwenai-web"
SSL_CERT="/etc/ssl/cloudflare/${DOMAIN}.pem"
SSL_KEY="/etc/ssl/cloudflare/${DOMAIN}.key"
NGINX_CONF="/etc/nginx/sites-available/shenwenai-web"
NGINX_LINK="/etc/nginx/sites-enabled/shenwenai-web"
REPO_URL="https://github.com/shenwenAI/shenwenaiweb.git"

echo "=========================================="
echo "  shenwenAI 网站 - 反向代理配置（端口 ${LISTEN_PORT}）"
echo "  域名: ${DOMAIN}"
echo "=========================================="
echo ""

# ==================== 1. 检查 root 权限 ====================
if [ "$EUID" -ne 0 ]; then
    echo "错误: 请使用 root 用户运行此脚本"
    echo "用法: sudo bash setup-website-proxy.sh"
    exit 1
fi

# ==================== 2. 安装基础工具 ====================
echo "[1/6] 安装基础工具..."
apt-get update -qq
apt-get install -y -qq git curl > /dev/null 2>&1
echo "  基础工具就绪"

# ==================== 3. 检查 SSL 证书 ====================
echo "[2/6] 检查 SSL 证书..."
if [ ! -d "/etc/ssl/cloudflare" ]; then
    mkdir -p /etc/ssl/cloudflare
fi

if [ ! -f "$SSL_CERT" ]; then
    echo "  错误: 证书文件不存在: $SSL_CERT"
    echo ""
    echo "  请先从 Cloudflare 仪表板生成 Origin 证书并保存到:"
    echo "    证书: $SSL_CERT"
    echo "    私钥: $SSL_KEY"
    echo ""
    echo "  步骤:"
    echo "    1. 登录 Cloudflare 仪表板"
    echo "    2. 选择域名 → SSL/TLS → Origin Server"
    echo "    3. 点击 Create Certificate"
    echo "    4. 将证书内容保存到上述路径"
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

# ==================== 4. 安装并检查 Nginx ====================
echo "[3/6] 检查 Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "  Nginx 未安装，正在安装..."
    apt-get install -y -qq nginx > /dev/null 2>&1
    echo "  Nginx 安装完成"
else
    echo "  Nginx 已安装: $(nginx -v 2>&1)"
fi

# 确保 Nginx 正在运行
systemctl enable nginx
systemctl start nginx

# ==================== 5. 下载网站文件 ====================
echo "[4/6] 下载网站文件..."
mkdir -p "$WEB_ROOT"

TEMP_DIR=$(mktemp -d)
git clone --depth 1 "$REPO_URL" "$TEMP_DIR" > /dev/null 2>&1

# 复制前端静态文件（HTML、CSS、JS、图片）
for ext in html css js png jpeg jpg gif svg ico xml txt; do
    find "$TEMP_DIR" -maxdepth 1 -name "*.${ext}" -exec cp {} "$WEB_ROOT/" \;
done
rm -rf "$TEMP_DIR"

# 设置文件权限
chown -R www-data:www-data "$WEB_ROOT"
chmod -R 755 "$WEB_ROOT"

echo "  网站文件已下载到 $WEB_ROOT"

# ==================== 6. 生成 Nginx 配置 ====================
echo "[5/6] 生成 Nginx 配置..."

# 备份已有配置
if [ -f "$NGINX_CONF" ]; then
    BACKUP="${NGINX_CONF}.bak.$(date +%Y%m%d%H%M%S)"
    cp "$NGINX_CONF" "$BACKUP"
    echo "  已备份旧配置到: $BACKUP"
fi

cat > "$NGINX_CONF" << NGINXEOF
# ============================================================
# shenwenAI 网站 - Cloudflare CDN HTTPS 反向代理配置
# 域名: ${DOMAIN}
# 监听端口: ${LISTEN_PORT} (Cloudflare 支持的 HTTPS 端口)
# 网站目录: ${WEB_ROOT}
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

# ==================== HTTPS 主配置（端口 ${LISTEN_PORT}） ====================
server {
    listen ${LISTEN_PORT} ssl http2;
    listen [::]:${LISTEN_PORT} ssl http2;
    server_name ${DOMAIN};

    # ---------- Cloudflare Origin SSL 证书 ----------
    ssl_certificate     ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};

    # ---------- SSL 安全参数 ----------
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:WebSSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # ---------- 安全响应头 ----------
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # ---------- 网站根目录 ----------
    root ${WEB_ROOT};
    index index.html;

    # ---------- 静态资源缓存 ----------
    location ~* \.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # ---------- 主页面 ----------
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # ---------- 禁止访问隐藏文件 ----------
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # ---------- Gzip 压缩 ----------
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;
    gzip_vary on;
}
NGINXEOF

echo "  Nginx 配置已生成: $NGINX_CONF"

# ==================== 7. 启用配置并测试 ====================
echo "[6/6] 启用 Nginx 配置..."

# 创建符号链接
ln -sf "$NGINX_CONF" "$NGINX_LINK"

# 测试 Nginx 配置
echo "  测试 Nginx 配置语法..."
if nginx -t; then
    echo "  配置语法正确"
else
    echo "  错误: Nginx 配置语法错误，请检查"
    exit 1
fi

# 重载 Nginx
systemctl reload nginx
echo "  Nginx 已重载"

# ==================== 验证服务 ====================
echo ""
echo "  验证服务..."

check_port() {
    if command -v ss &> /dev/null; then
        ss -tlnp | grep -q ":$1"
    elif command -v netstat &> /dev/null; then
        netstat -tlnp | grep -q ":$1"
    else
        return 1
    fi
}

if check_port "${LISTEN_PORT}"; then
    echo "  Nginx HTTPS (${LISTEN_PORT}) 正在监听 ✓"
else
    echo "  警告: Nginx HTTPS 端口 ${LISTEN_PORT} 未在监听"
fi

# ==================== 完成 ====================
echo ""
echo "=========================================="
echo "  配置完成！"
echo "=========================================="
echo ""
echo "  架构: 客户端 → Cloudflare CDN (HTTPS) → Nginx (:${LISTEN_PORT}) → 静态文件"
echo ""
echo "  网站目录: ${WEB_ROOT}"
echo "  Nginx 配置: ${NGINX_CONF}"
echo "  监听端口: ${LISTEN_PORT}"
echo ""
echo "  测试命令:"
echo "    curl -k https://127.0.0.1:${LISTEN_PORT}/"
echo "    curl https://${DOMAIN}:${LISTEN_PORT}/"
echo ""
echo "  ==================== Cloudflare 仪表板设置 ===================="
echo ""
echo "  请在 Cloudflare 仪表板中完成以下设置:"
echo ""
echo "  1. DNS 记录:"
echo "     - 类型: A 记录"
echo "     - 名称: ${DOMAIN%%.*}"
echo "     - 内容: <你的服务器 IP>"
echo "     - 代理状态: 已代理（橙色云朵 ☁️）"
echo ""
echo "  2. SSL/TLS 设置:"
echo "     - 加密模式: Full (strict)"
echo "     - 最低 TLS 版本: TLS 1.2"
echo "     - 始终使用 HTTPS: 开启"
echo ""
echo "  3. 访问方式（Cloudflare 代理后）:"
echo "     - https://${DOMAIN}"
echo "     注意: Cloudflare 代理后，用户通过标准 443 端口访问，"
echo "     Cloudflare 会自动将请求转发到源站的 ${LISTEN_PORT} 端口。"
echo "     需要在 Cloudflare Origin Rules 中设置 Origin Port 为 ${LISTEN_PORT}。"
echo ""
echo "  4. 证书文件位置:"
echo "     - 证书: ${SSL_CERT}"
echo "     - 私钥: ${SSL_KEY}"
echo ""
echo "  5. 更新网站文件:"
echo "     cd ${WEB_ROOT} && git pull（或重新运行此脚本）"
echo ""
