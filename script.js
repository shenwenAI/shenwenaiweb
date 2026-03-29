/**
 * shenwenAI 官网 JavaScript
 * 包含主题切换、移动端菜单、代码演示等功能
 */

(function() {
    'use strict';

    // ==================== DOM 加载完成后初始化 ====================
    document.addEventListener('DOMContentLoaded', function() {
        initTheme();
        initMobileMenu();
        initDemoTabs();
        initCopyButton();
        initSmoothScroll();
        initHeaderScroll();
        initFaqAccordion();
        initGetApiHandler();
        initAuthForms();
        initDashboard();
        initContactForm();
    });

    // ==================== 主题切换功能 ====================
    function initTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const html = document.documentElement;

        // 从本地存储获取主题偏好
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        // 设置初始主题
        if (savedTheme) {
            html.className = savedTheme;
        } else if (systemPrefersDark) {
            html.className = 'dark';
        }

        // 点击切换主题
        if (themeToggle) {
            themeToggle.addEventListener('click', function() {
                const currentTheme = html.className;
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

                html.className = newTheme;
                localStorage.setItem('theme', newTheme);

                // 添加过渡动画
                document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
                setTimeout(function() {
                    document.body.style.transition = '';
                }, 300);
            });
        }

        // 监听系统主题变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            if (!localStorage.getItem('theme')) {
                html.className = e.matches ? 'dark' : 'light';
            }
        });
    }

    // ==================== 移动端菜单 ====================
    function initMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const navLinks = document.getElementById('navLinks');

        if (mobileMenuToggle && navLinks) {
            mobileMenuToggle.addEventListener('click', function() {
                this.classList.toggle('active');
                navLinks.classList.toggle('active');
            });

            // 点击导航链接后关闭菜单
            navLinks.querySelectorAll('a').forEach(function(link) {
                link.addEventListener('click', function() {
                    mobileMenuToggle.classList.remove('active');
                    navLinks.classList.remove('active');
                });
            });

            // 点击外部关闭菜单
            document.addEventListener('click', function(e) {
                if (!navLinks.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                    mobileMenuToggle.classList.remove('active');
                    navLinks.classList.remove('active');
                }
            });
        }
    }

    // ==================== 代码演示标签页 ====================
    function initDemoTabs() {
        const demoTabs = document.querySelectorAll('.demo-tab');
        const demoCode = document.getElementById('demoCode');

        // 代码示例数据
        const codeExamples = {
            python: `import OpenAI from '@openai/openai';

const client = new OpenAI({
  apiKey: 'sk-...',
  baseURL: 'https://api.shenwenai.com/v1'
});

const completion = await client.chat.completions.create({
  model: 'shenwen-chat',
  messages: [
    { role: 'user', content: '你好，请介绍一下你自己' }
  ]
});

console.log(completion.choices[0].message);`,
            curl: `curl https://api.shenwenai.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-..." \\
  -d '{
    "model": "shenwen-chat",
    "messages": [
      {
        "role": "user",
        "content": "你好，请介绍一下你自己"
      }
    ]
  }'`,
            js: `const response = await fetch('https://api.shenwenai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-...'
  },
  body: JSON.stringify({
    model: 'shenwen-chat',
    messages: [
      {
        role: 'user',
        content: '你好，请介绍一下你自己'
      }
    ]
  })
});

const data = await response.json();
console.log(data.choices[0].message);`
        };

        if (demoTabs.length > 0 && demoCode) {
            demoTabs.forEach(function(tab) {
                tab.addEventListener('click', function() {
                    const lang = this.dataset.lang;

                    // 更新激活状态
                    demoTabs.forEach(function(t) {
                        t.classList.remove('active');
                    });
                    this.classList.add('active');

                    // 更新代码内容
                    if (codeExamples[lang]) {
                        demoCode.textContent = codeExamples[lang];
                    }
                });
            });
        }
    }

    // ==================== 复制代码功能 ====================
    function initCopyButton() {
        const copyBtn = document.querySelector('.copy-btn');
        const demoCode = document.getElementById('demoCode');

        if (copyBtn && demoCode) {
            copyBtn.addEventListener('click', function() {
                const code = demoCode.textContent;

                navigator.clipboard.writeText(code).then(function() {
                    // 复制成功反馈
                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    `;
                    copyBtn.style.color = 'var(--accent-success)';

                    setTimeout(function() {
                        copyBtn.innerHTML = originalHTML;
                        copyBtn.style.color = '';
                    }, 2000);
                }).catch(function(err) {
                    console.error('复制失败:', err);
                    // 降级方案
                    const textarea = document.createElement('textarea');
                    textarea.value = code;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                });
            });
        }
    }

    // ==================== 平滑滚动 ====================
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href !== '#') {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        const headerOffset = 80;
                        const elementPosition = target.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });
    }

    // ==================== 头部滚动效果 ====================
    function initHeaderScroll() {
        const header = document.getElementById('header');
        let lastScrollY = 0;
        let ticking = false;

        function updateHeader() {
            const scrollY = window.scrollY;

            // 添加阴影效果
            if (scrollY > 10) {
                header.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
            } else {
                header.style.boxShadow = 'none';
            }

            ticking = false;
        }

        window.addEventListener('scroll', function() {
            lastScrollY = window.scrollY;
            if (!ticking) {
                requestAnimationFrame(updateHeader);
                ticking = true;
            }
        });
    }

    // ==================== 工具函数 ====================
    /**
     * 节流函数
     */
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(function() {
                    inThrottle = false;
                }, limit);
            }
        };
    }

    /**
     * 防抖函数
     */
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }

    // ==================== 视差效果（可选） ====================
    function initParallax() {
        const hero = document.querySelector('.hero');

        if (hero) {
            window.addEventListener('scroll', throttle(function() {
                const scrolled = window.scrollY;
                hero.style.backgroundPositionY = scrolled * 0.5 + 'px';
            }, 10));
        }
    }

    // ==================== 数字动画效果 ====================
    function animateNumbers() {
        const numbers = document.querySelectorAll('.score');

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.5
            });

            numbers.forEach(function(num) {
                observer.observe(num);
            });
        }
    }

    // ==================== 卡片悬停效果增强 ====================
    function initCardEffects() {
        const cards = document.querySelectorAll('.feature-card, .model-card, .pricing-card');

        cards.forEach(function(card) {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-4px)';
            });

            card.addEventListener('mouseleave', function() {
                this.style.transform = '';
            });
        });
    }

    // ==================== FAQ 手风琴功能 ====================
    function initFaqAccordion() {
        const faqItems = document.querySelectorAll('.faq-item');

        faqItems.forEach(function(item) {
            const question = item.querySelector('.faq-question');

            if (question) {
                question.addEventListener('click', function() {
                    const isActive = item.classList.contains('active');

                    // 关闭所有其他展开的FAQ
                    faqItems.forEach(function(otherItem) {
                        otherItem.classList.remove('active');
                    });

                    // 切换当前FAQ状态
                    if (!isActive) {
                        item.classList.add('active');
                    }
                });
            }
        });
    }

    // ==================== 页面加载完成后执行 ====================
    window.addEventListener('load', function() {
        // 隐藏加载动画（如果有）
        document.body.classList.add('loaded');

        // 初始化额外效果
        initParallax();
        initCardEffects();

        // 添加页面过渡效果
        document.body.style.opacity = '1';
        document.body.style.transition = 'opacity 0.3s ease';
    });

    // ==================== 错误处理 ====================
    window.addEventListener('error', function(e) {
        console.error('页面错误:', e.message);
    });

    // ==================== 导出全局函数（如果需要） ====================
    window.shenwenAI = {
        toggleTheme: function() {
            const html = document.documentElement;
            const currentTheme = html.className;
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.className = newTheme;
            localStorage.setItem('theme', newTheme);
        },

        setTheme: function(theme) {
            const html = document.documentElement;
            if (theme === 'dark' || theme === 'light') {
                html.className = theme;
                localStorage.setItem('theme', theme);
            }
        }
    };

    // ==================== 打字机效果 ====================
    function initTypewriter() {
        const typewriterElement = document.getElementById('typewriter-text');
        if (!typewriterElement) return;

        const phrases = ['人工智能助手', '代码生成工具', '多模态AI', '智能对话系统', '代码助手'];
        let phraseIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typeSpeed = 100;
        const deleteSpeed = 50;
        const pauseTime = 2000;

        function type() {
            const currentPhrase = phrases[phraseIndex];

            if (isDeleting) {
                typewriterElement.textContent = currentPhrase.substring(0, charIndex - 1);
                charIndex--;
                if (charIndex === 0) {
                    isDeleting = false;
                    phraseIndex = (phraseIndex + 1) % phrases.length;
                    typeSpeed = 100;
                }
            } else {
                typewriterElement.textContent = currentPhrase.substring(0, charIndex + 1);
                charIndex++;
                if (charIndex === currentPhrase.length) {
                    isDeleting = true;
                    typeSpeed = pauseTime;
                }
            }

            setTimeout(type, isDeleting ? deleteSpeed : typeSpeed);
        }

        type();
    }

    // ==================== swllm.cpp 页面打字机效果 ====================
    function initSwllmTypewriter() {
        const swllmTypewriter = document.getElementById('swllm-typewriter');
        if (!swllmTypewriter) return;

        const isEnglish = document.documentElement.lang === 'en';
        const phrases = isEnglish
            ? ['High-Performance Inference', 'Local Deployment', 'Open Source & Free', 'Cross-Platform', 'Quantization Optimized']
            : ['高性能推理引擎', '本地部署方案', '开源免费', '跨平台支持', '量化优化'];
        let phraseIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typeSpeed = 100;
        const deleteSpeed = 50;
        const pauseTime = 2000;

        function type() {
            const currentPhrase = phrases[phraseIndex];

            if (isDeleting) {
                swllmTypewriter.textContent = currentPhrase.substring(0, charIndex - 1);
                charIndex--;
                if (charIndex === 0) {
                    isDeleting = false;
                    phraseIndex = (phraseIndex + 1) % phrases.length;
                    typeSpeed = 100;
                }
            } else {
                swllmTypewriter.textContent = currentPhrase.substring(0, charIndex + 1);
                charIndex++;
                if (charIndex === currentPhrase.length) {
                    isDeleting = true;
                    typeSpeed = pauseTime;
                }
            }

            setTimeout(type, isDeleting ? deleteSpeed : typeSpeed);
        }

        type();
    }

    // ==================== 开源协议打字机效果 ====================
    function initLicenseTypewriter() {
        const licenseElement = document.getElementById('license-typewriter');
        if (!licenseElement) return;

        const isEnglish = document.documentElement.lang === 'en';
        const licenseText = isEnglish
            ? 'MIT License\n\nCopyright (c) shenwenAI\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.'
            : 'MIT 许可证\n\nCopyright (c) shenwenAI\n\n特此免费授予获得本软件及相关文档文件（"软件"）副本的任何人不受限制地处理本软件的权利，包括但不限于使用、复制、修改、合并、发布、分发、再许可和/或销售本软件的副本的权利。';

        let charIndex = 0;
        const speed = 30;

        function type() {
            if (charIndex < licenseText.length) {
                licenseElement.textContent = licenseText.substring(0, charIndex + 1);
                charIndex++;
                setTimeout(type, speed);
            }
        }

        type();
    }

    // ==================== 赞助弹窗功能 ====================
    function initSponsorModal() {
        const modal = document.getElementById('sponsorModal');
        const dismissBtn = document.getElementById('sponsorDismiss');

        if (!modal || !dismissBtn) return;

        const dismissed = localStorage.getItem('sponsorDismissed');
        if (dismissed === 'true') return;

        setTimeout(function() {
            modal.classList.add('active');
        }, 1000);

        dismissBtn.addEventListener('click', function() {
            modal.classList.remove('active');
            localStorage.setItem('sponsorDismissed', 'true');
        });

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    // 在页面加载完成后初始化打字机效果
    window.addEventListener('load', function() {
        setTimeout(initTypewriter, 500);
        setTimeout(initSwllmTypewriter, 500);
        setTimeout(initLicenseTypewriter, 800);
        initSponsorModal();
    });

    // ==================== 后端 API 地址 ====================
    // 部署后端后，将此地址改为你的服务器地址，例如：
    // var AUTH_API_URL = 'https://shenwenapi.578388.xyz';
    var AUTH_API_URL = 'https://shenwenapi.578388.xyz';

    // ==================== API 响应处理 ====================
    function handleApiResponse(response) {
        return response.text().then(function(text) {
            try {
                return JSON.parse(text);
            } catch (e) {
                if (!response.ok) {
                    return { success: false, message: '服务器错误 (' + response.status + ')', message_en: 'Server error (' + response.status + ')' };
                }
                return { success: false, message: '服务器响应格式错误', message_en: 'Invalid server response' };
            }
        });
    }

    function getNetworkErrorMessage(err, isEnglish) {
        var msg = err && err.message ? err.message : '';
        if (msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1 || msg.indexOf('Network request failed') !== -1) {
            return isEnglish ? 'Unable to connect to server, please check your network and try again' : '无法连接到服务器，请检查网络后重试';
        }
        return isEnglish ? 'Network error, please try again' : '网络错误，请稍后重试';
    }

    // ==================== 获取API处理 ====================
    function initGetApiHandler() {
        window.handleGetApi = function() {
            var token = localStorage.getItem('shenwenai_token');
            if (token) {
                var isEnglish = document.documentElement.lang === 'en';
                window.location.href = isEnglish ? 'dashboard-en.html' : 'dashboard.html';
            } else {
                var isEnglish = document.documentElement.lang === 'en';
                window.location.href = isEnglish ? 'login-en.html' : 'login.html';
            }
        };
    }

    // ==================== 登录注册功能 ====================
    function initAuthForms() {
        var loginForm = document.getElementById('loginForm');
        var registerForm = document.getElementById('registerForm');
        var showRegisterLink = document.getElementById('showRegister');
        var showLoginLink = document.getElementById('showLogin');
        var loginSection = document.getElementById('loginSection');
        var registerSection = document.getElementById('registerSection');
        var forgotPwSection = document.getElementById('forgotPwSection');
        var showForgotPwLink = document.getElementById('showForgotPw');
        var backToLoginLink = document.getElementById('backToLogin');
        var sendCodeCountdownTimer = null;

        if (showRegisterLink && showLoginLink && loginSection && registerSection) {
            showRegisterLink.addEventListener('click', function(e) {
                e.preventDefault();
                loginSection.style.display = 'none';
                registerSection.style.display = 'block';
                if (forgotPwSection) forgotPwSection.style.display = 'none';
            });

            showLoginLink.addEventListener('click', function(e) {
                e.preventDefault();
                if (sendCodeCountdownTimer) {
                    clearInterval(sendCodeCountdownTimer);
                    sendCodeCountdownTimer = null;
                }
                registerSection.style.display = 'none';
                loginSection.style.display = 'block';
                if (forgotPwSection) forgotPwSection.style.display = 'none';
            });
        }

        if (showForgotPwLink && forgotPwSection) {
            showForgotPwLink.addEventListener('click', function(e) {
                e.preventDefault();
                if (loginSection) loginSection.style.display = 'none';
                if (registerSection) registerSection.style.display = 'none';
                forgotPwSection.style.display = 'block';
            });
        }
        if (backToLoginLink && loginSection) {
            backToLoginLink.addEventListener('click', function(e) {
                e.preventDefault();
                if (forgotPwSection) forgotPwSection.style.display = 'none';
                loginSection.style.display = 'block';
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var isEnglish = document.documentElement.lang === 'en';
                var email = document.getElementById('loginEmail').value.trim();
                var password = document.getElementById('loginPassword').value;

                if (!email || !password) {
                    showAuthMessage('loginMessage', isEnglish ? 'Please fill in all fields' : '请填写所有字段', 'error');
                    return;
                }

                // 显示加载状态
                var submitBtn = loginForm.querySelector('button[type="submit"]');
                var originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = isEnglish ? 'Logging in...' : '登录中...';

                fetch(AUTH_API_URL + '/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: password })
                })
                .then(handleApiResponse)
                .then(function(data) {
                    if (data.success) {
                        localStorage.setItem('shenwenai_token', data.token);
                        localStorage.setItem('shenwenai_user', JSON.stringify(data.user));
                        showAuthMessage('loginMessage', isEnglish ? (data.message_en || 'Login successful! Redirecting...') : (data.message || '登录成功！正在跳转...'), 'success');
                        setTimeout(function() {
                            window.location.href = isEnglish ? 'dashboard-en.html' : 'dashboard.html';
                        }, 1500);
                    } else {
                        showAuthMessage('loginMessage', isEnglish ? (data.message_en || 'Invalid email or password') : (data.message || '邮箱或密码错误'), 'error');
                    }
                })
                .catch(function(err) {
                    console.error('登录请求失败:', err);
                    showAuthMessage('loginMessage', getNetworkErrorMessage(err, isEnglish), 'error');
                })
                .finally(function() {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                });
            });
        }

        if (registerForm) {
            var sendCodeBtn = document.getElementById('sendCodeBtn');
            var registerSubmitBtn = document.getElementById('registerSubmitBtn');
            var verifyCodeGroup = document.getElementById('verifyCodeGroup');

            // Step 1: Send verification code
            if (sendCodeBtn) {
                sendCodeBtn.addEventListener('click', function() {
                    var isEnglish = document.documentElement.lang === 'en';
                    var name = document.getElementById('registerName').value.trim();
                    var email = document.getElementById('registerEmail').value.trim();
                    var password = document.getElementById('registerPassword').value;
                    var confirmPassword = document.getElementById('registerConfirmPassword').value;

                    if (!name || !email || !password || !confirmPassword) {
                        showAuthMessage('registerMessage', isEnglish ? 'Please fill in all fields' : '请填写所有字段', 'error');
                        return;
                    }
                    if (password !== confirmPassword) {
                        showAuthMessage('registerMessage', isEnglish ? 'Passwords do not match' : '两次密码输入不一致', 'error');
                        return;
                    }
                    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[^a-zA-Z0-9\s]/.test(password)) {
                        showAuthMessage('registerMessage', isEnglish ? 'Password must be at least 8 characters and contain letters and special characters' : '密码须至少8位，包含字母和特殊符号', 'error');
                        return;
                    }

                    var originalText = sendCodeBtn.textContent;
                    sendCodeBtn.disabled = true;
                    sendCodeBtn.textContent = isEnglish ? 'Sending...' : '发送中...';

                    fetch(AUTH_API_URL + '/api/auth/send-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: name, email: email, password: password })
                    })
                    .then(handleApiResponse)
                    .then(function(data) {
                        if (data.success) {
                            showAuthMessage('registerMessage', isEnglish ? (data.message_en || 'Verification code sent!') : (data.message || '验证码已发送！'), 'success');
                            // Show code input and register button, hide send-code button
                            if (verifyCodeGroup) verifyCodeGroup.style.display = 'block';
                            if (registerSubmitBtn) registerSubmitBtn.style.display = 'block';
                            sendCodeBtn.style.display = 'none';
                            // Start resend cooldown (60s)
                            var countdown = 60;
                            sendCodeBtn.textContent = isEnglish ? 'Resend (' + countdown + 's)' : '重新发送 (' + countdown + 's)';
                            if (sendCodeCountdownTimer) clearInterval(sendCodeCountdownTimer);
                            sendCodeCountdownTimer = setInterval(function() {
                                countdown--;
                                if (countdown <= 0) {
                                    clearInterval(sendCodeCountdownTimer);
                                    sendCodeCountdownTimer = null;
                                    sendCodeBtn.disabled = false;
                                    sendCodeBtn.textContent = isEnglish ? 'Resend Code' : '重新发送验证码';
                                    sendCodeBtn.style.display = 'block';
                                } else {
                                    sendCodeBtn.textContent = isEnglish ? 'Resend (' + countdown + 's)' : '重新发送 (' + countdown + 's)';
                                }
                            }, 1000);
                        } else {
                            sendCodeBtn.disabled = false;
                            sendCodeBtn.textContent = originalText;
                            showAuthMessage('registerMessage', isEnglish ? (data.message_en || 'Failed to send code') : (data.message || '发送失败'), 'error');
                        }
                    })
                    .catch(function(err) {
                        console.error('发送验证码请求失败:', err);
                        sendCodeBtn.disabled = false;
                        sendCodeBtn.textContent = originalText;
                        showAuthMessage('registerMessage', getNetworkErrorMessage(err, isEnglish), 'error');
                    });
                });
            }

            // Step 2: Submit registration with verification code
            registerForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var isEnglish = document.documentElement.lang === 'en';
                var name = document.getElementById('registerName').value.trim();
                var email = document.getElementById('registerEmail').value.trim();
                var password = document.getElementById('registerPassword').value;
                var confirmPassword = document.getElementById('registerConfirmPassword').value;
                var codeInput = document.getElementById('registerVerifyCode');
                var code = codeInput ? codeInput.value.trim() : '';

                if (!name || !email || !password || !confirmPassword) {
                    showAuthMessage('registerMessage', isEnglish ? 'Please fill in all fields' : '请填写所有字段', 'error');
                    return;
                }
                if (password !== confirmPassword) {
                    showAuthMessage('registerMessage', isEnglish ? 'Passwords do not match' : '两次密码输入不一致', 'error');
                    return;
                }
                if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[^a-zA-Z0-9\s]/.test(password)) {
                    showAuthMessage('registerMessage', isEnglish ? 'Password must be at least 8 characters and contain letters and special characters' : '密码须至少8位，包含字母和特殊符号', 'error');
                    return;
                }
                if (!code) {
                    showAuthMessage('registerMessage', isEnglish ? 'Please enter the verification code' : '请输入验证码', 'error');
                    return;
                }

                // 显示加载状态
                var submitBtn = registerSubmitBtn || registerForm.querySelector('button[type="submit"]');
                var originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = isEnglish ? 'Registering...' : '注册中...';

                fetch(AUTH_API_URL + '/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name, email: email, password: password, code: code })
                })
                .then(handleApiResponse)
                .then(function(data) {
                    if (data.success) {
                        localStorage.setItem('shenwenai_token', data.token);
                        localStorage.setItem('shenwenai_user', JSON.stringify(data.user));
                        var successMsg = isEnglish
                            ? (data.message_en || 'Registration successful!')
                            : (data.message || '注册成功！');
                        showAuthMessage('registerMessage', successMsg, 'success');
                        setTimeout(function() {
                            window.location.href = isEnglish ? 'dashboard-en.html' : 'dashboard.html';
                        }, 3000);
                    } else {
                        showAuthMessage('registerMessage', isEnglish ? (data.message_en || 'Registration failed') : (data.message || '注册失败'), 'error');
                    }
                })
                .catch(function(err) {
                    console.error('注册请求失败:', err);
                    showAuthMessage('registerMessage', getNetworkErrorMessage(err, isEnglish), 'error');
                })
                .finally(function() {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                });
            });
        }
    }

    function showAuthMessage(elementId, message, type) {
        var el = document.getElementById(elementId);
        if (el) {
            el.textContent = message;
            el.className = 'auth-message ' + type;
            el.style.display = 'block';
        }
    }

    // ==================== 控制台/仪表板功能 ====================
    function initDashboard() {
        var dashboardSection = document.getElementById('dashboardSection');
        if (!dashboardSection) return;

        var isEnglish = document.documentElement.lang === 'en';
        var token = localStorage.getItem('shenwenai_token');

        if (!token) {
            window.location.href = isEnglish ? 'login-en.html' : 'login.html';
            return;
        }

        // 从后端获取用户信息
        fetch(AUTH_API_URL + '/api/auth/user', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(handleApiResponse)
        .then(function(data) {
            if (!data.success) {
                localStorage.removeItem('shenwenai_token');
                localStorage.removeItem('shenwenai_user');
                window.location.href = isEnglish ? 'login-en.html' : 'login.html';
                return;
            }
            var user = data.user;
            localStorage.setItem('shenwenai_user', JSON.stringify(user));
            var nameEl = document.getElementById('dashUserName');
            var emailEl = document.getElementById('dashUserEmail');
            var initialEl = document.getElementById('dashUserInitial');
            if (nameEl) nameEl.textContent = user.name;
            if (emailEl) emailEl.textContent = user.email;
            if (initialEl) initialEl.textContent = user.name.charAt(0).toUpperCase();
        })
        .catch(function() {
            // 网络错误时使用本地缓存
            var cached = localStorage.getItem('shenwenai_user');
            if (cached) {
                try {
                    var user = JSON.parse(cached);
                    var nameEl = document.getElementById('dashUserName');
                    var emailEl = document.getElementById('dashUserEmail');
                    var initialEl = document.getElementById('dashUserInitial');
                    if (nameEl) nameEl.textContent = user.name;
                    if (emailEl) emailEl.textContent = user.email;
                    if (initialEl) initialEl.textContent = user.name.charAt(0).toUpperCase();
                } catch (e) { /* ignore */ }
            }
        });

        // 退出登录
        var logoutBtn = document.getElementById('dashLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                fetch(AUTH_API_URL + '/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token }
                }).catch(function() { /* ignore */ }).finally(function() {
                    localStorage.removeItem('shenwenai_token');
                    localStorage.removeItem('shenwenai_user');
                    window.location.href = isEnglish ? 'login-en.html' : 'login.html';
                });
            });
        }

        // 修改密码
        var sendChangePwCodeBtn = document.getElementById('sendChangePwCodeBtn');
        var changePwSubmitBtn = document.getElementById('changePwSubmitBtn');
        var changePwCodeGroup = document.getElementById('changePwCodeGroup');
        var changePwCountdownTimer = null;

        if (sendChangePwCodeBtn) {
            sendChangePwCodeBtn.addEventListener('click', function() {
                var originalText = sendChangePwCodeBtn.textContent;
                sendChangePwCodeBtn.disabled = true;
                sendChangePwCodeBtn.textContent = isEnglish ? 'Sending...' : '发送中...';

                fetch(AUTH_API_URL + '/api/auth/send-change-password-code', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
                })
                .then(handleApiResponse)
                .then(function(data) {
                    if (data.success) {
                        showAuthMessage('changePwMessage', isEnglish ? (data.message_en || 'Verification code sent!') : (data.message || '验证码已发送！'), 'success');
                        if (changePwCodeGroup) changePwCodeGroup.style.display = 'block';
                        if (changePwSubmitBtn) changePwSubmitBtn.style.display = 'block';
                        sendChangePwCodeBtn.style.display = 'none';
                        var countdown = 60;
                        if (changePwCountdownTimer) clearInterval(changePwCountdownTimer);
                        changePwCountdownTimer = setInterval(function() {
                            countdown--;
                            if (countdown <= 0) {
                                clearInterval(changePwCountdownTimer);
                                changePwCountdownTimer = null;
                                sendChangePwCodeBtn.disabled = false;
                                sendChangePwCodeBtn.textContent = isEnglish ? 'Resend Code' : '重新发送验证码';
                                sendChangePwCodeBtn.style.display = 'block';
                            } else {
                                sendChangePwCodeBtn.textContent = isEnglish ? 'Resend (' + countdown + 's)' : '重新发送 (' + countdown + 's)';
                            }
                        }, 1000);
                    } else {
                        sendChangePwCodeBtn.disabled = false;
                        sendChangePwCodeBtn.textContent = originalText;
                        showAuthMessage('changePwMessage', isEnglish ? (data.message_en || 'Failed to send code') : (data.message || '发送失败'), 'error');
                    }
                })
                .catch(function(err) {
                    sendChangePwCodeBtn.disabled = false;
                    sendChangePwCodeBtn.textContent = originalText;
                    showAuthMessage('changePwMessage', getNetworkErrorMessage(err, isEnglish), 'error');
                });
            });
        }

        var changePwForm = document.getElementById('changePwForm');
        if (changePwForm) {
            changePwForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var newPassword = document.getElementById('changePwNew').value;
                var confirmPassword = document.getElementById('changePwConfirm').value;
                var code = document.getElementById('changePwCode') ? document.getElementById('changePwCode').value.trim() : '';

                if (!newPassword || !confirmPassword || !code) {
                    showAuthMessage('changePwMessage', isEnglish ? 'Please fill in all fields' : '请填写所有字段', 'error');
                    return;
                }
                if (newPassword !== confirmPassword) {
                    showAuthMessage('changePwMessage', isEnglish ? 'Passwords do not match' : '两次密码输入不一致', 'error');
                    return;
                }
                if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[^a-zA-Z0-9\s]/.test(newPassword)) {
                    showAuthMessage('changePwMessage', isEnglish ? 'Password must be at least 8 characters and contain letters and special characters' : '密码须至少8位，包含字母和特殊符号', 'error');
                    return;
                }

                var originalText = changePwSubmitBtn ? changePwSubmitBtn.textContent : '';
                if (changePwSubmitBtn) { changePwSubmitBtn.disabled = true; changePwSubmitBtn.textContent = isEnglish ? 'Saving...' : '保存中...'; }

                fetch(AUTH_API_URL + '/api/auth/change-password', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newPassword: newPassword, code: code })
                })
                .then(handleApiResponse)
                .then(function(data) {
                    if (data.success) {
                        showAuthMessage('changePwMessage', isEnglish ? (data.message_en || 'Password changed successfully!') : (data.message || '密码修改成功！'), 'success');
                        changePwForm.reset();
                        if (changePwCodeGroup) changePwCodeGroup.style.display = 'none';
                        if (changePwSubmitBtn) changePwSubmitBtn.style.display = 'none';
                        if (sendChangePwCodeBtn) { sendChangePwCodeBtn.style.display = 'block'; sendChangePwCodeBtn.disabled = false; sendChangePwCodeBtn.textContent = isEnglish ? 'Send Verification Code' : '发送验证码'; }
                        if (changePwCountdownTimer) { clearInterval(changePwCountdownTimer); changePwCountdownTimer = null; }
                    } else {
                        showAuthMessage('changePwMessage', isEnglish ? (data.message_en || 'Failed to change password') : (data.message || '修改密码失败'), 'error');
                    }
                })
                .catch(function(err) {
                    showAuthMessage('changePwMessage', getNetworkErrorMessage(err, isEnglish), 'error');
                })
                .finally(function() {
                    if (changePwSubmitBtn) { changePwSubmitBtn.disabled = false; changePwSubmitBtn.textContent = originalText; }
                });
            });
        }
    }

    // ==================== 联系表单功能 ====================
    function initContactForm() {
        var contactForm = document.getElementById('contactForm');
        if (!contactForm) return;

        var isEnglish = document.documentElement.lang === 'en';

        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var name = document.getElementById('contactName').value.trim();
            var email = document.getElementById('contactEmail').value.trim();
            var subject = document.getElementById('contactSubject').value.trim();
            var message = document.getElementById('contactMessage').value.trim();
            var submitBtn = document.getElementById('contactSubmitBtn');

            if (!name || !email || !message) {
                showAuthMessage('contactFormMessage', isEnglish ? 'Please fill in name, email and message' : '请填写姓名、邮箱和消息', 'error');
                return;
            }

            var originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = isEnglish ? 'Sending...' : '发送中...';

            fetch(AUTH_API_URL + '/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, email: email, subject: subject, message: message })
            })
            .then(handleApiResponse)
            .then(function(data) {
                if (data.success) {
                    showAuthMessage('contactFormMessage', isEnglish ? (data.message_en || 'Message sent successfully!') : (data.message || '消息已发送！'), 'success');
                    contactForm.reset();
                } else {
                    showAuthMessage('contactFormMessage', isEnglish ? (data.message_en || 'Failed to send message') : (data.message || '发送失败'), 'error');
                }
            })
            .catch(function(err) {
                showAuthMessage('contactFormMessage', getNetworkErrorMessage(err, isEnglish), 'error');
            })
            .finally(function() {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            });
        });
    }

})();
