'use strict';

(function () {
  function setEl(id, val) {
    if (!val) return;
    const el = document.getElementById(id);
    if (el) {
      // For zodiac/planet headers: they contain a child .zodiac-header-bg/.planet-header-bg
      // so set textContent on a text node, not overwriting children
      const bg = el.querySelector('.zodiac-header-bg, .planet-header-bg');
      if (bg) {
        // Replace only the text node (last child)
        const nodes = Array.from(el.childNodes);
        const textNode = nodes.find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
        if (textNode) textNode.textContent = ' ' + val;
        else el.appendChild(document.createTextNode(' ' + val));
      } else {
        el.textContent = val;
      }
    }
  }

  function setLink(id, href, text) {
    const el = document.getElementById(id);
    if (!el) return;
    if (text) el.textContent = text;
    if (href) el.href = href;
  }

  // Apply nav labels and hrefs to homepage nav links by href pattern
  function applyNav(nav) {
    if (!nav) return;
    const links = Array.from(document.querySelectorAll('.navbar-nav .nav-link'));
    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (href.includes('index.html') || href === './' || href === './index.html') {
        if (nav.home_label) link.textContent = nav.home_label;
        if (nav.home_href) link.href = nav.home_href;
      } else if (href.includes('crystals')) {
        if (nav.crystals_label) link.textContent = nav.crystals_label;
        if (nav.crystals_href) link.href = nav.crystals_href;
      } else if (href.includes('tarot')) {
        if (nav.tarot_label) link.textContent = nav.tarot_label;
        if (nav.tarot_href) link.href = nav.tarot_href;
      } else if (href.includes('aroma')) {
        if (nav.aromas_label) link.textContent = nav.aromas_label;
        if (nav.aromas_href) link.href = nav.aromas_href;
      } else if (href.includes('accessories')) {
        if (nav.accessories_label) link.textContent = nav.accessories_label;
        if (nav.accessories_href) link.href = nav.accessories_href;
      }
    });
  }

  function applySeo(seo) {
    if (!seo) return;
    if (seo.title) document.title = seo.title;
    if (seo.description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = seo.description;
    }
  }

  // ── SWIPER ────────────────────────────────────────────────────────────────────

  let _swiperData = [];

  function resolveImg(img) {
    if (!img) return '';
    if (img.startsWith('http') || img.startsWith('/')) return img;
    if (img.includes('/')) return './img/' + img;
    return './img/' + img;
  }

  function renderSwiperSlides(products) {
    const wrapper = document.getElementById('home-accessories-slides');
    if (!wrapper) return;
    _swiperData = products;
    wrapper.innerHTML = products
      .map((p, idx) => {
        const imgPath = resolveImg(p.img);
        const bgStyle = imgPath ? `background-image:url('${imgPath}')` : '';
        const hasMore = p.desc || (p.sections && p.sections.length > 0);
        return `<div class="swiper-slide c1" style="${bgStyle}">
          <div class="c2-text">
            <h3>${p.title || ''}</h3>
            ${hasMore ? `<button class="vrcl-btn" data-swiper-idx="${idx}">ვრცლად</button>` : ''}
          </div>
        </div>`;
      })
      .join('');
  }

  // Capture-phase delegation — works on Swiper cloned slides
  document.addEventListener(
    'click',
    function (e) {
      const btn = e.target.closest('[data-swiper-idx]');
      if (!btn) return;
      e.stopPropagation();
      openSwiperDetail(parseInt(btn.dataset.swiperIdx, 10));
    },
    true
  );

  function openSwiperDetail(idx) {
    const p = _swiperData[idx];
    if (!p) return;
    const overlay = document.getElementById('item-detail');
    if (!overlay) return;

    const imgPath = resolveImg(p.img);
    overlay.querySelector('.item-detail-img').style.backgroundImage = imgPath ? `url('${imgPath}')` : 'none';
    overlay.querySelector('.item-detail-title').textContent = p.title || '';

    const priceEl = overlay.querySelector('.item-detail-price');
    priceEl.textContent = p.price || '';
    priceEl.style.display = p.price ? 'inline-block' : 'none';

    overlay.querySelector('.item-detail-desc').textContent = p.desc || '';
    overlay.querySelector('.item-detail-sections').innerHTML = (p.sections || [])
      .map((s) => `
        <div class="item-detail-section">
          <div class="item-detail-section-title">${s.header || ''}</div>
          <div class="item-detail-section-text">${s.text || ''}</div>
        </div>`)
      .join('');

    overlay.classList.add('open');
    overlay.scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }

  function initOverlay() {
    const overlay = document.getElementById('item-detail');
    if (!overlay) return;
    const close = () => { overlay.classList.remove('open'); document.body.style.overflow = ''; };
    overlay.querySelector('.item-detail-back').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  const MIN_LOOP = 11;

  function padSwiperSlides(el) {
    const wrapper = el.querySelector('.swiper-wrapper');
    if (!wrapper) return 0;
    const slides = wrapper.querySelectorAll('.swiper-slide');
    const n = slides.length;
    if (n === 0) return 0;
    if (n >= MIN_LOOP) return n;
    const base = Array.from(slides).map((s) => s.outerHTML).join('');
    wrapper.innerHTML = base.repeat(Math.ceil(MIN_LOOP / n));
    return n;
  }

  function makeSwiperConfig(origN) {
    return {
      effect: 'coverflow',
      grabCursor: true,
      centeredSlides: true,
      loop: origN > 1,
      initialSlide: Math.floor(origN / 2),
      breakpoints: {
        100:  { slidesPerView: 1, coverflowEffect: { rotate: 40, stretch: 10,  depth: 40, modifier: 1, scale: 0.9  }, autoplay: { delay: 5000 } },
        550:  { slidesPerView: 2, coverflowEffect: { rotate: 0,  stretch: 130, depth: 50, modifier: 1, scale: 0.8  }, autoplay: { delay: 5000 } },
        700:  { slidesPerView: 3, coverflowEffect: { rotate: 0,  stretch: -10, depth: 50, modifier: 1, scale: 0.85 }, autoplay: { delay: 5000 } },
        910:  { slidesPerView: 4, coverflowEffect: { rotate: 0,  stretch: -10, depth: 50, modifier: 1, scale: 0.85 }, autoplay: { delay: 5000 } },
        1121: { slidesPerView: 5, coverflowEffect: { rotate: 0,  stretch: -30, depth: 50, modifier: 1, scale: 0.85 }, autoplay: { delay: 5000 } },
      },
    };
  }

  function initHomeSwiper() {
    const el = document.getElementById('home-accessories-swiper');
    if (!el || typeof Swiper === 'undefined') return;
    const origN = padSwiperSlides(el);
    if (origN === 0) return;
    if (el.swiper) el.swiper.destroy(true, true);
    new Swiper(el, makeSwiperConfig(origN));
  }

  // ── MAIN LOAD ────────────────────────────────────────────────────────────────

  async function load() {
    initOverlay();

    const [globalRes, homeRes] = await Promise.all([
      fetch('./content/global/global.json').catch(() => null),
      fetch('./content/home/home.json').catch(() => null),
    ]);

    if (globalRes?.ok) {
      const g = await globalRes.json();

      applyNav(g.nav);

      const fn = g.friday_night || {};
      setEl('fn-title', fn.title);
      setEl('fn-text', fn.text);
      setEl('fn-btn', fn.button_text);
      const fnLink = document.getElementById('fn-btn-link');
      if (fnLink && fn.button_href) fnLink.href = fn.button_href;

      const f = g.footer || {};
      setLink('footer-address', f.address ? 'https://maps.google.com/?q=' + encodeURIComponent(f.address) : '', f.address);
      setLink('footer-phone', f.phone ? 'tel:' + f.phone.replace(/\s/g, '') : '', f.phone);
      setLink('footer-email-link', f.email ? 'mailto:' + f.email : '', f.email);
      if (f.facebook)  { const a = document.getElementById('footer-facebook');  if (a) a.href = f.facebook; }
      if (f.instagram) { const a = document.getElementById('footer-instagram'); if (a) a.href = f.instagram; }
      if (f.whatsapp)  { const a = document.getElementById('footer-whatsapp');  if (a) a.href = f.whatsapp; }

      // Swiper products are stored in global.json under key 'swiper'
      renderSwiperSlides(g.swiper?.products || []);
      initHomeSwiper();
    }

    if (homeRes?.ok) {
      const h = await homeRes.json();
      applySeo(h.seo);
      setEl('home-zodiac-header', h.zodiac_header);
      setEl('home-planet-header', h.planet_header);
      setEl('home-accessories-header', h.accessories_header);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
