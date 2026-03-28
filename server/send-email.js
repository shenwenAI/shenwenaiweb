#!/usr/bin/env node
/**
 * send-email.js - 命令行邮件发送脚本
 *
 * 用法（需在 server/ 目录下运行，或先 cd 到该目录）:
 *   node send-email.js --to recipient@example.com --subject "主题" --message "邮件正文"
 *
 * 也可以将正文内容通过管道传入:
 *   echo "邮件正文" | node send-email.js --to recipient@example.com --subject "主题"
 *
 * 所有邮件配置从 .env 文件读取（EMAIL_HOST / EMAIL_PORT / EMAIL_SECURE /
 * EMAIL_USER / EMAIL_PASS / EMAIL_FROM），如果 .env 不存在则从环境变量读取。
 *
 * 选项:
 *   --to       收件人地址（必填，可用逗号分隔多个地址）
 *   --subject  邮件主题（必填）
 *   --message  邮件正文（如省略则从 stdin 读取）
 *   --html     将正文作为 HTML 发送（默认按纯文本发送）
 *   --help     显示帮助信息
 */

'use strict';

var path = require('path');
var fs = require('fs');
var nodemailer = require('nodemailer');

// ==================== 读取 .env 文件 ====================
var envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    var lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;
        var eqIdx = line.indexOf('=');
        if (eqIdx === -1) continue;
        var key = line.slice(0, eqIdx).trim();
        var val = line.slice(eqIdx + 1).trim();
        // 去除两端引号
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (!process.env[key]) {
            process.env[key] = val;
        }
    }
}

// ==================== 邮件配置 ====================
var EMAIL_HOST   = process.env.EMAIL_HOST   || '';
var EMAIL_PORT   = parseInt(process.env.EMAIL_PORT || '465', 10);
var EMAIL_SECURE = process.env.EMAIL_SECURE !== 'false';
var EMAIL_USER   = process.env.EMAIL_USER   || '';
var EMAIL_PASS   = process.env.EMAIL_PASS   || '';
var EMAIL_FROM   = process.env.EMAIL_FROM   || EMAIL_USER;
var ADMIN_EMAIL  = process.env.ADMIN_EMAIL  || EMAIL_USER;

// ==================== 解析命令行参数 ====================
function parseArgs(argv) {
    var args = { to: '', subject: '', message: '', html: false, help: false };
    for (var i = 2; i < argv.length; i++) {
        switch (argv[i]) {
            case '--to':      args.to      = (i + 1 < argv.length) ? argv[++i] : ''; break;
            case '--subject': args.subject = (i + 1 < argv.length) ? argv[++i] : ''; break;
            case '--message': args.message = (i + 1 < argv.length) ? argv[++i] : ''; break;
            case '--html':    args.html    = true;            break;
            case '--help':    args.help    = true;            break;
            default:
                // 支持 --key=value 格式
                var m = argv[i].match(/^--(\w[\w-]*)=(.*)$/);
                if (m) {
                    var k = m[1], v = m[2];
                    if (k === 'to')      args.to      = v;
                    else if (k === 'subject') args.subject = v;
                    else if (k === 'message') args.message = v;
                    else if (k === 'html')    args.html    = true;
                }
        }
    }
    return args;
}

function showHelp() {
    console.log([
        '',
        '用法: node send-email.js [选项]',
        '',
        '选项:',
        '  --to <地址>      收件人地址（必填，多个地址用逗号分隔）',
        '  --subject <主题> 邮件主题（必填）',
        '  --message <正文> 邮件正文（如省略则从 stdin 读取）',
        '  --html           将正文作为 HTML 发送（默认纯文本）',
        '  --help           显示此帮助信息',
        '',
        '示例:',
        '  # 发送纯文本邮件给管理员（ADMIN_EMAIL）',
        '  node send-email.js --subject "测试" --message "Hello"',
        '',
        '  # 发送给指定收件人',
        '  node send-email.js --to user@example.com --subject "通知" --message "内容"',
        '',
        '  # 从 stdin 读取正文',
        '  echo "服务器报警" | node send-email.js --subject "报警"',
        '',
        '  # 发送 HTML 邮件',
        '  node send-email.js --to me@example.com --subject "报告" --message "<b>粗体</b>" --html',
        ''
    ].join('\n'));
}

/**
 * 从 stdin 读取所有数据，返回 Promise<string>
 */
function readStdin() {
    return new Promise(function(resolve, reject) {
        var chunks = [];
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', function(chunk) { chunks.push(chunk); });
        process.stdin.on('end', function() { resolve(chunks.join('')); });
        process.stdin.on('error', reject);
    });
}

async function main() {
    var args = parseArgs(process.argv);

    if (args.help) {
        showHelp();
        process.exit(0);
    }

    // 校验邮件服务配置
    if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
        console.error('错误：邮件服务未配置。请在 server/.env 中设置 EMAIL_HOST / EMAIL_USER / EMAIL_PASS。');
        process.exit(1);
    }

    // 收件人：优先使用 --to 参数，否则发给管理员
    var toAddresses = (args.to || ADMIN_EMAIL).split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    if (toAddresses.length === 0) {
        console.error('错误：请通过 --to 参数指定收件人，或在 .env 中设置 ADMIN_EMAIL。');
        process.exit(1);
    }

    // 主题校验
    if (!args.subject) {
        console.error('错误：请通过 --subject 参数指定邮件主题。');
        process.exit(1);
    }

    // 正文：优先用 --message，否则从 stdin 读取
    var body = args.message;
    if (!body) {
        // 仅在 stdin 不是 TTY（即有管道输入）时读取
        if (!process.stdin.isTTY) {
            body = (await readStdin()).trim();
        }
    }
    if (!body) {
        console.error('错误：邮件正文为空，请通过 --message 参数或管道提供正文内容。');
        process.exit(1);
    }

    // 创建邮件传输器
    var transport = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_SECURE,
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    });

    // 验证连接
    try {
        await transport.verify();
    } catch (err) {
        console.error('错误：无法连接到邮件服务器：', err.message);
        process.exit(1);
    }

    // 构建邮件内容
    var mailOptions = {
        from: EMAIL_FROM,
        to: toAddresses.join(', '),
        subject: args.subject
    };
    if (args.html) {
        mailOptions.html = body;
    } else {
        mailOptions.text = body;
    }

    // 发送
    try {
        var info = await transport.sendMail(mailOptions);
        console.log('邮件发送成功！');
        console.log('  收件人:', mailOptions.to);
        console.log('  主题:  ', mailOptions.subject);
        console.log('  消息ID:', info.messageId);
    } catch (err) {
        console.error('错误：邮件发送失败：', err.message);
        process.exit(1);
    }
}

main().catch(function(err) {
    console.error('未预期的错误:', err);
    process.exit(1);
});
