const allAromas = document.querySelector('.aromas');

fetch('../../content/categories/aromas.json')
  .then(r => r.json())
  .then(data => {
    allAromas.innerHTML = (data.items || []).map((item, i) => {
      const imgStyle = item.img ? `url(../../img/aromas/${item.img}) center / cover` : '#1a1a1a';
      return `
        <div class="aroma_item" onclick="openItemDetail(window._aromasData[${i}],'../../img/aromas/')">
          <div class="interact">
            <div class="aroma_img" style="background:${imgStyle}"></div>
            <div class="aroma_desc">${item.desc}</div>
            ${item.price ? `<div class="item-price-badge">${item.price}</div>` : ''}
          </div>
          <div class="aroma_title">${item.title}</div>
        </div>`;
    }).join('');
    window._aromasData = data.items;
  })
  .catch(() => {});
