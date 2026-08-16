/* HIS Stock -> Quote units and quantity module */
(function(){
  const n=v=>Number(v)||0;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(n(v));
  const normalizeUnit=v=>String(v||'adet').trim()||'adet';
  const countUnits=new Set(['adet','set','takım','kutu','paket','çift','top','rulo']);
  const stepFor=u=>countUnits.has(normalizeUnit(u).toLocaleLowerCase('tr'))?'1':'0.01';
  const unitForProduct=p=>normalizeUnit(p?.unit);

  function patchProductMapping(){
    if(typeof mapProduct!=='function'||mapProduct.__hisUnitPatched)return;
    const original=mapProduct;
    const patched=function(p){const r=original(p);return {...r,unit:normalizeUnit(p?.unit||r.unit)}};
    patched.__hisUnitPatched=true;
    mapProduct=patched;
  }

  function injectStyle(){
    if(document.getElementById('his-quote-units-style'))return;
    const s=document.createElement('style');s.id='his-quote-units-style';s.textContent=`
      .unit-select{width:100%;box-sizing:border-box;background:#0b1829;color:#edf5ff;border:1px solid #2b3c50;border-radius:8px;padding:8px 9px;outline:none}
      .unit-select:focus{border-color:#43e3a4;box-shadow:0 0 0 2px rgba(67,227,164,.08)}
      .quote-unit-badge{display:inline-flex;align-items:center;gap:5px;margin-left:6px;padding:4px 8px;border-radius:999px;background:rgba(67,227,164,.08);border:1px solid rgba(67,227,164,.16);color:#43e3a4;font-size:11px;font-weight:800}
      .quote-qty-wrap{display:flex;align-items:center;gap:6px}
      .quote-qty-wrap input{min-width:100px}
      .quote-qty-stock{font-size:10px;color:#7f90a4;margin-top:4px}
      .qi-unit{font-weight:800;color:#9eacba;white-space:nowrap}
      .qi-stock{display:block;font-size:10px;color:#718297;margin-top:3px}
      .qi-over{color:#ffb45e!important;font-weight:800}
      @media(max-width:900px){.quote-qty-wrap{align-items:stretch;flex-direction:column}.quote-qty-wrap input{min-width:0}.quote-unit-badge{margin-left:0}}
    `;document.head.appendChild(s);
  }

  function decorateProductUnitField(){
    const form=document.querySelector('#modal-form');
    if(!form||state.editing?.type!=='product')return;
    const current=form.querySelector('[name="unit"]');
    if(!current)return;
    if(current.tagName==='SELECT')return;
    const value=normalizeUnit(current.value);
    const select=document.createElement('select');select.name='unit';select.className='unit-select';
    const options=[['adet','Adet'],['m','Metre (m)'],['kg','Kilogram (kg)'],['lt','Litre (L)'],['set','Set'],['takım','Takım'],['kutu','Kutu'],['paket','Paket'],['çift','Çift'],['rulo','Rulo'],['saat','Saat'],['gün','Gün'],['iş','İş'],['proje','Proje']];
    if(!options.some(x=>x[0]===value))options.push([value,value]);
    select.innerHTML=options.map(x=>`<option value="${esc(x[0])}">${esc(x[1])}</option>`).join('');select.value=value;
    current.replaceWith(select);
  }

  function syncProductUnitAfterSave(){
    document.addEventListener('submit',e=>{
      if(e.target?.id!=='modal-form'||state.editing?.type!=='product')return;
      const form=e.target;
      const unit=normalizeUnit(form.querySelector('[name="unit"]')?.value);
      const code=String(form.querySelector('[name="code"]')?.value||'').trim();
      const id=state.editing?.id||null;
      if(state.demo)return;
      setTimeout(async()=>{
        try{
          let q;
          if(id)q=await sb.from('products').update({unit,updated_at:new Date().toISOString()}).eq('id',id);
          else {
            const found=await sb.from('products').select('id').eq('product_code',code).order('created_at',{ascending:false}).limit(1).maybeSingle();
            if(found.error||!found.data)return;
            q=await sb.from('products').update({unit,updated_at:new Date().toISOString()}).eq('id',found.data.id);
          }
          if(q?.error)throw q.error;
          await loadData();renderAll();
        }catch(err){console.warn('Ürün birimi kaydedilemedi:',err)}
      },900);
    },true);
  }

  function patchQuoteItemsRenderer(){
    if(typeof calcQuote!=='function')return;
    const render=function(){
      const c=calcQuote();
      const rows=state.quoteItems.map((i,index)=>{
        const p=state.products.find(x=>x.id===i.product_id);
        const unit=unitForProduct(p);
        const cost=p?(p.purchaseCurrency==='USD'&&state.usdRate?n(p.purchase)*n(state.usdRate):n(p.purchase)):0;
        const margin=cost>0?((n(i.unit_price)-cost)/cost)*100:0;
        const qty=n(i.quantity)||1;
        const over=p&&qty>n(p.stock);
        i.profit_margin=margin;
        return `<tr class="quote-items-enhanced">
          <td><b>${esc(i.code)}</b><small>${esc(i.name)}</small><span class="qi-stock ${over?'qi-over':''}">Stok: ${n(p?.stock)} ${esc(unit)}</span><span class="qi-cost">Maliyet: ${money(cost)}</span></td>
          <td><div class="quote-qty-wrap"><input class="qi-qty" data-i="${index}" type="number" min="${stepFor(unit)==='1'?'1':'0.01'}" max="${n(p?.stock)||0}" step="${stepFor(unit)}" value="${qty}"><span class="qi-unit">${esc(unit)}</span></div></td>
          <td><input class="qi-price" data-price-i="${index}" type="number" min="0" step="0.01" value="${n(i.unit_price).toFixed(2)}"></td>
          <td><input class="qi-margin" data-margin-i="${index}" type="number" step="0.1" value="${margin.toFixed(1)}"><span style="font-size:10px;color:#7e8b99">%</span></td>
          <td><input class="qi-net" data-net-i="${index}" type="number" step="0.01" value="${(n(i.unit_price)-cost).toFixed(2)}"><span style="font-size:10px;color:#7e8b99">net fark</span></td>
          <td><b>${money(qty*n(i.unit_price))}</b></td>
          <td><button type="button" class="text-btn" data-remove-qi="${index}">Sil</button></td>
        </tr>`;
      }).join('')||'<tr><td colspan="7" class="muted">Henüz ürün eklenmedi.</td></tr>';
      const body=document.querySelector('#q-items');if(!body)return;
      body.innerHTML=rows;
      const head=body.closest('table')?.querySelector('thead tr');if(head)head.innerHTML='<th>Ürün</th><th>Miktar</th><th>Birim Fiyat</th><th>Kâr %</th><th>Net Fark</th><th>Tutar</th><th></th>';
      $('#q-subtotal').textContent=money(c.subtotal);$('#q-discount-amount').textContent=money(c.discount);$('#q-taxable').textContent=money(c.taxable);$('#q-vat-amount').textContent=money(c.vat);$('#q-total').textContent=money(c.total);
    };
    window.renderQuoteItems=render;
  }

  function updateProductAddUnit(){
    const product=document.querySelector('#q-product');const qty=document.querySelector('#q-qty');
    if(!product||!qty)return;
    let badge=document.querySelector('#q-unit-badge');
    let stock=document.querySelector('#q-stock-hint');
    if(!badge){badge=document.createElement('span');badge.id='q-unit-badge';badge.className='quote-unit-badge';qty.parentNode.insertBefore(badge,qty.nextSibling)}
    if(!stock){stock=document.createElement('span');stock.id='q-stock-hint';stock.className='quote-qty-stock';qty.parentNode.appendChild(stock)}
    const p=state.products.find(x=>x.id===product.value);const unit=unitForProduct(p);qty.step=stepFor(unit);qty.min=stepFor(unit)==='1'?'1':'0.01';qty.max=p?n(p.stock):'';badge.textContent=unit;stock.textContent=p?`Mevcut stok: ${n(p.stock)} ${unit}`:'';
  }

  function bindQuoteQuantity(){
    document.addEventListener('change',e=>{
      if(e.target?.matches('.qi-qty')){
        const index=n(e.target.dataset.i);const item=state.quoteItems[index];if(!item)return;
        const p=state.products.find(x=>x.id===item.product_id);const unit=unitForProduct(p);let qty=n(e.target.value);
        if(qty<=0)qty=stepFor(unit)==='1'?1:0.01;
        if(p&&qty>n(p.stock)){qty=n(p.stock);toast(`Stok yetersiz. Maksimum ${qty} ${unit} seçebilirsin.`,'bad')}
        item.quantity=qty;renderQuoteItems();
      }
      if(e.target?.id==='q-product')updateProductAddUnit();
    });
    document.addEventListener('input',e=>{if(e.target?.id==='q-product')updateProductAddUnit()});
    const product=document.querySelector('#q-product');if(product)product.addEventListener('change',updateProductAddUnit);
    updateProductAddUnit();
  }

  function install(){
    if(window.__hisQuoteUnitsInstalled)return;
    if(typeof state==='undefined'||typeof sb==='undefined'||!window.__hisStockQuoteInstalled||typeof loadData!=='function')return setTimeout(install,100);
    window.__hisQuoteUnitsInstalled=true;
    patchProductMapping();
    injectStyle();
    decorateProductUnitField();
    const modal=document.querySelector('#modal');if(modal){new MutationObserver(()=>setTimeout(decorateProductUnitField,20)).observe(modal,{subtree:true,childList:true})}
    document.addEventListener('click',e=>{if(e.target.closest('#add-product,[data-edit-product]'))setTimeout(decorateProductUnitField,40)});
    syncProductUnitAfterSave();
    patchQuoteItemsRenderer();
    bindQuoteQuantity();
    setTimeout(()=>{if(state.products.length&&state.user&&!state.demo)loadData().then(renderAll).catch(()=>{});},300);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();