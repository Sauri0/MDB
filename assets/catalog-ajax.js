/**
 * MDB — AJAX Catalog Filters
 * Handles real-time filtering without page reloads using Shopify's Section Rendering API.
 */
class CatalogAJAX {
  constructor() {
    this.container = document.querySelector('#CollectionSection');
    this.grid = document.querySelector('#ProductGrid');
    this.sidebar = document.querySelector('.collection-sidebar');
    
    if (!this.container || !this.sidebar) return;
    
    this.init();
  }

  init() {
    // Intercept clicks on category links in the sidebar
    this.sidebar.addEventListener('click', (e) => {
      const link = e.target.closest('.filter-list a');
      if (link) {
        e.preventDefault();
        const url = link.getAttribute('href');
        this.updateCatalog(url);
      }
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
      this.updateCatalog(window.location.href, false);
    });
  }

  async updateCatalog(url, updateHistory = true) {
    this.container.classList.add('loading--active');
    
    // Construct the URL for Section Rendering API
    // We append the section_id of the main-collection
    const sectionId = document.querySelector('[data-section-id]').getAttribute('data-section-id');
    const ajaxUrl = `${url}${url.includes('?') ? '&' : '?'}section_id=${sectionId}`;

    try {
      const response = await fetch(ajaxUrl);
      const html = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract the new grid content
      const newGridContent = doc.querySelector('#ProductGrid').innerHTML;
      
      // Update the DOM
      this.grid.innerHTML = newGridContent;
      
      // Update History
      if (updateHistory) {
        history.pushState({ url }, '', url);
      }

      // Update Active State in Sidebar
      this.updateActiveLinks(url);

      // Scroll to top of grid
      this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
      console.error('MDB Catalog Error:', error);
    } finally {
      this.container.classList.remove('loading--active');
    }
  }

  updateActiveLinks(currentUrl) {
    const links = this.sidebar.querySelectorAll('.filter-list a');
    links.forEach(link => {
      const linkUrl = new URL(link.href, window.location.origin).pathname;
      const currentPath = new URL(currentUrl, window.location.origin).pathname;
      
      if (linkUrl === currentPath) {
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
