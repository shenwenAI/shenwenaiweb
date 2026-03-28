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

    // ==================== 获取API处理 ====================
    function initGetApiHandler() {
        window.handleGetApi = function() {
            var token = localStorage.getItem('shenwenai_token');
            if (token) {
                window.location.href = 'https://shenwenapi.578388.xyz';
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

        if (showRegisterLink && showLoginLink && loginSection && registerSection) {
            showRegisterLink.addEventListener('click', function(e) {
                e.preventDefault();
                loginSection.style.display = 'none';
                registerSection.style.display = 'block';
            });

            showLoginLink.addEventListener('click', function(e) {
                e.preventDefault();
                registerSection.style.display = 'none';
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
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    if (data.success) {
                        // 保存 token 和用户信息（不保存密码）
                        localStorage.setItem('shenwenai_token', data.token);
                        localStorage.setItem('shenwenai_user', JSON.stringify(data.user));
                        showAuthMessage('loginMessage', isEnglish ? (data.message_en || 'Login successful! Redirecting...') : (data.message || '登录成功！正在跳转...'), 'success');
                        setTimeout(function() {
                            window.location.href = 'https://shenwenapi.578388.xyz';
                        }, 1500);
                    } else {
                        showAuthMessage('loginMessage', isEnglish ? (data.message_en || 'Invalid email or password') : (data.message || '邮箱或密码错误'), 'error');
                    }
                })
                .catch(function(err) {
                    console.error('登录请求失败:', err);
                    showAuthMessage('loginMessage', isEnglish ? 'Network error, please try again' : '网络错误，请稍后重试', 'error');
                })
                .finally(function() {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                });
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', function(e) {
                e.preventDefault();
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

                if (password.length < 6) {
                    showAuthMessage('registerMessage', isEnglish ? 'Password must be at least 6 characters' : '密码长度至少6位', 'error');
                    return;
                }

                // 显示加载状态
                var submitBtn = registerForm.querySelector('button[type="submit"]');
                var originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = isEnglish ? 'Registering...' : '注册中...';

                fetch(AUTH_API_URL + '/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name, email: email, password: password })
                })
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    if (data.success) {
                        // 保存 token 和用户信息（不保存密码）
                        localStorage.setItem('shenwenai_token', data.token);
                        localStorage.setItem('shenwenai_user', JSON.stringify(data.user));
                        var successMsg = isEnglish
                            ? (data.message_en || 'Registration successful!')
                            : (data.message || '注册成功！');
                        showAuthMessage('registerMessage', successMsg, 'success');
                        setTimeout(function() {
                            window.location.href = 'https://shenwenapi.578388.xyz';
                        }, 3000);
                    } else {
                        showAuthMessage('registerMessage', isEnglish ? (data.message_en || 'Registration failed') : (data.message || '注册失败'), 'error');
                    }
                })
                .catch(function(err) {
                    console.error('注册请求失败:', err);
                    showAuthMessage('registerMessage', isEnglish ? 'Network error, please try again' : '网络错误，请稍后重试', 'error');
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

})();
