document.addEventListener('DOMContentLoaded', () => {
    initYear();
    initMouseSpotlight();
    initCodexCanvas();
    initTelemetry();
    initSearchEngine();
    initAudioEngine();
});

/* =========================================
   1. DYNAMIC YEAR & TELEMETRY
   ========================================= */
function initYear() {
    const yearEl = document.getElementById('currentYear');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
}

function initTelemetry() {
    const clockEl = document.getElementById('liveClock');
    const greetingEl = document.getElementById('localGreeting');
    const pingEl = document.getElementById('pingRate');

    function update() {
        const now = new Date();
        if (clockEl) {
            clockEl.textContent = now.toTimeString().split(' ')[0];
        }

        if (greetingEl) {
            const hrs = now.getHours();
            if (hrs >= 5 && hrs < 12) greetingEl.textContent = 'Good Morning';
            else if (hrs >= 12 && hrs < 17) greetingEl.textContent = 'Good Afternoon';
            else if (hrs >= 17 && hrs < 21) greetingEl.textContent = 'Good Evening';
            else greetingEl.textContent = 'Night Shift';
        }

        if (pingEl && Math.random() > 0.65) {
            const latency = Math.floor(Math.random() * 7) + 9;
            pingEl.textContent = `${latency}ms`;
        }
    }

    update();
    setInterval(update, 1000);
}

/* =========================================
   2. AMBIENT MOUSE SPOTLIGHT & BINARY MATRIX
   ========================================= */
function initMouseSpotlight() {
    const spotlight = document.getElementById('mouseSpotlight');
    if (!spotlight) return;

    window.addEventListener('mousemove', (e) => {
        spotlight.style.left = `${e.clientX}px`;
        spotlight.style.top = `${e.clientY}px`;
    }, { passive: true });
}

