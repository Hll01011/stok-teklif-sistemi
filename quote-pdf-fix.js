/* Compatibility loader: keep the proven PDF renderer and load stock categories. */
(function(){
  const load=src=>{const s=document.createElement('script');s.src=src;s.async=false;document.head.appendChild(s)};
  load('./category.js');
  load('https://raw.githubusercontent.com/Hll01011/stok-teklif-sistemi/74f3d8cf90ebb9d0b56e19276daf6653114ae24c/quote-pdf-fix.js');
})();