(function() {
    document.addEventListener("DOMContentLoaded", () => {
        // --- CACHE DOM ELEMENTS ---
        const progressBar = document.querySelector('.progress-bar');
        const pageContent = document.querySelector('.page-content');
        const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
        const canvas = document.getElementById('constellation-canvas');
        const navLinksContainer = document.querySelector('.nav-links');
        const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
        const transitionOverlay = document.getElementById('transition-overlay');
        const tagline = document.querySelector(".hero-content .tagline");
        const allNavLinks = document.querySelectorAll('.nav-links a, .nav-logo');
        const sections = document.querySelectorAll('section[id], header[id]');
        const activeIndicator = document.querySelector('.active-indicator');
        const navLinks = document.querySelectorAll('.nav-links a');

        AOS.init({ duration: 800, once: false, mirror: true, offset: 100 });

        // --- CORE FUNCTIONS ---
        const canvasCtx = canvas.getContext('2d');
        let dots = []; const mouse = { x: null, y: null, radius: 150 };
        function setupCanvas() { /* ... canvas setup logic remains the same ... */ }
        function animateCanvas() { /* ... canvas animation logic remains the same ... */ }
        
        function handleScroll() {
            let current = '';
            if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 10) {
                current = 'contact';
            } else {
                sections.forEach(section => {
                    if (section.getBoundingClientRect().top <= 75) { current = section.id; }
                });
            }
            navLinks.forEach(a => {
                a.classList.remove('active');
                if (a.getAttribute('href').substring(1) === current) { a.classList.add('active'); }
            });
            updateActiveIndicator();
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;
            progressBar.style.width = `${scrollPercent}%`;
        }

        function updateActiveIndicator() {
            const activeLink = document.querySelector('.nav-links a.active');
            if (activeLink && window.innerWidth > 768) {
                activeIndicator.style.left = `${activeLink.offsetLeft}px`;
                activeIndicator.style.width = `${activeLink.offsetWidth}px`;
            }
        }
        
        function toggleMobileNav() {
            const isOpen = navLinksContainer.classList.toggle('nav-open');
            mobileNavOverlay.classList.toggle('active');
            pageContent.classList.toggle('blurred');
            mobileNavToggle.setAttribute('aria-expanded', isOpen);
            mobileNavToggle.classList.toggle('is-active');

            if (isOpen) {
                // Animate links in
                anime({
                    targets: '.nav-links li',
                    translateY: [-20, 0],
                    opacity: [0, 1],
                    delay: anime.stagger(80, {start: 200})
                });
            }
        }

        // --- EVENT LISTENERS & INITIALIZATION ---
        window.addEventListener('resize', setupCanvas);
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

        mobileNavToggle.addEventListener('click', toggleMobileNav);
        mobileNavOverlay.addEventListener('click', toggleMobileNav);

        allNavLinks.forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                if (navLinksContainer.classList.contains('nav-open')) { toggleMobileNav(); }
                const targetElement = document.querySelector(link.getAttribute('href'));
                if (!targetElement) return;
                transitionOverlay.classList.add('active');
                setTimeout(() => {
                    targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                    setTimeout(() => { transitionOverlay.classList.remove('active'); handleScroll(); }, 50);
                }, 400);
            });
        });

        tagline.addEventListener("click", event => {
            let iteration = 0; let interval = setInterval(() => {
                event.target.innerText = event.target.innerText.split("").map((letter, index) => {
                    if (index < iteration) return event.target.dataset.value[index];
                    return "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
                }).join("");
                if (iteration >= event.target.dataset.value.length) clearInterval(interval);
                iteration += 1 / 3;
            }, 30);
        });
        
        // Duplicated canvas functions for completeness...
        function setupCanvas() {
            canvas.width = window.innerWidth; canvas.height = window.innerHeight;
            dots = [];
            const dotsDensity = window.innerWidth < 768 ? 20000 : 9000;
            const dotsCount = Math.floor((canvas.width * canvas.height) / dotsDensity);
            for (let i = 0; i < dotsCount; i++) {
                dots.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: Math.random() * 0.2 - 0.1, vy: Math.random() * 0.2 - 0.1, size: Math.random() * 2 + 1 });
            }
        }
        function animateCanvas() {
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            dots.forEach(dot => {
                dot.x += dot.vx; dot.y += dot.vy;
                if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1;
                if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1;
                canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                canvasCtx.beginPath(); canvasCtx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2); canvasCtx.fill();
            });
            for (let i = 0; i < dots.length; i++) {
                for (let j = i + 1; j < dots.length; j++) {
                    const dx1 = dots[i].x - mouse.x; const dy1 = dots[i].y - mouse.y; const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
                    if (dist1 < mouse.radius) {
                        const dx = dots[i].x - dots[j].x; const dy = dots[i].y - dots[j].y; const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 120) { canvasCtx.beginPath(); canvasCtx.moveTo(dots[i].x, dots[i].y); canvasCtx.lineTo(dots[j].x, dots[j].y); canvasCtx.strokeStyle = `rgba(0, 170, 255, ${1 - dist / 120})`; canvasCtx.stroke(); }
                    }
                }
            }
            requestAnimationFrame(animateCanvas);
        }

        setupCanvas();
        animateCanvas();
        handleScroll();
    });
})();