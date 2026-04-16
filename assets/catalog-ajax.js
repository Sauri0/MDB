/**
 * MDB — AJAX Catalog Filters (Premium Version)
 * Handles real-time filtering with robust section targeting and error handling.
 */
class CatalogAJAX {
  constructor() {
    this.container = document.querySelector('#CollectionSection');
    this.grid = document.querySelector('#ProductGrid');
    this.sidebar = document.querySelector('.collection-sidebar');
    
    if (!this.container || !this.sidebar) return;
    
    // Find the closest section ID to avoid targeting Hero or Header
    const sectionElement = this.container.closest('[data-section-id]');
    this.sectionId = sectionElement ? sectionElement.getAttribute('data-section-id') : null;
    
    this.init();
  }

  init() {
    this.sidebar.addEventListener('click', (e) => {
      const link = e.target.closest('.filter-list a');
      if (link) {
        e.preventDefault();
        const url = link.getAttribute('href');
        this.updateCatalog(url);
      }
    });

    window.addEventListener('popstate', (e) => {
      this.updateCatalog(window.location.href, false);
    });
  }

  async updateCatalog(url, updateHistory = true) {
    if (!this.sectionId) {
      console.warn('MDB: No section ID found for AJAX filtering. Falling back to full reload.');
      window.location.href = url;
      return;
    }

    this.container.classList.add('loading--active');
    
    const ajaxUrl = `${url}${url.includes('?') ? '&' : '?'}section_id=${this.sectionId}`;

    try {
      const response = await fetch(ajaxUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const newGrid = doc.querySelector('#ProductGrid');
      
      if (newGrid) {
        // Update Grid Content
        this.grid.innerHTML = newGrid.innerHTML;
        
        // Update URL
        if (updateHistory) {
          history.pushState({ url }, '', url);
        }

        // Update Active Links
        this.updateActiveLinks(url);

        // Smart Scroll: only scroll if the top of the container is above the current view
        const rect = this.container.getBoundingClientRect();
        if (rect.top < 0) {
          window.scrollTo({
            top: window.scrollY + rect.top - 100, // Offset for fixed header
            behavior: 'smooth'
          });
        }
      } else {
        console.warn('MDB: #ProductGrid not found in the AJAX response. Section ID might be incorrect.');
        // If we can't find the grid in AJAX, let's just go to the URL directly as fallback
        window.location.href = url;
      }
    } catch (error) {
      console.error('MDB Catalog AJAX Error:', error);
      window.location.href = url; // Hard fallback on error
    } finally {
      this.container.classList.remove('loading--active');
    }
  }

  updateActiveLinks(currentUrl) {
    const links = this.sidebar.querySelectorAll('.filter-list a');
    const currentPath = new URL(currentUrl, window.location.origin).pathname;
    const currentSearch = new URL(currentUrl, window.location.origin).search;

    links.forEach(link => {
      const linkParsed = new URL(link.href, window.location.origin);
      const isSamePath = linkParsed.pathname === currentPath;
      const isSameSearch = linkParsed.search === currentSearch;
      
      if (isSamePath && (currentSearch === '' || isSameSearch)) {
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
