/*
 * Compatibility loader + Stock -> Quote workflow.
 * The existing premium PDF renderer remains loaded from its proven commit.
 */
(function(){
  const load=src=>{const s=document.createElement('script');s.src=src;s.async=false;document.head.appendChild(s)};
  load('./category.js');
  load('https://raw.githubusercontent.com/Hll01011/stok-teklif-sistemi/74f3d8cf90ebb9d0b56e19276daf6653114ae24c/quote-pdf-fix.js');

  const escQ=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const nQ=v=>Number(v)||0;
  const moneyQ=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(nQ(n));

  function costTL(p){
    if(!p)return 0;
    return p.purchaseCurrency==='USD'&&window.state?.usdRate?nQ(p.purchase)*nQ(state.usdRate):nQ(p.purchase);
  }
  function saleTL(p){
    if(!p)return 0;
    return p.saleCurrency==='USD'&&window.state?.usdRate?nQ(p.sale)*nQ(state.usdRate):nQ(p.sale);
  }
  function marginFromPrice(p,price){const c=costTL(p);return c>0?((nQ(price)-c)/c)*100:0}

  function injectStyle(){
    if(document.getElementById('stock-quote-enhanced-style'))return;
    const s=document.createElement('style');s.id='stock-quote-enhanced-style';s.textContent=`
      .stock-quote-select{width:18px;height:18px;accent-color:#43e3a4;cursor:pointer;vertical-align:middle}
      .stock-quote-action{white-space:nowrap;border:1px solid rgba(67,227,164,.28);background:rgba(67,227,164,.08);color:#43e3a4;border-radius:8px;padding:7px 10px;font-weight:800;font-size:12px;cursor:pointer;transition:.18s}
      .stock-quote-action:hover{background:rgba(67,227,164,.16);transform:translateY(-1px)}
      .stock-quote-head{display:flex;align-items:center;gap:8px;color:#91a0b1;font-size:12px}
      .stock-quote-head input{accent-color:#43e3a4;width:17px;height:17px}
      .stock-quote-bar{position:fixed;left:calc(268px + 24px);right:24px;bottom:20px;z-index:90;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 16px;border:1px solid rgba(67,227,164,.28);border-radius:16px;background:rgba(8,20,35,.94);box-shadow:0 18px 50px rgba(0,0,0,.35);backdrop-filter:blur(16px);transform:translateY(120px);opacity:0;pointer-events:none;transition:.22s}
      .stock-quote-bar.show{transform:translateY(0);opacity:1;pointer-events:auto}
      .stock-quote-bar .sqb-count{font-weight:800;color:#fff}.stock-quote-bar .sqb-sub{font-size:11px;color:#8d9baa;margin-top:2px}
      .stock-quote-create{border:0;background:#43e3a4;color:#07111f;border-radius:10px;padding:10px 16px;font-weight:900;cursor:pointer}
      .stock-quote-clear{border:1px solid #314154;background:transparent;color:#aeb8c3;border-radius:10px;padding:9px 12px;font-weight:700;cursor:pointer}
      .sqb-actions{display:flex;gap:8px;align-items:center}
      .quote-items-enhanced input{width:100%;box-sizing:border-box;border:1px solid #2b3c50;background:#0b1829;color:#e8eef5;border-radius:7px;padding:7px 8px;outline:none}
      .quote-items-enhanced input:focus{border-color:#43e3a4;box-shadow:0 0 0 2px rgba(67,227,164,.08)}
      .quote-items-enhanced .qi-price{min-width:105px}.quote-items-enhanced .qi-margin{min-width:82px}.quote-items-enhanced .qi-net{min-width:95px}
      .quote-items-enhanced .qi-cost{font-size:10px;color:#7e8b99;display:block;margin-top:3px}
      .quote-stock-info{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:9px;background:rgba(67,227,164,.06);border:1px solid rgba(67,227,164,.14);color:#a9b5c1;font-size:11px;margin-bottom:12px}
      .quote-stock-info b{color:#43e3a4}
      .quote-approve-btn{white-space:nowrap;border:1px solid rgba(67,227,164,.28);background:rgba(67,227,164,.08);color:#43e3a4;border-radius:8px;padding:7px 10px;font-weight:800;font-size:11px;cursor:pointer;margin-left:6px}
      .quote-approve-btn:hover{background:rgba(67,227,164,.16)}
      .quote-approved-badge{display:inline-flex;align-items:center;gap:5px;margin-left:6px;color:#43e3a4;font-size:11px;font-weight:800}
      @media(max-width:900px){.stock-quote-bar{left:16px;right:16px;bottom:76px}.stock-quote-bar .sqb-sub{display:none}.stock-quote-bar{padding:10px 12px}.stock-quote-create{padding:9px 12px}.stock-quote-action{padding:6px 8px}.quote-items-enhanced .qi-net{display:none}}
    `;document.head.appendChild(s);
  }

  function ensureBar(){
    if(document.getElementById('stock-quote-bar'))return;
    const bar=document.createElement('div');bar.id='stock-quote-bar';bar.className='stock-quote-bar';bar.innerHTML=`<div><div class="sqb-count"><span id="stock-quote-count">0</span> ürün seçildi</div><div class="sqb-sub">Seçtiğin ürünlerden tek ekranda müşteri teklifi oluştur.</div></div><div class="sqb-actions"><button type="button" class="stock-quote-clear" id="stock-quote-clear">Temizle</button><button type="button" class="stock-quote-create" id="stock-quote-create">Teklif Oluştur →</button></div>`;document.body.appendChild(bar);
    $('#stock-quote-clear').addEventListener('click',()=>{state.stockQuoteSelected=new Set();refreshProductsUI()});
    $('#stock-quote-create').addEventListener('click',openStockQuote);
  }

  function refreshProductsUI(){
    const selected=state.stockQuoteSelected||new Set();
    const filter=$('#product-search')?.value||'';
    if(typeof window.__hisBaseRenderProducts==='function')window.__hisBaseRenderProducts(filter);
    enhanceProductRows();
    updateSelectionBar();
  }

  function enhanceProductRows(){
    const body=$('#products-body');if(!body)return;
    const head=body.closest('table')?.querySelector('thead tr');
    if(head){const first=head.firstElementChild;if(first&&!first.querySelector('.stock-quote-head'))first.innerHTML=`<label class="stock-quote-head"><input id="stock-quote-select-all" type="checkbox"> Kod</label>`;const last=head.lastElementChild;if(last)last.textContent='Teklif';}
    const rows=[...body.querySelectorAll('tr')];
    const selected=state.stockQuoteSelected||new Set();
    rows.forEach(row=>{
      const code=row.querySelector('td b')?.textContent?.trim();
      const p=state.products.find(x=>x.code===code);
      if(!p||!row.children.length)return;
      if(row.dataset.stockQuoteEnhanced)return;
      row.dataset.stockQuoteEnhanced='1';
      const first=row.firstElementChild;
      if(first)first.innerHTML=`<label class="stock-quote-head"><input class="stock-quote-select" type="checkbox" data-stock-product="${escQ(p.id)}" ${selected.has(p.id)?'checked':''}><b>${escQ(p.code)}</b></label>`;
      const last=row.lastElementChild;
      if(last)last.innerHTML=`<button type="button" class="stock-quote-action" data-stock-add="${escQ(p.id)}">+ Teklife Ekle</button>`;
    });
    const selectAll=$('#stock-quote-select-all');
    if(selectAll){
      const visible=rows.map(r=>r.querySelector('.stock-quote-select')).filter(Boolean);
      selectAll.checked=visible.length>0&&visible.every(x=>x.checked);
      selectAll.indeterminate=visible.some(x=>x.checked)&&!selectAll.checked;
    }
  }

  function updateSelectionBar(){
    ensureBar();
    const count=(state.stockQuoteSelected||new Set()).size;
    $('#stock-quote-count').textContent=count;
    $('#stock-quote-bar').classList.toggle('show',count>0);
  }

  function openStockQuote(){
    const ids=[...(state.stockQuoteSelected||new Set())];
    if(!ids.length)return toast('Teklif için önce stoktan ürün seç.','bad');
    if(state.demo){toast('Demo modunda teklif kaydı yapılamaz.','bad');return}
    const products=ids.map(id=>state.products.find(p=>p.id===id)).filter(Boolean);
    openQuote();
    state.quoteItems=products.map(p=>{
      const price=saleTL(p),margin=marginFromPrice(p,price);
      return {product_id:p.id,code:p.code,name:p.name,quantity:1,unit_price:price,profit_margin:margin,vat_rate:nQ(p.vat)||20,currency:'TRY'};
    });
    renderQuoteItems();
    $('#quote-modal-title').textContent=`Stoktan Yeni Teklif · ${products.length} Ürün`;
    $('#quote-modal').querySelector('.quote-form')?.insertAdjacentHTML('afterbegin',`<div class="quote-stock-info"><span>▦</span><span><b>Stoktan seçildi.</b> Miktarları ve teklif fiyatlarını aşağıdaki tablodan doğrudan düzenleyebilirsin.</span></div>`);
    state.stockQuoteSelected=new Set();
    updateSelectionBar();
  }

  function enhancedRenderQuoteItems(){
    const c=calcQuote();
    const rows=state.quoteItems.map((i,n)=>{
      const p=state.products.find(x=>x.id===i.product_id);
      const cost=costTL(p);
      const margin=marginFromPrice(p,i.unit_price);
      i.profit_margin=margin;
      return `<tr class="quote-items-enhanced"><td><b>${escQ(i.code)}</b><small>${escQ(i.name)}</small><span class="qi-cost">Maliyet: ${moneyQ(cost)}</span></td><td><input class="qi-qty" data-i="${n}" type="number" min="0.01" step="0.01" value="${i.quantity}"></td><td><input class="qi-price" data-price-i="${n}" type="number" min="0" step="0.01" value="${nQ(i.unit_price).toFixed(2)}"></td><td><input class="qi-margin" data-margin-i="${n}" type="number" step="0.1" value="${margin.toFixed(1)}"><span style="font-size:10px;color:#7e8b99">%</span></td><td><input class="qi-net" data-net-i="${n}" type="number" step="0.01" value="${(nQ(i.unit_price)-cost).toFixed(2)}"><span style="font-size:10px;color:#7e8b99">net fark</span></td><td><b>${moneyQ(i.quantity*i.unit_price)}</b></td><td><button type="button" class="text-btn" data-remove-qi="${n}">Sil</button></td></tr>`;
    }).join('')||'<tr><td colspan="7" class="muted">Henüz ürün eklenmedi.</td></tr>';
    $('#q-items').innerHTML=rows;
    $('#q-items').closest('table')?.querySelector('thead tr')?.replaceChildren(...['Ürün','Miktar','Birim Fiyat','Kâr %','Net Fark','Tutar',''].map(x=>{const th=document.createElement('th');th.textContent=x;return th}));
    $('#q-subtotal').textContent=moneyQ(c.subtotal);$('#q-discount-amount').textContent=moneyQ(c.discount);$('#q-taxable').textContent=moneyQ(c.taxable);$('#q-vat-amount').textContent=moneyQ(c.vat);$('#q-total').textContent=moneyQ(c.total);
  }

  async function approveQuote(id){
    const q=state.quotes.find(x=>x.id===id);if(!q)return;
    if(q.status==='Onaylandı')return toast('Bu teklif zaten onaylanmış.');
    if(!confirm(`${q.quote_no} teklifini onaylayıp ürünleri stoktan düşmek istiyor musun?\n\nBu işlem stok hareketi oluşturur ve geri alınmaz.`))return;
    if(state.demo)return toast('Demo modunda stok düşümü yapılmaz.','bad');
    try{
      const {data,error}=await sb.rpc('approve_quote_and_issue_stock',{p_quote_id:id});
      if(error)throw error;
      await loadData();renderAll();
      const msg=data?.message||'Teklif onaylandı ve stoklar düşüldü.';
      toast(msg);
    }catch(err){toast(err.message||'Teklif onaylanamadı.','bad')}
  }

  function enhanceQuoteRows(){
    const body=$('#quotes-body');if(!body)return;
    [...body.querySelectorAll('tr')].forEach(row=>{
      if(row.dataset.quoteEnhanced)return;
      const no=row.querySelector('td b')?.textContent?.trim();
      const q=state.quotes.find(x=>x.quote_no===no);if(!q)return;
      row.dataset.quoteEnhanced='1';
      const last=row.lastElementChild;if(!last)return;
      if(q.status==='Onaylandı')last.insertAdjacentHTML('beforeend','<span class="quote-approved-badge">✓ Stok işlendi</span>');
      else if(q.status==='Bekliyor'||q.status==='Taslak')last.insertAdjacentHTML('beforeend',`<button type="button" class="quote-approve-btn" data-approve-quote="${escQ(q.id)}">✓ Onayla & Stoktan Düş</button>`);
    });
  }

  function install(){
    if(window.__hisStockQuoteInstalled)return;
    if(!window.state||!window.sb||!window.renderProducts||!window.renderQuotes||!window.renderQuoteItems)return setTimeout(install,60);
    window.__hisStockQuoteInstalled=true;
    injectStyle();ensureBar();
    window.__hisBaseRenderProducts=window.renderProducts;
    window.renderProducts=function(filter=''){window.__hisBaseRenderProducts(filter);enhanceProductRows();updateSelectionBar()};
    window.__hisBaseRenderQuotes=window.renderQuotes;
    window.renderQuotes=function(filter=''){window.__hisBaseRenderQuotes(filter);enhanceQuoteRows()};
    window.renderQuoteItems=enhancedRenderQuoteItems;

    document.addEventListener('click',e=>{
      const add=e.target.closest('[data-stock-add]');
      if(add){const id=add.dataset.stockAdd;state.stockQuoteSelected=state.stockQuoteSelected||new Set();state.stockQuoteSelected.add(id);updateSelectionBar();return}
      const approve=e.target.closest('[data-approve-quote]');if(approve){approveQuote(approve.dataset.approveQuote);return}
      const rem=e.target.closest('[data-remove-qi]');if(rem){setTimeout(()=>renderQuoteItems(),0);return}
    });
    document.addEventListener('change',e=>{
      if(e.target.matches('#stock-quote-select-all')){state.stockQuoteSelected=state.stockQuoteSelected||new Set();const visible=[...document.querySelectorAll('.stock-quote-select')];visible.forEach(cb=>e.target.checked?state.stockQuoteSelected.add(cb.dataset.stockProduct):state.stockQuoteSelected.delete(cb.dataset.stockProduct));refreshProductsUI();return}
      if(e.target.matches('.stock-quote-select')){state.stockQuoteSelected=state.stockQuoteSelected||new Set();const id=e.target.dataset.stockProduct;e.target.checked?state.stockQuoteSelected.add(id):state.stockQuoteSelected.delete(id);updateSelectionBar();enhanceProductRows();return}
      const pi=e.target.dataset.priceI,mi=e.target.dataset.marginI,ni=e.target.dataset.netI;
      if(pi!==undefined){const i=state.quoteItems[nQ(pi)];if(i){i.unit_price=nQ(e.target.value);i.profit_margin=marginFromPrice(state.products.find(p=>p.id===i.product_id),i.unit_price);renderQuoteItems()}return}
      if(mi!==undefined){const i=state.quoteItems[nQ(mi)],p=i&&state.products.find(x=>x.id===i.product_id);if(i&&p){i.unit_price=costTL(p)*(1+nQ(e.target.value)/100);i.profit_margin=nQ(e.target.value);renderQuoteItems()}return}
      if(ni!==undefined){const i=state.quoteItems[nQ(ni)],p=i&&state.products.find(x=>x.id===i.product_id);if(i&&p){i.unit_price=costTL(p)+nQ(e.target.value);i.profit_margin=marginFromPrice(p,i.unit_price);renderQuoteItems()}return}
    });

    const oldQuoteClose=$('#quote-close');
    if(oldQuoteClose)oldQuoteClose.addEventListener('click',()=>document.querySelector('.quote-stock-info')?.remove());
    setTimeout(()=>{enhanceProductRows();enhanceQuoteRows();updateSelectionBar()},0);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();