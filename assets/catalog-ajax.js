/**
 * MDB — AJAX Catalog & Global Interaction System
 * Handles real-time filtering, global Quick View, and GSAP animations.
 */
class CatalogAJAX {
  constructor() {
    this.container = document.querySelector('#CollectionSection');
    this.grid = document.querySelector('#ProductGrid');
    this.sidebar = document.querySelector('.collection-sidebar');
    this.filterDrawer = document.querySelector('#FilterDrawer');
    
    // Find the closest section ID
    const sectionElement = document.querySelector('.collection-main');
    this.sectionId = sectionElement ? sectionElement.getAttribute('data-section-id') : null;
    
    this.init();
    this.initQuickView();
  }

  init() {
    if (this.sidebar) {
      this.sidebar.addEventListener('click', (e) => {
        const link = e.target.closest('.filter-list a');
        if (link) {
          e.preventDefault();
          this.updateCatalog(link.getAttribute('href'));
          
          // Close drawer on mobile after clicking
          if (this.filterDrawer) {
            this.filterDrawer.classList.remove('active');
            document.body.classList.remove('overflow-hidden');
          }
        }
      });
    }

    // Filter Drawer (Mobile Logic)
    document.addEventListener('click', (e) => {
      if (e.target.closest('.js-open-filters')) {
        this.filterDrawer && this.filterDrawer.classList.add('active');
        document.body.classList.add('overflow-hidden');
      }
      if (e.target.closest('.js-close-filters') || e.target.classList.contains('filter-drawer-overlay')) {
        this.filterDrawer && this.filterDrawer.classList.remove('active');
        document.body.classList.remove('overflow-hidden');
      }
    });

    window.addEventListener('popstate', (e) => {
      this.updateCatalog(window.location.href, false);
    });
  }

  initQuickView() {
    // Global delegation for Quick View buttons
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-qv-open-btn, .btn-quick-view');
      const card = e.target.closest('.js-qv-card');
      if (!card || (!btn && !e.target.closest('.product-image-container'))) return;
      
      e.preventDefault();
      try {
        const bulk = JSON.parse(card.dataset.bulk || '[]');
        window.MDBQuickView && window.MDBQuickView.open({
          name:         card.dataset.title || '',
          category:     card.dataset.category || '',
          presentation: card.dataset.presentation || '',
          description:  card.dataset.description || '',
          image:        card.dataset.image || '',
          variantId:    card.dataset.variantId || '',
          bulkPricing:  bulk
        });
      } catch(err) {
        console.warn('MDB Global QuickView error:', err);
      }
    });
  }

  async updateCatalog(url, updateHistory = true) {
    if (!this.sectionId || !this.grid) {
      window.location.href = url;
      return;
    }

    // 1. UI Phase: Start Loading & GSAP Out
    this.container.classList.add('loading--active');
    
    const items = this.grid.querySelectorAll('.product-grid-item');
    if (items.length > 0) {
      gsap.to(items, {
        opacity: 0,
        y: 20,
        stagger: 0.02,
        duration: 0.3,
        ease: "power2.in"
      });
    }

    const ajaxUrl = `${url}${url.includes('?') ? '&' : '?'}section_id=${this.sectionId}`;

    try {
      const response = await fetch(ajaxUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const newGrid = doc.querySelector('#ProductGrid');
      const newSidebar = doc.querySelector('.collection-sidebar');
      
      if (newGrid) {
        // 2. DOM Phase: Update Content
        setTimeout(() => {
          this.grid.innerHTML = newGrid.innerHTML;
          if (this.sidebar && newSidebar) {
             // Optional: update sidebar if nested links change
             this.sidebar.innerHTML = newSidebar.innerHTML;
          }
          
          // Re-trigger scroll reveal for new items if not handled by GSAP
          
          // 3. GSAP In Phase
          const newItems = this.grid.querySelectorAll('.product-grid-item');
          gsap.fromTo(newItems, 
            { opacity: 0, y: 30 },
            { 
              opacity: 1, 
              y: 0, 
              stagger: 0.04, 
              duration: 0.6, 
              ease: "power3.out",
              clearProps: "all"
            }
          );

          if (updateHistory) history.pushState({ url }, '', url);
          this.updateActiveLinks(url);
          
          // Scroll fix
          const rect = this.container.getBoundingClientRect();
          if (rect.top < 0) {
            window.scrollTo({ top: window.scrollY + rect.top - 100, behavior: 'smooth' });
          }
        }, 350); // Wait for transition out
      } else {
        window.location.href = url;
      }
    } catch (error) {
      console.error('MDB Catalog AJAX Error:', error);
      window.location.href = url;
    } finally {
      setTimeout(() => this.container.classList.remove('loading--active'), 600);
    }
  }

  updateActiveLinks(currentUrl) {
    const links = document.querySelectorAll('.filter-list a');
    const currentPath = new URL(currentUrl, window.location.origin).pathname;
    links.forEach(link => {
      const linkParsed = new URL(link.href, window.location.origin);
      if (linkParsed.pathname === currentPath) link.classList.add('active');
      else link.classList.remove('active');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.catalogAJAX = new CatalogAJAX();
});
