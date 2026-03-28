#!/bin/bash
# ============================================================
# shenwenAI 认证后端 - 升级脚本
# 在保留原有数据和配置的同时，将后端升级到最新版本
# 使用方法: bash upgrade.sh
# ============================================================

set -e

echo "=========================================="
echo "  shenwenAI 认证后端 - 升级脚本"
echo "=========================================="
echo ""

# 检查是否是 root
if [ "$EUID" -ne 0 ]; then
    echo "请使用 root 用户运行此脚本"
    echo "用法: sudo bash upgrade.sh"
    exit 1
fi

PROJECT_DIR="/opt/shenwenai-auth"

if [ ! -d "$PROJECT_DIR" ]; then
    echo "错误: 项目目录 $PROJECT_DIR 不存在，请先运行 deploy.sh 进行初始部署"
    exit 1
fi

# ==================== 1. 备份数据库和配置 ====================
echo "[1/5] 备份数据库和配置..."
BACKUP_DIR="$PROJECT_DIR/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 备份数据库（如果存在）
if [ -d "$PROJECT_DIR/data" ]; then
    cp -r "$PROJECT_DIR/data" "$BACKUP_DIR/"
    echo "  数据库已备份到 $BACKUP_DIR/data"
else
    echo "  未找到数据库目录，跳过数据库备份"
fi

# 备份 .env 配置
if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" "$BACKUP_DIR/.env"
    echo "  配置文件已备份到 $BACKUP_DIR/.env"
else
    echo "  未找到 .env 文件，跳过配置备份"
fi

echo "  备份完成，备份目录: $BACKUP_DIR"

# ==================== 2. 复制新版本文件 ====================
echo "[2/5] 更新服务器文件..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$SCRIPT_DIR/server.js" ]; then
    cp "$SCRIPT_DIR/server.js" "$PROJECT_DIR/"
    cp "$SCRIPT_DIR/package.json" "$PROJECT_DIR/"
    # 仅当 .env.example 存在时更新（不覆盖 .env）
    if [ -f "$SCRIPT_DIR/.env.example" ]; then
        cp "$SCRIPT_DIR/.env.example" "$PROJECT_DIR/"
    fi
    echo "  文件已更新"
else
    echo "  错误: 未找到 server.js，请确保在正确目录下运行"
    exit 1
fi

# ==================== 3. 安装/更新 npm 依赖 ====================
echo "[3/5] 更新 npm 依赖..."
cd "$PROJECT_DIR"
npm install --production
echo "  依赖更新完成"

# ==================== 4. 重启服务 ====================
echo "[4/5] 重启服务..."
if command -v pm2 &> /dev/null; then
    # 重新加载环境变量并重启
    set -a
    source "$PROJECT_DIR/.env" 2>/dev/null || true
    set +a

    pm2 restart shenwenai-auth 2>/dev/null || {
        echo "  PM2 重启失败，尝试重新启动..."
        pm2 delete shenwenai-auth 2>/dev/null || true
        pm2 start "$PROJECT_DIR/server.js" --name shenwenai-auth
    }
    pm2 save
    echo "  服务已重启"
else
    echo "  警告: PM2 未安装，请手动重启服务"
fi

# ==================== 5. 验证升级 ====================
echo "[5/5] 验证升级..."
# 从 .env 读取端口，默认 3000
HEALTH_PORT=3000
if [ -f "$PROJECT_DIR/.env" ]; then
    ENV_PORT=$(grep -E '^PORT=' "$PROJECT_DIR/.env" 2>/dev/null | head -1 | cut -d= -f2 | tr -d '[:space:]')
    [ -n "$ENV_PORT" ] && HEALTH_PORT="$ENV_PORT"
fi
sleep 2
if curl -sf "http://localhost:${HEALTH_PORT}/api/health" > /dev/null 2>&1; then
    echo "  服务正常运行"
else
    echo "  警告: 服务健康检查失败，请手动检查日志"
    echo "    pm2 logs shenwenai-auth"
fi

# ==================== 完成 ====================
echo ""
echo "=========================================="
echo "  升级完成！"
echo "=========================================="
echo ""
echo "  服务地址: http://localhost:${HEALTH_PORT:-3000}"
echo "  项目目录: $PROJECT_DIR"
echo "  备份目录: $BACKUP_DIR"
echo ""
echo "  原有数据库: $PROJECT_DIR/data/users.db（已保留）"
echo "  原有配置: $PROJECT_DIR/.env（已保留）"
echo ""
echo "  PM2 命令:"
echo "    pm2 status              # 查看状态"
echo "    pm2 logs shenwenai-auth # 查看日志"
echo "    pm2 restart shenwenai-auth  # 重启"
echo ""
echo "  如需回滚，可从备份目录恢复:"
echo "    cp $BACKUP_DIR/data/users.db $PROJECT_DIR/data/"
echo ""
