/* HIS - Inline stock pricing editor
 * Alış/Satış farkını stok kartını açmadan doğrudan tabloda değiştirir.
 * Kullanıcı aynı satırda hem Kâr % hem de Net Fark tutarı girebilir.
 */
(function(){
  const n=v=>Number(v)||0;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const fmt=v=>n(v).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});

  function rate(){ return typeof state!=='undefined' ? n(state.usdRate) : 0; }

  // Alış fiyatını satış para birimine çevirir.
  function costInSaleCurrency(p){
    const buy=n(p.purchase), bc=p.purchaseCurrency||'TRY', sc=p.saleCurrency||'TRY', r=rate();
    if(bc===sc) return buy;
    if(!r) return buy;
    if(bc==='USD' && sc==='TRY') return buy*r;
    if(bc==='TRY' && sc==='USD') return buy/r;
    return buy;
  }

  function calc(p){
    const cost=costInSaleCurrency(p);
    const sale=n(p.sale);
    const diff=sale-cost;
    const pct=cost ? (diff/cost)*100 : 0;
    return {cost,sale,diff,pct};
  }

  function moneySymbol(currency){ return currency==='USD' ? '$' : '₺'; }

  function decorateHeader(){
    const table=document.querySelector('#page-products table');
    const head=table?.querySelector('thead tr');
    if(!head) return;
    // app.js'nin kendi Kâr/Fark başlığı varsa onu kaldır.
    head.querySelectorAll('[data-inline-pricing-head]').forEach(x=>x.remove());
    const th=document.createElement('th');
    th.dataset.inlinePricingHead='1';
    th.textContent='Fiyatlandırma';
    const cells=[...head.querySelectorAll('th')];
    const sale=cells.find(x=>x.textContent.trim().toLocaleLowerCase('tr').includes('satış'));
    if(sale) sale.after(th); else head.appendChild(th);
  }

  function render(filter=''){
    const body=document.querySelector('#products-body');
    if(!body || typeof state==='undefined') return;
    decorateHeader();
    const f=String(filter||'').toLocaleLowerCase('tr');
    const rows=state.products.filter(p=>`${p.code} ${p.name} ${p.category||''}`.toLocaleLowerCase('tr').includes(f));

    body.innerHTML=rows.map(p=>{
      const purchaseCur=p.purchaseCurrency==='USD'?'$':'₺';
      const saleCur=moneySymbol(p.saleCurrency||'TRY');
      const purchaseTry=p.purchaseCurrency==='USD'&&rate()
        ? `₺${fmt(n(p.purchase)*rate())}`
        : `${purchaseCur}${fmt(p.purchase)}`;
      const m=calc(p);
      const cls=m.pct<0?'danger':m.pct<10?'warn':'ok';
      return `<tr>
        <td><b>${esc(p.code)}</b></td>
        <td>${esc(p.name)}</td>
        <td>${esc(p.category||'-')}</td>
        <td><span class="badge ${p.stock<=p.min_stock?'danger':p.stock<=15?'warn':'ok'}">${p.stock}</span></td>
        <td>${esc(p.unit)}</td>
        <td>${purchaseTry}</td>
        <td>${saleCur}<span data-sale-value="${esc(p.id)}">${fmt(p.sale)}</span></td>
        <td>
          <div class="inline-price-editor ${cls}" data-price-editor="${esc(p.id)}">
            <label title="Satış fiyatını alışa göre yüzde olarak belirle">
              <span>%</span>
              <input class="inline-margin" data-id="${esc(p.id)}" type="number" step="0.1" value="${m.pct.toFixed(1)}" aria-label="Kâr yüzdesi">
            </label>
            <label title="Satış fiyatına eklenecek net fark">
              <span>${saleCur}</span>
              <input class="inline-diff" data-id="${esc(p.id)}" type="number" step="0.01" value="${m.diff.toFixed(2)}" aria-label="Net fark">
            </label>
            <button class="inline-price-save" data-id="${esc(p.id)}" type="button" title="Fiyatı kaydet">✓</button>
          </div>
        </td>
        <td>${esc(p.saleCurrency||'TRY')}</td>
        <td><button class="text-btn" data-edit-product="${esc(p.id)}">Düzenle</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="11" class="muted">Kayıt bulunamadı.</td></tr>';
  }

  async function savePrice(id,mode){
    if(typeof state==='undefined') return;
    const p=state.products.find(x=>String(x.id)===String(id));
    if(!p) return;
    const editor=document.querySelector(`[data-price-editor="${CSS.escape(String(id))}"]`);
    if(!editor) return;
    const marginInput=editor.querySelector('.inline-margin');
    const diffInput=editor.querySelector('.inline-diff');
    const margin=n(marginInput.value);
    const diff=n(diffInput.value);
    const cost=costInSaleCurrency(p);
    let sale;
    if(mode==='margin'){
      sale=cost*(1+margin/100);
    }else if(mode==='diff'){
      sale=cost+diff;
    }else{
      // Kaydet butonu: yüzdeyi esas alır. Böylece iki alan arasında tutarsızlık kalmaz.
      sale=cost*(1+margin/100);
    }
    sale=Math.max(0,Number(sale.toFixed(4)));

    // UI anında güncellensin.
    p.sale=sale;
    const saleValue=document.querySelector(`[data-sale-value="${CSS.escape(String(id))}"]`);
    if(saleValue) saleValue.textContent=fmt(sale);

    if(state.demo){
      const fresh=calc(p);
      marginInput.value=fresh.pct.toFixed(1);
      diffInput.value=fresh.diff.toFixed(2);
      toast('Demo modunda fiyat değişikliği kalıcı olarak kaydedilmez');
      return;
    }

    if(!window.sb){ toast('Supabase bağlantısı bulunamadı','bad'); return; }
    const btn=editor.querySelector('.inline-price-save');
    if(btn){btn.disabled=true;btn.textContent='…';}
    try{
      const r=await sb.from('products').update({sale_price:sale,updated_at:new Date().toISOString()}).eq('id',id);
      if(r.error) throw r.error;
      const fresh=calc(p);
      marginInput.value=fresh.pct.toFixed(1);
      diffInput.value=fresh.diff.toFixed(2);
      if(typeof toast==='function') toast('Satış fiyatı güncellendi');
      editor.classList.add('saved');
      setTimeout(()=>editor.classList.remove('saved'),900);
    }catch(err){
      if(typeof toast==='function') toast(`Fiyat kaydedilemedi: ${err.message}`,'bad');
      // Sunucudan gelen eski değeri yeniden yükle.
      try{await loadData();render(document.querySelector('#product-search')?.value||'')}catch{}
    }finally{
      if(btn){btn.disabled=false;btn.textContent='✓';}
    }
  }

  document.addEventListener('change',e=>{
    const margin=e.target.closest('.inline-margin');
    const diff=e.target.closest('.inline-diff');
    if(margin){ savePrice(margin.dataset.id,'margin'); return; }
    if(diff){ savePrice(diff.dataset.id,'diff'); return; }
  });

  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter') return;
    const input=e.target.closest('.inline-margin,.inline-diff');
    if(!input) return;
    e.preventDefault();
    savePrice(input.dataset.id,input.classList.contains('inline-margin')?'margin':'diff');
  });

  document.addEventListener('click',e=>{
    const btn=e.target.closest('.inline-price-save');
    if(btn){ savePrice(btn.dataset.id,'button'); return; }
  });

  if(!document.getElementById('his-inline-pricing-style')){
    const style=document.createElement('style');
    style.id='his-inline-pricing-style';
    style.textContent=`
      #page-products table th:nth-child(8),#page-products table td:nth-child(8){min-width:190px}
      .inline-price-editor{display:flex;align-items:center;gap:5px;min-width:180px;padding:3px;border-radius:10px;transition:.2s}
      .inline-price-editor label{display:flex;align-items:center;gap:2px;border:1px solid rgba(148,163,184,.25);background:rgba(8,20,35,.72);border-radius:7px;padding:2px 5px}
      .inline-price-editor label>span{font-size:11px;font-weight:700;color:var(--muted);min-width:10px}
      .inline-price-editor input{width:62px;border:0;outline:0;background:transparent;color:var(--text);font:600 12px Inter,sans-serif;padding:4px 2px;text-align:right}
      .inline-price-editor input:focus{color:var(--primary)}
      .inline-price-save{width:27px;height:27px;border:1px solid rgba(67,227,164,.35);border-radius:7px;background:rgba(67,227,164,.09);color:var(--primary);cursor:pointer;font-weight:800}
      .inline-price-save:hover{background:rgba(67,227,164,.18)}
      .inline-price-editor.saved{box-shadow:0 0 0 2px rgba(67,227,164,.18)}
      .inline-price-editor.warn label:first-child input{color:var(--warning)}
      .inline-price-editor.danger label:first-child input{color:#ff98a4}
      @media(max-width:900px){.inline-price-editor{min-width:165px}.inline-price-editor input{width:52px}}
    `;
    document.head.appendChild(style);
  }

  function install(){
    if(typeof window.renderProducts!=='function'||window.renderProducts.__stockPricingWrapped) return;
    function wrapped(filter=''){render(filter)}
    wrapped.__stockPricingWrapped=true;
    window.renderProducts=wrapped;
    render(document.querySelector('#product-search')?.value||'');
  }

  const timer=setInterval(()=>{
    if(typeof window.renderProducts==='function'){
      install();clearInterval(timer);
    }
  },100);
})();
