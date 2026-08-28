
const state={products:[],categories:[],customers:[],quotes:[],transactions:[],quoteItems:[]};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const money=(v,c='TRY')=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:c,maximumFractionDigits:2}).format(Number(v||0));
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function toast(msg,type='success'){const e=$('#toast');e.textContent=msg;e.className='toast '+type;clearTimeout(window.__t);window.__t=setTimeout(()=>e.className='',3200)}
function openModal(h){$('#modalContent').innerHTML=h;$('#modal').classList.remove('hidden')}
function closeModal(){$('#modal').classList.add('hidden');$('#modalContent').innerHTML=''}
function showPage(p){$$('.page').forEach(x=>x.classList.toggle('active-page',x.id===p));$$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===p));const t={dashboard:['GENEL BAKIŞ','Dashboard'],stocks:['ENVANTER','Stoklar'],customers:['MÜŞTERİLER','Müşteriler'],quotes:['TEKLİFLER','Teklifler'],transactions:['ENVANTER','Hareketler'],settings:['SİSTEM','Ayarlar']}[p];$('#pageEyebrow').textContent=t[0];$('#pageTitle').textContent=t[1];}
async function loadAll(){
  const [c,p,cu,q,m]=await Promise.all([
    sb.from('stock_categories').select('*').order('name'),
    sb.from('stock_products').select('*,stock_categories(name)').eq('is_active',true).order('product_name'),
    sb.from('quote_customers').select('*').order('name'),
    sb.from('stock_quotes').select('*').order('created_at',{ascending:false}),
    sb.from('stock_movements').select('*,stock_products(product_name,product_code,unit)').order('created_at',{ascending:false}).limit(50)
  ]);
  for(const r of [c,p,cu,q,m]) if(r.error) throw r.error;
  state.categories=c.data||[];state.products=p.data||[];state.customers=cu.data||[];state.quotes=q.data||[];state.transactions=m.data||[];
  $('#stockCategoryFilter').innerHTML='<option value="">Tüm kategoriler</option>'+state.categories.map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join('');
  renderAll();
}
function renderAll(){renderDashboard();renderStocks();renderCustomers();renderQuotes();renderTransactions()}
function renderDashboard(){
 const critical=state.products.filter(p=>Number(p.stock_quantity)<=Number(p.critical_stock_level));
 $('#statProducts').textContent=state.products.length;$('#statCritical').textContent=critical.length;
 $('#statOpenQuotes').textContent=state.quotes.filter(q=>['DRAFT','SENT'].includes(q.status)).length;
 $('#statApproved').textContent=state.quotes.filter(q=>q.status==='APPROVED').length;
 $('#criticalList').innerHTML=critical.map(p=>'<div class="list-row"><div><b>'+esc(p.product_name)+'</b><div class="muted">'+esc(p.product_code)+'</div></div><span class="stock-badge critical">'+p.stock_quantity+' '+esc(p.unit)+'</span></div>').join('')||'<div class="empty">Kritik stok yok.</div>';
 $('#recentTransactions').innerHTML=state.transactions.slice(0,8).map(m=>'<div class="list-row"><div><b>'+esc(m.stock_products?.product_name||'')+'</b><div class="muted">'+m.movement_type+' • '+new Date(m.created_at).toLocaleString('tr-TR')+'</div></div><strong>'+m.quantity+' '+esc(m.stock_products?.unit||'')+'</strong></div>').join('')||'<div class="empty">Henüz hareket yok.</div>';
}
function filteredProducts(){const q=($('#stockSearch').value||'').toLowerCase(),c=$('#stockCategoryFilter').value;return state.products.filter(p=>(!c||p.category_id===c)&&(!q||[p.product_code,p.product_name,p.stock_categories?.name].join(' ').toLowerCase().includes(q)))}
function renderStocks(){
 $('#stockBody').innerHTML=filteredProducts().map(p=>{
  const critical=Number(p.stock_quantity)<=Number(p.critical_stock_level);
  return '<tr><td><input class="product-check" type="checkbox" value="'+p.id+'"></td><td><b>'+esc(p.product_code)+'</b></td><td>'+esc(p.product_name)+'</td><td>'+esc(p.stock_categories?.name||'-')+'</td><td><span class="stock-badge '+(critical?'critical':'')+'">'+p.stock_quantity+'</span></td><td>'+esc(p.unit)+'</td><td>'+money(p.purchase_price,p.currency)+'</td><td>'+money(p.sale_price,p.currency)+'</td><td><div class="pricing"><select class="mode" data-id="'+p.id+'"><option value="PERCENT" '+(p.pricing_mode==='PERCENT'?'selected':'')+'>%</option><option value="FIXED" '+(p.pricing_mode==='FIXED'?'selected':'')+'>₺/$</option></select><input class="price-value" data-id="'+p.id+'" value="'+p.pricing_value+'"><button class="primary save" data-price-save="'+p.id+'">✓</button></div></td><td>'+esc(p.currency)+'</td><td><button class="secondary" data-add-quote="'+p.id+'">+ Teklife Ekle</button></td><td><button class="link-btn" data-edit-product="'+p.id+'">Düzenle</button></td></tr>';
 }).join('')||'<tr><td colspan="12"><div class="empty">Ürün bulunamadı.</div></td></tr>';
}
function renderCustomers(){$('#customerGrid').innerHTML=state.customers.map(c=>'<div class="customer-card"><h3>'+esc(c.name)+'</h3><p>'+esc(c.contact_name||'')+'<br>'+esc(c.phone||'')+'<br>'+esc(c.email||'')+'</p><button class="secondary" data-edit-customer="'+c.id+'">Düzenle</button></div>').join('')||'<div class="empty">Henüz müşteri yok.</div>'}
function renderQuotes(){$('#quotesBody').innerHTML=state.quotes.map(q=>'<tr><td><b>'+esc(q.quote_number)+'</b></td><td>'+esc(q.customer_name)+'</td><td>'+q.quote_date+'</td><td>'+ (q.valid_until||'-')+'</td><td><span class="status-pill status-'+q.status+'">'+q.status+'</span></td><td>'+money(q.grand_total,q.currency)+'</td><td><button class="secondary" data-view-quote="'+q.id+'">Aç</button>'+(['DRAFT','SENT'].includes(q.status)?' <button class="primary" data-approve-quote="'+q.id+'">Onayla</button>':'')+'</td></tr>').join('')||'<tr><td colspan="7"><div class="empty">Henüz teklif yok.</div></td></tr>'}
function renderTransactions(){$('#transactionsBody').innerHTML=state.transactions.map(m=>'<tr><td>'+new Date(m.created_at).toLocaleString('tr-TR')+'</td><td>'+esc(m.stock_products?.product_name||'')+'</td><td>'+m.movement_type+'</td><td>'+m.quantity+' '+esc(m.stock_products?.unit||'')+'</td><td>'+money(m.unit_price,m.currency)+'</td><td>'+esc(m.description||'-')+'</td></tr>').join('')||'<tr><td colspan="6"><div class="empty">Henüz hareket yok.</div></td></tr>'}