function initCodexCanvas() {
    const canvas = document.getElementById('codexCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const chars = '01';
    const fontSize = 14;
    let width = 0;
    let height = 0;
    let drops = [];

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        const columns = Math.floor(width / fontSize);
        drops = Array.from({ length: columns }, () => Math.floor(Math.random() * -80));
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const embers = Array.from({ length: 36 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.8 + 0.8,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.8) * 1.1,
        opacity: Math.random() * 0.5 + 0.2
    }));

    function render() {
        ctx.fillStyle = 'rgba(3, 7, 18, 0.2)';
        ctx.fillRect(0, 0, width, height);

        ctx.font = `600 ${fontSize}px 'JetBrains Mono', monospace`;
        for (let i = 0; i < drops.length; i++) {
            const text = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillStyle = Math.random() > 0.88 ? '#e0e7ff' : 'rgba(129, 140, 248, 0.75)';
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > height && Math.random() > 0.978) {
                drops[i] = 0;
            }
            drops[i]++;
        }

        embers.forEach((ember) => {
            ember.x += ember.speedX + Math.sin(ember.y * 0.01) * 0.35;
            ember.y += ember.speedY;

            if (ember.y < 0) {
                ember.y = height;
                ember.x = Math.random() * width;
            }
            if (ember.x < 0) ember.x = width;
            if (ember.x > width) ember.x = 0;

            ctx.beginPath();
            ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(99, 102, 241, ${ember.opacity})`;
            ctx.fill();
        });

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

/* =========================================
   3. SMART DIRECTORY SEARCH & SHORTCUTS
   ========================================= */
function initSearchEngine() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', filterLinks);

    document.addEventListener('keydown', (event) => {
        if (event.key === '/' && document.activeElement !== searchInput) {
            event.preventDefault();
            searchInput.focus();
        } else if (event.key === 'Escape') {
            if (document.activeElement === searchInput && searchInput.value !== '') {
                clearSearch();
            } else {
                const modal = document.getElementById('qrModal');
                if (modal && modal.classList.contains('active')) {
                    modal.classList.remove('active');
                }
            }
        }
    });
}

function filterLinks() {
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    const shortcutBadge = document.getElementById('searchShortcut');
    const sections = document.querySelectorAll('[data-section]');
    const noResults = document.getElementById('noResults');

    if (!input) return;

    const query = input.value.trim().toLowerCase();

    if (clearBtn && shortcutBadge) {
        clearBtn.style.display = query.length > 0 ? 'flex' : 'none';
        shortcutBadge.style.display = query.length > 0 ? 'none' : 'inline-block';
    }

    let totalVisible = 0;

    sections.forEach((section) => {
        const links = section.querySelectorAll('.social-link');
        let sectionVisible = 0;

        links.forEach((link) => {
            const title = link.querySelector('.link-title')?.textContent || '';
            const subtitle = link.querySelector('.link-subtitle')?.textContent || '';
            const keywords = link.getAttribute('data-keywords') || '';
            const searchableText = `${title} ${subtitle} ${keywords}`.toLowerCase();

            if (searchableText.includes(query)) {
                link.style.display = 'flex';
                sectionVisible++;
                totalVisible++;
            } else {
                link.style.display = 'none';
            }
        });

        section.style.display = sectionVisible > 0 ? 'flex' : 'none';
    });

    if (noResults) {
        noResults.style.display = totalVisible === 0 ? 'block' : 'none';
    }
}

function clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = '';
        filterLinks();
        input.focus();
    }
}

/* =========================================
   4. RHYTHM-SYNCED AUDIO VISUALIZER & CONTROLS
   ========================================= */
let audioCtx = null;
let analyser = null;
let dataArray = null;
let isAudioInitialized = false;
let currentScale = 1;
let currentEchoScale = 1;
let currentAuraScale = 1;

function initAudioEngine() {
    const audio = document.getElementById('bgMusic');
    if (!audio) return;

    audio.volume = 0.75;

    audio.addEventListener('play', () => {
        updateAudioUI(true);
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        setupVisualizer(audio);
    });

    audio.addEventListener('pause', () => {
        updateAudioUI(false);
    });

    // Attempt subtle autoplay; fallback to first user click
    audio.play().catch(() => {
        document.body.addEventListener('click', function unlockAudio(e) {
            if (e.target.closest('#audioToggleBtn')) return;
            if (audio.paused) {
                audio.play().catch(() => {});
            }
        }, { once: true });
    });
}

function toggleAudio() {
    const audio = document.getElementById('bgMusic');
    if (!audio) return;

    if (audio.paused) {
        audio.play().catch((err) => {
            console.warn('Playback blocked:', err);
            showToast('Tap anywhere to enable audio');
        });
    } else {
        audio.pause();
    }
}

function updateAudioUI(isPlaying) {
    const btn = document.getElementById('audioToggleBtn');
    const icon = document.getElementById('audioIcon');
    if (!btn || !icon) return;

    if (isPlaying) {
        btn.classList.add('active-audio');
        icon.className = 'fa-solid fa-volume-high';
    } else {
        btn.classList.remove('active-audio');
        icon.className = 'fa-solid fa-volume-xmark';
    }
}

function setupVisualizer(audio) {
    if (isAudioInitialized) return;

    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        analyser = audioCtx.createAnalyser();

        const source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);

        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.25;
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        isAudioInitialized = true;
        renderRhythmLoop(audio);
    } catch (err) {
        console.warn('Web Audio API unavailable:', err);
    }
}

function renderRhythmLoop(audio) {
    const ring = document.getElementById('avatarRing');
    const echo = document.getElementById('avatarRingEcho');
    const aura = document.getElementById('avatarRingAura');

    if (!ring || !echo || !aura) return;

    if (!audio.paused && analyser) {
        analyser.getByteFrequencyData(dataArray);

        let bassSum = 0;
        for (let i = 0; i < 4; i++) bassSum += dataArray[i];
        const bassAvg = bassSum / 4;

        let midSum = 0;
        for (let i = 8; i < 20; i++) midSum += dataArray[i];
        const midAvg = midSum / 12;

        const targetScale = 1 + (bassAvg / 255) * 0.14;
        const targetEcho = 1 + (bassAvg / 255) * 0.22;
        const targetAura = 1 + (bassAvg / 255) * 0.30;

        currentScale += (targetScale - currentScale) * (targetScale > currentScale ? 0.65 : 0.22);
        currentEchoScale += (targetEcho - currentEchoScale) * (targetEcho > currentEchoScale ? 0.65 : 0.22);
        currentAuraScale += (targetAura - currentAuraScale) * (targetAura > currentAuraScale ? 0.65 : 0.22);

        const r = Math.floor(56 + (midAvg / 255) * 90);
        const g = Math.floor(189 - (midAvg / 255) * 55);
        const b = 248;
        const blur = 6 + (bassAvg / 255) * 20;
        const alpha = 0.45 + (bassAvg / 255) * 0.5;

        ring.style.transform = `scale(${currentScale})`;
        ring.style.borderColor = `rgb(${r}, ${g}, ${b})`;
        ring.style.boxShadow = `0 0 ${blur}px rgba(${r}, ${g}, ${b}, ${alpha}), 0 0 ${blur * 1.4}px rgba(168, 85, 247, ${alpha * 0.55})`;
        ring.classList.add('playing');

        echo.style.transform = `scale(${currentEchoScale})`;
        echo.classList.add('playing');

        aura.style.transform = `scale(${currentAuraScale})`;
        aura.classList.add('playing');
    } else {
        currentScale += (1 - currentScale) * 0.12;
        currentEchoScale += (1 - currentEchoScale) * 0.12;
        currentAuraScale += (1 - currentAuraScale) * 0.12;

        ring.style.transform = `scale(${currentScale})`;
        ring.style.boxShadow = 'none';
        ring.style.borderColor = 'rgba(56, 189, 248, 0.45)';
        ring.classList.remove('playing');

        echo.style.transform = `scale(${currentEchoScale})`;
        echo.classList.remove('playing');

        aura.style.transform = `scale(${currentAuraScale})`;
        aura.classList.remove('playing');
    }

    requestAnimationFrame(() => renderRhythmLoop(audio));
}

/* =========================================
   5. UI INTERACTIONS, CLIPBOARD & MODAL
   ========================================= */
function copyProfileLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('Hub URL copied to clipboard');
    }).catch(() => {
        showToast('Unable to copy link');
    });
}

function copyHandle() {
    navigator.clipboard.writeText('@vexornull').then(() => {
        showToast('Handle @vexornull copied');
    });
}

let toastTimeout;
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 2800);
}

let fxActive = true;
function toggleEffects() {
    fxActive = !fxActive;
    const canvasEl = document.getElementById('codexCanvas');
    const grid = document.querySelector('.cyber-grid');
    const icon = document.getElementById('fxIcon');

    if (canvasEl) canvasEl.style.opacity = fxActive ? '1' : '0.12';
    if (grid) {
        grid.style.animationPlayState = fxActive ? 'running' : 'paused';
        grid.style.opacity = fxActive ? '1' : '0.15';
    }
    if (icon) {
        icon.style.opacity = fxActive ? '1' : '0.45';
    }
    showToast(fxActive ? 'Matrix FX enabled' : 'Minimalist mode enabled');
}

function triggerAvatarEasterEgg() {
    const messages = [
        'System Verified • @vexornull',
        'Building sleek web experiences.',
        'All systems operational at 100%.',
        'Thanks for stopping by the hub!'
    ];
    const statusTextEl = document.getElementById('statusText');
    if (!statusTextEl) return;

    const current = statusTextEl.textContent;
    const next = messages.find((msg) => msg !== current) || messages[0];
    statusTextEl.textContent = next;
}

function openQrModal() {
    const modal = document.getElementById('qrModal');
    const qrImg = document.getElementById('qrImage');
    if (!modal || !qrImg) return;

    const targetUrl = encodeURIComponent(window.location.href);
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=4&data=${targetUrl}`;
    modal.classList.add('active');
}

function closeQrModal(event) {
    if (event.target.classList.contains('modal-overlay') || event.target.closest('.modal-close')) {
        const modal = document.getElementById('qrModal');
        if (modal) modal.classList.remove('active');
    }
}
