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
          
          if (this.filterDrawer) {
            this.filterDrawer.classList.remove('active');
            document.body.classList.remove('overflow-hidden');
          }
        }
      });
    }

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
    // Robust delegation with multiple triggers
    document.addEventListener('click', (e) => {
      const target = e.target;
      const btn = target.closest('.js-qv-trigger, .btn-quick-view, .product-image-container');
      const card = target.closest('.js-qv-trigger');
      
      if (!card || !btn) return;
      
      e.preventDefault();
      e.stopPropagation();

      // Check if MDBQuickView is available
      if (window.MDBQuickView) {
        this.openQuickView(card);
      } else {
        console.warn('MDB: QuickView system not ready, retrying...');
        setTimeout(() => {
          if (window.MDBQuickView) this.openQuickView(card);
        }, 500);
      }
    });
  }

  openQuickView(card) {
    try {
      const bulk = JSON.parse(card.dataset.bulk || '[]');
      window.MDBQuickView.open({
        name:         card.dataset.title || '',
        category:     card.dataset.category || '',
        presentation: card.dataset.presentation || '',
        description:  card.dataset.description || '',
        image:        card.dataset.image || '',
        variantId:    card.dataset.variantId || '',
        bulkPricing:  bulk
      });
    } catch(err) {
      console.error('MDB QuickView Error:', err);
    }
  }

  async updateCatalog(url, updateHistory = true) {
    if (!this.sectionId || !this.grid) {
      window.location.href = url;
      return;
    }

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
        setTimeout(() => {
          this.grid.innerHTML = newGrid.innerHTML;
          if (this.sidebar && newSidebar) this.sidebar.innerHTML = newSidebar.innerHTML;
          
          const newItems = this.grid.querySelectorAll('.product-grid-item');
          if (newItems.length > 0) {
            gsap.fromTo(newItems, 
              { opacity: 0, y: 30 },
              { 
                opacity: 1, 
                y: 0, 
                stagger: 0.04, 
                duration: 0.4, 
                ease: "power2.out",
                clearProps: "all"
              }
            );
          } else {
             // Fallback reveal if grid is empty or items missed
             this.grid.style.opacity = '1';
          }

          if (updateHistory) history.pushState({ url }, '', url);
          this.updateActiveLinks(url);
          
          const rect = this.container.getBoundingClientRect();
          if (rect.top < 0) {
            window.scrollTo({ top: window.scrollY + rect.top - 100, behavior: 'smooth' });
          }
        }, 350);
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
    const currentLoc = new URL(currentUrl, window.location.origin);
    
    links.forEach(link => {
      const linkParsed = new URL(link.href, window.location.origin);
      
      // Compare both pathname AND search (important for /collections/types?q=...)
      const isSamePath = linkParsed.pathname === currentLoc.pathname;
      const isSameSearch = linkParsed.search === currentLoc.search;
      
      if (isSamePath && isSameSearch) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.catalogAJAX = new CatalogAJAX();
});
