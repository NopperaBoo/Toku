'use strict';

// ─── PAGE MANIFEST ────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  home: 'მთავარი გვერდი',
  chakras: 'ჩაკრები',
  zodiac: 'ზოდიაქო',
  planets: 'პლანეტები',
  elements: 'ელემენტები',
  wishes: 'სურვილები',
  categories: 'კატეგორიები',
  global: 'მთავარი გვერდი',
};

const PAGE_PATHS = {
  home:    ()   => `/index.html`,
  chakras: (id) => `/index/chakras/${id}/${id}.html`,
  zodiac: (id) =>
    id === 'capricorn'
      ? `/index/zodiac/capricornus/capricornus.html`
      : `/index/zodiac/${id}/${id}.html`,
  planets: (id) => `/index/planet/${id}/${id}.html`,
  elements: (id) => `/index/elements/${id}/${id}.html`,
  wishes: (id) => `/index/wishes/${id}/${id}.html`,
  categories: (id) => `/index/${id}/${id}.html`,
  global: () => `/index.html`,
};

let pages = [];
let currentPage = null;
let currentData = null;
let selectedItemIdx = -1;

// Swiper inline editor state — keyed by section key (e.g. 'crystals')
let swiperSelectedIdx = {};   // { crystals: 2, aromas: -1 }
let currentSwiperSection = null; // which section's image picker is open

let imgPickerTarget = 'item'; // 'item' | 'swiper'
let imgFolders = [];

async function init() {
  const [pagesRes] = await Promise.all([fetch('/api/pages')]);
  pages = await pagesRes.json();
  // Pre-fetch folders so they're ready when swiper sections render
  try {
    const fr = await fetch('/api/image-folders');
    if (fr.ok) imgFolders = await fr.json();
  } catch {}
  renderSidebar();
}

function renderSidebar() {
  const groups = {};
  pages.forEach((p) => {
    if (!groups[p.category]) groups[p.category] = [];
    groups[p.category].push(p);
  });
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = Object.entries(groups)
    .map(
      ([cat, items]) => `
    <div class="nav-group" data-cat="${cat}">
      <div class="nav-group-header" onclick="toggleGroup(this)">
        <span>${CATEGORY_LABELS[cat] || cat}</span>
        <span class="nav-group-arrow">▶</span>
      </div>
      <div class="nav-group-items">
        ${items
          .map(
            (p) => `
          <div class="nav-item" data-id="${p.category}/${p.id}" onclick="loadPage('${p.category}','${p.id}','${p.type}','${p.label}','${p.imgDir || ''}')">
            ${p.label}
          </div>`
          )
          .join('')}
      </div>
    </div>`
    )
    .join('');
}

function toggleGroup(header) {
  header.closest('.nav-group').classList.toggle('open');
}

async function loadPage(category, id, type, label, imgDir) {
  document.querySelectorAll('.nav-item').forEach((el) => el.classList.remove('active'));
  document.querySelector(`.nav-item[data-id="${category}/${id}"]`)?.classList.add('active');
  document.getElementById('topbar-page').textContent = label;
  selectedItemIdx = -1;
  swiperSelectedIdx = {};
  try {
    const res = await fetch(`/api/content/${category}/${id}`);
    currentData = res.ok ? await res.json() : {};
  } catch {
    currentData = {};
  }
  currentPage = { category, id, type, label, imgDir };
  const pathFn = PAGE_PATHS[category];
  const pagePath = pathFn ? pathFn(id) : null;
  document.getElementById('btn-save').style.display = 'block';
  document.getElementById('btn-preview').style.display = pagePath ? 'block' : 'none';
  document.getElementById('btn-preview').dataset.path = pagePath || '';
  renderEditor(type, currentData);
}

function previewPage() {
  const p = document.getElementById('btn-preview').dataset.path;
  if (p) window.open(p, '_blank');
}

async function savePage() {
  if (!currentPage) return;
  flushAllSwiperEditors();
  const data = collectForm();
  try {
    const res = await fetch(`/api/content/${currentPage.category}/${currentPage.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error();
    currentData = data;
    showToast('შენახულია');
  } catch {
    showToast('შეცდომა!', true);
  }
}

// ─── AUTO-SAVE ────────────────────────────────────────────────────────────────

let autoSaveTimer = null;

function scheduleAutoSave() {
  if (!currentPage) return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    if (!currentPage) return;
    flushAllSwiperEditors();
    const data = collectForm();
    try {
      const res = await fetch(`/api/content/${currentPage.category}/${currentPage.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) currentData = data;
    } catch {}
  }, 1500);
}

document.addEventListener('input', (e) => {
  if (e.target.closest('#editor')) scheduleAutoSave();
});

