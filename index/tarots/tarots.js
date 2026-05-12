const allTarots = document.querySelector('.tarots');

fetch('../../content/categories/tarots.json')
  .then(r => r.json())
  .then(data => {
    allTarots.innerHTML = (data.items || []).map((item, i) => {
      const imgStyle = item.img ? `url(../../img/tarots/${item.img}) center / cover` : '#1a1a1a';
      return `
        <div class="tarot_item" onclick="openItemDetail(window._tarotsData[${i}],'../../img/tarots/')">
          <div class="interact">
            <div class="tarot_img" style="background:${imgStyle}"></div>
            <div class="tarot_desc">${item.desc}</div>
            <div class="tarot_title">${item.title}</div>
            ${item.price ? `<div class="item-price-badge">${item.price}</div>` : ''}
          </div>
        </div>`;
    }).join('');
    window._tarotsData = data.items;
  })
  .catch(() => {});
