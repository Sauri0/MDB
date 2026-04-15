class CartDrawer {
  constructor() {
    this.drawer = document.getElementById('CartDrawer');
    this.backdrop = document.getElementById('CartDrawerBackdrop');
    this.itemsContainer = document.getElementById('CartDrawerItems');
    this.footer = document.getElementById('CartDrawerFooter');
    this.countElements = document.querySelectorAll('.js-cart-count');
    
    this.bindEvents();
    this.fetchCart(); // Initial sync
  }

  bindEvents() {
    // Escuchar a los botones globales que abren el carrito
    document.querySelectorAll('.js-cart-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
    });

    // Delegación de eventos dentro del contenedor de items
    this.itemsContainer.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;

      if (target.classList.contains('js-remove-item')) {
        this.updateItem(target.dataset.key, 0);
      } else if (target.classList.contains('js-quantity-minus')) {
        this.updateItem(target.dataset.key, parseInt(target.dataset.qty) - 1);
      } else if (target.classList.contains('js-quantity-plus')) {
        this.updateItem(target.dataset.key, parseInt(target.dataset.qty) + 1);
      }
    });
  }

  open() {
    this.fetchCart().then(() => {
      this.drawer.classList.add('is-active');
      this.backdrop.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    });
  }

  close() {
    this.drawer.classList.remove('is-active');
    this.backdrop.classList.remove('is-active');
    document.body.style.overflow = '';
  }

  async fetchCart() {
    try {
      const response = await fetch(`${window.Shopify.routes.root}cart.js`);
      const cart = await response.json();
      this.renderCart(cart);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  }

  async updateItem(key, quantity) {
    try {
      // Bloquear UI opcionalmente
      this.itemsContainer.style.opacity = '0.5';
      this.itemsContainer.style.pointerEvents = 'none';

      const response = await fetch(`${window.Shopify.routes.root}cart/change.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ id: key, quantity: quantity })
      });
      const cart = await response.json();
      this.renderCart(cart);
    } catch (error) {
      console.error('Error updating cart:', error);
    } finally {
      this.itemsContainer.style.opacity = '1';
      this.itemsContainer.style.pointerEvents = 'auto';
    }
  }

  async clearCart() {
    try {
      this.itemsContainer.style.opacity = '0.5';
      const response = await fetch(`${window.Shopify.routes.root}cart/clear.js`, { method: 'POST' });
      const cart = await response.json();
      this.renderCart(cart);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  }

  renderCart(cart) {
    // Actualizar contadores globales (burbuja de header)
    this.countElements.forEach(el => el.textContent = cart.item_count);
    
    // Clear btn
    const clearBtn = document.querySelector('.cart-clear-btn');
    if (clearBtn) {
      clearBtn.style.display = cart.items.length > 0 ? 'block' : 'none';
      // Solo bindeamos una vez el clear o lo desbindeamos
      clearBtn.onclick = () => this.clearCart();
    }

    if (cart.items.length === 0) {
      this.footer.style.display = 'none';
      this.itemsContainer.innerHTML = `
        <div class="cart-empty animate-on-scroll is-visible">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          <p>Tu carrito está vacío</p>
          <span>Agregá productos del catálogo</span>
        </div>
      `;
      return;
    }

    // Render Items
    this.footer.style.display = 'flex';
    this.itemsContainer.innerHTML = cart.items.map((item, index) => {
      const price = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(item.final_line_price / 100);
      const delay = index * 0.1;
      
      let priceHtml = `<span class="cart-current-price">${price}</span>`;
      
      return `
        <div class="cart-item animate-on-scroll is-visible" style="animation-delay: ${delay}s">
          <div class="cart-item-info">
            <span class="cart-item-name">${item.product_title}</span>
            <span class="cart-item-presentation">${item.variant_title ? item.variant_title : ''}</span>
            <div class="cart-item-price-wrap">${priceHtml}</div>
          </div>
          <div class="cart-item-controls">
            <button class="js-quantity-minus" data-key="${item.key}" data-qty="${item.quantity}">−</button>
            <span>${item.quantity}</span>
            <button class="js-quantity-plus" data-key="${item.key}" data-qty="${item.quantity}">+</button>
            <button class="cart-remove-btn js-remove-item" data-key="${item.key}">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Inicializar y exportar a global para eventos onclick in-line (closeCartDrawer)
document.addEventListener('DOMContentLoaded', () => {
  window.ShopifyCart = new CartDrawer();
  window.closeCartDrawer = () => window.ShopifyCart.close();
});
