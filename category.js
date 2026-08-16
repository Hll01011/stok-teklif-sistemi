/* HIS Stock Category Module - Supabase backed */
(function(){
  const KEY='his_stock_categories_v2';
  const DEFAULT=['Pano','Havalandırma','Yemleme','Sulama','Elektrik','Kablo','Otomasyon','Sensör','Aydınlatma','Fan','Motor','Pano Malzemeleri','Kümes Ekipmanları','Diğer'];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let categories=[];
  const localLoad=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return [...new Set([...DEFAULT,...x].map(v=>String(v).trim()).filter(Boolean))]}catch{return [...DEFAULT]}};
  const localSave=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}};
  categories=localLoad();
  let client=null;
  const getClient=()=>client||(client=window.supabase?.createClient?.('https://miznxoykfoanazcitmit.supabase.co','sb_publishable_F3fq67Aqp42zaXrhhKFEoQ_1zy1_6xA'));
  const notify=(t,type)=>{if(typeof window.toast==='function')window.toast(t,type)};
  async function load(){
    try{
      const sb=getClient();
      if(sb){const {data,error}=await sb.from('stock_categories').select('name').eq('is_active',true).order('name');if(!error&&data){categories=[...new Set([...DEFAULT,...data.map(x=>x.name)].filter(Boolean))];localSave(categories)}}
    }catch{}
    refresh();
  }
  async function add(name){
    name=String(name||'').trim();if(!name)return '';
    const existing=categories.find(x=>x.toLocaleLowerCase('tr')===name.toLocaleLowerCase('tr'));if(existing)return existing;
    categories=[...new Set([...categories,name])];localSave(categories);
    try{const sb=getClient();if(sb){const {error}=await sb.from('stock_categories').insert({name});if(error&&!/duplicate|unique/i.test(error.message||''))notify('Kategori kaydedilemedi: '+error.message,'bad')}}catch{notify('Kategori kaydedilemedi.','bad')}
    refresh();return name;
  }
  const oldFields=window.fieldsFor;
  if(typeof oldFields==='function')window.fieldsFor=function(type,item={}){
    const fields=oldFields(type,item);if(type!=='product')return fields;
    return fields.map(f=>f.n==='category'?{n:'category',l:'Kategori',v:item.category||'',type:'select',options:[['','Kategori seçin…'],...categories.map(c=>[c,c]),['__new__','＋ Yeni kategori oluştur…']]}:f);
  };
  function refresh(){
    const search=document.querySelector('#product-search');if(!search)return;
    let wrap=document.querySelector('#product-category-filter-wrap');
    if(!wrap){wrap=document.createElement('div');wrap.id='product-category-filter-wrap';wrap.className='category-filter-wrap';wrap.innerHTML='<span aria-hidden="true">▦</span><select id="product-category-filter" aria-label="Stok kategorisi"><option value="">Tüm kategoriler</option></select>';search.parentNode.insertBefore(wrap,search)}
    const select=wrap.querySelector('select');const current=select.value;
    select.innerHTML='<option value="">Tüm kategoriler</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');if(categories.includes(current))select.value=current;
    if(!select.dataset.bound){select.dataset.bound='1';select.addEventListener('change',applyFilter)}
    if(!search.dataset.categoryBound){search.dataset.categoryBound='1';search.addEventListener('input',()=>{clearTimeout(search.__categoryTimer);search.__categoryTimer=setTimeout(applyFilter,80)})}
  }
  function applyFilter(){
    const search=document.querySelector('#product-search');const select=document.querySelector('#product-category-filter');
    if(typeof window.renderProducts!=='function'||!search)return;
    const parts=[search.value.trim(),select?.value||''].filter(Boolean);
    window.renderProducts(parts.join(' '));
  }
  async function init(){
    if(!document.getElementById('his-category-style')){const style=document.createElement('style');style.id='his-category-style';style.textContent='.category-filter-wrap{display:flex;align-items:center;gap:8px;background:var(--surface,#0d1a2b);border:1px solid var(--line,#22344d);border-radius:12px;padding:0 10px;min-height:42px;color:var(--text,#edf5ff)}.category-filter-wrap select{border:0;background:var(--surface,#0d1a2b);min-height:42px;outline:0;font:inherit;color:var(--text,#edf5ff);min-width:180px;cursor:pointer}.category-filter-wrap select option{background:#0d1a2b;color:#edf5ff}.category-filter-wrap span{opacity:.7;color:var(--muted,#8ea2bd)}@media(max-width:900px){.category-filter-wrap{width:100%}.category-filter-wrap select{width:100%;min-width:0}}';document.head.appendChild(style)}
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