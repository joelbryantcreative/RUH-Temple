/* RŪḤ Temple — Shopify Cart (public endpoints, no token required) */
(function () {
  const STORE = 'zdfyns-0v.myshopify.com';
  const TERRE_NATALE_HANDLE = 'terre-natale';

  /* Local cart state */
  let lineItems = []; /* [{ variantId, title, price, qty }] */
  let variantCache = null;

  /* ── Fetch variant via public product JSON (no auth needed) ── */
  async function getVariant() {
    if (variantCache) return variantCache;
    const res = await fetch(
      `https://${STORE}/products/${TERRE_NATALE_HANDLE}.json`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) throw new Error('Product not found');
    const data = await res.json();
    const v = data.product.variants[0];
    variantCache = {
      id: v.id,
      title: data.product.title,
      variantTitle: v.title,
      price: parseFloat(v.price),
    };
    return variantCache;
  }

  /* ── Build Shopify direct-checkout URL ── */
  function checkoutUrl() {
    if (lineItems.length === 0) return null;
    const items = lineItems.map(l => `${l.variantId}:${l.qty}`).join(',');
    return `https://${STORE}/cart/${items}`;
  }

  /* ── Public API ── */
  window.RuhCart = {
    async addTerrNatale() {
      showLoading(true);
      try {
        const v = await getVariant();
        const existing = lineItems.find(l => l.variantId === v.id);
        if (existing) {
          existing.qty += 1;
        } else {
          lineItems.push({ variantId: v.id, title: v.title, variantTitle: v.variantTitle, price: v.price, qty: 1 });
        }
        renderDrawer();
        openDrawer();
      } catch (err) {
        console.error('[RūḥCart]', err);
        alert('Could not load product. Please check your connection and try again.');
      } finally {
        showLoading(false);
      }
    },
    openDrawer,
    closeDrawer,
  };

  /* ── Drawer ── */
  function buildDrawer() {
    const d = document.createElement('div');
    d.id = 'ruh-cart-drawer';
    d.innerHTML = `
      <div id="ruh-cart-overlay"></div>
      <div id="ruh-cart-panel">
        <div id="ruh-cart-header">
          <span id="ruh-cart-title">Your Cart</span>
          <button id="ruh-cart-close" aria-label="Close cart">&#215;</button>
        </div>
        <div id="ruh-cart-body"></div>
        <div id="ruh-cart-footer">
          <div id="ruh-cart-subtotal"></div>
          <a id="ruh-cart-checkout" href="#" target="_blank">Proceed to Checkout</a>
          <p id="ruh-cart-note">Secure checkout powered by Shopify</p>
        </div>
      </div>`;
    document.body.appendChild(d);
    document.getElementById('ruh-cart-close').addEventListener('click', closeDrawer);
    document.getElementById('ruh-cart-overlay').addEventListener('click', closeDrawer);
  }

  function renderDrawer() {
    const body = document.getElementById('ruh-cart-body');
    const subtotalEl = document.getElementById('ruh-cart-subtotal');
    const checkoutLink = document.getElementById('ruh-cart-checkout');
    if (!body) return;

    if (lineItems.length === 0) {
      body.innerHTML = '<p id="ruh-cart-empty">Your cart is empty.</p>';
      subtotalEl.textContent = '';
      checkoutLink.style.opacity = '0.4';
      checkoutLink.style.pointerEvents = 'none';
      return;
    }

    let total = 0;
    body.innerHTML = lineItems.map((item, idx) => {
      const lineTotal = item.price * item.qty;
      total += lineTotal;
      return `
        <div class="ruh-cart-item">
          <div class="ruh-cart-item-info">
            <p class="ruh-cart-item-name">${item.title}</p>
            ${item.variantTitle && item.variantTitle !== 'Default Title' ? `<p class="ruh-cart-item-variant">${item.variantTitle}</p>` : ''}
          </div>
          <div class="ruh-cart-item-qty">
            <button class="ruh-qty-btn" data-idx="${idx}" data-action="dec">−</button>
            <span>${item.qty}</span>
            <button class="ruh-qty-btn" data-idx="${idx}" data-action="inc">+</button>
          </div>
          <p class="ruh-cart-item-price">AUD ${lineTotal.toFixed(2)}</p>
        </div>`;
    }).join('');

    subtotalEl.textContent = `Subtotal: AUD ${total.toFixed(2)}`;
    const url = checkoutUrl();
    checkoutLink.href = url || '#';
    checkoutLink.style.opacity = '1';
    checkoutLink.style.pointerEvents = 'auto';

    body.querySelectorAll('.ruh-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const action = btn.dataset.action;
        if (action === 'inc') {
          lineItems[idx].qty += 1;
        } else {
          lineItems[idx].qty -= 1;
          if (lineItems[idx].qty <= 0) lineItems.splice(idx, 1);
        }
        renderDrawer();
        updateCartCount();
      });
    });

    updateCartCount();
  }

  function openDrawer() {
    const d = document.getElementById('ruh-cart-drawer');
    if (d) d.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    const d = document.getElementById('ruh-cart-drawer');
    if (d) d.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showLoading(on) {
    const panel = document.getElementById('ruh-cart-panel');
    if (panel) panel.style.opacity = on ? '0.6' : '1';
  }

  function updateCartCount() {
    const total = lineItems.reduce((sum, l) => sum + l.qty, 0);
    document.querySelectorAll('.ruh-cart-count').forEach(el => {
      el.textContent = total > 0 ? total : '';
      el.style.display = total > 0 ? 'flex' : 'none';
    });
  }

  /* ── Styles ── */
  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
      #ruh-cart-drawer { display: none; }
      #ruh-cart-drawer.open { display: block; }
      #ruh-cart-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.4);
        z-index: 900;
        animation: ruhFadeIn 0.25s ease;
      }
      #ruh-cart-panel {
        position: fixed; top: 0; right: 0; bottom: 0;
        width: min(420px, 100vw);
        background: #fff;
        z-index: 901;
        display: flex; flex-direction: column;
        box-shadow: -4px 0 40px rgba(0,0,0,0.15);
        animation: ruhSlideIn 0.3s ease;
        transition: opacity 0.2s;
      }
      @keyframes ruhFadeIn { from { opacity:0 } to { opacity:1 } }
      @keyframes ruhSlideIn { from { transform:translateX(100%) } to { transform:translateX(0) } }
      #ruh-cart-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 28px 32px 20px;
        border-bottom: 1px solid rgba(0,0,0,0.1);
      }
      #ruh-cart-title {
        font-family: 'Cinzel', serif;
        font-size: 13px; font-weight: 400;
        letter-spacing: 0.24em; text-transform: uppercase;
        color: #1a1a1a;
      }
      #ruh-cart-close {
        background: none; border: none; cursor: pointer;
        font-size: 22px; color: #888; line-height: 1; padding: 4px;
      }
      #ruh-cart-close:hover { color: #1a1a1a; }
      #ruh-cart-body { flex: 1; overflow-y: auto; padding: 24px 32px; }
      #ruh-cart-empty {
        font-family: 'Cormorant Garamond', serif;
        font-size: 16px; color: #999;
        text-align: center; margin-top: 60px;
      }
      .ruh-cart-item {
        display: flex; align-items: center; gap: 16px;
        padding: 16px 0;
        border-bottom: 1px solid rgba(0,0,0,0.07);
      }
      .ruh-cart-item-info { flex: 1; }
      .ruh-cart-item-name {
        font-family: 'Cinzel', serif;
        font-size: 11px; letter-spacing: 0.15em;
        text-transform: uppercase; color: #1a1a1a;
      }
      .ruh-cart-item-variant {
        font-family: 'Cormorant Garamond', serif;
        font-size: 13px; color: #888; margin-top: 2px;
      }
      .ruh-cart-item-qty {
        display: flex; align-items: center; gap: 10px;
        font-family: 'Cormorant Garamond', serif;
        font-size: 16px; color: #1a1a1a;
      }
      .ruh-qty-btn {
        background: none; border: 1px solid rgba(0,0,0,0.2);
        width: 26px; height: 26px; cursor: pointer;
        font-size: 14px; color: #1a1a1a;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.2s;
      }
      .ruh-qty-btn:hover { background: #f5f5f5; }
      .ruh-cart-item-price {
        font-family: 'Cormorant Garamond', serif;
        font-size: 15px; color: #1a1a1a; white-space: nowrap;
      }
      #ruh-cart-footer {
        padding: 24px 32px 32px;
        border-top: 1px solid rgba(0,0,0,0.1);
      }
      #ruh-cart-subtotal {
        font-family: 'Cinzel', serif;
        font-size: 12px; letter-spacing: 0.12em;
        text-transform: uppercase; color: #1a1a1a; margin-bottom: 18px;
      }
      #ruh-cart-checkout {
        display: block; width: 100%;
        background: #1a1a1a; color: #fff;
        text-align: center; text-decoration: none;
        font-family: 'Cinzel', serif;
        font-size: 11px; font-weight: 400;
        letter-spacing: 0.28em; text-transform: uppercase;
        padding: 16px 24px;
        transition: background 0.3s;
      }
      #ruh-cart-checkout:hover { background: #333; }
      #ruh-cart-note {
        font-family: 'Cormorant Garamond', serif;
        font-size: 12px; color: #aaa;
        text-align: center; margin-top: 12px;
      }
      .ruh-cart-count {
        position: absolute; top: -6px; right: -6px;
        background: #1a1a1a; color: #fff;
        font-size: 9px; font-family: sans-serif;
        width: 16px; height: 16px;
        border-radius: 50%;
        display: none;
        align-items: center; justify-content: center;
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', () => {
    buildDrawer();
    injectStyles();

    document.querySelectorAll('.nav-cart').forEach(btn => {
      btn.style.position = 'relative';
      const badge = document.createElement('span');
      badge.className = 'ruh-cart-count';
      btn.appendChild(badge);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openDrawer();
      });
    });

    document.querySelectorAll('.shop-tile[data-shopify="terre-natale"]').forEach(tile => {
      tile.addEventListener('click', async (e) => {
        e.preventDefault();
        await window.RuhCart.addTerrNatale();
      });
    });

    const preorderBtn = document.querySelector('.btn-preorder');
    if (preorderBtn) {
      preorderBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const orig = preorderBtn.textContent;
        preorderBtn.textContent = 'Adding...';
        await window.RuhCart.addTerrNatale();
        preorderBtn.textContent = orig;
      });
    }
  });
})();
