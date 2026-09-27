/* Hotel João de Barro — interações */
(function () {
    'use strict';

    // Configuração central — confirmar números com o hotel antes de publicar
    var CONFIG = {
        whatsapp: '5547997715769',
        bookingBase: 'https://hbook.hsystem.com.br/Booking?companyId=600ad992ab41d60a9cb266fa',
        matterport: 'https://my.matterport.com/show/?play=1&qs=1&m='
    };

    var $ = function (s, c) { return (c || document).querySelector(s); };
    var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

    /* ---------- Header ---------- */
    var header = $('#header');
    var onScroll = function () { header.classList.toggle('is-solid', window.scrollY > 40); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ---------- Menu mobile ---------- */
    var nav = $('#nav');
    var toggle = $('#navToggle');
    var setMenu = function (open) {
        nav.classList.toggle('is-open', open);
        header.classList.toggle('nav-open', open);
        toggle.setAttribute('aria-expanded', open);
        toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
        document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    // Fecha o menu se a tela crescer para o layout de desktop
    window.matchMedia('(min-width: 981px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });

    /* ---------- Link ativo no menu ---------- */
    var links = $$('.nav__link');
    var sections = links.map(function (l) { return $(l.getAttribute('href')); }).filter(Boolean);
    if ('IntersectionObserver' in window) {
        var navObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                links.forEach(function (l) { l.classList.toggle('is-current', l.getAttribute('href') === '#' + e.target.id); });
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        sections.forEach(function (s) { navObs.observe(s); });
    }

    /* ---------- Slider do hero (autoplay + arrastar/deslizar) ---------- */
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hero = $('.hero');
    var slides = $$('.hero__slide');
    var dots = $$('#heroDots button');
    var heroCount = $('#heroCount');
    var current = 0;
    var HERO_DELAY = 6500;
    var heroTimer = null;

    var goTo = function (i) {
        i = (i + slides.length) % slides.length;
        if (i === current) return;
        slides[current].classList.remove('is-active');
        dots[current].classList.remove('is-active');
        current = i;
        slides[current].classList.add('is-active');
        // reinicia a animação da barra de progresso do ponto ativo
        void dots[current].offsetWidth;
        dots[current].classList.add('is-active');
        heroCount.textContent = ('0' + (current + 1)).slice(-2);
    };
    var heroPlay = function () {
        clearInterval(heroTimer);
        if (reduced) return;
        hero.classList.remove('is-paused');
        heroTimer = setInterval(function () { goTo(current + 1); }, HERO_DELAY);
    };
    var heroStep = function (d) { goTo(current + d); heroPlay(); };

    hero.style.setProperty('--hero-delay', HERO_DELAY + 'ms');
    dots.forEach(function (d, i) { d.addEventListener('click', function () { goTo(i); heroPlay(); }); });
    $('#heroPrev').addEventListener('click', function () { heroStep(-1); });
    $('#heroNext').addEventListener('click', function () { heroStep(1); });
    document.addEventListener('visibilitychange', function () { document.hidden ? clearInterval(heroTimer) : heroPlay(); });
    heroPlay();

    // Arrastar com mouse ou dedo em qualquer área livre do hero
    (function () {
        var startX = 0, startY = 0, dx = 0, dragging = false, locked = null;
        var interactive = 'a, button, input, select, textarea, label, form';
        var slideEl = function () { return slides[current]; };

        hero.addEventListener('pointerdown', function (e) {
            if (e.target.closest(interactive) || (e.pointerType === 'mouse' && e.button !== 0)) return;
            dragging = true; locked = null; dx = 0;
            startX = e.clientX; startY = e.clientY;
            hero.classList.add('is-dragging');
            clearInterval(heroTimer);
        });
        window.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            var mx = e.clientX - startX, my = e.clientY - startY;
            if (locked === null && (Math.abs(mx) > 6 || Math.abs(my) > 6)) locked = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
            if (locked !== 'x') return;
            dx = mx;
            slideEl().style.transform = 'translateX(' + dx * 0.25 + 'px) scale(1.02)';
            hero.style.setProperty('--drag', Math.min(Math.abs(dx) / 200, 1));
        });
        var end = function () {
            if (!dragging) return;
            dragging = false;
            hero.classList.remove('is-dragging');
            hero.classList.add('is-settling');
            slideEl().style.transform = '';
            hero.style.removeProperty('--drag');
            setTimeout(function () { hero.classList.remove('is-settling'); }, 700);
            if (locked === 'x' && Math.abs(dx) > 60) goTo(current + (dx < 0 ? 1 : -1));
            heroPlay();
        };
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
        hero.addEventListener('keydown', function (e) {
            if (e.target.closest('input, select, textarea')) return;
            if (e.key === 'ArrowRight') heroStep(1);
            if (e.key === 'ArrowLeft') heroStep(-1);
        });
    })();

    /* ---------- Carrosséis arrastáveis ([data-drag]) ----------
       Toque usa a rolagem nativa (com scroll-snap); o mouse ganha arrastar
       com inércia. Opções: data-autoplay="ms", data-mobile-only, data-dots */
    var makeDraggable = function (track) {
        var mobileOnly = track.hasAttribute('data-mobile-only');
        var mq = window.matchMedia('(max-width: 640px)');
        var active = function () { return !mobileOnly || mq.matches; };
        var items = Array.prototype.slice.call(track.children);
        var isDown = false, moved = false, startX = 0, startScroll = 0, lastX = 0, lastT = 0, vel = 0, raf = null;

        $$('img', track).forEach(function (img) { img.setAttribute('draggable', 'false'); });

        var stepSize = function () {
            var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
            return items[0].getBoundingClientRect().width + gap;
        };
        var maxScroll = function () { return track.scrollWidth - track.clientWidth; };

        // Encaixa no card mais próximo depois da inércia
        var snapTo = function () {
            var s = stepSize();
            var target = Math.round(track.scrollLeft / s) * s;
            track.scrollTo({ left: Math.min(target, maxScroll()), behavior: 'smooth' });
            setTimeout(function () { track.classList.remove('is-dragging'); }, 350);
        };
        var glide = function () {
            vel *= 0.94;
            track.scrollLeft -= vel;
            if (Math.abs(vel) > 0.5) raf = requestAnimationFrame(glide);
            else snapTo();
        };

        track.addEventListener('pointerdown', function (e) {
            if (!active() || e.pointerType !== 'mouse' || e.button !== 0) return;
            isDown = true; moved = false;
            cancelAnimationFrame(raf);
            startX = lastX = e.clientX; lastT = performance.now();
            startScroll = track.scrollLeft; vel = 0;
            track.classList.add('is-grabbing');
            stopAuto();
        });
        window.addEventListener('pointermove', function (e) {
            if (!isDown) return;
            var dx = e.clientX - startX;
            if (!moved && Math.abs(dx) > 5) { moved = true; track.classList.add('is-dragging'); }
            if (!moved) return;
            e.preventDefault();
            track.scrollLeft = startScroll - dx;
            var now = performance.now();
            vel = Math.max(-28, Math.min(28, (e.clientX - lastX) / Math.max(now - lastT, 1) * 16));
            lastX = e.clientX; lastT = now;
        });
        window.addEventListener('pointerup', function () {
            if (!isDown) return;
            isDown = false;
            track.classList.remove('is-grabbing');
            if (moved) raf = requestAnimationFrame(glide);
            startAuto();
        });
        // Evita abrir link/botão ao soltar um arraste
        track.addEventListener('click', function (e) {
            if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
        }, true);

        // Pontos de paginação
        var dotsWrap = null;
        if (track.hasAttribute('data-dots')) {
            dotsWrap = document.createElement('div');
            dotsWrap.className = 'drag-dots';
            items.forEach(function (_, i) {
                var b = document.createElement('button');
                b.setAttribute('aria-label', 'Ir para o item ' + (i + 1));
                b.addEventListener('click', function () { track.scrollTo({ left: i * stepSize(), behavior: 'smooth' }); });
                dotsWrap.appendChild(b);
            });
            track.parentNode.insertBefore(dotsWrap, track.nextSibling);
        }

        // Estado: card em foco, progresso, pontos
        var onScroll = function () {
            var max = maxScroll();
            var pct = max > 0 ? track.scrollLeft / max : 0;
            track.dispatchEvent(new CustomEvent('dragprogress', { detail: { pct: pct, max: max } }));
            var idx = Math.round(track.scrollLeft / stepSize());
            if (pct > 0.98) idx = items.length - 1;
            items.forEach(function (it, i) { it.classList.toggle('is-current', i === idx); });
            if (dotsWrap) Array.prototype.forEach.call(dotsWrap.children, function (d, i) { d.classList.toggle('is-active', i === idx); });
        };
        track.addEventListener('scroll', function () { requestAnimationFrame(onScroll); }, { passive: true });
        window.addEventListener('resize', onScroll);
        onScroll();

        // Autoplay: pausa com mouse em cima, ao interagir ou fora da tela
        var autoDelay = parseInt(track.getAttribute('data-autoplay'), 10);
        var autoTimer = null, visible = false, hovering = false;
        function stopAuto() { clearInterval(autoTimer); }
        function startAuto() {
            stopAuto();
            if (!autoDelay || reduced || !visible || hovering || !active()) return;
            autoTimer = setInterval(function () {
                var next = track.scrollLeft + stepSize();
                track.scrollTo({ left: next > maxScroll() + 4 ? 0 : next, behavior: 'smooth' });
            }, autoDelay);
        }
        if (autoDelay) {
            track.addEventListener('mouseenter', function () { hovering = true; stopAuto(); });
            track.addEventListener('mouseleave', function () { hovering = false; startAuto(); });
            track.addEventListener('touchstart', function () { stopAuto(); }, { passive: true });
            track.addEventListener('touchend', function () { setTimeout(startAuto, 3000); }, { passive: true });
            if ('IntersectionObserver' in window) {
                new IntersectionObserver(function (en) { visible = en[0].isIntersecting; visible ? startAuto() : stopAuto(); }, { threshold: 0.3 }).observe(track);
            }
        }

        return {
            step: function (dir) {
                stopAuto();
                track.scrollBy({ left: dir * stepSize(), behavior: 'smooth' });
                startAuto();
            }
        };
    };

    var carousels = {};
    $$('[data-drag]').forEach(function (t) { carousels[t.id || t.className] = makeDraggable(t); });

    /* ---------- Animações de entrada ---------- */
    var reveals = $$('.reveal');
    if ('IntersectionObserver' in window && !reduced) {
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        reveals.forEach(function (el) { obs.observe(el); });
    } else {
        reveals.forEach(function (el) { el.classList.add('is-in'); });
    }

    /* ---------- Reserva (hSystem) ---------- */
    var checkin = $('#checkin');
    var checkout = $('#checkout');
    var adults = $('#adults');

    var iso = function (d) { return d.toISOString().slice(0, 10); };
    var br = function (v) { var p = v.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
    var addDays = function (v, n) { var d = new Date(v + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };

    var today = iso(new Date());
    checkin.min = today;
    checkin.value = addDays(today, 7);
    checkout.min = addDays(checkin.value, 1);
    checkout.value = addDays(checkin.value, 3);

    checkin.addEventListener('change', function () {
        if (!checkin.value) return;
        checkout.min = addDays(checkin.value, 1);
        if (!checkout.value || checkout.value <= checkin.value) checkout.value = addDays(checkin.value, 2);
    });

    var bookingUrl = function () {
        var url = CONFIG.bookingBase;
        if (checkin.value && checkout.value && checkout.value > checkin.value) {
            url += '&checkin=' + br(checkin.value) + '&checkout=' + br(checkout.value) + '&adults=' + adults.value;
        }
        return url;
    };

    $('#bookingForm').addEventListener('submit', function (e) {
        e.preventDefault();
        window.open(bookingUrl(), '_blank', 'noopener');
    });
    $$('[data-book]').forEach(function (a) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
        a.href = CONFIG.bookingBase;
        a.addEventListener('click', function () { a.href = bookingUrl(); });
    });

    /* ---------- WhatsApp ---------- */
    var waLink = function (msg) { return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(msg); };
    $$('[data-wa]').forEach(function (a) {
        a.href = waLink(a.getAttribute('data-wa'));
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
    });

    $('#msgForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = 'Olá! Meu nome é ' + $('#msgName').value.trim() + '.';
        var dates = $('#msgDates').value.trim();
        if (dates) msg += '\nDatas: ' + dates;
        msg += '\n\n' + $('#msgText').value.trim();
        window.open(waLink(msg), '_blank', 'noopener');
    });

    /* ---------- Tour 360° (seção) ---------- */
    var frame = $('#tourFrame');
    var poster = $('#tourPoster');
    var tabs = $$('.tour__tab');
    var activeModel = tabs[0].getAttribute('data-model');

    var loadTour = function (model) {
        var ifr = $('iframe', frame);
        if (!ifr) {
            ifr = document.createElement('iframe');
            ifr.setAttribute('allow', 'fullscreen; xr-spatial-tracking');
            ifr.setAttribute('allowfullscreen', '');
            ifr.title = 'Tour virtual 360° do Hotel João de Barro';
            frame.appendChild(ifr);
        }
        ifr.src = CONFIG.matterport + model;
        poster.hidden = true;
    };

    poster.addEventListener('click', function () { loadTour(activeModel); });
    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            tabs.forEach(function (t) { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
            tab.classList.add('is-active');
            tab.setAttribute('aria-selected', 'true');
            activeModel = tab.getAttribute('data-model');
            $('#tourLabel').textContent = tab.textContent;
            if (poster.hidden) loadTour(activeModel);
        });
    });

    /* ---------- Tour 360° (modal das suítes) ---------- */
    var modal = $('#tourModal');
    var modalBody = $('#modalBody');
    var lastFocus = null;
    var closeModal = function () {
        modal.hidden = true;
        modalBody.innerHTML = '';
        document.body.style.overflow = '';
        lastFocus && lastFocus.focus();
    };
    $$('[data-tour]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            lastFocus = btn;
            $('#modalTitle').textContent = 'Tour 360° — ' + btn.getAttribute('data-tour-title');
            modalBody.innerHTML = '<iframe allow="fullscreen; xr-spatial-tracking" allowfullscreen title="Tour virtual 360°" src="' +
                CONFIG.matterport + btn.getAttribute('data-tour') + '"></iframe>';
            modal.hidden = false;
            document.body.style.overflow = 'hidden';
            $('#modalClose').focus();
        });
    });
    $('#modalClose').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (!modal.hidden) closeModal();
        else if (nav.classList.contains('is-open')) setMenu(false);
    });

    /* ---------- Carrossel da região ---------- */
    var track = $('#carouselTrack');
    var regiao = carousels.carouselTrack;
    var carPrev = $('#carPrev');
    var carNext = $('#carNext');
    var bar = $('#carProgress');
    carPrev.addEventListener('click', function () { regiao.step(-1); });
    carNext.addEventListener('click', function () { regiao.step(1); });
    track.addEventListener('dragprogress', function (e) {
        var visibleShare = track.clientWidth / track.scrollWidth;
        bar.style.width = (visibleShare + (1 - visibleShare) * e.detail.pct) * 100 + '%';
        carPrev.disabled = e.detail.pct <= 0.01;
        carNext.disabled = e.detail.pct >= 0.99;
    });
    track.dispatchEvent(new Event('scroll'));

    /* ---------- Ano no rodapé ---------- */
    $('#year').textContent = new Date().getFullYear();
})();