function productForm(p={}){
 return '<h2>'+(p.id?'Ürünü düzenle':'Yeni ürün')+'</h2><form id="productForm"><div class="form-grid">'+
 '<label>Ürün kodu<input name="product_code" required value="'+esc(p.product_code||'')+'"></label>'+
 '<label>Ürün adı<input name="product_name" required value="'+esc(p.product_name||'')+'"></label>'+
 '<label>Kategori<select name="category_id"><option value="">Kategori yok</option>'+state.categories.map(c=>'<option value="'+c.id+'" '+(p.category_id===c.id?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></label>'+
 '<label>Birim<select name="unit">'+['adet','metre','m','kg','lt','set','kutu'].map(u=>'<option '+((p.unit||'adet')===u?'selected':'')+'>'+u+'</option>').join('')+'</select></label>'+
 '<label>Mevcut stok<input name="stock_quantity" type="number" step="0.001" value="'+(p.stock_quantity??0)+'"></label>'+
 '<label>Kritik seviye<input name="critical_stock_level" type="number" step="0.001" value="'+(p.critical_stock_level??0)+'"></label>'+
 '<label>Alış fiyatı<input name="purchase_price" type="number" step="0.0001" value="'+(p.purchase_price??0)+'"></label>'+
 '<label>Satış fiyatı<input name="sale_price" type="number" step="0.0001" value="'+(p.sale_price??0)+'"></label>'+
 '<label>Kur<select name="currency"><option '+((p.currency||'TRY')==='TRY'?'selected':'')+'>TRY</option><option '+(p.currency==='USD'?'selected':'')+'>USD</option><option '+(p.currency==='EUR'?'selected':'')+'>EUR</option></select></label>'+
 '<label>Fiyatlandırma<select name="pricing_mode"><option value="PERCENT" '+(p.pricing_mode==='FIXED'?'':'selected')+'>Yüzde</option><option value="FIXED" '+(p.pricing_mode==='FIXED'?'selected':'')+'>Net fark</option></select></label>'+
 '<label class="full-field">Fiyat farkı<input name="pricing_value" type="number" step="0.0001" value="'+(p.pricing_value??0)+'"></label></div><div class="form-actions"><button type="button" class="ghost" id="cancelModal">Vazgeç</button><button class="primary">Kaydet</button></div></form>';
}
function openProduct(p={}){
 openModal(productForm(p));$('#cancelModal').onclick=closeModal;
 $('#productForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));['stock_quantity','critical_stock_level','purchase_price','sale_price','pricing_value'].forEach(k=>f[k]=Number(f[k]||0));if(!f.category_id)f.category_id=null;
 try{if(p.id){const old=Number(p.stock_quantity),neu=Number(f.stock_quantity);const {stock_quantity,...upd}=f;let r=await sb.from('stock_products').update(upd).eq('id',p.id);if(r.error)throw r.error;if(neu!==old){const delta=neu-old;if(delta>0){const r2=await sb.rpc('apply_stock_movement',{p_product_id:p.id,p_movement_type:'IN',p_quantity:delta,p_unit_price:f.purchase_price,p_currency:f.currency,p_description:'Stok düzenleme'});if(r2.error)throw r2.error}else{const r2=await sb.rpc('apply_stock_movement',{p_product_id:p.id,p_movement_type:'OUT',p_quantity:Math.abs(delta),p_unit_price:f.purchase_price,p_currency:f.currency,p_description:'Stok düzenleme'});if(r2.error)throw r2.error}}}else{const initial=f.stock_quantity;f.stock_quantity=0;const r=await sb.from('stock_products').insert(f).select().single();if(r.error)throw r.error;if(initial>0){const r2=await sb.rpc('apply_stock_movement',{p_product_id:r.data.id,p_movement_type:'IN',p_quantity:initial,p_unit_price:f.purchase_price,p_currency:f.currency,p_description:'İlk stok girişi'});if(r2.error)throw r2.error}}toast('Ürün kaydedildi');closeModal();await loadAll()}catch(err){toast(err.message||'Ürün kaydedilemedi','error')}}}
async function savePricing(id){const p=state.products.find(x=>x.id===id),mode=document.querySelector('.mode[data-id="'+id+'"]').value,value=Number(document.querySelector('.price-value[data-id="'+id+'"]').value||0),sale=mode==='FIXED'?Number(p.purchase_price)+value:Number(p.purchase_price)*(1+value/100);const r=await sb.from('stock_products').update({pricing_mode:mode,pricing_value:value,sale_price:sale}).eq('id',id);if(r.error)return toast(r.error.message,'error');toast('Satış fiyatı güncellendi');await loadAll()}

function customerForm(c={}){return '<h2>'+ (c.id?'Müşteri düzenle':'Yeni müşteri')+'</h2><form id="customerForm"><div class="form-grid"><label>Firma / kişi adı<input name="name" required value="'+esc(c.name||'')+'"></label><label>Yetkili<input name="contact_name" value="'+esc(c.contact_name||'')+'"></label><label>Telefon<input name="phone" value="'+esc(c.phone||'')+'"></label><label>E-posta<input name="email" value="'+esc(c.email||'')+'"></label><label class="full-field">Adres<textarea name="address">'+esc(c.address||'')+'</textarea></label></div><div class="form-actions"><button type="button" class="ghost" id="cancelModal">Vazgeç</button><button class="primary">Kaydet</button></div></form>'}
function openCustomer(c={}){openModal(customerForm(c));$('#cancelModal').onclick=closeModal;$('#customerForm').onsubmit=async e=>{e.preventDefault();const row=Object.fromEntries(new FormData(e.currentTarget));const r=c.id?await sb.from('quote_customers').update(row).eq('id',c.id):await sb.from('quote_customers').insert(row);if(r.error)return toast(r.error.message,'error');closeModal();toast('Müşteri kaydedildi');await loadAll()}}

function quoteModal(seed=[]){
 state.quoteItems=seed.map(p=>({product_id:p.id,product_code:p.product_code,product_name:p.product_name,unit:p.unit,quantity:1,unit_price:Number(p.sale_price),vat_rate:20,currency:p.currency}));
 const productOptions=state.products.map(p=>'<option value="'+p.id+'">'+esc(p.product_code)+' — '+esc(p.product_name)+' | '+p.stock_quantity+' '+esc(p.unit)+'</option>').join('');
 openModal('<h2>Yeni fiyat teklifi</h2><div class="quote-builder"><label>Müşteri<select id="quoteCustomer"><option value="">Müşteri seçin</option>'+state.customers.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('')+'</select></label><label>Geçerlilik<input id="quoteValid" type="date" value="'+new Date(Date.now()+7*86400000).toISOString().slice(0,10)+'"></label><label class="full-field">Ürün ekle<select id="quoteProductAdd"><option value="">Ürün seçin</option>'+productOptions+'</select></label><div class="form-actions"><button id="addQuoteItem" class="secondary">+ Satır ekle</button></div><div id="quoteItems"></div><label class="full-field">Not<textarea id="quoteNotes"></textarea></label><div class="form-actions"><button class="ghost" id="cancelModal">Vazgeç</button><button class="primary" id="saveQuote">Teklifi Kaydet</button></div></div>');
 $('#cancelModal').onclick=closeModal;$('#addQuoteItem').onclick=()=>{const id=$('#quoteProductAdd').value,p=state.products.find(x=>x.id===id);if(!p)return;state.quoteItems.push({product_id:p.id,product_code:p.product_code,product_name:p.product_name,unit:p.unit,quantity:1,unit_price:Number(p.sale_price),vat_rate:20,currency:p.currency});renderQuoteItems()};
 $('#saveQuote').onclick=saveQuote;renderQuoteItems();
}
function renderQuoteItems(){const el=$('#quoteItems');if(!el)return;el.innerHTML='<div class="quote-lines">'+state.quoteItems.map((i,n)=>'<div class="quote-line"><b>'+esc(i.product_name)+'</b><span>'+esc(i.unit)+'</span><input type="number" step="0.001" value="'+i.quantity+'" data-q-qty="'+n+'"><input type="number" step="0.01" value="'+i.unit_price+'" data-q-price="'+n+'"><button class="ghost" data-q-del="'+n+'">×</button></div>').join('')+'</div>'}
async function saveQuote(){
 if(!state.quoteItems.length)return toast('En az bir ürün ekleyin','error');
 const customerId=$('#quoteCustomer').value,customer=state.customers.find(c=>c.id===customerId);if(!customer)return toast('Müşteri seçin','error');
 state.quoteItems.forEach((i,n)=>{i.quantity=Number(document.querySelector('[data-q-qty="'+n+'"]').value||0);i.unit_price=Number(document.querySelector('[data-q-price="'+n+'"]').value||0)});
 if(state.quoteItems.some(i=>i.quantity<=0))return toast('Miktarlar sıfırdan büyük olmalı','error');
 const currency=state.quoteItems[0].currency||'TRY',subtotal=state.quoteItems.reduce((s,i)=>s+i.quantity*i.unit_price,0),vat=state.quoteItems.reduce((s,i)=>s+i.quantity*i.unit_price*i.vat_rate/100,0);
 const quote={quote_number:'TKF-'+Date.now().toString().slice(-8),customer_id:customerId,customer_name:customer.name,valid_until:$('#quoteValid').value||null,currency,subtotal,vat_total:vat,grand_total:subtotal+vat,notes:$('#quoteNotes').value};
 const r=await sb.from('stock_quotes').insert(quote).select().single();if(r.error)return toast(r.error.message,'error');
 const lines=state.quoteItems.map(i=>({quote_id:r.data.id,product_id:i.product_id,product_code:i.product_code,product_name:i.product_name,unit:i.unit,quantity:i.quantity,unit_price:i.unit_price,vat_rate:i.vat_rate,line_total:i.quantity*i.unit_price*(1+i.vat_rate/100)}));
 const r2=await sb.from('stock_quote_items').insert(lines);if(r2.error)return toast(r2.error.message,'error');
 closeModal();toast('Teklif oluşturuldu');await loadAll();showPage('quotes');
}
async function viewQuote(id){const q=state.quotes.find(x=>x.id===id),r=await sb.from('stock_quote_items').select('*').eq('quote_id',id).order('created_at');if(r.error)return toast(r.error.message,'error');openModal('<h2>'+esc(q.quote_number)+'</h2><p><b>'+esc(q.customer_name)+'</b> • '+q.status+'</p><div class="panel table-panel"><table><thead><tr><th>Ürün</th><th>Miktar</th><th>Birim fiyat</th><th>Toplam</th></tr></thead><tbody>'+r.data.map(i=>'<tr><td>'+esc(i.product_name)+'</td><td>'+i.quantity+' '+esc(i.unit)+'</td><td>'+money(i.unit_price,q.currency)+'</td><td>'+money(i.line_total,q.currency)+'</td></tr>').join('')+'</tbody></table></div><h3>Genel toplam: '+money(q.grand_total,q.currency)+'</h3><div class="form-actions"><button class="secondary" id="pdfQuote">PDF oluştur</button><button class="primary" id="closeQuote">Kapat</button></div>');$('#closeQuote').onclick=closeModal}
function buildCategoryReportData(items){const groups={};items.forEach(i=>{const k=i.stock_categories?.name||i.category_name||'Diğer';(groups[k]??=[]).push(i)});return groups}
function exportProjectCategoryPdf(){
 const products=state.products;const groups=buildCategoryReportData(products);
 const box=document.createElement('div');box.style.cssText='padding:28px;font-family:Arial;background:#fff;color:#111';
 let body='<h1>HİS OTOMASYON</h1><h2>KÜMES SİSTEMLERİ – KATEGORİ RAPORU</h2><p>'+new Date().toLocaleDateString('tr-TR')+'</p>';
 let grand=0;Object.entries(groups).forEach(([name,list])=>{const total=list.reduce((x,p)=>x+Number(p.sale_price||0)*Number(p.stock_quantity||0),0);grand+=total;body+='<h3 style="background:#eee;padding:10px">'+esc(name)+' — '+money(total)+'</h3><table style="width:100%;border-collapse:collapse"><thead><tr><th>Ürün</th><th>Stok</th><th>Satış</th><th>Stok Değeri</th></tr></thead><tbody>'+list.map(p=>'<tr><td>'+esc(p.product_name)+'</td><td>'+p.stock_quantity+' '+esc(p.unit)+'</td><td>'+money(p.sale_price,p.currency)+'</td><td>'+money(Number(p.sale_price||0)*Number(p.stock_quantity||0),p.currency)+'</td></tr>').join('')+'</tbody></table>'});body+='<h2 style="text-align:right">TOPLAM STOK DEĞERİ: '+money(grand)+'</h2>';box.innerHTML=body;box.querySelectorAll('th,td').forEach(x=>x.style.cssText='border:1px solid #aaa;padding:7px;text-align:left');html2pdf().set({margin:7,filename:'HIS-Kategori-Raporu.pdf',html2canvas:{scale:2},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}).from(box).save()}

function exportQuotePdf(q,items){const box=document.createElement('div');box.style.cssText='padding:36px;font-family:Arial;color:#172033;background:#fff;width:100%;box-sizing:border-box';const rows=items.map((i,n)=>'<tr><td>'+ (n+1)+'</td><td><b>'+esc(i.product_name)+'</b><br><small>'+esc(i.product_code)+'</small></td><td>'+i.quantity+' '+esc(i.unit)+'</td><td style="text-align:right">'+money(i.unit_price,q.currency)+'</td><td style="text-align:right">'+money(i.line_total,q.currency)+'</td></tr>').join('');box.innerHTML='<div style="display:flex;justify-content:space-between;border-bottom:3px solid #1d4ed8;padding-bottom:18px"><div><h1 style="margin:0;color:#1d4ed8">HİS OTOMASYON</h1><p style="color:#666">Otomasyon • Pano • Havalandırma</p></div><div style="text-align:right"><h2 style="margin:0">FİYAT TEKLİFİ</h2><b>'+esc(q.quote_number)+'</b></div></div><div style="margin:24px 0;padding:16px;background:#f4f7fb"><b>SAYIN:</b><br><span style="font-size:18px">'+esc(q.customer_name)+'</span><br>Geçerlilik: '+(q.valid_until?new Date(q.valid_until).toLocaleDateString('tr-TR'):'-')+'</div><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#1d4ed8;color:#fff"><th>#</th><th>ÜRÜN / AÇIKLAMA</th><th>MİKTAR</th><th>BİRİM FİYAT</th><th>TOPLAM</th></tr></thead><tbody>'+rows+'</tbody></table><div style="margin-left:auto;width:45%;margin-top:22px"><p>Ara Toplam: <b style="float:right">'+money(q.subtotal,q.currency)+'</b></p><p>KDV: <b style="float:right">'+money(q.vat_total,q.currency)+'</b></p><div style="padding:12px;background:#172033;color:#fff"><b>GENEL TOPLAM</b><b style="float:right">'+money(q.grand_total,q.currency)+'</b></div></div><div style="margin-top:45px;border-top:1px solid #ddd;padding-top:14px;color:#666;font-size:10px"><b>Not:</b> '+esc(q.notes||'Fiyat teklifimiz belirtilen geçerlilik süresi boyunca geçerlidir.')+'</div>';box.querySelectorAll('th,td').forEach(x=>x.style.padding='9px');box.querySelectorAll('td').forEach(x=>x.style.borderBottom='1px solid #ddd');html2pdf().set({margin:7,filename:q.quote_number+'-HIS-Teklif.pdf',html2canvas:{scale:2},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}).from(box).save()}

async function approveQuote(id){if(!confirm('Teklif onaylanacak ve ürün miktarları stoktan düşülecek. Devam edilsin mi?'))return;const r=await sb.rpc('approve_stock_quote',{p_quote_id:id});if(r.error)return toast(r.error.message,'error');toast('Teklif onaylandı, stoklar düşüldü');await loadAll()}
async function addToQuote(id){const p=state.products.find(x=>x.id===id);const raw=prompt(p.product_name+' için teklif miktarı ('+p.unit+'):',1);if(raw===null)return;const qty=Number(raw);if(!Number.isFinite(qty)||qty<=0)return toast('Geçerli miktar girin','error');quoteModal([{...p,__qty:qty}]);state.quoteItems[0].quantity=qty;renderQuoteItems()}

async function importExcel(file){const data=await file.arrayBuffer(),wb=XLSX.read(data),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:''});let added=0;for(const x of rows){const name=x['Ürün']||x['ÜRÜN']||x['product_name'];if(!name)continue;let catName=x['Kategori']||x['KATEGORİ']||'Genel',cat=state.categories.find(c=>c.name.toLowerCase()===String(catName).toLowerCase());if(!cat){const r=await sb.from('stock_categories').insert({name:String(catName)}).select().single();if(r.error)throw r.error;cat=r.data;state.categories.push(cat)}const row={product_code:String(x['Kod']||x['KOD']||x['product_code']||('PRD-'+Date.now()+added)),product_name:String(name),category_id:cat.id,unit:String(x['Birim']||x['BİRİM']||'adet'),stock_quantity:0,critical_stock_level:Number(x['Kritik']||0),purchase_price:Number(x['Alış']||x['ALIŞ']||0),sale_price:Number(x['Satış']||x['SATIŞ']||0),currency:String(x['Kur']||x['KUR']||'TRY')};const stock=Number(x['Stok']||x['STOK']||0);const r=await sb.from('stock_products').insert(row).select().single();if(r.error)continue;if(stock>0)await sb.rpc('apply_stock_movement',{p_product_id:r.data.id,p_movement_type:'IN',p_quantity:stock,p_unit_price:row.purchase_price,p_currency:row.currency,p_description:'Excel ilk stok'});added++}toast(added+' ürün içe aktarıldı');await loadAll()}

