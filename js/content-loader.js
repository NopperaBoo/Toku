'use strict';

(function () {
  const cfg = window.CONTENT_CONFIG;
  if (!cfg) return;

  const _productData = {};

  // Calculate relative prefix to site root based on how deep cfg.path is
  // e.g. '../../../content/chakras/muladhara.json' → '../../../'
  const _depth = (cfg.path.match(/\.\.\//g) || []).length;
  const _imgRoot = '../'.repeat(_depth) + 'img/';

  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null && val !== '') el.textContent = val;
  }

  function resolveImgPath(img, imgDir) {
    if (!img) return '';
    if (img.startsWith('http')) return img;
    // Strip leading /img/ if somehow stored as absolute
    const clean = img.replace(/^\/img\//, '');
    // clean is now 'folder/filename' or 'filename'
    if (clean.includes('/')) return _imgRoot + clean;
    return imgDir ? _imgRoot + imgDir + '/' + clean : _imgRoot + clean;
  }

  function generateSlides(containerId, products, imgDir) {
    const container = document.getElementById(containerId);
    if (!container) return;
    _productData[containerId] = products || [];
    container.innerHTML = (products || [])
      .map((p, idx) => {
        const imgPath = resolveImgPath(p.img, imgDir);
        // Background goes directly on .c1 — simplest and most reliable
        const bgStyle = imgPath ? ` style="background-image:url('${imgPath}')"` : '';
        const hasMore = p.desc || (p.sections && p.sections.length > 0);
        return `<div class="swiper-slide c1"${bgStyle}>
        <div class="c2-text">
          <h3>${p.title || ''}</h3>
          ${hasMore ? `<button class="vrcl-btn" data-container="${containerId}" data-idx="${idx}">ვრცლად</button>` : ''}
        </div>
      </div>`;
      })
      .join('');
  }

  // Use capture phase — fires before Swiper's handlers, works on cloned slides
  document.addEventListener(
    'click',
    function (e) {
      const btn = e.target.closest('.vrcl-btn');
      if (!btn) return;
      e.stopPropagation();
      window.openProductModal(btn.dataset.container, parseInt(btn.dataset.idx, 10));
    },
    true
  );

  // ── PRODUCT DETAIL OVERLAY (same structure as crystals/accessories) ─────────

  function ensureDetailOverlay() {
    if (document.getElementById('swiper-item-detail')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="item-detail-overlay" id="swiper-item-detail">
        <div class="item-detail-inner">
          <div class="item-detail-back">← დაბრუნება</div>
          <div class="item-detail-img" id="sid-img"></div>
          <div class="item-detail-body">
            <div class="item-detail-title" id="sid-title"></div>
            <div class="item-detail-price" id="sid-price" style="display:none"></div>
            <div class="item-detail-desc" id="sid-desc"></div>
            <div class="item-detail-sections" id="sid-sections"></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap.firstElementChild);

    const overlay = document.getElementById('swiper-item-detail');
    overlay.querySelector('.item-detail-back').addEventListener('click', closeProductModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeProductModal(); });
  }

  function closeProductModal() {
    const overlay = document.getElementById('swiper-item-detail');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  window.closeProductModal = closeProductModal;

  window.openProductModal = function (containerId, idx) {
    ensureDetailOverlay();
    const products = _productData[containerId] || [];
    const p = products[idx];
    if (!p) return;

    const imgDir = containerId.replace('-slides', '');
    const imgPath = resolveImgPath(p.img, imgDir);

    document.getElementById('sid-img').style.backgroundImage = imgPath ? `url('${imgPath}')` : 'none';
    document.getElementById('sid-title').textContent = p.title || '';

    const priceEl = document.getElementById('sid-price');
    priceEl.textContent = p.price || '';
    priceEl.style.display = p.price ? 'inline-block' : 'none';

    document.getElementById('sid-desc').textContent = p.desc || '';
    document.getElementById('sid-sections').innerHTML = (p.sections || [])
      .map((s) => `
        <div class="item-detail-section">
          <div class="item-detail-section-title">${s.header || ''}</div>
          <div class="item-detail-section-text">${s.text || ''}</div>
        </div>`)
      .join('');

    const overlay = document.getElementById('swiper-item-detail');
    overlay.classList.add('open');
    overlay.scrollTop = 0;
    document.body.style.overflow = 'hidden';
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeProductModal();
  });

  // ── SWIPER INIT ────────────────────────────────────────────────────────────

  // Swiper v11 loop needs at least (maxSlidesPerView * 2 + 1) DOM slides.
  // If there are fewer, duplicate slides in the wrapper until the threshold is met.
  // Cloned slides keep the same data-* attrs so popups still open the right product.
  const MIN_LOOP = 11; // 5 (max spv) * 2 + 1

  function padSwiperSlides(el) {
    const wrapper = el.querySelector('.swiper-wrapper');
    if (!wrapper) return 0;
    const slides = wrapper.querySelectorAll('.swiper-slide');
    const n = slides.length;
    if (n === 0) return 0;
    if (n >= MIN_LOOP) return n;
    const base = Array.from(slides).map((s) => s.outerHTML).join('');
    const times = Math.ceil(MIN_LOOP / n);
    wrapper.innerHTML = base.repeat(times);
    return n; // return original count for initialSlide calc
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

  function initSwipers() {
    document.querySelectorAll('.mySwiper').forEach((el) => {
      const origN = padSwiperSlides(el);
      if (origN === 0) return;
      new Swiper(el, makeSwiperConfig(origN));
    });
  }

  function setupScrollTop() {
    const btn = document.querySelector('.scrollTop');
    if (!btn) return;
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    const check = () => {
      btn.style.display = window.scrollY >= 1000 ? 'block' : 'none';
    };
    window.addEventListener('scroll', check);
    check();
  }

  function renderTags(tags, container) {
    if (!container || !tags) return;
    container.innerHTML = tags
      .map((t) => {
        if (t.type === 'wish') {
          return `<div class="content__tag"><a href="${t.href}" class="wish">${t.label}</a></div>`;
        }
        if (t.type === 'element') {
          return `<div class="content__tag">
          <a href="${t.href}" class="d-flex align-items-center justify-content-center flex-column element-link">
            <div class="element ${t.element} d-flex align-items-center justify-content-center">
              <div class="element-bg"></div>
              <img class="element-img" src="../../../img/elements/${t.element}.svg" alt="" />
            </div>
            <div class="element-title">${t.label}</div>
          </a>
        </div>`;
        }
        return '';
      })
      .join('');
  }

  function applySwipersAndBlogs(d) {
    generateSlides('crystals-slides', d.crystals?.products, 'crystals');
    generateSlides('aromas-slides', d.aromas?.products, 'aromas');
    generateSlides('accessories-slides', d.accessories?.products, 'accessories');

    setEl('crystals-blog-header', d.crystals?.blog_header);
    setEl('crystals-blog-text1', d.crystals?.blog_text1);
    setEl('crystals-blog-text2', d.crystals?.blog_text2);
    setEl('aromas-blog-header', d.aromas?.blog_header);
    setEl('aromas-blog-text1', d.aromas?.blog_text1);
    setEl('aromas-blog-text2', d.aromas?.blog_text2);
    setEl('accessories-blog-header', d.accessories?.blog_header);
    setEl('accessories-blog-text1', d.accessories?.blog_text1);
    setEl('accessories-blog-text2', d.accessories?.blog_text2);
  }

  function applyChakra(d) {
    setEl('page-title', d.title);
    setEl('page-subtitle', d.subtitle);
    setEl('page-desc1', d.desc1);
    setEl('page-desc2', d.desc2);
    setEl('body-subtitle', d.body_subtitle);
    setEl('body-desc', d.body_desc);
    setEl('activation-subtitle', d.activation_subtitle);
    setEl('activation-desc', d.activation_desc);
    const video = document.getElementById('page-video');
    if (video && d.video_url) video.src = d.video_url;
    renderTags(d.tags, document.getElementById('content-tags'));
    applySwipersAndBlogs(d);
  }

  function applySubpage(d) {
    setEl('page-title', d.title);
    setEl('page-desc1', d.desc1);
    setEl('page-desc2', d.desc2);
    setEl('page-header2', d.header2);
    setEl('page-desc3', d.desc3);
    setEl('page-desc4', d.desc4);
    const video = document.getElementById('page-video');
    if (video && d.video_url) video.src = d.video_url;
    if (d.tags) renderTags(d.tags, document.getElementById('content-tags'));
    applySwipersAndBlogs(d);
  }

  // Apply SEO — sets <title> and <meta name="description"> from page JSON
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

  // Apply nav labels and hrefs — matches links by href pattern, no HTML changes needed
  function applyNav(nav) {
    if (!nav) return;
    const prefix = '../'.repeat(_depth); // e.g. '../../../' for 3-level pages
    const links = Array.from(document.querySelectorAll('.navbar-nav .nav-link'));
    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (href.includes('index.html') || href === '../../../' || href.endsWith('../index.html')) {
        if (nav.home_label) link.textContent = nav.home_label;
        if (nav.home_href) link.href = prefix + nav.home_href;
      } else if (href.includes('crystals')) {
        if (nav.crystals_label) link.textContent = nav.crystals_label;
        if (nav.crystals_href) link.href = prefix + nav.crystals_href;
      } else if (href.includes('tarot')) {
        if (nav.tarot_label) link.textContent = nav.tarot_label;
        if (nav.tarot_href) link.href = prefix + nav.tarot_href;
      } else if (href.includes('aroma')) {
        if (nav.aromas_label) link.textContent = nav.aromas_label;
        if (nav.aromas_href) link.href = prefix + nav.aromas_href;
      } else if (href.includes('accessories')) {
        if (nav.accessories_label) link.textContent = nav.accessories_label;
        if (nav.accessories_href) link.href = prefix + nav.accessories_href;
      }
    });
  }

  function applyFooter(g) {
    const f = g.footer || {};
    const setLink = (id, href, text) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (text) el.textContent = text;
      if (href) el.href = href;
    };
    setLink(
      'footer-address',
      f.address ? 'https://maps.google.com/?q=' + encodeURIComponent(f.address) : '',
      f.address
    );
    setLink('footer-phone', f.phone ? 'tel:' + f.phone.replace(/\s/g, '') : '', f.phone);
    setLink('footer-email-link', f.email ? 'mailto:' + f.email : '', f.email);
    if (f.facebook) {
      const a = document.getElementById('footer-facebook');
      if (a) a.href = f.facebook;
    }
    if (f.instagram) {
      const a = document.getElementById('footer-instagram');
      if (a) a.href = f.instagram;
    }
    if (f.whatsapp) {
      const a = document.getElementById('footer-whatsapp');
      if (a) a.href = f.whatsapp;
    }
  }

  async function load() {
    setupScrollTop();
    const globalPath =
      cfg.path.replace(/[^/]+\/[^/]+\.json$/, '').replace(/\/+$/, '') +
      '/../global/global.json';
    try {
      const gr = await fetch(globalPath);
      if (gr.ok) {
        const g = await gr.json();
        applyFooter(g);
        applyNav(g.nav);
      }
    } catch {}
    try {
      const res = await fetch(cfg.path);
      if (!res.ok) return;
      const data = await res.json();
      applySeo(data.seo);
      if (cfg.type === 'chakra') applyChakra(data);
      else applySubpage(data);
    } catch (e) {
      console.warn('content-loader: could not load', cfg.path, e);
    }
    initSwipers();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
