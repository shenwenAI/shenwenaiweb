#!/bin/bash
# ============================================================
# shenwenAI - 自定义域名邮箱一键配置脚本
# 自动安装依赖、生成 DKIM 密钥、配置 .env、输出 DNS 记录
#
# 使用方法: sudo bash setup-email.sh
#
# 功能:
#   1. 安装所需依赖（openssl、dig）
#   2. 交互式输入邮件配置（SMTP 服务器、用户名、密码等）
#   3. 自动生成 DKIM 密钥对
#   4. 更新 .env 文件中的邮件配置
#   5. 输出需要添加的 DNS 记录（SPF、DKIM、DMARC）
#   6. 发送测试邮件验证配置
# ============================================================

set -euo pipefail

# ==================== 颜色输出 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[信息]${NC} $1"; }
success() { echo -e "${GREEN}[成功]${NC} $1"; }
warn()    { echo -e "${YELLOW}[警告]${NC} $1"; }
error()   { echo -e "${RED}[错误]${NC} $1"; }

# ==================== 变量 ====================
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
DKIM_DIR="/etc/dkim"

echo ""
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}  shenwenAI 自定义域名邮箱一键配置${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""

# ==================== 1. 检查 root 权限 ====================
if [ "$EUID" -ne 0 ]; then
    error "请使用 root 用户运行此脚本"
    echo "  用法: sudo bash setup-email.sh"
    exit 1
fi

# ==================== 2. 安装依赖 ====================
echo -e "${BLUE}[1/7]${NC} 检查并安装依赖..."

install_if_missing() {
    local cmd="$1"
    local pkg="$2"
    if ! command -v "$cmd" &> /dev/null; then
        info "  正在安装 $pkg..."
        apt-get update -qq 2>/dev/null
        if ! apt-get install -y "$pkg" 2>&1 | tail -3; then
            error "  $pkg 安装失败，请手动安装: apt-get install $pkg"
            exit 1
        fi
        success "  $pkg 安装完成"
    else
        success "  $cmd 已安装"
    fi
}

install_if_missing openssl openssl
install_if_missing dig dnsutils
install_if_missing node nodejs

# 检查 npm 和 nodemailer
if [ -f "$SCRIPT_DIR/package.json" ]; then
    if [ ! -d "$SCRIPT_DIR/node_modules/nodemailer" ]; then
        info "  正在安装 Node.js 依赖..."
        cd "$SCRIPT_DIR" && npm install --production -q 2>/dev/null
        success "  Node.js 依赖安装完成"
    else
        success "  Node.js 依赖已安装"
    fi
fi

# ==================== 3. 收集邮件配置信息 ====================
echo ""
echo -e "${BLUE}[2/7]${NC} 配置邮件发送信息..."
echo ""
echo "  请选择 SMTP 服务类型:"
echo ""
echo "    1) 腾讯企业邮 (smtp.exmail.qq.com)"
echo "    2) 阿里企业邮 (smtp.mxhichina.com)"
echo "    3) QQ 邮箱    (smtp.qq.com)"
echo "    4) 163 邮箱   (smtp.163.com)"
echo "    5) Zoho Mail  (smtp.zoho.com)"
echo "    6) Gmail      (smtp.gmail.com)"
echo "    7) Amazon SES (email-smtp.us-east-1.amazonaws.com)"
echo "    8) Mailgun    (smtp.mailgun.org)"
echo "    9) 自定义 SMTP 服务器"
echo ""
read -rp "  请输入选项 [1-9]: " SMTP_CHOICE

case "$SMTP_CHOICE" in
    1) SMTP_HOST="smtp.exmail.qq.com";  SMTP_PORT=465; SMTP_SECURE=true;  SPF_INCLUDE="include:spf.mail.qq.com" ;;
    2) SMTP_HOST="smtp.mxhichina.com";  SMTP_PORT=465; SMTP_SECURE=true;  SPF_INCLUDE="include:spf.mail.alibaba.com" ;;
    3) SMTP_HOST="smtp.qq.com";         SMTP_PORT=465; SMTP_SECURE=true;  SPF_INCLUDE="include:spf.mail.qq.com" ;;
    4) SMTP_HOST="smtp.163.com";        SMTP_PORT=465; SMTP_SECURE=true;  SPF_INCLUDE="include:spf.163.com" ;;
    5) SMTP_HOST="smtp.zoho.com";       SMTP_PORT=465; SMTP_SECURE=true;  SPF_INCLUDE="include:zoho.com" ;;
    6) SMTP_HOST="smtp.gmail.com";      SMTP_PORT=465; SMTP_SECURE=true;  SPF_INCLUDE="include:_spf.google.com" ;;
    7) SMTP_HOST="email-smtp.us-east-1.amazonaws.com"; SMTP_PORT=465; SMTP_SECURE=true; SPF_INCLUDE="include:amazonses.com" ;;
    8) SMTP_HOST="smtp.mailgun.org";    SMTP_PORT=465; SMTP_SECURE=true;  SPF_INCLUDE="include:mailgun.org" ;;
    9)
        read -rp "  请输入 SMTP 服务器地址: " SMTP_HOST
        read -rp "  请输入 SMTP 端口 [465]: " SMTP_PORT
        SMTP_PORT="${SMTP_PORT:-465}"
        read -rp "  是否使用 SSL/TLS? (y/n) [y]: " SMTP_SECURE_INPUT
        SMTP_SECURE_INPUT="${SMTP_SECURE_INPUT:-y}"
        if [ "$SMTP_SECURE_INPUT" = "y" ] || [ "$SMTP_SECURE_INPUT" = "Y" ]; then
            SMTP_SECURE=true
        else
            SMTP_SECURE=false
        fi
        SPF_INCLUDE=""
        ;;
    *)
        error "无效选项"
        exit 1
        ;;