function openCategory(){
 openModal('<h2>Yeni kategori</h2><form id="categoryForm"><label>Kategori adı<input name="name" required placeholder="Örn: Pano, Havalandırma"></label><div class="form-actions"><button type="button" class="ghost" id="cancelModal">Vazgeç</button><button class="primary">Kaydet</button></div></form>');
 $('#cancelModal').onclick=closeModal;
 $('#categoryForm').onsubmit=async e=>{e.preventDefault();const name=new FormData(e.currentTarget).get('name').trim();if(!name)return;const r=await sb.from('stock_categories').insert({name}).select().single();if(r.error)return toast(r.error.message,'error');toast('Kategori eklendi');closeModal();await loadAll()}
}
function exportStockPdf(){
 const products=filteredProducts();
 const cat=$('#stockCategoryFilter').selectedOptions[0]?.textContent||'Tüm kategoriler';
 const rows=products.map(p=>'<tr><td>'+esc(p.product_code)+'</td><td>'+esc(p.product_name)+'</td><td>'+esc(p.stock_categories?.name||'-')+'</td><td>'+p.stock_quantity+' '+esc(p.unit)+'</td><td>'+money(p.purchase_price,p.currency)+'</td><td>'+money(p.sale_price,p.currency)+'</td></tr>').join('');
 const box=document.createElement('div');
 box.style.cssText='padding:32px;font-family:Arial;color:#111;background:#fff;width:100%';
 box.innerHTML='<div style="border-bottom:3px solid #111;padding-bottom:14px;margin-bottom:22px"><h1 style="margin:0">HİS OTOMASYON</h1><h2 style="margin:8px 0 0">STOK LİSTESİ</h2><p>Kategori: <b>'+esc(cat)+'</b><br>Tarih: '+new Date().toLocaleDateString('tr-TR')+'</p></div><table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr><th>KOD</th><th>ÜRÜN</th><th>KATEGORİ</th><th>STOK</th><th>ALIŞ</th><th>SATIŞ</th></tr></thead><tbody>'+rows+'</tbody></table><p style="margin-top:20px">Toplam ürün: '+products.length+'</p>';
 box.querySelectorAll('th,td').forEach(x=>x.style.cssText='border:1px solid #999;padding:7px;text-align:left');
 html2pdf().set({margin:8,filename:'HIS-Stok-Listesi.pdf',image:{type:'jpeg',quality:.98},html2canvas:{scale:2},jsPDF:{unit:'mm',format:'a4',orientation:'landscape'}}).from(box).save();
}

