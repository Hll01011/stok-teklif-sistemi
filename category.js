/* HIS Stock Category Module */
(function(){
  const KEY='his_stock_categories_v1';
  const DEFAULT=['Pano','Havalandırma','Yemleme','Sulama','Elektrik','Kablo','Otomasyon','Sensör','Aydınlatma','Fan','Motor','Pano Malzemeleri','Kümes Ekipmanları','Diğer'];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const get=()=>{try{return [...new Set([...DEFAULT,...JSON.parse(localStorage.getItem(KEY)||'[]')].filter(Boolean))]}catch{return DEFAULT}};
  const save=v=>{v=String(v||'').trim();if(!v)return;const a=get();if(!a.includes(v)){a.push(v);localStorage.setItem(KEY,JSON.stringify(a))}};
  const oldFields=window.fieldsFor;
  if(typeof oldFields==='function')window.fieldsFor=function(type,item={}){
    const fields=oldFields(type,item);if(type!=='product')return fields;
    return fields.map(f=>f.n==='category'?{n:'category',l:'Kategori',v:item.category||'',type:'select',options:[['','Kategori seçin…'],...get().map(c=>[c,c]),['__new__','＋ Yeni kategori oluştur…']]}:f);
  };
  function refresh(){
    const search=document.querySelector('#product-search');if(!search)return;
    let wrap=document.querySelector('#product-category-filter-wrap');
    if(!wrap){wrap=document.createElement('div');wrap.id='product-category-filter-wrap';wrap.className='category-filter-wrap';wrap.innerHTML='<span>▦</span><select id="product-category-filter"><option value="">Tüm kategoriler</option></select>';search.parentNode.insertBefore(wrap,search)}
    const select=wrap.querySelector('select');const current=select.value;
    const tableCats=[...document.querySelectorAll('#products-body tr td:nth-child(3)')].map(x=>x.textContent.trim()).filter(x=>x&&x!=='Kategorisiz');
    const cats=[...new Set([...get(),...tableCats])];
    select.innerHTML='<option value="">Tüm kategoriler</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');if(cats.includes(current))select.value=current;
    if(!select.dataset.bound){select.dataset.bound='1';select.addEventListener('change',()=>{const c=select.value,s=search.value.trim();window.renderProducts([s,c].filter(Boolean).join(' '))})}
  }
  function init(){
    if(!document.getElementById('his-category-style')){const style=document.createElement('style');style.id='his-category-style';style.textContent='.category-filter-wrap{display:flex;align-items:center;gap:8px;background:var(--panel,#fff);border:1px solid rgba(148,163,184,.22);border-radius:12px;padding:0 10px}.category-filter-wrap select{border:0;background:transparent;min-height:42px;outline:0;font:inherit;color:inherit}.category-filter-wrap span{opacity:.6}@media(max-width:760px){.category-filter-wrap{width:100%}.category-filter-wrap select{width:100%}}';document.head.appendChild(style)}
    const oldRenderAll=window.renderAll;
    if(typeof oldRenderAll==='function'&&!window.__hisCategoryRenderPatch){window.__hisCategoryRenderPatch=true;window.renderAll=function(){oldRenderAll();refresh()}}
    refresh();
    const form=document.querySelector('#modal-form');
    if(form&&!form.dataset.categoryBound){form.dataset.categoryBound='1';form.addEventListener('change',e=>{if(e.target.name==='category'){if(e.target.value==='__new__'){const name=prompt('Yeni kategori adı:');if(name&&name.trim()){const v=name.trim();save(v);const o=new Option(v,v);e.target.add(o);e.target.value=v}else e.target.value=''}else if(e.target.value)save(e.target.value);refresh()}})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();