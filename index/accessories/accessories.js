const allAccessories = document.querySelector('.accessories');

fetch('../../content/categories/accessories.json')
  .then((r) => r.json())
  .then((data) => {
    allAccessories.innerHTML = (data.items || [])
      .map((item, i) => {
        const imgStyle = item.img
          ? `url(../../img/accessories/${item.img}) center / cover`
          : '#1a1a1a';
        return `
        <div class="accessorie_item" onclick="openItemDetail(window._accData[${i}],'../../img/accessories/')">
          <div class="interact">
            <div class="accessorie_img" style="background:${imgStyle}"></div>
            <div class="accessorie_desc">${item.desc}</div>
            ${item.price ? `<div class="item-price-badge">${item.price}</div>` : ''}
          </div>
          <div class="accessorie_title">${item.title}</div>
        </div>`;
      })
      .join('');
    window._accData = data.items;
  })
  .catch(() => {});