esac

echo ""
read -rp "  请输入 SMTP 登录用户名（邮箱地址）: " EMAIL_USER
if [ -z "$EMAIL_USER" ]; then
    error "SMTP 用户名不能为空"
    exit 1
fi

echo ""
read -rsp "  请输入 SMTP 登录密码（或授权码）: " EMAIL_PASS
echo ""
if [ -z "$EMAIL_PASS" ]; then
    error "SMTP 密码不能为空"
    exit 1
fi

echo ""
read -rp "  请输入发件人显示名称 [shenwenAI]: " DISPLAY_NAME
DISPLAY_NAME="${DISPLAY_NAME:-shenwenAI}"

read -rp "  请输入发件人邮箱地址 [$EMAIL_USER]: " FROM_EMAIL
FROM_EMAIL="${FROM_EMAIL:-$EMAIL_USER}"

EMAIL_FROM="$DISPLAY_NAME <$FROM_EMAIL>"

echo ""
read -rp "  请输入管理员邮箱（接收系统通知） [$FROM_EMAIL]: " ADMIN_EMAIL
ADMIN_EMAIL="${ADMIN_EMAIL:-$FROM_EMAIL}"

# 提取域名用于 DKIM
EMAIL_DOMAIN="${FROM_EMAIL##*@}"
if [ -z "$EMAIL_DOMAIN" ] || [ "$EMAIL_DOMAIN" = "$FROM_EMAIL" ]; then
    error "无法从邮箱地址提取域名: $FROM_EMAIL"
    exit 1
fi

echo ""
success "SMTP 配置: $SMTP_HOST:$SMTP_PORT (SSL: $SMTP_SECURE)"
success "发件人: $EMAIL_FROM"
success "域名: $EMAIL_DOMAIN"

# ==================== 4. 生成 DKIM 密钥 ====================
echo ""
echo -e "${BLUE}[3/7]${NC} 配置 DKIM 签名..."

read -rp "  是否配置 DKIM 签名？（推荐，提高邮件送达率）(y/n) [y]: " SETUP_DKIM
SETUP_DKIM="${SETUP_DKIM:-y}"

DKIM_DOMAIN_VAL=""
DKIM_SELECTOR_VAL="default"
DKIM_KEY_PATH=""
DKIM_PUBLIC_KEY=""

