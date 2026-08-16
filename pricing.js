/* HIS Pricing Module - configurable purchase/sale difference */
(function(){
  const baseFieldsFor=window.fieldsFor;
  const n=v=>Number(v)||0;
  const getRate=()=>typeof state!=='undefined' ? n(state.usdRate) : 0;
  const toBase=(value,currency)=>currency==='USD' ? n(value)*getRate() : n(value);
  const fromBase=(value,currency)=>currency==='USD' ? (getRate()?n(value)/getRate():0) : n(value);
  const calcSale=(purchase,purchaseCurrency,saleCurrency,mode,diff)=>{
    const cost=toBase(purchase,purchaseCurrency);
    if(!cost)return 0;
    if(mode==='percent')return fromBase(cost*(1+n(diff)/100),saleCurrency);
    if(mode==='amount')return fromBase(cost+n(diff),saleCurrency);
    return null;
  };
  const marginFromSale=(purchase,purchaseCurrency,sale,saleCurrency)=>{
    const cost=toBase(purchase,purchaseCurrency), sell=toBase(sale,saleCurrency);
    return cost ? ((sell-cost)/cost)*100 : 0;
  };

  window.fieldsFor=function(type,item={}){
    const fields=baseFieldsFor(type,item);
    if(type!=='product')return fields;
    const existingMargin=marginFromSale(item.purchase||0,item.purchaseCurrency||'TRY',item.sale||0,item.saleCurrency||'TRY');
    const hasRate=!!getRate() || (item.purchaseCurrency||'TRY')===(item.saleCurrency||'TRY');
    const out=[];
    fields.forEach(f=>{
      out.push(f);
      if(f.n==='sale_currency'){
        out.push({n:'pricing_mode',l:'Satış farkı hesaplama',v:item.pricingMode||'percent',type:'select',options:[['percent','Alış üzerine Kâr %'],['amount','Alış üzerine Sabit Fark'],['manual','Manuel Satış Fiyatı']]});
        out.push({n:'pricing_value',l:'Kâr / Fark',v:item.pricingValue??(Number.isFinite(existingMargin)?existingMargin.toFixed(2):0),t:'number'});
      }
    });
    return out;
  };

  function updateSaleField(form){
    if(!form)return;
    const purchase=form.querySelector('[name="purchase"]');
    const purchaseCurrency=form.querySelector('[name="purchase_currency"]');
    const sale=form.querySelector('[name="sale"]');
    const saleCurrency=form.querySelector('[name="sale_currency"]');
    const mode=form.querySelector('[name="pricing_mode"]');
    const value=form.querySelector('[name="pricing_value"]');
    if(!purchase||!sale||!mode||!value)return;
    const manual=mode.value==='manual';
    sale.readOnly=!manual;
    sale.style.opacity=manual?'1':'.78';
    sale.title=manual?'Satış fiyatını doğrudan girebilirsiniz':'Satış fiyatı seçtiğiniz fark kuralına göre hesaplanır';
    value.disabled=manual;
    value.parentElement.style.opacity=manual?'.55':'1';
    if(!manual){
      const calculated=calcSale(n(purchase.value),purchaseCurrency?.value||'TRY',saleCurrency?.value||'TRY',mode.value,n(value.value));
      if(calculated!==null){
        sale.value=calculated.toFixed(2);
      }else if(purchaseCurrency?.value!==saleCurrency?.value){
        sale.value='';
        if(typeof window.toast==='function')window.toast('USD/TL kuru alınmadan farklı para biriminde otomatik fiyat hesaplanamaz.','bad');
      }
    }
  }

  function bind(){
    const form=document.querySelector('#modal-form');
    if(!form||form.dataset.pricingBound)return;
    if(typeof state!=='undefined' && state.usdRate){}
    form.dataset.pricingBound='1';
    form.addEventListener('input',e=>{
      if(['purchase','purchase_currency','sale_currency','pricing_mode','pricing_value'].includes(e.target.name))updateSaleField(form);
    });
    form.addEventListener('change',e=>{
      if(['purchase','purchase_currency','sale_currency','pricing_mode','pricing_value'].includes(e.target.name))updateSaleField(form);
    });
    updateSaleField(form);
  }

  const originalOpenModal=window.openModal;
  window.openModal=function(type,item={},id=null){
    originalOpenModal(type,item,id);
    if(type==='product'){
      const form=document.querySelector('#modal-form');
      if(form){
        form.dataset.pricingBound='';
        bind();
        updateSaleField(form);
      }
    }
  };

  const style=document.createElement('style');
  style.textContent='.pricing-hint{font-size:11px;color:var(--muted,#8ea2bd);margin-top:-3px}.modal-form input[readonly]{cursor:not-allowed;background:#0b1b2d}.modal-form select[name="pricing_mode"]{border-color:rgba(67,227,164,.35)}';
  document.head.appendChild(style);
})();