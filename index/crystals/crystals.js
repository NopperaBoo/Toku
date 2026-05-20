const allCrystals = document.querySelector('.crystals');

allCrystals.innerHTML = Array(6).fill('<div class="skeleton-item"></div>').join('');

function renderCrystals(crystals) {
  allCrystals.innerHTML = crystals.map((c, i) => {
    const imgStyle = c.img ? `url(../../img/crystals/${c.img}) center / cover` : '#1a1a1a';
    return `
      <div class="crystal_item" onclick="openItemDetail(window._crystalsData[${i}],'../../img/crystals/')">
        <div class="interact">
          <div class="crystal_img" style="background:${imgStyle}"></div>
        </div>
        <div class="crystal_title">${c.title}</div>
        ${c.price ? `<div class="item-price-badge">${c.price}</div>` : ''}
      </div>`;
  }).join('');
  window._crystalsData = crystals;
}

fetch('../../content/categories/crystals.json')
  .then(r => r.json())
  .then(data => renderCrystals(data.items || []))
  .catch(() => renderCrystals([]));
