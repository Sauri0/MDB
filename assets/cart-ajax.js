/**
 * MDB Shopify — AJAX Cart Engine
 * Manages cart state, drawer UI, and header synchronization.
 */

window.ShopifyCart = (function() {
  const selectors = {
    drawer: '#CartDrawer',
    itemsContainer: '.js-cart-items-container',
    totalPrice: '.js-cart-total-price',
    bubble: '#cart-icon-bubble',
    closeBtn: '.js-cart-close',
    qvModal: '#QuickViewModal',
    qvBody: '.js-qv-body',
    qvClose: '.js-qv-close'
  };

  function init() {
    document.addEventListener('click', (e) => {
      if (e.target.closest(selectors.closeBtn)) close();
      if (e.target.closest(selectors.qvClose)) closeQuickView();
      
      if (e.target.closest('.js-cart-trigger')) {
        e.preventDefault();
        open();
      }

      // Quick View Trigger
      const qvTrigger = e.target.closest('.js-qv-trigger');
      if (qvTrigger) {
        e.preventDefault();
        openQuickView(qvTrigger.dataset.handle);
      }

      // Quantity adjustments in Modal
      if (e.target.closest('.js-qv-minus')) {
        const input = document.querySelector('.js-qv-qty-input');
        if (input.value > 1) input.value = parseInt(input.value) - 1;
      }
      if (e.target.closest('.js-qv-plus')) {
        const input = document.querySelector('.js-qv-qty-input');
        input.value = parseInt(input.value) + 1;
      }

      // Add to cart from Modal
      const qvAddBtn = e.target.closest('.js-qv-add');
      if (qvAddBtn) {
        const id = qvAddBtn.dataset.variantId;
        const qty = parseInt(document.querySelector('.js-qv-qty-input').value);
        addItem(id, qty);
        closeQuickView();
      }

      if (e.target.closest('.js-qty-minus')) updateQuantity(e.target.closest('[data-id]').dataset.id, -1);
      if (e.target.closest('.js-qty-plus')) updateQuantity(e.target.closest('[data-id]').dataset.id, 1);
    });

    // Capture "Add to Cart" clicks
    document.addEventListener('click', (e) => {
      const addBtn = e.target.closest('.js-add-to-cart');
      if (addBtn) {
        e.preventDefault();
        const variantId = addBtn.dataset.variantId;
        addItem(variantId, 1);
      }
    });

    refresh();
  }

  function open() {
    document.querySelector(selectors.drawer).classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    document.querySelector(selectors.drawer).classList.remove('open');
    document.body.style.overflow = '';
  }

  async function addItem(id, qty = 1) {
    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id, quantity: qty }] })
      });
      if (response.ok) {
        await refresh();
        open();
      }
    } catch (err) { console.error('Error adding to cart', err); }
  }

  async function updateQuantity(id, change) {
    try {
      const cart = await (await fetch('/cart.js')).json();
      const currentItem = cart.items.find(i => i.key === id || i.id == id);
      if (!currentItem) return;
      
      const newQty = currentItem.quantity + change;
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantity: newQty })
      });
      if (response.ok) await refresh();
    } catch (err) { console.error('Error updating qty', err); }
  }

  async function refresh() {
    const response = await fetch('/cart.js');
    const cart = await response.json();
    render(cart);
    updateHeader(cart);
  }

  function render(cart) {
    const container = document.querySelector(selectors.itemsContainer);
    const totalEl = document.querySelector(selectors.totalPrice);
    
    if (cart.item_count === 0) {
      container.innerHTML = `
        <div class="cart-drawer-empty">
          <span class="empty-icon">🛒</span>
          <p>Tu carrito está vacío</p>
          <a href="/collections/all" class="btn-primary">VER CATÁLOGO</a>
        </div>
      `;
      totalEl.innerText = '$0.00';
      return;
    }

    container.innerHTML = cart.items.map(item => `
      <div class="cart-item" data-id="${item.key}">
        <div class="cart-item-image">
          <img src="${item.image}" alt="${item.title}">
        </div>
        <div class="cart-item-info">
          <h3>${item.product_title}</h3>
          <p class="cart-item-price">${Shopify.formatMoney(item.price)}</p>
          <div class="cart-item-qty">
            <button class="qty-btn js-qty-minus">-</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn js-qty-plus">+</button>
          </div>
        </div>
      </div>
    `).join('');

    totalEl.innerText = Shopify.formatMoney(cart.total_price);
  }

  function updateHeader(cart) {
    const bubble = document.querySelector(selectors.bubble);
    if (!bubble) return;
    
    if (cart.item_count > 0) {
      bubble.innerHTML = `<span class="header-cart-badge">${cart.item_count}</span>`;
    } else {
      bubble.innerHTML = '';
    }
  }

  async function openQuickView(handle) {
    const modal = document.querySelector(selectors.qvModal);
    const body = document.querySelector(selectors.qvBody);
    
    modal.classList.add('open');
    body.innerHTML = '<div class="qv-loading"><div class="spinner"></div></div>';

    try {
      const response = await fetch(`/products/${handle}.js`);
      const product = await response.json();
      renderQuickView(product);
    } catch (err) {
      console.error('Error loading Quick View', err);
      body.innerHTML = '<p class="error-msg">Error al cargar productos.</p>';
    }
  }

  function closeQuickView() {
    document.querySelector(selectors.qvModal).classList.remove('open');
  }

  function renderQuickView(product) {
    const body = document.querySelector(selectors.qvBody);
    const formattedPrice = Shopify.formatMoney(product.price);
    const variantId = product.variants[0].id;

    body.innerHTML = `
      <div class="qv-image-side">
        <img src="${product.featured_image}" alt="${product.title}">
      </div>
      <div class="qv-info-side">
        <span class="qv-vendor uppercase">${product.vendor || 'MDB Industrial'}</span>
        <h2 class="qv-title">${product.title}</h2>
        <p class="qv-price">${formattedPrice}</p>
        
        <div class="qv-desc">${product.description || 'Sin descripción disponible.'}</div>
        
        <div class="qv-actions">
          <div class="qv-qty-selector">
            <button class="qty-btn js-qv-minus">-</button>
            <input type="number" class="qv-qty-input js-qv-qty-input" value="1" min="1">
            <button class="qty-btn js-qv-plus">+</button>
          </div>
          <button class="btn-qv-add js-qv-add" data-variant-id="${variantId}">AGREGAR AL CARRITO</button>
        </div>
      </div>
    `;
  }

  return { init, open, close, addItem, refresh };
})();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Shopify === 'undefined') window.Shopify = {};
  if (!Shopify.formatMoney) {
    Shopify.formatMoney = function(cents) {
      return '$' + (cents / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 });
    };
  }
  window.ShopifyCart.init();
});