if [ "$SETUP_DKIM" = "y" ] || [ "$SETUP_DKIM" = "Y" ]; then
    read -rp "  DKIM 域名 [$EMAIL_DOMAIN]: " DKIM_DOMAIN_VAL
    DKIM_DOMAIN_VAL="${DKIM_DOMAIN_VAL:-$EMAIL_DOMAIN}"

    read -rp "  DKIM 选择器 [default]: " DKIM_SELECTOR_VAL
    DKIM_SELECTOR_VAL="${DKIM_SELECTOR_VAL:-default}"

    DKIM_KEY_PATH="$DKIM_DIR/${DKIM_DOMAIN_VAL}.private.key"

    # 创建 DKIM 目录
    mkdir -p "$DKIM_DIR"

    if [ -f "$DKIM_KEY_PATH" ]; then
        warn "DKIM 私钥已存在: $DKIM_KEY_PATH"
        read -rp "  是否重新生成？(y/n) [n]: " REGEN_DKIM
        REGEN_DKIM="${REGEN_DKIM:-n}"
    else
        REGEN_DKIM="y"
    fi

    if [ "$REGEN_DKIM" = "y" ] || [ "$REGEN_DKIM" = "Y" ]; then
        info "正在生成 2048 位 RSA DKIM 密钥对..."
        if ! openssl genrsa -out "$DKIM_KEY_PATH" 2048 2>&1 | grep -v "^[.+]*$"; then
            error "DKIM 密钥生成失败，请检查 openssl 是否正确安装"
            exit 1
        fi
        chmod 600 "$DKIM_KEY_PATH"
        success "DKIM 私钥已生成: $DKIM_KEY_PATH"
    fi

    # 提取公钥
    DKIM_PUBLIC_KEY=$(openssl rsa -in "$DKIM_KEY_PATH" -pubout 2>/dev/null | grep -v '^-' | tr -d '\n')
    success "DKIM 公钥已提取"
else
    info "跳过 DKIM 配置"
fi

# ==================== 5. 更新 .env 文件 ====================
echo ""
echo -e "${BLUE}[4/7]${NC} 更新 .env 配置文件..."

# 读取现有 .env 或从模板创建
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$SCRIPT_DIR/.env.example" ]; then
        cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
        info "从 .env.example 创建 .env"
    else
        touch "$ENV_FILE"
        info "创建新的 .env 文件"
    fi
fi

# 备份
cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d%H%M%S)"
info "已备份现有 .env"

# 更新或添加配置项的函数
update_env() {
    local key="$1"
    local value="$2"
    if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
        # 使用 sed 更新（处理包含特殊字符的值）
        local escaped_value
        escaped_value=$(printf '%s\n' "$value" | sed 's/[&/\]/\\&/g')
        sed -i "s|^${key}=.*|${key}=${escaped_value}|" "$ENV_FILE"
    else
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
}

update_env "EMAIL_HOST" "$SMTP_HOST"
update_env "EMAIL_PORT" "$SMTP_PORT"
update_env "EMAIL_SECURE" "$SMTP_SECURE"
update_env "EMAIL_USER" "$EMAIL_USER"
update_env "EMAIL_PASS" "$EMAIL_PASS"
update_env "EMAIL_FROM" "$EMAIL_FROM"
update_env "ADMIN_EMAIL" "$ADMIN_EMAIL"

if [ -n "$DKIM_DOMAIN_VAL" ]; then
    update_env "DKIM_DOMAIN" "$DKIM_DOMAIN_VAL"
    update_env "DKIM_SELECTOR" "$DKIM_SELECTOR_VAL"
    update_env "DKIM_PRIVATE_KEY_PATH" "$DKIM_KEY_PATH"
fi

# 确保 TOKEN_SECRET 已设置
if ! grep -q "^TOKEN_SECRET=" "$ENV_FILE" 2>/dev/null || grep -q "^TOKEN_SECRET=please-change" "$ENV_FILE" 2>/dev/null; then
    TOKEN_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null)
    if [ -z "$TOKEN_SECRET" ] || [ "$TOKEN_SECRET" = "please-change-this-to-a-random-string" ]; then
        error "TOKEN_SECRET 生成失败，请确保 Node.js 已正确安装"
        exit 1
    fi
    update_env "TOKEN_SECRET" "$TOKEN_SECRET"
    info "TOKEN_SECRET 已自动生成"
