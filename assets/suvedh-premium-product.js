document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.suvedh-product-page').forEach((section) => {
    section.querySelectorAll('[data-copy-code]').forEach((button) => button.addEventListener('click', async () => {
      const label = button.dataset.copyLabel || 'Copy';
      try { await navigator.clipboard.writeText(button.dataset.copyCode); button.textContent = 'Copied!'; }
      catch (_) { button.textContent = 'Select code'; }
      window.setTimeout(() => { button.textContent = label; }, 1520);
    }));
    const tabs = [...section.querySelectorAll('[role="tab"]')];
    const activate = (index) => tabs.forEach((item, i) => {
      const active = i === index;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      const panel = section.querySelector('#' + item.getAttribute('aria-controls'));
      panel?.classList.toggle('is-hidden', !active);
      const panelContent = panel?.querySelector('.suvedh-product-page__panel-content');
      if (panelContent) panelContent.hidden = !active;
    });
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(index));
      tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next].focus(); activate(next);
      });
    });
    section.querySelectorAll('.suvedh-product-page__accordion-trigger').forEach((button) => button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      const panel = section.querySelector('#' + button.getAttribute('aria-controls'));
      if (panel) panel.hidden = open;
    }));
  });
});
document.addEventListener('DOMContentLoaded', () => {
  if (typeof subscribe !== 'function' || !window.PUB_SUB_EVENTS) return;
  subscribe(PUB_SUB_EVENTS.variantChange, ({ data }) => {
    if (!data.variant) return;
    const root = document.querySelector(`product-info[data-section="${data.sectionId}"]`);
    if (!root) return;
    const detailSku = root.querySelector('[data-product-detail-sku]');
    if (detailSku) { detailSku.querySelector('dd').textContent = data.variant.sku || ''; detailSku.classList.toggle('hidden', !data.variant.sku); }
    const saving = root.querySelector('[data-variant-saving]');
    if (saving) {
      const compare = Number(data.variant.compare_at_price) || 0, price = Number(data.variant.price) || 0;
      const percent = compare > price ? Math.round((compare - price) * 100 / compare) : 0;
      saving.textContent = percent ? `Save ${percent}%` : ''; saving.classList.toggle('hidden', !percent);
    }
  });
});