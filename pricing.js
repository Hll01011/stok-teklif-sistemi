/* HIS Pricing Module - configurable purchase/sale difference */
(function(){
  const baseFieldsFor=window.fieldsFor;
  const n=v=>Number(v)||0;
  const getRate=()=>typeof state!=='undefined'?n(state.usdRate):0;
  const toTRY=(value,currency)=>currency==='USD'?n(value)*getRate():n(value);
  const fromTRY=(value,currency)=>currency==='USD'?(getRate()?n(value)/getRate():0):n(value);

  function calcSale(purchase,purchaseCurrency,saleCurrency,mode,diff){
    const cost=toTRY(purchase,purchaseCurrency);
    if(!cost)return 0;
    if(mode==='percent')return fromTRY(cost*(1+n(diff)/100),saleCurrency);
    if(mode==='amount')return fromTRY(cost+n(diff),saleCurrency);
    return null;
  }

  function marginFromSale(purchase,purchaseCurrency,sale,saleCurrency){
    const cost=toTRY(purchase,purchaseCurrency),sell=toTRY(sale,saleCurrency);
    return cost?((sell-cost)/cost)*100:0;
  }

  window.fieldsFor=function(type,item={}){
    const fields=baseFieldsFor(type,item);
    if(type!=='product')return fields;

    const existingMargin=marginFromSale(item.purchase||0,item.purchaseCurrency||'TRY',item.sale||0,item.saleCurrency||'TRY');
    const out=[];
    fields.forEach(f=>{
      out.push(f);
      if(f.n==='sale_currency'){
        out.push({
          n:'pricing_mode',
          l:'Satış fiyatını nasıl belirleyelim?',
          v:item.pricingMode||'percent',
          type:'select',
          options:[
            ['percent','Alış üzerine Kâr %'],
            ['amount','Alış üzerine Sabit Fark'],
            ['manual','Manuel Satış Fiyatı']
          ]
        });
        out.push({
          n:'pricing_value',
          l:'Kâr / Fark',
          v:item.pricingValue??(Number.isFinite(existingMargin)&&existingMargin!==0?existingMargin.toFixed(2):30),
          t:'number'
        });
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
    sale.title=manual?'Satış fiyatını doğrudan girebilirsiniz.':'Satış fiyatı seçtiğiniz kâr/fark kuralına göre otomatik hesaplanır.';
    value.disabled=manual;
    value.parentElement.style.opacity=manual?'.55':'1';

    if(!manual){
      const calculated=calcSale(
        n(purchase.value),
        purchaseCurrency?.value||'TRY',
        saleCurrency?.value||'TRY',
        mode.value,
        n(value.value)
      );
      if(calculated!==null){
        sale.value=calculated.toFixed(2);
      }else if(purchaseCurrency?.value!==saleCurrency?.value){
        sale.value='';
        if(typeof window.toast==='function')window.toast('USD/TL kuru alınmadan farklı para biriminde otomatik fiyat hesaplanamaz.','bad');
      }
    }
    updatePricingHint(form);
  }

  function updatePricingHint(form){
    const sale=form.querySelector('[name="sale"]');
    const mode=form.querySelector('[name="pricing_mode"]');
    const value=form.querySelector('[name="pricing_value"]');
    const purchase=form.querySelector('[name="purchase"]');
    const purchaseCurrency=form.querySelector('[name="purchase_currency"]');
    const saleCurrency=form.querySelector('[name="sale_currency"]');
    if(!sale||!mode||!value||!purchase)return;

    let hint=form.querySelector('.pricing-hint');
    if(!hint){
      hint=document.createElement('div');
      hint.className='pricing-hint';
      sale.parentElement.appendChild(hint);
    }

    if(mode.value==='manual'){
      hint.textContent='Manuel mod: satış fiyatını siz belirlersiniz.';
      return;
    }

    const cost=toTRY(n(purchase.value),purchaseCurrency?.value||'TRY');
    const sell=toTRY(n(sale.value),saleCurrency?.value||'TRY');
    const actualMargin=cost?((sell-cost)/cost)*100:0;
    const label=mode.value==='percent'?`Alış + %${n(value.value).toLocaleString('tr-TR')}`:`Alış + ${n(value.value).toLocaleString('tr-TR')} TL`;
    hint.textContent=`${label} → Satış: ${n(sale.value).toLocaleString('tr-TR',{minimumFractionDigits:2})} ${saleCurrency?.value==='USD'?'USD':'TL'} · Gerçek fark: %${actualMargin.toFixed(2)}`;
  }

  function bind(){
    const form=document.querySelector('#modal-form');
    if(!form||form.dataset.pricingBound)return;
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
  style.textContent=`
    .pricing-hint{font-size:11px;line-height:1.45;color:var(--muted,#8ea2bd);margin-top:-2px}
    .modal-form input[readonly]{cursor:not-allowed;background:#0b1b2d}
    .modal-form select[name="pricing_mode"]{border-color:rgba(67,227,164,.35)}
    .modal-form input[name="pricing_value"]:disabled{cursor:not-allowed}
  `;
  document.head.appendChild(style);
})();