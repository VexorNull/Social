document.addEventListener('DOMContentLoaded', () => {
    setCurrentYear();
    initClockAndGreeting();
    initCursorGlow();
    initSearch();
    initAudioVisualizer();
});

/* =========================================
   1. TIME & GREETING
   ========================================= */
function setCurrentYear() {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function initClockAndGreeting() {
    const clockEl = document.getElementById('liveClock');
    const greetingEl = document.getElementById('greetingLabel');

    function update() {
        const now = new Date();
        if (clockEl) {
            clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (greetingEl) {
            const hour = now.getHours();
            if (hour < 12) greetingEl.textContent = 'Good Morning';
            else if (hour < 17) greetingEl.textContent = 'Good Afternoon';
            else greetingEl.textContent = 'Good Evening';
        }
    }

    update();
    setInterval(update, 15000);
}

/* =========================================
   2. SUBTLE CURSOR GLOW & AMBIENT TOGGLE
   ========================================= */
function initCursorGlow() {
    const glow = document.getElementById('cursorGlow');
    if (!glow) return;

    window.addEventListener('pointermove', (e) => {
        glow.style.left = `${e.clientX}px`;
        glow.style.top = `${e.clientY}px`;
    }, { passive: true });
}

let ambientEnabled = true;
function toggleAmbient() {
    ambientEnabled = !ambientEnabled;
    const layer = document.querySelector('.ambient-layer');
    const btn = document.getElementById('ambientToggleBtn');

    if (layer) layer.style.opacity = ambientEnabled ? '1' : '0';
    if (btn) btn.classList.toggle('active', ambientEnabled);

    showToast(ambientEnabled ? 'Ambient glow on' : 'Minimal mode on');
}

/* =========================================
   3. SEARCH & KEYBOARD SHORTCUTS
   ========================================= */
function initSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;

    input.addEventListener('input', filterLinks);

    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== input) {
            e.preventDefault();
            input.focus();
        } else if (e.key === 'Escape') {
            const modal = document.getElementById('qrModal');
            if (modal && modal.classList.contains('open')) {
                modal.classList.remove('open');
            } else if (document.activeElement === input && input.value) {
                clearSearch();
            }
        }
    });
}

function filterLinks() {
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    const kbdHint = document.getElementById('kbdHint');
    const groups = document.querySelectorAll('[data-group]');
    const emptyState = document.getElementById('noResults');

    if (!input) return;
    const query = input.value.trim().toLowerCase();

    if (clearBtn && kbdHint) {
        clearBtn.style.display = query ? 'inline-flex' : 'none';
        kbdHint.style.display = query ? 'none' : 'inline-block';
    }

    let totalMatches = 0;

    groups.forEach((group) => {
        const cards = group.querySelectorAll('.link-card');
        let groupMatches = 0;

        cards.forEach((card) => {
            const title = card.querySelector('.card-title')?.textContent || '';
            const desc = card.querySelector('.card-desc')?.textContent || '';
            const keywords = card.getAttribute('data-keywords') || '';
            const haystack = `${title} ${desc} ${keywords}`.toLowerCase();

            const match = haystack.includes(query);
            card.style.display = match ? 'flex' : 'none';
            if (match) {
                groupMatches++;
                totalMatches++;
            }
        });

        group.style.display = groupMatches > 0 ? 'flex' : 'none';
    });

    if (emptyState) {
        emptyState.style.display = totalMatches === 0 ? 'block' : 'none';
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
   4. RHYTHM-SYNCED AUDIO RING
   ========================================= */
let audioCtx = null;
let analyser = null;
let freqData = null;
let audioReady = false;
let scaleCore = 1;
let scaleEcho = 1;
let scaleAura = 1;

function initAudioVisualizer() {
    const audio = document.getElementById('bgMusic');
    if (!audio) return;

    audio.volume = 0.7;

    audio.addEventListener('play', () => {
        setAudioBtnState(true);
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        bindAnalyser(audio);
    });

    audio.addEventListener('pause', () => {
        setAudioBtnState(false);
    });

    audio.play().catch(() => {
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('#audioToggleBtn')) return;
            if (audio.paused) audio.play().catch(() => {});
        }, { once: true });
    });
}