fi

success ".env 文件已更新"

# ==================== 6. 输出 DNS 记录 ====================
echo ""
echo -e "${BLUE}[5/7]${NC} 需要添加的 DNS 记录"
echo ""
echo -e "${CYAN}=========================================="
echo "  请在域名 DNS 管理面板添加以下记录"
echo "  （如 Cloudflare、阿里云 DNS、腾讯云 DNS）"
echo -e "==========================================${NC}"
echo ""

# 获取服务器公网 IP
SERVER_IP=$(curl -s --connect-timeout 5 https://api.ipify.org 2>/dev/null || curl -s --connect-timeout 5 https://ifconfig.me 2>/dev/null || echo "你的服务器IP")

# SPF 记录
echo -e "${YELLOW}  1. SPF 记录（验证发件服务器身份）${NC}"
echo "  ┌──────────────────────────────────────────────────┐"
echo "  │ 类型:  TXT                                       │"
echo "  │ 名称:  @                                         │"
if [ -n "$SPF_INCLUDE" ]; then
    SPF_VALUE="v=spf1 mx a ip4:${SERVER_IP} ${SPF_INCLUDE} ~all"
else
    SPF_VALUE="v=spf1 mx a ip4:${SERVER_IP} ~all"
fi
echo "  │ 内容:  $SPF_VALUE"
echo "  └──────────────────────────────────────────────────┘"
echo ""

# DKIM 记录
if [ -n "$DKIM_PUBLIC_KEY" ]; then
    echo -e "${YELLOW}  2. DKIM 记录（邮件签名验证）${NC}"
    echo "  ┌──────────────────────────────────────────────────┐"
    echo "  │ 类型:  TXT                                       │"
    echo "  │ 名称:  ${DKIM_SELECTOR_VAL}._domainkey            │"
    echo "  │ 内容:  v=DKIM1; k=rsa; p=${DKIM_PUBLIC_KEY}"
    echo "  └──────────────────────────────────────────────────┘"
    echo ""
    echo -e "  ${CYAN}提示: 如果 DNS 记录长度受限，可以将公钥分成多段:${NC}"
    echo "  v=DKIM1; k=rsa; p=\"第一段\"\"第二段\""
    echo ""
else
    echo -e "${YELLOW}  2. DKIM 记录（已跳过）${NC}"
    echo ""
fi

# DMARC 记录
echo -e "${YELLOW}  3. DMARC 记录（邮件认证策略）${NC}"
echo "  ┌──────────────────────────────────────────────────┐"
echo "  │ 类型:  TXT                                       │"
echo "  │ 名称:  _dmarc                                    │"
echo "  │ 内容:  v=DMARC1; p=quarantine; rua=mailto:${ADMIN_EMAIL}; pct=100"
echo "  └──────────────────────────────────────────────────┘"
echo ""

# 保存 DNS 记录到文件
DNS_RECORD_FILE="$SCRIPT_DIR/dns-records.txt"
cat > "$DNS_RECORD_FILE" << DNSEOF
# ==========================================
# shenwenAI 邮件 DNS 记录配置
# 域名: $EMAIL_DOMAIN
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
# ==========================================

# 1. SPF 记录
类型: TXT
名称: @
内容: $SPF_VALUE

# 2. DKIM 记录
$(if [ -n "$DKIM_PUBLIC_KEY" ]; then
echo "类型: TXT"
echo "名称: ${DKIM_SELECTOR_VAL}._domainkey"
echo "内容: v=DKIM1; k=rsa; p=${DKIM_PUBLIC_KEY}"
else
echo "(未配置 DKIM)"
fi)

# 3. DMARC 记录
类型: TXT
名称: _dmarc
内容: v=DMARC1; p=quarantine; rua=mailto:${ADMIN_EMAIL}; pct=100
DNSEOF

info "DNS 记录已保存到: $DNS_RECORD_FILE"

# ==================== 7. 测试 SMTP 连接 ====================
echo ""
echo -e "${BLUE}[6/7]${NC} 测试 SMTP 连接..."

# 创建临时测试脚本
TEST_SCRIPT=$(mktemp /tmp/test-email-XXXXXX.js)
cat > "$TEST_SCRIPT" << 'TESTEOF'
var nodemailer = require('nodemailer');
var fs = require('fs');
var path = require('path');

// 读取 .env
var envPath = path.join(process.argv[2] || '.', '.env');
if (fs.existsSync(envPath)) {
    var lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;
        var eqIdx = line.indexOf('=');
        if (eqIdx === -1) continue;
        var key = line.slice(0, eqIdx).trim();
        var val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
    }
}

