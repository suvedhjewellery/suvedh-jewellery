(() => {
  const key = 'suvedh-wishlist-products';
  const init = (root) => {
    if (root.dataset.featuresInitialized) return;
    root.dataset.featuresInitialized = 'true';
    const setStickyOffset = () => {
      const headers = [...document.querySelectorAll('.shopify-section-group-header-group')];
      const height = headers.reduce((total, item) => total + item.getBoundingClientRect().height, 0);
      root.style.setProperty('--suvedh-showcase-sticky-top', `${Math.ceil(height + 20)}px`);
    };
    setStickyOffset(); window.addEventListener('resize', setStickyOffset, { passive: true });
    root.querySelectorAll('[data-copy-code]').forEach((button) => button.addEventListener('click', async () => { const label = button.dataset.copyLabel; try { await navigator.clipboard.writeText(button.dataset.copyCode); button.textContent = 'Copied'; } catch (_) { button.textContent = 'Select code'; } setTimeout(() => { button.textContent = label; }, 1600); }));
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const activate = (index) => tabs.forEach((tab, i) => { const active = i === index; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; document.getElementById(tab.getAttribute('aria-controls'))?.classList.toggle('is-hidden', !active); });
    tabs.forEach((tab, index) => { tab.addEventListener('click', () => activate(index)); tab.addEventListener('keydown', (event) => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; tabs[next].focus(); activate(next); }); });
    const accordionButtons = [...root.querySelectorAll('.suvedh-single-collection-product__accordion-trigger')];
    accordionButtons.forEach((button) => button.addEventListener('click', () => { const open = button.getAttribute('aria-expanded') === 'true'; accordionButtons.forEach((other) => { other.setAttribute('aria-expanded','false'); document.getElementById(other.getAttribute('aria-controls')).hidden = true; }); if (!open) { button.setAttribute('aria-expanded','true'); document.getElementById(button.getAttribute('aria-controls')).hidden = false; } }));
    const modal = root.querySelector('[data-zoom-modal]'); const trigger = root.querySelector('[data-zoom-trigger]'); const thumbs = [...root.querySelectorAll('[data-media-zoom-src]')]; let zoomIndex = Math.max(0, thumbs.findIndex((item) => item.classList.contains('is-active'))); let returnFocus;
    if (modal && trigger) { const image = modal.querySelector('[data-zoom-image]'); const show = (index) => { if (thumbs.length) { zoomIndex = (index + thumbs.length) % thumbs.length; image.src = thumbs[zoomIndex].dataset.mediaZoomSrc; image.alt = thumbs[zoomIndex].dataset.mediaAlt; } }; const close = () => { modal.hidden = true; document.body.classList.remove('suvedh-showcase-zoom-open'); returnFocus?.focus(); }; trigger.addEventListener('click', () => { returnFocus = trigger; zoomIndex = Math.max(0, thumbs.findIndex((item) => item.classList.contains('is-active'))); show(zoomIndex); modal.hidden = false; document.body.classList.add('suvedh-showcase-zoom-open'); modal.querySelector('[data-zoom-close]').focus(); }); modal.querySelector('[data-zoom-close]').addEventListener('click', close); modal.querySelector('[data-zoom-previous]').addEventListener('click', () => show(zoomIndex - 1)); modal.querySelector('[data-zoom-next]').addEventListener('click', () => show(zoomIndex + 1)); modal.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); if (event.key === 'ArrowLeft') show(zoomIndex - 1); if (event.key === 'ArrowRight') show(zoomIndex + 1); if (event.key === 'Tab') { const controls = [...modal.querySelectorAll('button:not([disabled])')]; const first = controls[0], last = controls[controls.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }); }
  };
  const boot = () => document.querySelectorAll('[data-single-collection-product]').forEach(init);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot(); document.addEventListener('shopify:section:load', boot);
})();