function toggleAudio() {
    const audio = document.getElementById('bgMusic');
    if (!audio) return;

    if (audio.paused) {
        audio.play().catch(() => showToast('Click anywhere to start audio'));
    } else {
        audio.pause();
    }
}

function setAudioBtnState(playing) {
    const btn = document.getElementById('audioToggleBtn');
    const icon = document.getElementById('audioIcon');
    if (!btn || !icon) return;

    btn.classList.toggle('active', playing);
    icon.className = playing ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
}

function bindAnalyser(audio) {
    if (audioReady) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        analyser = audioCtx.createAnalyser();

        const source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);

        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.25;
        freqData = new Uint8Array(analyser.frequencyBinCount);
        audioReady = true;
        animateRings(audio);
    } catch (_) {
        // Fallback if Web Audio API is restricted
    }
}

function animateRings(audio) {
    const ring = document.getElementById('avatarRing');
    const echo = document.getElementById('avatarRingEcho');
    const aura = document.getElementById('avatarRingAura');
    if (!ring || !echo || !aura) return;

    if (!audio.paused && analyser) {
        analyser.getByteFrequencyData(freqData);

        let bassSum = 0;
        for (let i = 0; i < 4; i++) bassSum += freqData[i];
        const bassAvg = bassSum / 4;

        let midSum = 0;
        for (let i = 8; i < 20; i++) midSum += freqData[i];
        const midAvg = midSum / 12;

        const tCore = 1 + (bassAvg / 255) * 0.12;
        const tEcho = 1 + (bassAvg / 255) * 0.19;
        const tAura = 1 + (bassAvg / 255) * 0.26;

        scaleCore += (tCore - scaleCore) * (tCore > scaleCore ? 0.65 : 0.22);
        scaleEcho += (tEcho - scaleEcho) * (tEcho > scaleEcho ? 0.65 : 0.22);
        scaleAura += (tAura - scaleAura) * (tAura > scaleAura ? 0.65 : 0.22);

        const r = Math.floor(56 + (midAvg / 255) * 80);
        const g = Math.floor(189 - (midAvg / 255) * 50);
        const b = 248;
        const blur = 6 + (bassAvg / 255) * 16;
        const alpha = 0.4 + (bassAvg / 255) * 0.45;

        ring.style.transform = `scale(${scaleCore})`;
        ring.style.borderColor = `rgb(${r}, ${g}, ${b})`;
        ring.style.boxShadow = `0 0 ${blur}px rgba(${r}, ${g}, ${b}, ${alpha})`;

        echo.style.transform = `scale(${scaleEcho})`;
        echo.classList.add('playing');

        aura.style.transform = `scale(${scaleAura})`;
        aura.classList.add('playing');
    } else {
        scaleCore += (1 - scaleCore) * 0.12;
        scaleEcho += (1 - scaleEcho) * 0.12;
        scaleAura += (1 - scaleAura) * 0.12;

        ring.style.transform = `scale(${scaleCore})`;
        ring.style.boxShadow = 'none';
        ring.style.borderColor = 'rgba(56, 189, 248, 0.4)';

        echo.style.transform = `scale(${scaleEcho})`;
        echo.classList.remove('playing');

        aura.style.transform = `scale(${scaleAura})`;
        aura.classList.remove('playing');
    }

    requestAnimationFrame(() => animateRings(audio));
}

/* =========================================
   5. CLIPBOARD, QR MODAL & TOAST
   ========================================= */
function copyHandle() {
    navigator.clipboard.writeText('@vexornull').then(() => {
        showToast('Copied @vexornull');
    });
}

function copyProfileLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('Hub link copied');
    });
}

function cycleProfileNote() {
    const notes = [
        'Available • @vexornull',
        'Crafting clean web tools',
        'Verified profile • 2026'
    ];
    const el = document.getElementById('statusText');
    if (!el) return;
    const next = notes.find((n) => n !== el.textContent) || notes[0];
    el.textContent = next;
}

function openQrModal() {
    const modal = document.getElementById('qrModal');
    const img = document.getElementById('qrImage');
    if (!modal || !img) return;
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(window.location.href)}`;
    modal.classList.add('open');
}

function closeQrModal(event) {
    if (event.target.classList.contains('modal-backdrop') || event.target.closest('.modal-x')) {
        const modal = document.getElementById('qrModal');
        if (modal) modal.classList.remove('open');
    }
}

let toastTimer;
function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}
