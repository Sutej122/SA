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
        const spaceModeBtn = document.getElementById('space-mode-btn');
        const spaceClockContainer = document.getElementById('space-mode-container');
        const spaceClockDate = document.getElementById('space-clock-date');
        const spaceClockTime = document.getElementById('space-clock-time');
        const spaceClockGreeting = document.getElementById('space-clock-greeting');

        AOS.init({ duration: 800, once: false, mirror: true, offset: 100 });

        // --- CORE FUNCTIONS ---
        const canvasCtx = canvas.getContext('2d');
        let dots = [];
        let shootingStars = [];
        let nebulae = [];

        // --- NEW: Quadtree Implementation for Performance ---
        class Point {
            constructor(x, y, data) {
                this.x = x;
                this.y = y;
                this.data = data;
            }
        }

        class Rectangle {
            constructor(x, y, w, h) {
                this.x = x; this.y = y; this.w = w; this.h = h;
            }
            contains(point) {
                return (point.x >= this.x - this.w && point.x <= this.x + this.w &&
                        point.y >= this.y - this.h && point.y <= this.y + this.h);
            }
            intersects(range) {
                return !(range.x - range.w > this.x + this.w || range.x + range.w < this.x - this.w ||
                         range.y - range.h > this.y + this.h || range.y + range.h < this.y - this.h);
            }
        }

        class QuadTree {
            constructor(boundary, capacity) {
                this.boundary = boundary;
                this.capacity = capacity;
                this.points = [];
                this.divided = false;
            }

            subdivide() {
                let { x, y, w, h } = this.boundary;
                let nw = new Rectangle(x - w / 2, y - h / 2, w / 2, h / 2);
                this.northwest = new QuadTree(nw, this.capacity);
                let ne = new Rectangle(x + w / 2, y - h / 2, w / 2, h / 2);
                this.northeast = new QuadTree(ne, this.capacity);
                let sw = new Rectangle(x - w / 2, y + h / 2, w / 2, h / 2);
                this.southwest = new QuadTree(sw, this.capacity);
                let se = new Rectangle(x + w / 2, y + h / 2, w / 2, h / 2);
                this.southeast = new QuadTree(se, this.capacity);
                this.divided = true;
            }

            insert(point) {
                if (!this.boundary.contains(point)) return false;
                if (this.points.length < this.capacity) {
                    this.points.push(point);
                    return true;
                }
                if (!this.divided) this.subdivide();
                return (this.northeast.insert(point) || this.northwest.insert(point) ||
                        this.southeast.insert(point) || this.southwest.insert(point));
            }

            query(range, found) {
                if (!found) found = [];
                if (!this.boundary.intersects(range)) return found;
                for (let p of this.points) {
                    if (range.contains(p)) found.push(p);
                }
                if (this.divided) {
                    this.northwest.query(range, found);
                    this.northeast.query(range, found);
                    this.southwest.query(range, found);
                    this.southeast.query(range, found);
                }
                return found;
            }
        }

        class DriftingNebula {
            constructor() {
                this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height;
                this.vx = Math.random() * 0.05 - 0.025; this.vy = Math.random() * 0.05 - 0.025;
                this.radius = Math.random() * 300 + 300;
                const hue = 200 + Math.random() * 60;
                this.color1 = `hsla(${hue}, 100%, 70%, 0.05)`; this.color2 = `hsla(${hue}, 100%, 70%, 0)`;
            }
            update() {
                this.x += this.vx; this.y += this.vy;
                if (this.x + this.radius < 0) this.x = canvas.width + this.radius;
                if (this.x - this.radius > canvas.width) this.x = -this.radius;
                if (this.y + this.radius < 0) this.y = canvas.height + this.radius;
                if (this.y - this.radius > canvas.height) this.y = -this.radius;
            }
            draw(ctx) {
                const gradient = ctx.createRadialGradient(this.x, this.y, this.radius * 0.1, this.x, this.y, this.radius);
                gradient.addColorStop(0, this.color1); gradient.addColorStop(1, this.color2);
                ctx.fillStyle = gradient; ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
            }
        }

        const MIN_STAR_INTERVAL = 100; const MAX_STAR_INTERVAL = 500;
        let nextShootingStarTimestamp = Date.now() + 200;

        function handleScroll() {
            let current = '';
            if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 10) { current = 'contact'; }
            else { sections.forEach(section => { if (section.getBoundingClientRect().top <= 75) { current = section.id; } }); }
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
            if (isOpen) { anime({ targets: '.nav-links li', translateY: [-20, 0], opacity: [0, 1], delay: anime.stagger(80, { start: 200 }) }); }
        }

        function getGreeting() {
            const hour = new Date().getHours();
            if (hour < 12) return 'Good morning';
            if (hour < 18) return 'Good afternoon';
            return 'Good evening';
        }

        function updateClock() {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0'); const minutes = now.getMinutes().toString().padStart(2, '0');
            const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
            spaceClockTime.textContent = `${hours}:${minutes}`;
            spaceClockDate.textContent = now.toLocaleDateString(undefined, dateOptions);
            spaceClockGreeting.textContent = getGreeting();
        }

        function enterSpaceMode() {
            document.body.classList.add('space-mode-active');
            document.documentElement.requestFullscreen().catch(err => { console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`); });
        }

        spaceModeBtn.addEventListener('click', enterSpaceMode);
        document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('space-mode-active')) { document.body.classList.remove('space-mode-active'); } });
        setInterval(updateClock, 1000); updateClock();
        window.addEventListener('resize', setupCanvas);
        window.addEventListener('scroll', handleScroll, { passive: true });
        mobileNavToggle.addEventListener('click', toggleMobileNav);
        mobileNavOverlay.addEventListener('click', toggleMobileNav);

        allNavLinks.forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                if (navLinksContainer.classList.contains('nav-open')) { toggleMobileNav(); }
                const targetElement = document.querySelector(link.getAttribute('href'));
                if (!targetElement) return;

                if (prefersReducedMotion) {
                    targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                    handleScroll();
                } else {
                    transitionOverlay.classList.add('active');
                    setTimeout(() => {
                        targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                        setTimeout(() => { transitionOverlay.classList.remove('active'); handleScroll(); }, 50);
                    }, 400);
                }
            });
        });

        tagline.addEventListener("click", event => {
            let iteration = 0; const interval = setInterval(() => {
                event.target.innerText = event.target.innerText.split("").map((letter, index) => {
                    if (index < iteration) return event.target.dataset.value[index];
                    return "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
                }).join("");
                if (iteration >= event.target.dataset.value.length) clearInterval(interval);
                iteration += 1 / 3;
            }, 30);
        });

        function setupCanvas() {
            canvas.width = window.innerWidth; canvas.height = window.innerHeight;
            dots = []; nebulae = [new DriftingNebula(), new DriftingNebula()];
            const dotsDensity = window.innerWidth < 768 ? 8000 : 4500;
            const dotsCount = Math.floor((canvas.width * canvas.height) / dotsDensity);
            for (let i = 0; i < dotsCount; i++) {
                const x = Math.random() * canvas.width, y = Math.random() * canvas.height, z = Math.random();
                const base_vx = Math.random() * 0.2 - 0.1, base_vy = Math.random() * 0.2 - 0.1;
                const dot = {
                    x, y, ox: x, oy: y, z, vx: base_vx * (z*0.7+0.3), vy: base_vy * (z*0.7+0.3),
                    ovx: base_vx, ovy: base_vy, size: z * 2.0 + 0.5, opacity: z * 0.7 + 0.1, isPulsar: false
                };
                if (Math.random() < 0.90) {
                    dot.isPulsar = true; dot.pulsarPhase = Math.random() * Math.PI * 2;
                    dot.pulsarSpeed = (Math.random() * 0.02 + 0.005);
                    dot.baseSize = dot.size; dot.baseOpacity = dot.opacity;
                }
                dots.push(dot);
            }
        }

        function createShootingStar() {
            const side = Math.floor(Math.random() * 2); const z = Math.random() * 0.8 + 0.2;
            const star = {
                x: side === 0 ? Math.random() * canvas.width : 0, y: side === 0 ? 0 : Math.random() * canvas.height,
                z: z, tailLength: 20 * (z + 0.5), opacity: 1, isFast: false, isHypervelocity: false
            };
            const rand = Math.random();
            if (rand < 0.20) {
                star.isHypervelocity = true; star.vx = (Math.random() * 10 + 25) * z; star.vy = (Math.random() * 10 + 25) * z; star.tailLength = 30 * (z + 0.5);
            } else if (rand < 0.6) {
                star.isFast = true; star.vx = (Math.random() * 7 + 14) * z; star.vy = (Math.random() * 7 + 14) * z;
            } else {
                star.vx = (Math.random() * 4 + 6) * z; star.vy = (Math.random() * 4 + 6) * z;
            }
            shootingStars.push(star);
        }

        function drawShootingStar(star) {
            const tailStartX = star.x - star.vx * star.tailLength, tailStartY = star.y - star.vy * star.tailLength;
            canvasCtx.shadowBlur = 20;
            const gradient = canvasCtx.createLinearGradient(star.x, star.y, tailStartX, tailStartY);
            let lineWidth, headSize; const scale = star.z * 0.8 + 0.2;
            if (star.isHypervelocity) {
                canvasCtx.shadowColor = 'rgba(226, 88, 214, 0.8)';
                gradient.addColorStop(0, `rgba(255, 0, 150, ${star.opacity})`); gradient.addColorStop(0.5, `rgba(138, 43, 226, ${star.opacity * 0.8})`); gradient.addColorStop(1, 'rgba(255, 20, 147, 0)');
                lineWidth = 4 * scale; headSize = 3.5 * scale;
            } else if (star.isFast) {
                canvasCtx.shadowColor = 'rgba(173, 216, 230, 0.8)';
                gradient.addColorStop(0, `rgba(135, 206, 250, ${star.opacity})`); gradient.addColorStop(1, 'rgba(0, 0, 139, 0)');
                lineWidth = 3.5 * scale; headSize = 3 * scale;
            } else {
                canvasCtx.shadowColor = 'rgba(255, 255, 255, 0.8)';
                gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`); gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                lineWidth = 3 * scale; headSize = 2.5 * scale;
            }
            canvasCtx.beginPath(); canvasCtx.moveTo(tailStartX, tailStartY); canvasCtx.lineTo(star.x, star.y);
            canvasCtx.strokeStyle = gradient; canvasCtx.lineWidth = lineWidth; canvasCtx.stroke();
            canvasCtx.beginPath(); canvasCtx.arc(star.x, star.y, headSize, 0, Math.PI * 2);
            canvasCtx.fillStyle = `rgba(255, 255, 255, ${star.opacity * 0.9})`; canvasCtx.fill();
            canvasCtx.shadowBlur = 0;
        }

        function animateCanvas() {
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            nebulae.forEach(n => n.update());

            // --- OPTIMIZED INTERACTION LOGIC ---
            const boundary = new Rectangle(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2);
            const qtree = new QuadTree(boundary, 4);
            for (let dot of dots) { qtree.insert(new Point(dot.x, dot.y, dot)); }

            const REPULSION_RADIUS = 90; const REPULSION_STRENGTH = 0.7;
            const DOT_REPULSION_RADIUS = 25; const DOT_REPULSION_STRENGTH = 0.05;

            shootingStars.forEach(star => {
                let range = new Rectangle(star.x, star.y, REPULSION_RADIUS, REPULSION_RADIUS);
                let pointsInRange = qtree.query(range);
                for (let point of pointsInRange) {
                    let dot = point.data; const dx = dot.x - star.x; const dy = dot.y - star.y; const distSq = dx * dx + dy * dy;
                    if (distSq > 0 && distSq < REPULSION_RADIUS * REPULSION_RADIUS) {
                        const dist = Math.sqrt(distSq); const forceFactor = Math.pow(1 - (dist / REPULSION_RADIUS), 2);
                        const effectiveStrength = REPULSION_STRENGTH * (star.isHypervelocity ? 1.5 : 1);
                        const forceMagnitude = forceFactor * effectiveStrength;
                        dot.vx += (dx / dist) * forceMagnitude; dot.vy += (dy / dist) * forceMagnitude;
                    }
                }
            });

            dots.forEach(dot => {
                let range = new Rectangle(dot.x, dot.y, DOT_REPULSION_RADIUS, DOT_REPULSION_RADIUS);
                let pointsInRange = qtree.query(range);
                for (let otherPoint of pointsInRange) {
                    let otherDot = otherPoint.data;
                    if (dot !== otherDot) {
                        const dx = otherDot.x - dot.x; const dy = otherDot.y - dot.y; const distSq = dx * dx + dy * dy;
                        if (distSq > 0 && distSq < DOT_REPULSION_RADIUS * DOT_REPULSION_RADIUS) {
                            const dist = Math.sqrt(distSq);
                            const force = (DOT_REPULSION_RADIUS - dist) / dist * DOT_REPULSION_STRENGTH;
                            dot.vx -= dx * force; dot.vy -= dy * force;
                        }
                    }
                }

                if (dot.isPulsar) {
                    dot.pulsarPhase += dot.pulsarSpeed; const pulse = (Math.sin(dot.pulsarPhase) + 1) / 2;
                    dot.size = dot.baseSize + pulse * 0.8; dot.opacity = dot.baseOpacity + pulse * 0.2;
                }
                const RESTORATION_STRENGTH = 0.0005;
                dot.vx += (dot.ox - dot.x) * RESTORATION_STRENGTH; dot.vy += (dot.oy - dot.y) * RESTORATION_STRENGTH;
                dot.vx += (dot.ovx - dot.vx) * 0.05; dot.vy += (dot.ovy - dot.vy) * 0.05;
                dot.x += dot.vx; dot.y += dot.vy;
                if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1;
                if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1;
            });

            for (let i = shootingStars.length - 1; i >= 0; i--) {
                const star = shootingStars[i]; star.x += star.vx; star.y += star.vy; star.opacity -= 0.007;
                const tailStartX = star.x - star.vx * star.tailLength, tailStartY = star.y - star.vy * star.tailLength;
                if (tailStartX > canvas.width || tailStartY > canvas.height || star.opacity <= 0) shootingStars.splice(i, 1);
            }

            nebulae.forEach(n => n.draw(canvasCtx));
            shootingStars.forEach(star => { if (star.z < 0.5) drawShootingStar(star); });
            dots.sort((a, b) => a.z - b.z);
            dots.forEach(dot => {
                canvasCtx.fillStyle = `rgba(255, 255, 255, ${dot.opacity})`;
                canvasCtx.beginPath(); canvasCtx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2); canvasCtx.fill();
            });
            shootingStars.forEach(star => { if (star.z >= 0.5) drawShootingStar(star); });

            if (document.body.classList.contains('space-mode-active')) {
                canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.1)'; canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            }

            const now = Date.now();
            if (now > nextShootingStarTimestamp && shootingStars.length < 1) {
                createShootingStar();
                nextShootingStarTimestamp = now + MIN_STAR_INTERVAL + Math.random() * (MAX_STAR_INTERVAL - MIN_STAR_INTERVAL);
            }
            requestAnimationFrame(animateCanvas);
        }

        setupCanvas();
        animateCanvas();
        handleScroll();
    });
})();