function showToast(msg, error = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (error ? ' error' : '');
  setTimeout(() => { t.className = 'toast'; }, 2800);
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────

function renderEditor(type, data) {
  const editor = document.getElementById('editor');
  const map = {
    home: renderHome,
    chakra: renderChakra,
    zodiac: renderZodiac,
    planet: renderPlanet,
    element: renderElement,
    wish: renderWish,
    global: renderGlobal,
    'items-page': renderItemsPage,
  };
  editor.innerHTML = (map[type] || renderGeneric)(data);
  initSections();
}

// ─── SHARED FIELD HELPERS ─────────────────────────────────────────────────────

function initSections() {
  document.querySelectorAll('.section-header').forEach((h) => {
    h.addEventListener('click', () => h.closest('.section').classList.toggle('open'));
  });
  refreshTagPoolState();
}

function section(title, body, open = false) {
  return `<div class="section ${open ? 'open' : ''}">
    <div class="section-header"><span>${title}</span><span class="section-arrow">▶</span></div>
    <div class="section-body">${body}</div>
  </div>`;
}

function field(label, key, value = '', type = 'text') {
  if (type === 'textarea')
    return `<div class="field"><label>${label}</label><textarea data-key="${key}" rows="3">${esc(value)}</textarea></div>`;
  return `<div class="field"><label>${label}</label><input type="${type}" data-key="${key}" value="${esc(value)}" /></div>`;
}

function fieldsRow(...fields) {
  return `<div class="fields-row">${fields.join('')}</div>`;
}

function blogFields(prefix, data = {}) {
  return `
    ${field('ბლოგ სათაური', prefix + '.blog_header', data.blog_header)}
    ${field('ბლოგ ტექსტი 1', prefix + '.blog_text1', data.blog_text1, 'textarea')}
    ${field('ბლოგ ტექსტი 2', prefix + '.blog_text2', data.blog_text2, 'textarea')}`;
}

// ─── SWIPER SECTION (inline editor, same layout as items-page) ────────────────

function swipSection(key, label, data = {}, withBlog = true) {
  const folderOptions = imgFolders
    .map((f) => `<option value="${f}"${f === (data.defaultImgDir || '') ? ' selected' : ''}>${f}</option>`)
    .join('');

  return section(
    label,
    `
    ${withBlog ? blogFields(key, data) : ''}
    <div class="swiper-dir-row">
      <span class="products-label">სურათების ფოლდერი</span>
      <select class="folder-select" data-key="${key}.defaultImgDir"
              onchange="setSwiperDefaultDir('${key}', this.value)">
        <option value="">— არ არის —</option>
        ${folderOptions}
      </select>
    </div>
    <div class="items-toolbar" style="margin-top:12px">
      <span class="items-count">${(data.products || []).length} ელემენტი</span>
      <button class="btn-add-item" onclick="addProduct('${key}')">+ ახალი</button>
    </div>
    <div class="items-grid" id="products-${key}">
      ${(data.products || []).map((p, i) => swiperThumb(key, i, p)).join('')}
    </div>
    <div class="item-editor-panel" id="swiper-editor-${key}" style="display:none"></div>`
  );
}

function swiperThumb(sKey, idx, p = {}) {
  const sData = getSwiperData(sKey);
  const imgDir = sData.defaultImgDir || sKey;
  const imgSrc = p.img ? resolveImgSrc(p.img, imgDir) : '';
  const bg = imgSrc
    ? `background-image:url('${imgSrc}');background-size:cover;background-position:center`
    : 'background:#1a1a1a';
  const isActive = swiperSelectedIdx[sKey] === idx;
  return `
    <div class="item-thumb${isActive ? ' active' : ''}" data-section="${sKey}" data-idx="${idx}"
         onclick="selectSwiperProduct('${sKey}', ${idx})">
      <div class="item-thumb-img" style="${bg}">
        ${!imgSrc ? '<span class="item-thumb-noimg">+</span>' : ''}
      </div>
      <div class="item-thumb-name">${esc(p.title || '—')}</div>
      <button class="item-thumb-del" onclick="event.stopPropagation();deleteSwiperProduct('${sKey}',${idx})">✕</button>
    </div>`;
}

function setSwiperDefaultDir(key, value) {
  const sData = getSwiperData(key);
  sData.defaultImgDir = value;
}

function getSwiperData(key) {
  if (!currentData[key]) currentData[key] = {};
  return currentData[key];
}

// ─── SWIPER INLINE EDITOR ────────────────────────────────────────────────────

function selectSwiperProduct(key, idx) {
  swiperSelectedIdx[key] = idx;
  document.querySelectorAll(`#products-${key} .item-thumb`).forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
  renderSwiperInlineEditor(key, idx);
}

function renderSwiperInlineEditor(key, idx) {
  const panel = document.getElementById(`swiper-editor-${key}`);
  if (!panel) return;

  const sData = getSwiperData(key);
  const p = (sData.products || [])[idx] || {};
  const imgDir = sData.defaultImgDir || key;
  const imgSrc = p.img ? resolveImgSrc(p.img, imgDir) : '';
  const bgStyle = imgSrc
    ? `background-image:url('${imgSrc}');background-size:cover;background-position:center`
    : '';

  panel.style.display = 'block';
  panel.innerHTML = `
    <div class="item-editor-header">
      <span class="item-editor-title">${esc(p.title || 'ახალი')}</span>
      <button class="btn-close-editor" onclick="closeSwiperInlineEditor('${key}')">დახურვა</button>
    </div>
    <div class="item-editor-body">
      <div class="item-editor-top">
        <div class="item-editor-img-area">
          <div class="item-editor-img" id="swiper-img-${key}"
               style="${bgStyle}"
               onclick="openImagePickerForSwiper('${key}')">
            ${!imgSrc ? '<div class="img-placeholder">სურათის არჩევა</div>' : ''}
            <div class="img-overlay">შეცვლა</div>
          </div>
          <input type="hidden" id="swiper-img-val-${key}" value="${esc(p.img || '')}" />
          <div class="img-actions">
            <button class="btn-img-pick" onclick="openImagePickerForSwiper('${key}')">საქაღალდიდან</button>
            ${imgSrc ? `<button class="btn-img-pick" style="color:var(--red);border-color:rgba(232,50,58,.4)"
              onclick="clearSwiperImg('${key}')">წაშლა</button>` : ''}
          </div>
        </div>
        <div class="item-editor-fields">
          <div class="field">
            <label>სახელი</label>
            <input type="text" id="swiper-title-${key}" value="${esc(p.title || '')}"
                   oninput="onSwiperFieldInput('${key}')" />
          </div>
          <div class="field">
            <label>აღწერა</label>
            <textarea id="swiper-desc-${key}" rows="4"
                      oninput="onSwiperFieldInput('${key}')">${esc(p.desc || '')}</textarea>
          </div>
        </div>
      </div>
      <div class="item-sections-label">
        <span>სექციები</span>
        <button class="btn-add-section" onclick="addSwiperSection('${key}')">+ სექცია</button>
      </div>
      <div id="swiper-sections-${key}">
        ${(p.sections || []).map((s, si) => swiperSectionRow(key, si, s)).join('')}
      </div>
    </div>`;

  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function swiperSectionRow(key, si, s = {}) {
  return `
    <div class="section-row" data-si="${si}">
      <div class="section-row-handle">⠿</div>
      <div class="section-row-fields">
        <input type="text" placeholder="სათაური" class="section-header-input"
               value="${esc(s.header || '')}" oninput="onSwiperFieldInput('${key}')" />
        <textarea placeholder="ტექსტი" class="section-text-input" rows="3"
                  oninput="onSwiperFieldInput('${key}')">${esc(s.text || '')}</textarea>
      </div>
      <button class="section-row-del" onclick="deleteSwiperSection('${key}',${si})">✕</button>
    </div>`;
}

function addSwiperSection(key) {
  const container = document.getElementById(`swiper-sections-${key}`);
  const si = container.children.length;
  const div = document.createElement('div');
  div.innerHTML = swiperSectionRow(key, si, {});
  container.appendChild(div.firstElementChild);
}

function deleteSwiperSection(key, si) {
  document.querySelector(`#swiper-sections-${key} .section-row[data-si="${si}"]`)?.remove();
  document.querySelectorAll(`#swiper-sections-${key} .section-row`).forEach((r, i) => {
    r.dataset.si = i;
  });
  flushSwiperEditor(key);
}

function closeSwiperInlineEditor(key) {
  flushSwiperEditor(key);
  swiperSelectedIdx[key] = -1;
  document.querySelectorAll(`#products-${key} .item-thumb`).forEach((el) => el.classList.remove('active'));
  const panel = document.getElementById(`swiper-editor-${key}`);
  if (panel) panel.style.display = 'none';
}

// Sync open editor DOM → currentData (called on every field input + before save)
function flushSwiperEditor(key) {
  const idx = swiperSelectedIdx[key];
  if (idx == null || idx < 0) return;
  const sData = getSwiperData(key);
  if (!sData.products || !sData.products[idx]) return;
  const p = sData.products[idx];
  const titleEl = document.getElementById(`swiper-title-${key}`);
  const descEl  = document.getElementById(`swiper-desc-${key}`);
  const imgEl   = document.getElementById(`swiper-img-val-${key}`);
  if (titleEl) p.title = titleEl.value;
  if (descEl)  p.desc  = descEl.value;
  if (imgEl)   p.img   = imgEl.value;
  p.sections = [];
  document.querySelectorAll(`#swiper-sections-${key} .section-row`).forEach((row) => {
    p.sections.push({
      header: row.querySelector('.section-header-input')?.value || '',
      text:   row.querySelector('.section-text-input')?.value   || '',
    });
  });
  // Update thumb title live
  const thumb = document.querySelector(`#products-${key} .item-thumb[data-idx="${idx}"] .item-thumb-name`);
  if (thumb) thumb.textContent = p.title || '—';
  // Update editor header title
  const headerTitle = document.querySelector(`#swiper-editor-${key} .item-editor-title`);
  if (headerTitle) headerTitle.textContent = p.title || 'ახალი';
}

function flushAllSwiperEditors() {
  Object.keys(swiperSelectedIdx).forEach((key) => flushSwiperEditor(key));
}

function onSwiperFieldInput(key) {
  flushSwiperEditor(key);
}

// ─── SWIPER PRODUCT IMAGE ─────────────────────────────────────────────────────

function openImagePickerForSwiper(key) {
  currentSwiperSection = key;
  const sData = getSwiperData(key);
  const defaultFolder = sData.defaultImgDir || imgFolders[0] || '';
  openImagePicker('swiper', defaultFolder);
}

function clearSwiperImg(key) {
  const preview = document.getElementById(`swiper-img-${key}`);
  const hidden  = document.getElementById(`swiper-img-val-${key}`);
  if (preview) {
    preview.style.backgroundImage = '';
    if (!preview.querySelector('.img-placeholder')) {
      const ph = document.createElement('div');
      ph.className = 'img-placeholder';
      ph.textContent = 'სურათის არჩევა';
      preview.appendChild(ph);
    }
    // Remove the clear button
    preview.nextElementSibling?.nextElementSibling?.querySelector('button:last-child')?.remove();
  }
  if (hidden) hidden.value = '';
  flushSwiperEditor(key);
  // Refresh thumb
  const idx = swiperSelectedIdx[key];
  if (idx >= 0) {
    const thumb = document.querySelector(`#products-${key} .item-thumb[data-idx="${idx}"] .item-thumb-img`);
    if (thumb) { thumb.style.backgroundImage = ''; thumb.style.background = '#1a1a1a'; }
  }
}

// Called from pickImage when target === 'swiper'
function setSwiperImage(path) {
  if (!currentSwiperSection) return;
  const key = currentSwiperSection;
  const preview = document.getElementById(`swiper-img-${key}`);
  const hidden  = document.getElementById(`swiper-img-val-${key}`);
  if (preview) {
    preview.style.backgroundImage = `url('/img/${path}')`;
    preview.style.backgroundSize  = 'cover';
    preview.style.backgroundPosition = 'center';
    preview.querySelector('.img-placeholder')?.remove();
  }
  if (hidden) hidden.value = path;
  flushSwiperEditor(key);
  // Update thumb preview
  const idx = swiperSelectedIdx[key];
  if (idx >= 0) {
    const thumb = document.querySelector(`#products-${key} .item-thumb[data-idx="${idx}"] .item-thumb-img`);
    if (thumb) {
      thumb.style.backgroundImage = `url('/img/${path}')`;
      thumb.style.backgroundSize  = 'cover';
      thumb.style.backgroundPosition = 'center';
    }
  }
}

// ─── SWIPER ADD / DELETE ──────────────────────────────────────────────────────

function addProduct(key) {
  const sData = getSwiperData(key);
  if (!sData.products) sData.products = [];
  const newIdx = sData.products.length;
  sData.products.push({ title: 'ახალი', img: '', desc: '', sections: [] });
  refreshSwiperGrid(key);
  selectSwiperProduct(key, newIdx);
}

function deleteSwiperProduct(key, idx) {
  if (!confirm('წაშლა?')) return;
  const sData = getSwiperData(key);
  if (sData.products) sData.products.splice(idx, 1);
  if (swiperSelectedIdx[key] === idx) {
    swiperSelectedIdx[key] = -1;
    const panel = document.getElementById(`swiper-editor-${key}`);
    if (panel) panel.style.display = 'none';
  }
  refreshSwiperGrid(key);
  // Update count label
  const countEl = document.querySelector(`#products-${key}`)?.closest('.section-body')?.querySelector('.items-count');
  if (countEl) countEl.textContent = `${(sData.products || []).length} ელემენტი`;
}

function refreshSwiperGrid(key) {
  const sData = getSwiperData(key);
  const grid = document.getElementById(`products-${key}`);
  if (!grid) return;
  grid.innerHTML = (sData.products || []).map((p, i) => swiperThumb(key, i, p)).join('');
  // Update count
  const countEl = grid.closest('.section-body')?.querySelector('.items-count');
  if (countEl) countEl.textContent = `${(sData.products || []).length} ელემენტი`;
}

function resolveImgSrc(img, fallbackDir) {
  if (!img) return '';
  if (img.startsWith('/')) return img;
  if (img.includes('/')) return `/img/${img}`;
  return fallbackDir ? `/img/${fallbackDir}/${img}` : `/img/${img}`;
}

// ─── TAGS POOL ────────────────────────────────────────────────────────────────

const TAG_POOL = {
  wishes: [
    { label: 'სიყვარული',    id: 'sikvaruli',    href: '../../wishes/sikvaruli/sikvaruli.html' },
    { label: 'ჯანმრთელობა',  id: 'janmrteloba',  href: '../../wishes/janmrteloba/janmrteloba.html' },
    { label: 'ბარაქა',       id: 'baraqa',        href: '../../wishes/baraqa/baraqa.html' },
    { label: 'ძალა',         id: 'dzala',         href: '../../wishes/dzala/dzala.html' },
    { label: 'მიმზიდველობა', id: 'mimzidveloba',  href: '../../wishes/mimzidveloba/mimzidveloba.html' },
    { label: 'წარმატება',    id: 'warmateba',     href: '../../wishes/warmateba/warmateba.html' },
  ],
  elements: [
    { label: 'მიწა',   id: 'earth', element: 'earth', href: '../../elements/earth/earth.html' },
    { label: 'ცეცხლი', id: 'fire',  element: 'fire',  href: '../../elements/fire/fire.html' },
    { label: 'წყალი',  id: 'water', element: 'water', href: '../../elements/water/water.html' },
    { label: 'ჰაერი',  id: 'wind',  element: 'wind',  href: '../../elements/wind/wind.html' },
  ],
};

function renderTagsEditor(tags) {
  return `
    <div class="tags-list" id="tags-chips">${renderTagChips(tags)}</div>
    <div class="tag-pool">
      <div class="tag-pool-group">
        <div class="tag-pool-label">სურვილები</div>
        <div class="tag-pool-items">
          ${TAG_POOL.wishes.map((w) => `<button class="tag-pool-btn" onclick="addTagFromPool('wish','${w.id}')">${w.label}</button>`).join('')}
        </div>
      </div>
      <div class="tag-pool-group">
        <div class="tag-pool-label">ელემენტები</div>
        <div class="tag-pool-items">
          ${TAG_POOL.elements.map((e) => `<button class="tag-pool-btn" onclick="addTagFromPool('element','${e.id}')">${e.label}</button>`).join('')}
        </div>
      </div>
    </div>`;
}

function renderTagChips(tags) {
  return (tags || [])
    .map((t, i) => `<span class="tag-chip">${t.label}<span class="tag-chip-del" onclick="removeTag(${i})">✕</span></span>`)
    .join('');
}

function removeTag(idx) {
  if (!currentData.tags) return;
  currentData.tags.splice(idx, 1);
  document.getElementById('tags-chips').innerHTML = renderTagChips(currentData.tags);
  refreshTagPoolState();
}

function addTagFromPool(type, id) {
  if (!currentData.tags) currentData.tags = [];
  const pool = type === 'wish' ? TAG_POOL.wishes : TAG_POOL.elements;
  const item = pool.find((p) => p.id === id);
  if (!item || currentData.tags.some((t) => t.id === id)) return;
  const tag = { type, id, label: item.label, href: item.href };
  if (type === 'element') tag.element = item.element;
  currentData.tags.push(tag);
  document.getElementById('tags-chips').innerHTML = renderTagChips(currentData.tags);
  refreshTagPoolState();
}

function refreshTagPoolState() {
  const addedIds = new Set((currentData.tags || []).map((t) => t.id));
  document.querySelectorAll('.tag-pool-btn').forEach((btn) => {
    const m = btn.getAttribute('onclick').match(/'([^']+)'\)$/);
    if (m) btn.classList.toggle('tag-pool-btn--added', addedIds.has(m[1]));
  });
}

// ─── PAGE RENDERERS ───────────────────────────────────────────────────────────

// SEO section — reused in every page renderer
function seoSection(d) {
  const seo = d.seo || {};
  return section('SEO — სათაური და აღწერა', `
    ${field('Tab-ის სათაური', 'seo.title', seo.title)}
    ${field('Meta Description (ძებნა)', 'seo.description', seo.description, 'textarea')}
  `);
}

function renderHome(d) {
  return `
    ${seoSection(d)}
    ${section('სექციების სათაურები', `
      ${field('ზოდიაქოს სათაური', 'zodiac_header', d.zodiac_header)}
      ${field('პლანეტების სათაური', 'planet_header', d.planet_header)}
      ${field('აქსესუარების სათაური', 'accessories_header', d.accessories_header)}
    `, true)}
    ${swipSection('swiper', 'სვაიპერი (მთავარი გვერდი)', d.swiper, false)}`;
}

function renderChakra(d) {
  return `
    ${seoSection(d)}
    ${section('ძირითადი ინფორმაცია', `
      ${fieldsRow(field('სახელი', 'title', d.title), field('ქვესათაური', 'subtitle', d.subtitle))}
      ${field('აღწერა 1', 'desc1', d.desc1, 'textarea')}
      ${field('აღწერა 2', 'desc2', d.desc2, 'textarea')}
    `, true)}
    ${section('სხეული', `
      ${field('სათაური', 'body_subtitle', d.body_subtitle)}
      ${field('ტექსტი', 'body_desc', d.body_desc, 'textarea')}
    `)}
    ${section('ვიდეო', `
      ${field('YouTube URL', 'video_url', d.video_url, 'url')}
      ${field('აქტივაციის სათაური', 'activation_subtitle', d.activation_subtitle)}
      ${field('აქტივაციის ტექსტი', 'activation_desc', d.activation_desc, 'textarea')}
    `)}
    ${section('თეგები', renderTagsEditor(d.tags || []))}
    ${swipSection('crystals', 'კრისტალები', d.crystals)}
    ${swipSection('aromas', 'არომათერაპია', d.aromas)}
    ${swipSection('accessories', 'აქსესუარები', d.accessories, false)}`;
}

function renderZodiac(d) {
  return `
    ${seoSection(d)}
    ${section('ძირითადი', `
      ${field('სახელი', 'title', d.title)}
      ${field('აღწერა 1', 'desc1', d.desc1, 'textarea')}
      ${field('აღწერა 2', 'desc2', d.desc2, 'textarea')}
    `, true)}
    ${section('ვიდეო', field('YouTube URL', 'video_url', d.video_url, 'url'))}
    ${section('თეგები', renderTagsEditor(d.tags || []))}
    ${swipSection('crystals', 'კრისტალები (+ დადებითი)', d.crystals)}
    ${swipSection('aromas', 'არომათერაპია (+ უარყოფითი)', d.aromas)}
    ${swipSection('accessories', 'აქსესუარები (+ გამოსწორება)', d.accessories)}`;
}

function renderPlanet(d) {
  return `
    ${seoSection(d)}
    ${section('ძირითადი', `
      ${field('სახელი', 'title', d.title)}
      ${field('აღწერა 1', 'desc1', d.desc1, 'textarea')}
      ${field('აღწერა 2', 'desc2', d.desc2, 'textarea')}
      ${field('აღწერა 3', 'desc3', d.desc3, 'textarea')}
      ${field('აღწერა 4', 'desc4', d.desc4, 'textarea')}
    `, true)}
    ${section('ვიდეო', field('YouTube URL', 'video_url', d.video_url, 'url'))}
    ${section('თეგები', renderTagsEditor(d.tags || []))}
    ${swipSection('crystals', 'კრისტალები (+ დადებითი)', d.crystals)}
    ${swipSection('aromas', 'არომათერაპია (+ უარყოფითი)', d.aromas)}
    ${swipSection('accessories', 'აქსესუარები (+ გამოსწორება)', d.accessories)}`;
}

function renderElement(d) {
  return `
    ${seoSection(d)}
    ${section('ძირითადი', `
      ${field('სახელი', 'title', d.title)}
      ${field('აღწერა 1', 'desc1', d.desc1, 'textarea')}
      ${field('აღწერა 2', 'desc2', d.desc2, 'textarea')}
    `, true)}
    ${section('სტიქიის გაძლიერება', `
      ${field('სათაური', 'header2', d.header2)}
      ${field('ტექსტი 1', 'desc3', d.desc3, 'textarea')}
      ${field('ტექსტი 2', 'desc4', d.desc4, 'textarea')}
    `)}
    ${section('ვიდეო', field('YouTube URL', 'video_url', d.video_url, 'url'))}
    ${section('თეგები', renderTagsEditor(d.tags || []))}
    ${swipSection('crystals', 'კრისტალები (+ დადებითი)', d.crystals)}
    ${swipSection('aromas', 'არომათერაპია (+ უარყოფითი)', d.aromas)}
    ${swipSection('accessories', 'აქსესუარები (+ ნიშნები)', d.accessories)}`;
}

function renderWish(d) {
  return `
    ${seoSection(d)}
    ${section('ძირითადი', `
      ${field('სახელი', 'title', d.title)}
      ${field('აღწერა 1', 'desc1', d.desc1, 'textarea')}
      ${field('აღწერა 2', 'desc2', d.desc2, 'textarea')}
    `, true)}
    ${section('ტოქსიკური ასპექტები', `
      ${field('სათაური', 'header2', d.header2)}
      ${field('ტექსტი 1', 'desc3', d.desc3, 'textarea')}
      ${field('ტექსტი 2', 'desc4', d.desc4, 'textarea')}
    `)}
    ${section('ვიდეო', field('YouTube URL', 'video_url', d.video_url, 'url'))}
    ${swipSection('crystals', 'კრისტალები', d.crystals, false)}
    ${swipSection('aromas', 'არომათერაპია (+ გამოსწორება)', d.aromas)}
    ${swipSection('accessories', 'აქსესუარები', d.accessories, false)}`;
}

function renderGlobal(d) {
  const f = d.footer || {}, n = d.nav || {}, fn = d.friday_night || {};
  return `
    ${section('Friday Night სექცია', `
      ${field('სათაური', 'friday_night.title', fn.title)}
      ${field('ტექსტი', 'friday_night.text', fn.text, 'textarea')}
      ${field('ღილაკის ტექსტი', 'friday_night.button_text', fn.button_text)}
      ${field('ღილაკის ბმული', 'friday_night.button_href', fn.button_href)}
    `, true)}
    ${section('საკონტაქტო', `
      ${field('მისამართი', 'footer.address', f.address)}
      ${field('ტელეფონი', 'footer.phone', f.phone)}
      ${field('Email', 'footer.email', f.email)}
    `, true)}
    ${section('სოციალური ქსელები', `
      ${field('Facebook URL', 'footer.facebook', f.facebook, 'url')}
      ${field('Instagram URL', 'footer.instagram', f.instagram, 'url')}
      ${field('WhatsApp URL', 'footer.whatsapp', f.whatsapp, 'url')}
    `, true)}
    ${section('ნავიგაცია — ტექსტი და ბმულები', `
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;line-height:1.5">
        ბმულები — root-დან პათი (მაგ: <code>index/crystals/crystals.html</code>)
      </div>
      ${fieldsRow(field('მთავარი — ტექსტი', 'nav.home_label', n.home_label), field('მთავარი — ბმული', 'nav.home_href', n.home_href))}
      ${fieldsRow(field('კრისტალები — ტექსტი', 'nav.crystals_label', n.crystals_label), field('კრისტალები — ბმული', 'nav.crystals_href', n.crystals_href))}
      ${fieldsRow(field('ტარო — ტექსტი', 'nav.tarot_label', n.tarot_label), field('ტარო — ბმული', 'nav.tarot_href', n.tarot_href))}
      ${fieldsRow(field('არომათერაპია — ტექსტი', 'nav.aromas_label', n.aromas_label), field('არომათერაპია — ბმული', 'nav.aromas_href', n.aromas_href))}
      ${fieldsRow(field('აქსესუარები — ტექსტი', 'nav.accessories_label', n.accessories_label), field('აქსესუარები — ბმული', 'nav.accessories_href', n.accessories_href))}
    `, true)}
    ${swipSection('swiper', 'სვაიპერი (მთავარი გვერდი)', d.swiper, false)}`;
}

function renderGeneric(d) {
  return `<div class="section open"><div class="section-header"><span>JSON</span><span class="section-arrow">▶</span></div>
    <div class="section-body"><textarea style="width:100%;min-height:400px;font-family:monospace;font-size:13px" data-key="__raw">${esc(JSON.stringify(d, null, 2))}</textarea></div></div>`;
}

// ─── ITEMS PAGE (crystals / aromas / accessories / tarots) ────────────────────

function renderItemsPage(d) {
  const items = d.items || [];
  const imgDir = currentPage?.imgDir || '';
  return `
    <div class="items-toolbar">
      <span class="items-count">${items.length} ელემენტი</span>
      <button class="btn-add-item" onclick="addNewItem()">+ ახალი</button>
    </div>
    <div class="items-grid" id="items-grid">
      ${items.map((item, i) => itemThumb(item, i, imgDir)).join('')}
    </div>
    <div class="item-editor-panel" id="item-editor-panel" style="display:none"></div>`;
}

function itemThumb(item, idx, imgDir) {
  const imgPath = item.img ? (item.img.includes('/') ? item.img : `${imgDir}/${item.img}`) : '';
  const bgUrl = imgPath ? `/img/${imgPath}` : '';
  const bg = bgUrl
    ? `background-image:url('${bgUrl}');background-size:cover;background-position:center`
    : 'background:#1a1a1a';
  const active = selectedItemIdx === idx ? ' active' : '';
  return `
    <div class="item-thumb${active}" data-idx="${idx}" onclick="selectItem(${idx})">
      <div class="item-thumb-img" style="${bg}">
        ${!bgUrl ? '<span class="item-thumb-noimg">+</span>' : ''}
      </div>
      <div class="item-thumb-name">${esc(item.title || '—')}</div>
      ${item.price ? `<div class="item-thumb-price">${esc(item.price)}</div>` : ''}
      <button class="item-thumb-del" onclick="event.stopPropagation();deleteItemByIdx(${idx})">✕</button>
    </div>`;
}

function selectItem(idx) {
  selectedItemIdx = idx;
  document.querySelectorAll('.item-thumb').forEach((el, i) => el.classList.toggle('active', i === idx));
  renderItemEditor(idx);
}

function renderItemEditor(idx) {
  const panel = document.getElementById('item-editor-panel');
  if (!panel) return;
  const item = currentData.items?.[idx];
  if (!item) return;
  const imgDir = currentPage?.imgDir || '';
  const imgPath = item.img ? (item.img.includes('/') ? item.img : `${imgDir}/${item.img}`) : '';
  const bgUrl = imgPath ? `/img/${imgPath}` : '';
  const bgStyle = bgUrl
    ? `background-image:url('${bgUrl}');background-size:cover;background-position:center`
    : 'background:#1a1a1a';

  panel.style.display = 'block';
  panel.innerHTML = `
    <div class="item-editor-header">
      <span class="item-editor-title">${esc(item.title || 'ახალი ელემენტი')}</span>
      <button class="btn-close-editor" onclick="closeItemEditor()">დახურვა</button>
    </div>
    <div class="item-editor-body">
      <div class="item-editor-top">
        <div class="item-editor-img-area">
          <div class="item-editor-img" id="editor-img-preview" style="${bgStyle}" onclick="openImagePicker('item')">
            ${!bgUrl ? '<div class="img-placeholder">სურათის არჩევა</div>' : ''}
            <div class="img-overlay">შეცვლა</div>
          </div>
          <input type="file" id="editor-img-upload" accept="image/*" style="display:none" onchange="handleEditorImgUpload(this)" />
          <div class="img-actions">
            <button class="btn-img-pick" onclick="openImagePicker('item')">საქაღალდიდან</button>
            <button class="btn-img-upload" onclick="document.getElementById('editor-img-upload').click()">ატვირთვა</button>
            ${bgUrl ? `<button class="btn-img-pick" style="color:var(--red);border-color:rgba(232,50,58,.4)"
              onclick="clearItemImg()">წაშლა</button>` : ''}
          </div>
          <input type="hidden" id="editor-img-value" value="${esc(item.img || '')}" />
        </div>
        <div class="item-editor-fields">
          <div class="field">
            <label>სახელი</label>
            <input type="text" id="editor-title" value="${esc(item.title || '')}" oninput="updateEditorTitle(this)" />
          </div>
          <div class="field">
            <label>ფასი <span style="opacity:.5;font-size:12px">(მაგ. 25 ₾)</span></label>
            <input type="text" id="editor-price" value="${esc(item.price || '')}" style="color:#00b96b;font-weight:600" />
          </div>
        </div>
      </div>
      <div class="item-sections-label">
        <span>სექციები</span>
        <button class="btn-add-section" onclick="addSection()">+ სექცია</button>
      </div>
      <div id="editor-sections">
        ${(item.sections || []).map((s, si) => sectionRow(si, s)).join('')}
      </div>
    </div>`;

  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function sectionRow(si, s = {}) {
  return `
    <div class="section-row" data-si="${si}">
      <div class="section-row-handle">⠿</div>
      <div class="section-row-fields">
        <input type="text" placeholder="სათაური" class="section-header-input" value="${esc(s.header || '')}" />
        <textarea placeholder="ტექსტი" class="section-text-input" rows="3">${esc(s.text || '')}</textarea>
      </div>
      <button class="section-row-del" onclick="deleteSection(${si})">✕</button>
    </div>`;
}

function updateEditorTitle(input) {
  const thumb = document.querySelector(`.item-thumb[data-idx="${selectedItemIdx}"] .item-thumb-name`);
  if (thumb) thumb.textContent = input.value || '—';
  const panelTitle = document.querySelector('.item-editor-title');
  if (panelTitle) panelTitle.textContent = input.value || 'ახალი ელემენტი';
}

function clearItemImg() {
  const preview = document.getElementById('editor-img-preview');
  const hidden  = document.getElementById('editor-img-value');
  if (preview) {
    preview.style.backgroundImage = '';
    preview.style.background = '#1a1a1a';
    if (!preview.querySelector('.img-placeholder')) {
      const ph = document.createElement('div');
      ph.className = 'img-placeholder';
      ph.textContent = 'სურათის არჩევა';
      preview.appendChild(ph);
    }
  }
  if (hidden) hidden.value = '';
  // Update thumb
  const thumb = document.querySelector(`.item-thumb[data-idx="${selectedItemIdx}"] .item-thumb-img`);
  if (thumb) { thumb.style.backgroundImage = ''; thumb.style.background = '#1a1a1a'; }
}

function addSection() {
  const container = document.getElementById('editor-sections');
  const si = container.children.length;
  const div = document.createElement('div');
  div.innerHTML = sectionRow(si, {});
  container.appendChild(div.firstElementChild);
}

function deleteSection(si) {
  document.querySelector(`#editor-sections .section-row[data-si="${si}"]`)?.remove();
  document.querySelectorAll('#editor-sections .section-row').forEach((row, i) => { row.dataset.si = i; });
}

function addNewItem() {
  if (!currentData.items) currentData.items = [];
  const newItem = { title: 'ახალი', img: '', price: '', sections: [] };
  currentData.items.push(newItem);
  const imgDir = currentPage?.imgDir || '';
  const grid = document.getElementById('items-grid');
  const div = document.createElement('div');
  div.innerHTML = itemThumb(newItem, currentData.items.length - 1, imgDir);
  grid.appendChild(div.firstElementChild);
  selectItem(currentData.items.length - 1);
}

function deleteItemByIdx(idx) {
  if (!confirm('წაშლა?')) return;
  currentData.items?.splice(idx, 1);
  if (selectedItemIdx === idx) closeItemEditor();
  selectedItemIdx = -1;
  const imgDir = currentPage?.imgDir || '';
  document.getElementById('items-grid').innerHTML = (currentData.items || [])
    .map((item, i) => itemThumb(item, i, imgDir))
    .join('');
}

function closeItemEditor() {
  selectedItemIdx = -1;
  const p = document.getElementById('item-editor-panel');
  if (p) p.style.display = 'none';
  document.querySelectorAll('.item-thumb').forEach((el) => el.classList.remove('active'));
}

// ─── IMAGE PICKER ─────────────────────────────────────────────────────────────

async function openImagePicker(target = 'item', defaultFolder) {
  imgPickerTarget = target;

  if (imgFolders.length === 0) {
    try {
      const res = await fetch('/api/image-folders');
      if (res.ok) imgFolders = await res.json();
    } catch {}
  }

  const select = document.getElementById('img-folder-select');
  const def = defaultFolder
    || (target === 'item' && currentPage?.imgDir)
    || imgFolders[0]
    || '';

  select.innerHTML = imgFolders
    .map((f) => `<option value="${f}"${f === def ? ' selected' : ''}>${f}</option>`)
    .join('');

  await loadImgFolder(def);
  document.getElementById('img-picker-modal').classList.add('open');
}

async function loadImgFolder(folder) {
  if (!folder) return;
  let files = [];
  try {
    const res = await fetch(`/api/images?category=${encodeURIComponent(folder)}`);
    files = await res.json();
  } catch {}

  const grid = document.getElementById('img-picker-grid');
  grid.innerHTML = files.length
    ? files
        .map(
          (f) => `
        <div class="img-picker-item" onclick="pickImage('${folder}/${esc(f)}')">
          <img src="/img/${folder}/${f}" alt="${esc(f)}" loading="lazy" />
          <div class="img-picker-name">${f}</div>
        </div>`
        )
        .join('')
    : `<div style="color:#666;padding:24px;text-align:center">საქაღალდე ცარიელია</div>`;
}

function closeImagePicker() {
  document.getElementById('img-picker-modal').classList.remove('open');
}

function pickImage(path) {
  if (imgPickerTarget === 'swiper') {
    setSwiperImage(path);
  } else {
    setEditorImage(path);
  }
  closeImagePicker();
}

function setEditorImage(path) {
  const imgDir = currentPage?.imgDir || '';
  const fullPath = path.includes('/') ? path : `${imgDir}/${path}`;
  const preview = document.getElementById('editor-img-preview');
  const hidden  = document.getElementById('editor-img-value');
  if (preview) {
    preview.style.backgroundImage = `url('/img/${fullPath}')`;
    preview.style.backgroundSize  = 'cover';
    preview.style.backgroundPosition = 'center';
    preview.querySelector('.img-placeholder')?.remove();
  }
  if (hidden) hidden.value = fullPath;
  const thumb = document.querySelector(`.item-thumb[data-idx="${selectedItemIdx}"] .item-thumb-img`);
  if (thumb) {
    thumb.style.backgroundImage = `url('/img/${fullPath}')`;
    thumb.style.backgroundSize = 'cover';
    thumb.style.backgroundPosition = 'center';
  }
}

async function handleEditorImgUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const imgDir = currentPage?.imgDir || 'uploads';
  const fd = new FormData();
  fd.append('image', file);
  fd.append('category', imgDir);
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    const relativePath = data.path.replace(/^\/img\//, '');
    setEditorImage(relativePath);
    showToast('სურათი ატვირთულია');
  } catch {
    showToast('შეცდომა!', true);
  }
}

// ─── DATA COLLECTION ──────────────────────────────────────────────────────────

function collectForm() {
  const type = currentPage?.type;
  const data = JSON.parse(JSON.stringify(currentData || {}));

  if (type === 'items-page') {
    if (selectedItemIdx >= 0 && data.items?.[selectedItemIdx]) {
      const item = data.items[selectedItemIdx];
      item.title    = document.getElementById('editor-title')?.value  || item.title;
      item.price    = document.getElementById('editor-price')?.value  || '';
      item.img      = document.getElementById('editor-img-value')?.value || item.img;
      item.sections = [];
      document.querySelectorAll('#editor-sections .section-row').forEach((row) => {
        item.sections.push({
          header: row.querySelector('.section-header-input')?.value || '',
          text:   row.querySelector('.section-text-input')?.value   || '',
        });
      });
    }
    return data;
  }

  // Collect [data-key] fields (text fields, blog fields, defaultImgDir selects)
  document.querySelectorAll('[data-key]').forEach((el) => {
    if (el.dataset.key === '__raw') return;
    setNested(data, el.dataset.key, el.value);
  });

  // Products already live in currentData (flushed by flushAllSwiperEditors before save)

  return data;
}

function setNested(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

init();
