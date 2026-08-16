/* HIS Stock List Pricing Column - shows the actual purchase/sale difference on the stock screen */
(function(){
  const n=v=>Number(v)||0;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const moneyLocal=v=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(n(v));
  const base=v=>{
    const p=typeof state!=='undefined'&&state.usdRate?n(state.usdRate):0;
    return p;
  };
  const toTry=(v,c)=>c==='USD'&&base()?n(v)*base():n(v);
  function margin(p){
    const cost=toTry(p.purchase,p.purchaseCurrency||'TRY');
    const sell=toTry(p.sale,p.saleCurrency||'TRY');
    if(!cost)return {pct:0,diff:0,cost,sell};
    return {pct:((sell-cost)/cost)*100,diff:sell-cost,cost,sell};
  }
  function decorateHeader(){
    const table=document.querySelector('#page-products table');
    const head=table?.querySelector('thead tr');
    if(!head)return;
    if(!head.querySelector('[data-pricing-head]')){
      const th=document.createElement('th');th.dataset.pricingHead='1';th.textContent='Kâr / Fark';
      const sale=head.querySelectorAll('th')[6];
      if(sale&&sale.nextSibling)head.insertBefore(th,sale.nextSibling);else head.appendChild(th);
    }
  }
  function render(filter=''){
    const body=document.querySelector('#products-body');
    if(!body||typeof state==='undefined')return;
    decorateHeader();
    const f=String(filter||'').toLocaleLowerCase('tr');
    const rows=state.products.filter(p=>`${p.code} ${p.name} ${p.category||''}`.toLocaleLowerCase('tr').includes(f));
    body.innerHTML=rows.map(p=>{
      const cur=p.purchaseCurrency==='USD'?'$':'₺';
      const tl=p.purchaseCurrency==='USD'&&state.usdRate?moneyLocal(p.purchase*state.usdRate):`${cur}${n(p.purchase).toLocaleString('tr-TR',{minimumFractionDigits:2})}`;
      const m=margin(p);
      const diffCur=p.saleCurrency==='USD'?'$':'₺';
      const diffDisplay=p.purchaseCurrency===p.saleCurrency?`${diffCur}${m.diff.toLocaleString('tr-TR',{minimumFractionDigits:2})}`:`${m.pct.toLocaleString('tr-TR',{minimumFractionDigits:1})}%`;
      const cls=m.pct<0?'danger':m.pct<10?'warn':'ok';
      return `<tr><td><b>${esc(p.code)}</b></td><td>${esc(p.name)}</td><td>${esc(p.category||'-')}</td><td><span class="badge ${p.stock<=p.min_stock?'danger':p.stock<=15?'warn':'ok'}">${p.stock}</span></td><td>${esc(p.unit)}</td><td>${tl}</td><td>${p.saleCurrency==='USD'?'$':'₺'}${n(p.sale).toLocaleString('tr-TR',{minimumFractionDigits:2})}</td><td><button class="stock-pricing-cell ${cls}" type="button" data-pricing-product="${esc(p.id)}"><b>${m.pct.toLocaleString('tr-TR',{minimumFractionDigits:1})}%</b><small>${diffDisplay}</small></button></td><td>${p.purchaseCurrency}</td><td><button class="text-btn" data-edit-product="${esc(p.id)}">Düzenle</button></td></tr>`;
    }).join('')||'<tr><td colspan="10" class="muted">Kayıt bulunamadı.</td></tr>';
  }
  function install(){
    if(typeof window.renderProducts!=='function'||window.renderProducts.__stockPricingWrapped)return;
    const original=window.renderProducts;
    function wrapped(filter=''){
      render(filter);
    }
    wrapped.__stockPricingWrapped=true;
    window.renderProducts=wrapped;
    decorateHeader();
    render('');
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-pricing-product]');
    if(!btn||typeof state==='undefined'||typeof window.openModal!=='function')return;
    const p=state.products.find(x=>String(x.id)===String(btn.dataset.pricingProduct));
    if(p)window.openModal('product',p,p.id);
  });
  if(!document.getElementById('his-stock-pricing-style')){
    const style=document.createElement('style');style.id='his-stock-pricing-style';style.textContent='.stock-pricing-cell{border:1px solid transparent;background:transparent;color:var(--text);border-radius:9px;padding:5px 8px;text-align:left;min-width:92px}.stock-pricing-cell:hover{border-color:var(--primary);background:rgba(67,227,164,.07)}.stock-pricing-cell b{display:block}.stock-pricing-cell small{display:block;color:var(--muted);font-size:10px;margin-top:2px}.stock-pricing-cell.ok b{color:var(--primary)}.stock-pricing-cell.warn b{color:var(--warning)}.stock-pricing-cell.danger b{color:#ff98a4}';document.head.appendChild(style);
  }
  const timer=setInterval(()=>{if(typeof window.renderProducts==='function'){install();clearInterval(timer)}},100);
})();