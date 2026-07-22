(() => {
  const init = (root) => {
    if (root.dataset.initialized) return;
    root.dataset.initialized = 'true';
    const variants = JSON.parse(root.querySelector('[data-product-variants]').textContent);
    const selects = [...root.querySelectorAll('[data-option-position]')];
    const form = root.querySelector('form');
    const idInput = form.querySelector('[name="id"]');
    const submit = form.querySelector('[name="add"]');
    const submitText = submit.querySelector('span');
    const quantity = form.querySelector('[name="quantity"]');
    const checkout = root.querySelector('[data-dynamic-checkout]');
    const mainImage = root.querySelector('.suvedh-single-collection-product__image');
    const renderData = (id) => root.querySelector(`[data-variant-render-data] [data-variant-id="${id}"]`);
    const setMedia = (src, mediaId) => {
      if (src && mainImage) mainImage.src = src;
      root.querySelectorAll('[data-media-id]').forEach((el) => el.classList.toggle('is-active', el.dataset.mediaId === String(mediaId)));
    };
    const update = () => {
      const chosen = selects.map((select) => select.value);
      const variant = variants.find((item) => item.options.every((value, index) => value === chosen[index]));
      selects.forEach((select, index) => [...select.options].forEach((option) => {
        option.disabled = !variants.some((item) => item.available && item.options[index] === option.value);
      }));
      if (!variant) {
        idInput.disabled = true; submit.disabled = true; submitText.textContent = window.variantStrings?.unavailable || 'Unavailable'; if (checkout) checkout.classList.add('hidden'); return;
      }
      const data = renderData(variant.id);
      idInput.value = variant.id; idInput.disabled = !variant.available;
      submit.disabled = !variant.available; submitText.textContent = variant.available ? (window.variantStrings?.addToCart || 'Add to cart') : (window.variantStrings?.soldOut || 'Sold out');
      if (checkout) checkout.classList.toggle('hidden', !variant.available);
      const sku = root.querySelector('[data-variant-sku]'); sku.querySelector('span').textContent = variant.sku || ''; sku.classList.toggle('hidden', !variant.sku);
      const price = root.querySelector('[data-variant-price]'); price.querySelector('.suvedh-single-collection-product__current-price').textContent = data.dataset.price;
      const compare = price.querySelector('s'); compare.textContent = data.dataset.compare; compare.classList.toggle('hidden', !data.dataset.compare);
      const discount = price.querySelector('.suvedh-single-collection-product__discount'); discount.textContent = data.dataset.saving !== '0' ? `Save ${data.dataset.saving}%` : ''; discount.classList.toggle('hidden', data.dataset.saving === '0');
      root.querySelector('[data-sale-badge]').classList.toggle('hidden', data.dataset.saving === '0');
      quantity.min = data.dataset.min; quantity.dataset.min = data.dataset.min; quantity.step = data.dataset.step; quantity.value = Math.max(Number(quantity.value), Number(data.dataset.min));
      if (data.dataset.max) { quantity.max = data.dataset.max; quantity.dataset.max = data.dataset.max; } else { quantity.removeAttribute('max'); delete quantity.dataset.max; }
      setMedia(data.dataset.mediaSrc, data.dataset.mediaId);
      idInput.dispatchEvent(new Event('change', { bubbles: true }));
    };
    selects.forEach((select) => select.addEventListener('change', update));
    root.querySelectorAll('.suvedh-single-collection-product__thumbnail').forEach((button) => button.addEventListener('click', () => setMedia(button.dataset.mediaSrc, button.dataset.mediaId)));
    update();
  };
  const boot = () => document.querySelectorAll('[data-single-collection-product]').forEach(init);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
  document.addEventListener('shopify:section:load', boot);
})();
