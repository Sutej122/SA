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
        let dots = []; 
        
        let shootingStars = [];
        const MIN_STAR_INTERVAL = 1500; 
        const MAX_STAR_INTERVAL = 5000; 
        let nextShootingStarTimestamp = Date.now() + 2000; 
        
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
            let iteration = 0;
            const interval = setInterval(() => {
                event.target.innerText = event.target.innerText
                    .split("")
                    .map((letter, index) => {
                        if (index < iteration) {
                            return event.target.dataset.value[index];
                        }
                        return "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
                    })
                    .join("");

                if (iteration >= event.target.dataset.value.length) {
                    clearInterval(interval);
                }
                iteration += 1 / 3;
            }, 30);
        });
        
        function setupCanvas() {
            canvas.width = window.innerWidth; canvas.height = window.innerHeight;
            dots = [];
            const dotsDensity = window.innerWidth < 768 ? 20000 : 9000;
            const dotsCount = Math.floor((canvas.width * canvas.height) / dotsDensity);
            for (let i = 0; i < dotsCount; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const vx = Math.random() * 0.2 - 0.1; 
                const vy = Math.random() * 0.2 - 0.1;
                dots.push({ 
                    x: x, 
                    y: y,
                    ox: x, 
                    oy: y, 
                    vx: vx, 
                    vy: vy,
                    ovx: vx,
                    ovy: vy, 
                    size: Math.random() * 2 + 0.5,
                    opacity: Math.random() * 0.5 + 0.2
                });
            }
        }
        
        function createShootingStar() {
            const side = Math.floor(Math.random() * 2);
            const star = {
                x: side === 0 ? Math.random() * canvas.width : 0,
                y: side === 0 ? 0 : Math.random() * canvas.height,
                tailLength: 20,
                opacity: 1,
                isFast: false,
                isHypervelocity: false 
            };

            const rand = Math.random();

            if (rand < 0.20) { // 20% chance for a hypervelocity star
                star.isHypervelocity = true;
                star.vx = Math.random() * 10 + 25; 
                star.vy = Math.random() * 10 + 25;
                star.tailLength = 30; 
            } else if (rand < 0.6) { // 40% chance for a fast star (from 0.20 to 0.60)
                star.isFast = true;
                star.vx = Math.random() * 7 + 14;
                star.vy = Math.random() * 7 + 14;
            } else { // 40% chance for a regular star
                star.vx = Math.random() * 4 + 6;
                star.vy = Math.random() * 4 + 6;
            }

            shootingStars.push(star);
        }

        function animateCanvas() {
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

            const REPULSION_RADIUS = 150; 
            const REPULSION_STRENGTH = 0.03; 
            
            shootingStars.forEach(star => {
                const shootingStarSpeed = Math.sqrt(star.vx * star.vx + star.vy * star.vy);
                dots.forEach(dot => {
                    const dx = dot.x - star.x;
                    const dy = dot.y - star.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < REPULSION_RADIUS) {
                        const forceDirectionX = dx / distance;
                        const forceDirectionY = dy / distance;
                        const forceMagnitude = (REPULSION_RADIUS - distance) / REPULSION_RADIUS;
                        const totalRepulsion = forceMagnitude * shootingStarSpeed * REPULSION_STRENGTH;
                        
                        dot.vx += forceDirectionX * totalRepulsion;
                        dot.vy += forceDirectionY * totalRepulsion;
                    }
                });
            });
            
            dots.forEach(dot => {
                const RESTORATION_STRENGTH = 0.0005; 
                dot.vx += (dot.ox - dot.x) * RESTORATION_STRENGTH;
                dot.vy += (dot.oy - dot.y) * RESTORATION_STRENGTH;
                
                dot.vx += (dot.ovx - dot.vx) * 0.05;
                dot.vy += (dot.ovy - dot.vy) * 0.05;
                
                dot.x += dot.vx;
                dot.y += dot.vy;
                if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1;
                if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1;
                
                canvasCtx.fillStyle = `rgba(255, 255, 255, ${dot.opacity})`;
                canvasCtx.beginPath(); 
                canvasCtx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2); 
                canvasCtx.fill();
            });

            const now = Date.now();
            if (now > nextShootingStarTimestamp && shootingStars.length < 1) {
                createShootingStar();
                nextShootingStarTimestamp = now + MIN_STAR_INTERVAL + Math.random() * (MAX_STAR_INTERVAL - MIN_STAR_INTERVAL);
            }

            for (let i = shootingStars.length - 1; i >= 0; i--) {
                const star = shootingStars[i];
                star.x += star.vx;
                star.y += star.vy;
                star.opacity -= 0.007;

                const tailStartX = star.x - star.vx * star.tailLength;
                const tailStartY = star.y - star.vy * star.tailLength;

                if (tailStartX > canvas.width || tailStartY > canvas.height || star.opacity <= 0) {
                    shootingStars.splice(i, 1);
                    continue;
                }
                
                canvasCtx.shadowBlur = 20;
                
                const gradient = canvasCtx.createLinearGradient(
                    star.x, star.y, 
                    tailStartX, tailStartY
                );

                let lineWidth, headSize;

                if (star.isHypervelocity) {
                    canvasCtx.shadowColor = 'rgba(226, 88, 214, 0.8)';
                    gradient.addColorStop(0, `rgba(255, 0, 150, ${star.opacity})`);
                    gradient.addColorStop(0.5, `rgba(138, 43, 226, ${star.opacity * 0.8})`);
                    gradient.addColorStop(1, 'rgba(255, 20, 147, 0)');
                    lineWidth = 4;
                    headSize = 3.5;
                } else if (star.isFast) {
                    canvasCtx.shadowColor = 'rgba(173, 216, 230, 0.8)';
                    gradient.addColorStop(0, `rgba(135, 206, 250, ${star.opacity})`);
                    gradient.addColorStop(1, 'rgba(0, 0, 139, 0)');
                    lineWidth = 3.5;
                    headSize = 3;
                } else {
                    canvasCtx.shadowColor = 'rgba(255, 255, 255, 0.8)';
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    lineWidth = 3;
                    headSize = 2.5;
                }
                
                canvasCtx.beginPath();
                canvasCtx.moveTo(tailStartX, tailStartY);
                canvasCtx.lineTo(star.x, star.y);
                canvasCtx.strokeStyle = gradient;
                canvasCtx.lineWidth = lineWidth;
                canvasCtx.stroke();

                canvasCtx.beginPath();
                canvasCtx.arc(star.x, star.y, headSize, 0, Math.PI * 2);
                canvasCtx.fillStyle = `rgba(255, 255, 255, ${star.opacity * 0.9})`;
                canvasCtx.fill();

                canvasCtx.shadowBlur = 0;
            }

            requestAnimationFrame(animateCanvas);
        }

        setupCanvas();
        animateCanvas();
        handleScroll();
    });
})();