var EMAIL_HOST = process.env.EMAIL_HOST || '';
var EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '465', 10);
var EMAIL_SECURE = process.env.EMAIL_SECURE !== 'false';
var EMAIL_USER = process.env.EMAIL_USER || '';
var EMAIL_PASS = process.env.EMAIL_PASS || '';
var EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;
var DKIM_DOMAIN = process.env.DKIM_DOMAIN || '';
var DKIM_SELECTOR = process.env.DKIM_SELECTOR || 'default';
var DKIM_PRIVATE_KEY_PATH = process.env.DKIM_PRIVATE_KEY_PATH || '';

if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    console.error('FAIL: 邮件配置不完整');
    process.exit(1);
}

var transportOptions = {
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_SECURE,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    connectionTimeout: 15000,
    socketTimeout: 15000
};

if (DKIM_DOMAIN && DKIM_PRIVATE_KEY_PATH && fs.existsSync(DKIM_PRIVATE_KEY_PATH)) {
    transportOptions.dkim = {
        domainName: DKIM_DOMAIN,
        keySelector: DKIM_SELECTOR,
        privateKey: fs.readFileSync(DKIM_PRIVATE_KEY_PATH, 'utf8')
    };
}

var transport = nodemailer.createTransport(transportOptions);

var mode = process.argv[3] || 'verify';

if (mode === 'verify') {
    transport.verify().then(function() {
        console.log('OK: SMTP 连接成功 (' + EMAIL_HOST + ':' + EMAIL_PORT + ')');
        process.exit(0);
    }).catch(function(err) {
        console.error('FAIL: SMTP 连接失败: ' + err.message);
        process.exit(1);
    });
} else if (mode === 'send') {
    var testTo = process.argv[4] || process.env.ADMIN_EMAIL || EMAIL_USER;
    var hasDkim = !!(DKIM_DOMAIN && DKIM_PRIVATE_KEY_PATH);
    transport.sendMail({
        from: EMAIL_FROM,
        to: testTo,
        subject: 'shenwenAI 邮件配置测试成功 ✅',
        html: [
            '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">',
            '  <h2 style="color:#2563eb;margin-bottom:8px;">shenwenAI ✅</h2>',
            '  <p style="color:#374151;">恭喜！自定义域名邮箱配置成功！<br>Congratulations! Custom domain email is configured!</p>',
            '  <table style="width:100%;border-collapse:collapse;margin:16px 0;">',
            '    <tr><td style="padding:4px 8px;color:#6b7280;">SMTP:</td><td style="padding:4px 8px;color:#111827;">' + EMAIL_HOST + ':' + EMAIL_PORT + '</td></tr>',
            '    <tr><td style="padding:4px 8px;color:#6b7280;">发件人:</td><td style="padding:4px 8px;color:#111827;">' + EMAIL_FROM + '</td></tr>',
            '    <tr><td style="padding:4px 8px;color:#6b7280;">DKIM:</td><td style="padding:4px 8px;color:#111827;">' + (hasDkim ? '✅ 已启用' : '❌ 未配置') + '</td></tr>',
            '  </table>',
            '  <p style="color:#6b7280;font-size:13px;">发送时间: ' + new Date().toISOString() + '</p>',
            '</div>'
        ].join('\n')
    }).then(function(info) {
        console.log('OK: 测试邮件已发送至 ' + testTo + ' (ID: ' + info.messageId + ')');
        process.exit(0);
    }).catch(function(err) {
        console.error('FAIL: 发送失败: ' + err.message);
        process.exit(1);
    });
}
TESTEOF

