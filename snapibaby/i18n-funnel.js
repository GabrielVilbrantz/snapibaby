(function() {
  var dict = {
    es: {
      // ── app.html Step 1 ──
      "app_title": "1. Sube las fotos de tu bebé",
      "app_subtitle": "Sube fotos simples de la cara de tu bebé (recomendado: 4 a 8 fotos)",
      "app_upload_btn": "Haz clic para subir o arrastra las fotos aquí",
      "app_req_title": "Para resultados mágicos:",
      "app_req_1": "✓ <strong>Sin chupón ni gorritos</strong> que tapen la cara",
      "app_req_2": "✓ <strong>Solo el bebé</strong> en la foto",
      "app_req_3": "✓ <strong>Cara completa visible</strong>",
      "app_baby_name_label": "¿Cómo se llama tu bebé?",
      "app_next_btn": "Siguiente: Elegir Tema y Plan →",
      
      // ── app.html Step 2 ──
      "app_step2_title": "Paso 2: Elige temas para",
      "app_step2_sub": "Selecciona los temas que te encantan — luego elige tu plan para desbloquearlos todos.",
      "app_step2_btn": "Ver Mis Opciones de Plan —",
      "app_step2_btn_suf": "temas seleccionados",

      // ── app.html Processing ──
      "app_proc_title": "Creando la magia para",
      "app_proc_sub": "Tus retratos de estudio están siendo creados. Prepárate.",
      "app_proc_lock": "Desbloquea para ver tus retratos",
      
      // ── app.html Pricing ──
      "app_price_title": "¡Los retratos de ",
      "app_price_title_suf": " están listos!",
      "app_price_sub": "Creamos retratos en todos tus temas elegidos. Desbloquea los que quieras a continuación.",
      "app_offer_title": "Una oferta especial para ti hoy",
      "app_offer_sub": "Elige el plan ideal y preserva recuerdos para siempre.",
      "app_offer_valid": "Oferta válida por:",
      "app_head_main1": "Entre más fotos elijas, ",
      "app_head_main2": "menos pagas.",
      "app_head_sub": "Más recuerdos, más ahorros, más momentos para guardar.",
      "app_most_chosen": "MÁS ELEGIDO POR MAMÁS",
      "app_best_value": "MEJOR VALOR",
      "app_guarantee": "💰 100% reembolso si no te encanta",
      
      // ── checkout.html ──
      "chk_title": "Pago Seguro",
      "chk_subtitle": "Casi listo. Tus fotos estarán preparadas en minutos.",
      "chk_contact": "Información de Contacto",
      "chk_email": "Tu Email (donde enviaremos las fotos)",
      "chk_summary": "Resumen de Orden",
      "chk_btn": "Completar Pago Seguro",
      "chk_guarantee": "🔒 Garantía de Devolución de 7 Días",
      
      // ── success.html ──
      "suc_title": "¡Orden Confirmada! 🎉",
      "suc_subtitle": "Nuestra IA ya está trabajando en las fotos de tu bebé.",
      "suc_done": "Recibirás un email con los resultados en los próximos 15-30 minutos.",
      "suc_btn": "Ver estado de mi orden"
    }
  };

  function applyTranslations() {
    var lang = 'en';
    // Pega país salvo no localStorage
    var savedCountry = localStorage.getItem('snapi_user_country');
    var countryLangMap = {'MX':'es','ES':'es','AR':'es','CO':'es','PE':'es','VE':'es','CL':'es','EC':'es','GT':'es','CU':'es','BO':'es','DO':'es','HN':'es','PY':'es','SV':'es','NI':'es','CR':'es','PA':'es','UY':'es','PR':'es'};
    if (savedCountry && countryLangMap[savedCountry]) lang = 'es';
    if (navigator.language.startsWith('es')) lang = 'es'; // Fallback
    
    if (lang !== 'es') return;
    var t = dict.es;

    var path = window.location.pathname;

    // --- APP.HTML ---
    if (path.includes('app.html')) {
      var h1 = document.querySelector('.title-area h1');
      if (h1) h1.textContent = t.app_title;
      var sub = document.querySelector('.title-area p');
      if (sub) sub.textContent = t.app_subtitle;
      var up = document.querySelector('.upload-text');
      if (up) up.textContent = t.app_upload_btn;
      var reqs = document.querySelectorAll('.photo-req-text');
      if (reqs.length > 0) reqs[0].innerHTML = t.app_req_title + "<br>" + t.app_req_1 + "<br>" + t.app_req_2 + "<br>" + t.app_req_3;
      var labels = document.querySelectorAll('label');
      labels.forEach(function(l) { if (l.textContent.includes('Baby')) l.textContent = t.app_baby_name_label; });
      var btn = document.querySelector('#btn-advance-upload');
      if (btn) btn.textContent = t.app_next_btn;
      
      // Step 2 & 3 text replacement happens partially in app.html dynamically, so we hook into it or replace statics here
      var step2h2 = document.querySelector('#step-themes h2');
      if (step2h2) step2h2.innerHTML = t.app_step2_title + ' <span class="baby-name-span">tu bebé</span>';
      var step2p = document.querySelector('#step-themes p');
      if (step2p) step2p.textContent = t.app_step2_sub;
      
      var teaserLock = document.querySelector('.teaser-lock-text');
      if (teaserLock) teaserLock.textContent = t.app_proc_lock;
      
      var procTitle = document.querySelector('#processing-title');
      if (procTitle) procTitle.innerHTML = t.app_proc_title + ' <span class="baby-name-span2" style="color:var(--primary);">tu bebé</span>... ✨';
      
      var procSub = document.querySelector('#step-processing p');
      if (procSub) procSub.textContent = t.app_proc_sub;
      
      var prevH2 = document.querySelector('#step-preview h2');
      if (prevH2) prevH2.innerHTML = t.app_price_title + '<span class="baby-name-span">tu bebé</span>' + t.app_price_title_suf;
      
      var prevP = document.querySelector('#step-preview > p');
      if (prevP) prevP.textContent = t.app_price_sub;
      
      var offT = document.querySelector('.offer-banner-title');
      if (offT) offT.textContent = t.app_offer_title;
      var offS = document.querySelector('.offer-banner-sub');
      if (offS) offS.textContent = t.app_offer_sub;
      var offV = document.querySelector('.offer-valid-label');
      if (offV) offV.textContent = t.app_offer_valid;
      
      var headM = document.querySelector('.pricing-headline');
      if (headM) headM.innerHTML = t.app_head_main1 + '<span class="pricing-headline-accent">' + t.app_head_main2 + '</span>';
      var headS = document.querySelector('.pricing-headline-sub');
      if (headS) headS.textContent = t.app_head_sub;
      
      document.querySelectorAll('.apc-badge-top').forEach(function(el) {
        if (el.textContent.includes('MOST CHOSEN')) el.textContent = t.app_most_chosen;
        if (el.textContent.includes('BEST VALUE')) el.textContent = t.app_best_value;
      });
      document.querySelectorAll('.app-guarantee').forEach(function(el) {
        el.textContent = t.app_guarantee;
      });
      
      // Translate features and button texts statically where possible
      document.querySelectorAll('.apc-photo-pill').forEach(function(el) {
        el.textContent = el.textContent.replace('photos', 'fotos');
      });
      document.querySelectorAll('.apc-features-v2 li').forEach(function(el) {
        var txt = el.textContent;
        if (txt.includes('professional AI photos')) el.textContent = txt.replace('professional AI photos', 'fotos profesionales IA');
        if (txt.includes('Standard resolution')) el.textContent = 'Resolución estándar';
        if (txt.includes('Premium resolution')) el.textContent = 'Resolución premium, ultra realista';
        if (txt.includes('4K resolution')) el.textContent = 'Resolución 4K, ultra realista';
        if (txt.includes('Ready in minutes')) el.textContent = 'Listo en minutos';
        if (txt.includes('Priority — ready in 15 min')) el.textContent = 'Prioridad — listo en 15 min';
        if (txt.includes('High-resolution digital delivery')) el.textContent = 'Entrega digital en alta resolución';
        if (txt.includes('Portrait & landscape format')) el.textContent = 'Formato vertical y horizontal';
        if (txt.includes('Free redo')) el.textContent = 'Rehacer gratis';
        if (txt.includes('1 free redo included')) el.textContent = '1 rehacer gratis incluido';
        if (txt.includes('Perfect for the complete 1st year album')) el.textContent = 'Perfecto para el álbum del 1er año';
      });
      document.querySelectorAll('.apc-btn-v2').forEach(function(el) {
        var txt = el.textContent;
        txt = txt.replace('Get', 'Obtener').replace('photos in', 'fotos en').replace('hour', 'hora');
        el.textContent = txt;
      });
      document.querySelectorAll('.apc-tagline').forEach(function(el) {
        var txt = el.textContent;
        if (txt.includes('first magical')) el.textContent = '"Tu primer recuerdo mágico"';
        if (txt.includes('complete newborn')) el.textContent = '"La historia completa del recién nacido"';
        if (txt.includes('Every moment')) el.textContent = '"Cada momento, para siempre"';
      });
    }

    // --- CHECKOUT.HTML ---
    if (path.includes('checkout.html')) {
      var h2 = document.querySelector('.site-header h2');
      if (h2) h2.textContent = t.chk_title;
      var p = document.querySelector('.site-header p');
      if (p) p.textContent = t.chk_subtitle;
      var cards = document.querySelectorAll('.card-header');
      if (cards[0]) cards[0].innerHTML = "✉️ " + t.chk_contact;
      if (cards[1]) cards[1].innerHTML = "🛒 " + t.chk_summary;
      var l = document.querySelector('label[for="email"]');
      if (l) l.textContent = t.chk_email;
      var btn2 = document.getElementById('pay-button');
      if (btn2) btn2.textContent = t.chk_btn;
      var guar = document.querySelector('.guarantee-text');
      if (guar) guar.textContent = t.chk_guarantee;
    }

    // --- SUCCESS.HTML ---
    if (path.includes('success.html')) {
      var h1s = document.querySelector('h1');
      if (h1s) h1s.textContent = t.suc_title;
      var ps = document.querySelector('p');
      if (ps) ps.textContent = t.suc_subtitle;
      var dt = document.querySelector('.delivery-text');
      if (dt) dt.textContent = t.suc_done;
      var btns = document.querySelector('.btn-primary');
      if (btns) btns.textContent = t.suc_btn;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTranslations);
  } else {
    applyTranslations();
  }
})();
