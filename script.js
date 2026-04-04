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
        initCaptcha();
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
            ? 'GNU General Public License v3.0\n\nCopyright (c) shenwenAI\n\nThis program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.\n\nThis program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.\n\nYou should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.'
            : 'GNU 通用公共许可证 第三版\n\nCopyright (c) shenwenAI\n\n本程序是自由软件：你可以根据自由软件基金会发布的 GNU 通用公共许可证的条款重新分发和/或修改它，可以使用许可证的第三版，或者（由你选择）任何更新的版本。\n\n本程序的发布是希望它有用，但不提供任何保证；甚至没有对适销性或特定用途适用性的暗示保证。详见 GNU 通用公共许可证。\n\n你应该已收到本程序附带的 GNU 通用公共许可证副本。如果没有，请参阅 <https://www.gnu.org/licenses/>。';

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
    // Cloudflare CDN 特殊状态码（520-527 表示源站问题）
    var CLOUDFLARE_ERROR_CODES = {
        520: 'Web server returned an unknown error',
        521: 'Web server is down',
        522: 'Connection timed out',
        523: 'Origin is unreachable',
        524: 'A timeout occurred',
        525: 'SSL handshake failed',
        526: 'Invalid SSL certificate',
        527: 'Railgun error'
    };

    function handleApiResponse(response) {
        return response.text().then(function(text) {
            try {
                return JSON.parse(text);
            } catch (e) {
                // 检测 Cloudflare CDN 错误页面（通常返回 HTML 而非 JSON）
                var cfError = CLOUDFLARE_ERROR_CODES[response.status];
                if (cfError) {
                    return { success: false, message: '服务器暂时不可用 (CF ' + response.status + ')', message_en: 'Server temporarily unavailable (CF ' + response.status + ': ' + cfError + ')' };
                }
                if (response.status === 403) {
                    return { success: false, message: '请求被安全策略拦截，请稍后重试', message_en: 'Request blocked by security policy, please try again later' };
                }
                if (response.status === 503) {
                    return { success: false, message: '服务器维护中，请稍后重试', message_en: 'Server is under maintenance, please try again later' };
                }
                if (!response.ok) {
                    return { success: false, message: '服务器错误 (' + response.status + ')', message_en: 'Server error (' + response.status + ')' };
                }
                return { success: false, message: '服务器响应格式错误', message_en: 'Invalid server response' };
            }
        });
    }

    /**
     * 带超时的 fetch 封装，防止 Cloudflare CDN 超时导致请求无限挂起
     * @param {string} url - 请求地址
     * @param {Object} options - fetch 选项
     * @param {number} timeoutMs - 超时时间（毫秒），默认30秒
     */
    function fetchWithTimeout(url, options, timeoutMs) {
        timeoutMs = timeoutMs || 30000;
        options = options || {};
        options.mode = options.mode || 'cors';

        if (typeof AbortController !== 'undefined') {
            var controller = new AbortController();
            options.signal = controller.signal;
            var timeoutId = setTimeout(function() { controller.abort(); }, timeoutMs);
            return fetch(url, options).finally(function() { clearTimeout(timeoutId); });
        }
        // 降级：不支持 AbortController 的浏览器使用 Promise.race
        return Promise.race([
            fetch(url, options),
            new Promise(function(_, reject) {
                setTimeout(function() { reject(new Error('请求超时')); }, timeoutMs);
            })
        ]);
    }

    function getNetworkErrorMessage(err, isEnglish) {
        var msg = err && err.message ? err.message : '';
        if (msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1 || msg.indexOf('Network request failed') !== -1) {
            return isEnglish ? 'Unable to connect to server, please check your network and try again' : '无法连接到服务器，请检查网络后重试';
        }
        if (msg.indexOf('aborted') !== -1 || msg.indexOf('请求超时') !== -1 || msg.indexOf('timeout') !== -1) {
            return isEnglish ? 'Request timed out, server may be busy, please try again' : '请求超时，服务器可能繁忙，请稍后重试';
        }
        if (msg.indexOf('CORS') !== -1 || msg.indexOf('cross-origin') !== -1 || msg.indexOf('不允许的跨域') !== -1) {
            return isEnglish ? 'Cross-origin request blocked, please refresh and try again' : '跨域请求被拦截，请刷新页面后重试';
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

    // ---- 图形验证码功能 ----
    var loginCaptchaId = '';
    var registerCaptchaId = '';

    function loadCaptcha(imgElementId, type) {
        fetchWithTimeout(AUTH_API_URL + '/api/captcha')
            .then(handleApiResponse)
            .then(function(data) {
                if (data.success) {
                    if (type === 'login') loginCaptchaId = data.captchaId;
                    else registerCaptchaId = data.captchaId;
                    var imgEl = document.getElementById(imgElementId);
                    if (imgEl) imgEl.innerHTML = data.svg;
                }
            })
            .catch(function(err) { console.error('验证码加载失败:', err); });
    }

    function initCaptcha() {
        var loginImg = document.getElementById('loginCaptchaImg');
        var registerImg = document.getElementById('registerCaptchaImg');
        if (loginImg) {
            loadCaptcha('loginCaptchaImg', 'login');
            loginImg.addEventListener('click', function() {
                loadCaptcha('loginCaptchaImg', 'login');
            });
        }
        if (registerImg) {
            loadCaptcha('registerCaptchaImg', 'register');
            registerImg.addEventListener('click', function() {
                loadCaptcha('registerCaptchaImg', 'register');
            });
        }
    }

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

        if (showRegisterLink && showLoginLink && loginSection && registerSection) {
            showRegisterLink.addEventListener('click', function(e) {
                e.preventDefault();
                loginSection.style.display = 'none';
                registerSection.style.display = 'block';
                if (forgotPwSection) forgotPwSection.style.display = 'none';
            });

            showLoginLink.addEventListener('click', function(e) {
                e.preventDefault();
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
                var captchaInput = document.getElementById('loginCaptcha');
                var captchaCode = captchaInput ? captchaInput.value.trim() : '';

                if (!email || !password) {
                    showAuthMessage('loginMessage', isEnglish ? 'Please fill in all fields' : '请填写所有字段', 'error');
                    return;
                }
                if (!captchaCode) {
                    showAuthMessage('loginMessage', isEnglish ? 'Please enter the captcha' : '请输入验证码', 'error');
                    return;
                }

                // 显示加载状态
                var submitBtn = loginForm.querySelector('button[type="submit"]');
                var originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = isEnglish ? 'Logging in...' : '登录中...';

                fetchWithTimeout(AUTH_API_URL + '/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: password, captchaId: loginCaptchaId, captchaCode: captchaCode })
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
                        loadCaptcha('loginCaptchaImg', 'login');
                        if (captchaInput) captchaInput.value = '';
                    }
                })
                .catch(function(err) {
                    console.error('登录请求失败:', err);
                    showAuthMessage('loginMessage', getNetworkErrorMessage(err, isEnglish), 'error');
                    loadCaptcha('loginCaptchaImg', 'login');
                    if (captchaInput) captchaInput.value = '';
                })
                .finally(function() {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                });
            });
        }

        if (registerForm) {
            // 直接注册（使用图形验证码）
            registerForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var isEnglish = document.documentElement.lang === 'en';
                var name = document.getElementById('registerName').value.trim();
                var email = document.getElementById('registerEmail').value.trim();
                var password = document.getElementById('registerPassword').value;
                var confirmPassword = document.getElementById('registerConfirmPassword').value;
                var captchaInput = document.getElementById('registerCaptcha');
                var captchaCode = captchaInput ? captchaInput.value.trim() : '';

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
                if (!captchaCode) {
                    showAuthMessage('registerMessage', isEnglish ? 'Please enter the captcha' : '请输入验证码', 'error');
                    return;
                }

                // 显示加载状态
                var submitBtn = document.getElementById('registerSubmitBtn') || registerForm.querySelector('button[type="submit"]');
                var originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = isEnglish ? 'Registering...' : '注册中...';

                fetchWithTimeout(AUTH_API_URL + '/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name, email: email, password: password, captchaId: registerCaptchaId, captchaCode: captchaCode })
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
                        loadCaptcha('registerCaptchaImg', 'register');
                        if (captchaInput) captchaInput.value = '';
                    }
                })
                .catch(function(err) {
                    console.error('注册请求失败:', err);
                    showAuthMessage('registerMessage', getNetworkErrorMessage(err, isEnglish), 'error');
                    loadCaptcha('registerCaptchaImg', 'register');
                    if (captchaInput) captchaInput.value = '';
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
        fetchWithTimeout(AUTH_API_URL + '/api/auth/user', {
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
                fetchWithTimeout(AUTH_API_URL + '/api/auth/logout', {
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
        var changePwForm = document.getElementById('changePwForm');
        if (changePwForm) {
            changePwForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var currentPassword = document.getElementById('changePwCurrent') ? document.getElementById('changePwCurrent').value : '';
                var newPassword = document.getElementById('changePwNew').value;
                var confirmPassword = document.getElementById('changePwConfirm').value;

                if (!currentPassword || !newPassword || !confirmPassword) {
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

                var changePwSubmitBtn = document.getElementById('changePwSubmitBtn');
                var originalText = changePwSubmitBtn ? changePwSubmitBtn.textContent : '';
                if (changePwSubmitBtn) { changePwSubmitBtn.disabled = true; changePwSubmitBtn.textContent = isEnglish ? 'Saving...' : '保存中...'; }

                fetchWithTimeout(AUTH_API_URL + '/api/auth/change-password', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword })
                })
                .then(handleApiResponse)
                .then(function(data) {
                    if (data.success) {
                        showAuthMessage('changePwMessage', isEnglish ? (data.message_en || 'Password changed successfully!') : (data.message || '密码修改成功！'), 'success');
                        changePwForm.reset();
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

        // 注销账号
        var deleteAccountForm = document.getElementById('deleteAccountForm');
        if (deleteAccountForm) {
            deleteAccountForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var password = document.getElementById('deleteAccountPassword') ? document.getElementById('deleteAccountPassword').value : '';
                var submitBtn = document.getElementById('deleteAccountSubmitBtn');

                if (!password) {
                    showAuthMessage('deleteAccountMessage', isEnglish ? 'Please enter your password' : '请输入密码', 'error');
                    return;
                }

                if (!confirm(isEnglish ? 'Are you sure you want to delete your account? This action cannot be undone.' : '确定要注销账号吗？此操作不可恢复。')) {
                    return;
                }

                var originalText = submitBtn ? submitBtn.textContent : '';
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = isEnglish ? 'Deleting...' : '删除中...'; }

                fetchWithTimeout(AUTH_API_URL + '/api/auth/delete-account', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: password })
                })
                .then(handleApiResponse)
                .then(function(data) {
                    if (data.success) {
                        showAuthMessage('deleteAccountMessage', isEnglish ? (data.message_en || 'Account deleted successfully') : (data.message || '账号已成功注销'), 'success');
                        localStorage.removeItem('shenwenai_token');
                        localStorage.removeItem('shenwenai_user');
                        setTimeout(function() {
                            window.location.href = isEnglish ? 'login-en.html' : 'login.html';
                        }, 2000);
                    } else {
                        showAuthMessage('deleteAccountMessage', isEnglish ? (data.message_en || 'Failed to delete account') : (data.message || '注销账号失败'), 'error');
                    }
                })
                .catch(function(err) {
                    showAuthMessage('deleteAccountMessage', getNetworkErrorMessage(err, isEnglish), 'error');
                })
                .finally(function() {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
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

            fetchWithTimeout(AUTH_API_URL + '/api/contact', {
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
