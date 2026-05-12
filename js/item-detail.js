'use strict';

// Shared item-detail popup — used by crystals, aromas, accessories, tarots pages.
// Expects a .item-detail-overlay div in the HTML.

(function () {
  const overlay = document.getElementById('item-detail');
  if (!overlay) return;

  const backBtn  = overlay.querySelector('.item-detail-back');
  const imgEl    = overlay.querySelector('.item-detail-img');
  const titleEl  = overlay.querySelector('.item-detail-title');
  const priceEl  = overlay.querySelector('.item-detail-price');
  const descEl   = overlay.querySelector('.item-detail-desc');
  const sectionsEl = overlay.querySelector('.item-detail-sections');

  backBtn?.addEventListener('click', closeDetail);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeDetail(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });

  function closeDetail() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  window.openItemDetail = function (item, imgBase) {
    if (imgEl)  {
      imgEl.style.backgroundImage = item.img
        ? `url(${imgBase}${item.img})`
        : 'none';
    }
    if (titleEl)    titleEl.textContent  = item.title || '';
    if (priceEl)    {
      priceEl.textContent = item.price || '';
      priceEl.style.display = item.price ? 'inline-block' : 'none';
    }
    if (descEl)     descEl.textContent  = item.details || item.desc || '';
    if (sectionsEl) {
      sectionsEl.innerHTML = (item.sections || []).map(s => `
        <div class="item-detail-section">
          <div class="item-detail-section-title">${s.header || ''}</div>
          <div class="item-detail-section-text">${s.text || ''}</div>
        </div>`).join('');
    }
    overlay.classList.add('open');
    overlay.scrollTop = 0;
    document.body.style.overflow = 'hidden';
  };

  // Load footer from global.json (category pages are 2 levels deep)
  fetch('../../content/global/global.json')
    .then(r => r.json())
    .then(g => {
      const f = g.footer || {};
      const setLink = (id, href, text) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (text) el.textContent = text;
        if (href) el.href = href;
      };
      setLink('footer-address',    f.address ? 'https://maps.google.com/?q=' + encodeURIComponent(f.address) : '', f.address);
      setLink('footer-phone',      f.phone ? 'tel:' + f.phone.replace(/\s/g,'') : '', f.phone);
      setLink('footer-email-link', f.email ? 'mailto:' + f.email : '', f.email);
      if (f.facebook)  { const a = document.getElementById('footer-facebook');  if (a) a.href = f.facebook; }
      if (f.instagram) { const a = document.getElementById('footer-instagram'); if (a) a.href = f.instagram; }
      if (f.whatsapp)  { const a = document.getElementById('footer-whatsapp');  if (a) a.href = f.whatsapp; }
    }).catch(() => {});
})();
