document.addEventListener('DOMContentLoaded', () => {
    // 1. Dynamic Color Theme Selector
    const albumCards = document.querySelectorAll('.album-card');
    const root = document.documentElement;

    albumCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove active from all
            albumCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            // Get theme attributes
            const primary = card.getAttribute('data-primary');
            const secondary = card.getAttribute('data-secondary');
            const glow = card.getAttribute('data-glow');

            // Apply smoothly to CSS variables
            root.style.setProperty('--primary-color', primary);
            root.style.setProperty('--secondary-color', secondary);
            root.style.setProperty('--primary-glow', glow);
        });
    });

    // 2. Interactive Equalizer Logic
    const eqSliders = document.querySelectorAll('.eq-slider');
    const eqVals = {
        'eq-slider-60': document.getElementById('eq-val-60'),
        'eq-slider-230': document.getElementById('eq-val-230'),
        'eq-slider-910': document.getElementById('eq-val-910'),
        'eq-slider-4k': document.getElementById('eq-val-4k'),
        'eq-slider-14k': document.getElementById('eq-val-14k')
    };

    const presetButtons = document.querySelectorAll('.btn-preset');
    const mockupCards = document.querySelectorAll('.mockup-card');

    // Update slider label on input
    eqSliders.forEach(slider => {
        slider.addEventListener('input', (e) => {
            const val = e.target.value;
            const sign = val > 0 ? '+' : '';
            eqVals[e.target.id].textContent = `${sign}${val}dB`;
            
            // Remove active preset highlight when manual edit occurs
            presetButtons.forEach(btn => btn.classList.remove('active'));

            // Shift focus highlight to EQ mockup card
            mockupCards.forEach(c => c.classList.remove('active-card'));
            document.querySelector('.mockup-card:nth-child(2)').classList.add('active-card');
        });
    });

    // Presets values dictionary
    const presets = {
        bassboost: { '60': 10, '230': 6, '910': -2, '4k': 1, '14k': 2 },
        vocal: { '60': -4, '230': -1, '910': 3, '4k': 8, '14k': 5 },
        flat: { '60': 0, '230': 0, '910': 0, '4k': 0, '14k': 0 }
    };

    // Apply Preset function
    function applyPreset(presetName) {
        const values = presets[presetName];
        if (!values) return;

        const mapping = {
            '60': 'eq-slider-60',
            '230': 'eq-slider-230',
            '910': 'eq-slider-910',
            '4k': 'eq-slider-4k',
            '14k': 'eq-slider-14k'
        };

        Object.keys(values).forEach(key => {
            const sliderId = mapping[key];
            const slider = document.getElementById(sliderId);
            const targetVal = values[key];
            
            // Smoothly animate the value change (simulate UI slide)
            let currentVal = parseInt(slider.value);
            const step = currentVal < targetVal ? 1 : -1;
            
            const animateSlider = setInterval(() => {
                if (currentVal === targetVal) {
                    clearInterval(animateSlider);
                } else {
                    currentVal += step;
                    slider.value = currentVal;
                    const sign = currentVal > 0 ? '+' : '';
                    eqVals[sliderId].textContent = `${sign}${currentVal}dB`;
                }
            }, 25);
        });
    }

    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const preset = btn.getAttribute('data-preset');
            applyPreset(preset);
        });
    });

    // 3. Beautiful Live Waveform Audio Visualizer on Canvas
    const canvas = document.getElementById('visualizer-canvas');
    const ctx = canvas.getContext('2d');

    // Resize handler
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let animationId;
    let phase = 0;

    // Get average EQ scale factor to influence waves
    function getEQMultiplier() {
        let sum = 0;
        eqSliders.forEach(slider => {
            // map slider range -12 to +12 to relative multiplier
            const val = parseInt(slider.value);
            sum += (val + 12) / 24; // 0 to 1
        });
        return (sum / eqSliders.length) * 1.5 + 0.3; // Returns normalized multiplier
    }

    function drawWaveform() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        ctx.clearRect(0, 0, width, height);

        // Get primary color dynamically from styles
        const primaryColor = getComputedStyle(root).getPropertyValue('--primary-color').trim() || '#ff3366';
        
        // Multiplier from EQ
        const eqFactor = getEQMultiplier();
        
        // Let's render 3 overlapping waves with transparency
        const waves = [
            { amplitude: 25 * eqFactor, frequency: 0.008, speed: 0.04, opacity: 0.15, offset: 0 },
            { amplitude: 15 * eqFactor, frequency: 0.015, speed: 0.06, opacity: 0.3, offset: Math.PI / 2 },
            { amplitude: 8 * eqFactor, frequency: 0.03, speed: 0.08, opacity: 0.6, offset: Math.PI }
        ];

        phase += 0.5;

        waves.forEach(wave => {
            ctx.beginPath();
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = wave.opacity * 6; // Thicker lines for more visible glow
            ctx.globalAlpha = wave.opacity;

            // Draw line
            for (let x = 0; x < width; x++) {
                // Combine sine wave with noise or harmonics
                const y = (height / 2) + 
                    Math.sin(x * wave.frequency + (phase * wave.speed) + wave.offset) * wave.amplitude +
                    Math.cos(x * 0.003 - (phase * 0.01)) * (wave.amplitude * 0.3);
                
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        });

        // Add visualizer dots mapping to bands
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = primaryColor;
        
        eqSliders.forEach((slider, idx) => {
            const val = parseInt(slider.value);
            const x = width * 0.15 + (width * 0.7 * (idx / (eqSliders.length - 1)));
            const y = (height / 2) - (val * 4); // height is modified by EQ value
            
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();

            // Draw vertical connector line
            ctx.beginPath();
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.2;
            ctx.moveTo(x, height / 2);
            ctx.lineTo(x, y);
            ctx.stroke();
        });

        animationId = requestAnimationFrame(drawWaveform);
    }
    
    // Start Visualizer
    drawWaveform();

    // 4. Scroll Reveal Intersection Observer
    const revealElements = document.querySelectorAll('.scroll-reveal');
    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(el => observer.observe(el));

    // Interactive switch for panel mockups based on visualizer focus
    canvas.addEventListener('mouseenter', () => {
        mockupCards.forEach(c => c.classList.remove('active-card'));
        document.querySelector('.mockup-card:nth-child(1)').classList.add('active-card');
    });
});
