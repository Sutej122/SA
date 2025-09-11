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
        
        // NO MOUSE LISTENERS FOR CANVAS INTERACTION

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
                dots.push({ 
                    x: Math.random() * canvas.width, 
                    y: Math.random() * canvas.height, 
                    vx: Math.random() * 0.2 - 0.1, 
                    vy: Math.random() * 0.2 - 0.1,
                    size: Math.random() * 2 + 0.5,
                    opacity: Math.random() * 0.5 + 0.2
                });
            }
        }
        
        function createShootingStar() {
            const side = Math.floor(Math.random() * 2);
            const isFastAndRare = Math.random() < 0.43;

            const star = {
                x: side === 0 ? Math.random() * canvas.width : 0,
                y: side === 0 ? 0 : Math.random() * canvas.height,
                tailLength: 20,
                opacity: 1,
                isFast: isFastAndRare
            };

            if (isFastAndRare) {
                star.vx = Math.random() * 7 + 14;
                star.vy = Math.random() * 7 + 14;
            } else {
                star.vx = Math.random() * 4 + 6;
                star.vy = Math.random() * 4 + 6;
            }

            shootingStars.push(star);
        }

        function animateCanvas() {
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw passive background dots
            dots.forEach(dot => {
                dot.x += dot.vx;
                dot.y += dot.vy;
                if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1;
                if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1;
                
                canvasCtx.fillStyle = `rgba(255, 255, 255, ${dot.opacity})`;
                canvasCtx.beginPath(); 
                canvasCtx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2); 
                canvasCtx.fill();
            });

            // Draw shooting stars
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
                    star.x - star.vx * star.tailLength, star.y - star.vy * star.tailLength
                );

                if (star.isFast) {
                    canvasCtx.shadowColor = 'rgba(173, 216, 230, 0.8)';
                    gradient.addColorStop(0, `rgba(135, 206, 250, ${star.opacity})`);
                    gradient.addColorStop(1, 'rgba(0, 0, 139, 0)');
                } else {
                    canvasCtx.shadowColor = 'rgba(255, 255, 255, 0.8)';
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                }
                
                canvasCtx.beginPath();
                canvasCtx.moveTo(star.x - star.vx * star.tailLength, star.y - star.vy * star.tailLength);
                canvasCtx.lineTo(star.x, star.y);
                canvasCtx.strokeStyle = gradient;
                canvasCtx.lineWidth = star.isFast ? 3.5 : 3;
                canvasCtx.stroke();

                canvasCtx.beginPath();
                canvasCtx.arc(star.x, star.y, star.isFast ? 3 : 2.5, 0, Math.PI * 2);
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