function exportExcel(){const rows=state.products.map(p=>({Kod:p.product_code,Ürün:p.product_name,Kategori:p.stock_categories?.name||'',Stok:p.stock_quantity,Birim:p.unit,Alış:p.purchase_price,Satış:p.sale_price,Kur:p.currency}));const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Stoklar');XLSX.writeFile(wb,'his-stoklar.xlsx')}

document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-page]');if(b){showPage(b.dataset.page);return}
 const l=e.target.closest('[data-page-link]');if(l){showPage(l.dataset.pageLink);return}
 if(e.target.id==='newProductBtn')return openProduct();
 if(e.target.id==='newCustomerBtn')return openCustomer();
 if(e.target.id==='newQuoteBtn')return quoteModal();
 if(e.target.id==='modalClose')return closeModal();
 if(e.target.id==='excelImportBtn')return $('#excelFile').click();
 if(e.target.id==='excelExportBtn')return exportExcel();
 if(e.target.id==='stockPdfBtn')return exportStockPdf();
 if(e.target.id==='newCategoryBtn')return openCategory();
 const ep=e.target.closest('[data-edit-product]');if(ep)return openProduct(state.products.find(x=>x.id===ep.dataset.editProduct));
 const ec=e.target.closest('[data-edit-customer]');if(ec)return openCustomer(state.customers.find(x=>x.id===ec.dataset.editCustomer));
 const ps=e.target.closest('[data-price-save]');if(ps)return savePricing(ps.dataset.priceSave);
 const aq=e.target.closest('[data-add-quote]');if(aq)return addToQuote(aq.dataset.addQuote);
 const vq=e.target.closest('[data-view-quote]');if(vq)return viewQuote(vq.dataset.viewQuote);
 const ap=e.target.closest('[data-approve-quote]');if(ap)return approveQuote(ap.dataset.approveQuote);
 const del=e.target.closest('[data-q-del]');if(del){state.quoteItems.splice(Number(del.dataset.qDel),1);renderQuoteItems()}
});
$('#stockSearch').addEventListener('input',renderStocks);$('#stockCategoryFilter').addEventListener('change',renderStocks);
$('#excelFile').addEventListener('change',async e=>{if(e.target.files[0])try{await importExcel(e.target.files[0])}catch(err){toast(err.message||'Excel okunamadı','error')}e.target.value=''});
(async()=>{try{await loadAll();toast('Şifresiz stok ve teklif sistemi hazır')}catch(err){console.error(err);toast('Bağlantı hatası: '+(err.message||err),'error')}})();