# 运行 SMTP 连接测试
VERIFY_OUTPUT=$(node "$TEST_SCRIPT" "$SCRIPT_DIR" "verify" 2>&1) || true
if echo "$VERIFY_OUTPUT" | grep -q "^OK:"; then
    success "$VERIFY_OUTPUT"
    SMTP_OK=true
else
    warn "$VERIFY_OUTPUT"
    warn "SMTP 连接测试失败，请检查配置后手动测试"
    SMTP_OK=false
fi

# ==================== 8. 发送测试邮件 ====================
echo ""
echo -e "${BLUE}[7/7]${NC} 发送测试邮件..."

if [ "$SMTP_OK" = true ]; then
    read -rp "  是否发送测试邮件？(y/n) [y]: " SEND_TEST
    SEND_TEST="${SEND_TEST:-y}"

    if [ "$SEND_TEST" = "y" ] || [ "$SEND_TEST" = "Y" ]; then
        read -rp "  测试收件人邮箱 [$ADMIN_EMAIL]: " TEST_TO
        TEST_TO="${TEST_TO:-$ADMIN_EMAIL}"

        SEND_OUTPUT=$(node "$TEST_SCRIPT" "$SCRIPT_DIR" "send" "$TEST_TO" 2>&1) || true
        if echo "$SEND_OUTPUT" | grep -q "^OK:"; then
            success "$SEND_OUTPUT"
        else
            warn "$SEND_OUTPUT"
        fi
    else
        info "跳过测试邮件"
    fi
else
    warn "SMTP 未连接，跳过测试邮件发送"
fi

# 清理临时文件
rm -f "$TEST_SCRIPT"

# ==================== 重启服务 ====================
echo ""
if command -v pm2 &> /dev/null; then
    if pm2 list 2>/dev/null | grep -q "shenwenai-auth"; then
        info "正在重启 shenwenai-auth 服务..."
        pm2 restart shenwenai-auth 2>/dev/null && success "服务已重启" || warn "服务重启失败，请手动执行: pm2 restart shenwenai-auth"
    fi
fi

# ==================== 完成 ====================
echo ""
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}  ✅ 邮件配置完成！${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""
echo "  配置摘要:"
echo "    SMTP 服务器:  $SMTP_HOST:$SMTP_PORT"
echo "    发件人:       $EMAIL_FROM"
echo "    管理员邮箱:   $ADMIN_EMAIL"
if [ -n "$DKIM_DOMAIN_VAL" ]; then
    echo "    DKIM:         ${DKIM_SELECTOR_VAL}._domainkey.${DKIM_DOMAIN_VAL}"
    echo "    DKIM 私钥:    $DKIM_KEY_PATH"
fi
echo ""
echo -e "  ${YELLOW}⚠️  重要：请务必添加上面列出的 DNS 记录！${NC}"
echo "  DNS 记录已保存到: $DNS_RECORD_FILE"
echo ""
echo "  后续步骤:"
echo "    1. 在域名 DNS 管理面板添加 SPF、DKIM、DMARC 记录"
echo "    2. 等待 DNS 生效（通常 5-30 分钟）"
echo "    3. 验证 DNS 记录:"
echo "       dig TXT $EMAIL_DOMAIN +short"
if [ -n "$DKIM_DOMAIN_VAL" ]; then
    echo "       dig TXT ${DKIM_SELECTOR_VAL}._domainkey.${DKIM_DOMAIN_VAL} +short"
fi
echo "       dig TXT _dmarc.${EMAIL_DOMAIN} +short"
echo ""
echo "    4. 重启服务: pm2 restart shenwenai-auth"
echo "    5. 使用 send-email.js 发送测试邮件:"
echo "       node send-email.js --to your@email.com --subject \"测试\" --message \"测试邮件\""
echo ""
