(() => {
  const storageKey = 'suvedh-wishlist-products';

  const readWishlist = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(saved) ? saved.filter((handle) => typeof handle === 'string') : [];
    } catch (_) {
      return [];
    }
  };

  const updateButtons = (root = document) => {
    const handles = readWishlist();
    root.querySelectorAll('[data-product-wishlist]').forEach((button) => {
      const saved = handles.includes(button.dataset.productHandle);
      const title = button.dataset.productTitle || 'this product';
      button.setAttribute('aria-pressed', String(saved));
      button.setAttribute('aria-label', (saved ? 'Remove ' : 'Add ') + title + (saved ? ' from wishlist' : ' to wishlist'));
      const label = button.querySelector('[data-wishlist-label]');
      if (label) label.textContent = saved ? 'Remove from Wishlist' : 'Add to Wishlist';
    });
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product-wishlist]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const handle = button.dataset.productHandle;
    if (!handle) return;
    const handles = readWishlist();
    const updated = handles.includes(handle)
      ? handles.filter((savedHandle) => savedHandle !== handle)
      : [...handles, handle];
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {
      return;
    }
    updateButtons();
  });

  document.addEventListener('DOMContentLoaded', () => updateButtons());
  document.addEventListener('shopify:section:load', (event) => updateButtons(event.target));
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey) updateButtons();
  });
})();
