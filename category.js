/* HIS Stock Category Module - Supabase backed */
(function(){
  const KEY='his_stock_categories_v2';
  const DEFAULT=['Pano','Havalandırma','Yemleme','Sulama','Elektrik','Kablo','Otomasyon','Sensör','Aydınlatma','Fan','Motor','Pano Malzemeleri','Kümes Ekipmanları','Diğer'];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let categories=[...DEFAULT];
  let loaded=false;
  const localLoad=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return [...new Set([...DEFAULT,...x].map(v=>String(v).trim()).filter(Boolean))]}catch{return [...DEFAULT]}};
  const localSave=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}};
  categories=localLoad();
  const db=()=>window.supabase?.createClient?.('https://miznxoykfoanazcitmit.supabase.co','sb_publishable_F3fq67Aqp42zaXrhhKFEoQ_1zy1_6xA');
  let client=null;
  async function load(){
    if(!window.supabase)return;
    try{
      client=client||db();
      const {data,error}=await client.from('stock_categories').select('name').eq('is_active',true).order('name');
      if(!error&&data?.length){categories=[...new Set(data.map(x=>x.name).concat(DEFAULT))].filter(Boolean);loaded=true;localSave(categories)}
    }catch{}
    refresh();
  }
  async function add(name){
    name=String(name||'').trim();
    if(!name)return '';
    if(categories.some(x=>x.toLocaleLowerCase('tr')===name.toLocaleLowerCase('tr')))return categories.find(x=>x.toLocaleLowerCase('tr')===name.toLocaleLowerCase('tr'));
    categories.push(name);categories=[...new Set(categories)];localSave(categories);
    try{
      client=client||db();
      const {error}=await client.from('stock_categories').insert({name});
      if(error && !/duplicate|unique/i.test(error.message||''))toastSafe('Kategori kaydedilemedi: '+error.message,'bad');
    }catch(e){toastSafe('Kategori kaydedilemedi.','bad')}
    refresh();
    return name;
  }
  function toastSafe(t,type){if(typeof window.toast==='function')window.toast(t,type)}
  const oldFields=window.fieldsFor;
  if(typeof oldFields==='function')window.fieldsFor=function(type,item={}){
    const fields=oldFields(type,item);if(type!=='product')return fields;
    return fields.map(f=>f.n==='category'?{n:'category',l:'Kategori',v:item.category||'',type:'select',options:[['','Kategori seçin…'],...categories.map(c=>[c,c]),['__new__','＋ Yeni kategori oluştur…']]}:f);
  };
  function ensureFilter(){
    const search=document.querySelector('#product-search');if(!search)return;
    let wrap=document.querySelector('#product-category-filter-wrap');
    if(!wrap){
      wrap=document.createElement('div');wrap.id='product-category-filter-wrap';wrap.className='category-filter-wrap';
      wrap.innerHTML='<span aria-hidden="true">▦</span><select id="product-category-filter" aria-label="Stok kategorisi"><option value="">Tüm kategoriler</option></select>';
      search.parentNode.insertBefore(wrap,search);
    }
    const select=wrap.querySelector('select');const current=select.value;
    select.innerHTML='<option value="">Tüm kategoriler</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if(categories.includes(current))select.value=current;
    if(!select.dataset.bound){
      select.dataset.bound='1';
      select.addEventListener('change',()=>applyFilter());
    }
  }
  function applyFilter(){
    const search=document.querySelector('#product-search');const select=document.querySelector('#product-category-filter');
    if(!search)return;
    const text=search.value.trim().toLocaleLowerCase('tr');const cat=(select?.value||'').toLocaleLowerCase('tr');
    const rows=(window.__hisProducts||[]);
    if(rows.length && typeof window.renderProducts==='function'){
      const original=window.__hisOriginalRenderProducts;
      if(original)original(rows.filter(p=>{const hay=`${p.code||''} ${p.name||''} ${p.category||''}`.toLocaleLowerCase('tr');return (!text||hay.includes(text))&&(!cat||String(p.category||'').toLocaleLowerCase('tr')===cat)}));
    }else if(typeof window.renderProducts==='function'){
      window.renderProducts([search.value,select?.value].filter(Boolean).join(' '));
    }
  }
  function patchRender(){
    if(typeof window.renderProducts==='function'&&!window.__hisCategoryRenderProducts){
      window.__hisCategoryRenderProducts=true;
      window.__hisOriginalRenderProducts=window.renderProducts;
      const original=window.renderProducts;
      window.renderProducts=function(filter=''){
        const select=document.querySelector('#product-category-filter');
        const cat=select?.value||'';
        if(cat){
          const text=String(filter||'').replace(cat,'').trim().toLocaleLowerCase('tr');
          const list=(window.state?.products)||[];
          const filtered=list.filter(p=>{const hay=`${p.code||''} ${p.name||''} ${p.category||''}`.toLocaleLowerCase('tr');return (!text||hay.includes(text))&&String(p.category||'').toLocaleLowerCase('tr')===cat.toLocaleLowerCase('tr')});
          const body=document.querySelector('#products-body');
          if(body){body.innerHTML=filtered.map(p=>{const cur=p.purchaseCurrency==='USD'?'$':'₺';const tl=p.purchaseCurrency==='USD'&&window.state?.usdRate?new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(Number(p.purchase)*Number(window.state.usdRate)):cur+Number(p.purchase||0).toLocaleString('tr-TR',{minimumFractionDigits:2});return `<tr><td><b>${esc(p.code)}</b></td><td>${esc(p.name)}</td><td>${esc(p.category||'-')}</td><td><span class="badge ${p.stock<=p.min_stock?'danger':p.stock<=15?'warn':'ok'}">${p.stock}</span></td><td>${esc(p.unit)}</td><td>${tl}</td><td>${p.saleCurrency==='USD'?'$':'₺'}${Number(p.sale||0).toLocaleString('tr-TR',{minimumFractionDigits:2})}</td><td>${esc(p.purchaseCurrency)}</td><td><button class="text-btn" data-edit-product="${p.id}">Düzenle</button></td></tr>`}).join('')||'<tr><td colspan="9" class="muted">Bu kategoride kayıt bulunamadı.</td></tr>'}
          return;
        }
        original(filter);
      };
    }
  }
  function refresh(){ensureFilter();patchRender();}
  async function init(){
    if(!document.getElementById('his-category-style')){const style=document.createElement('style');style.id='his-category-style';style.textContent='.category-filter-wrap{display:flex;align-items:center;gap:8px;background:var(--panel,#fff);border:1px solid rgba(148,163,184,.22);border-radius:12px;padding:0 10px}.category-filter-wrap select{border:0;background:transparent;min-height:42px;outline:0;font:inherit;color:inherit;min-width:180px}.category-filter-wrap span{opacity:.6}@media(max-width:760px){.category-filter-wrap{width:100%}.category-filter-wrap select{width:100%}}';document.head.appendChild(style)}
    refresh();
    const form=document.querySelector('#modal-form');
    if(form&&!form.dataset.categoryBound){
      form.dataset.categoryBound='1';
      form.addEventListener('change',async e=>{
        if(e.target.name!=='category')return;
        if(e.target.value==='__new__'){
          const name=prompt('Yeni kategori adı:');
          if(name?.trim()){const v=await add(name);e.target.innerHTML='<option value="">Kategori seçin…</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')+'<option value="__new__">＋ Yeni kategori oluştur…</option>';e.target.value=v||''}else e.target.value='';
        }else if(e.target.value){await add(e.target.value)}
        refresh();
      });
    }
    await load();
  }
  window.hisRefreshCategories=load;
  window.hisAddStockCategory=add;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();