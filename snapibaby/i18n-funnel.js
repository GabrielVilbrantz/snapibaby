(function() {
  var dictTextNode = {
    // Upsell
    "Order confirmed — But wait, one more thing...": "Orden confirmada — Pero espera, una cosa más...",
    "These dates only come": "Estas fechas solo ocurren",
    "once a year.": "una vez al año.",
    "You already secured your baby's memories. But holidays pass fast —": "Ya aseguraste los recuerdos de tu bebé. Pero las fiestas pasan rápido —",
    "and these are the moments you'll wish you had captured.": "y estos son los momentos que desearías haber capturado.",
    "Exclusive Post-Purchase Offer — Not Available Anywhere Else": "Oferta Exclusiva Post-Compra — No disponible en otro lugar",
    "Christmas Theme": "Tema Navideño",
    "Cozy holiday portraits — Santa hats, fairy lights & winter magic": "Retratos acogedores — Gorros de Santa, luces y magia invernal",
    "Halloween Theme": "Tema de Halloween",
    "Spooky & cute costumes — Little pumpkins, ghosts & fall vibes": "Disfraces tiernos — Calabacitas, fantasmas y otoño",
    "Easter Theme": "Tema de Pascua",
    "Springtime moments — Bunny ears, pastel colors & flowers": "Momentos de primavera — Orejas de conejo, tonos pastel y flores",
    "photos": "fotos",
    "exclusive": "exclusivo",
    "Add 15 Holiday Photos to My Order": "Agregar 15 Fotos Festivas a mi Orden",
    "One-click secure payment. No need to enter card details again.": "Pago seguro en un clic. No necesitas ingresar tu tarjeta de nuevo.",
    "No thanks, I don't want these memories": "No gracias, no quiero estos recuerdos",
    
    // Checkout General
    "Order Summary": "Resumen de Orden",
    "Package Price": "Precio del Paquete",
    "Total:": "Total:",
    "Complete Purchase 🚀": "Completar Compra 🚀",
    "100% Secure Payment": "Pago 100% Seguro",
    "Your data is encrypted with 256-bit SSL.": "Tus datos están encriptados con SSL de 256 bits.",
    "Processed safely via Stripe.": "Procesado de forma segura vía Stripe.",
    "Wait! Don't go yet...": "¡Espera! No te vayas aún...",
    "Your baby's memories are still here": "Los recuerdos de tu bebé aún están aquí",
    "We noticed you're leaving. As a special gift,": "Notamos que te vas. Como un regalo especial,",
    "we reserved a secret discount just for you.": "reservamos un descuento secreto para ti.",
    "Scratch to reveal your discount": "Rasca para revelar tu descuento",
    "OFF your order": "DE DESCUENTO en tu orden",
    "Applied automatically at checkout": "Aplicado automáticamente",
    "Claim My Discount & Finish Checkout": "Reclamar mi descuento y finalizar compra",
    "No thanks, I'll pay full price": "No gracias, pagaré el precio completo",
    "Sign up and receive everything in your inbox!": "¡Regístrate y recibe todo en tu correo!",
    "Confirm & Receive My Photos": "Confirmar y recibir mis fotos",
    "Your Details (Where we'll send your photos)": "Tus Datos (A dónde enviaremos tus fotos)",
    "Secure Payment": "Pago Seguro",
    "Secure & Encrypted Checkout": "Pago Seguro y Encriptado",
    "Photos delivered to your email in minutes.": "Fotos enviadas a tu email en minutos.",
    "Order confirmed": "Orden confirmada",
    "But wait, one more thing...": "Pero espera, una cosa más...",
    "Premium Package": "Paquete Premium",
    "Classic": "Clásico",
    "Starter": "Básico",
    "Delivered to your email in 15 to 30 min.": "Enviado a tu email en 15 a 30 min.",
    "Premium Frames & Editing": "Marcos Premium y Edición",
    "Real Stories from Real Moms": "Historias reales de madres reales",
    "Join thousands of happy families": "Únete a miles de familias felices",
    "Mom of": "Mamá de",
    "weeks": "semanas",
    "month": "mes",
    
    // app.html specific that might leak into text nodes
    "Step 1: Upload at least 3 photos of your baby": "Paso 1: Sube al menos 3 fotos de tu bebé",
    "Tap to select multiple photos at once": "Toca para seleccionar varias fotos a la vez",
    "Choose Photos": "Elige Fotos",
    "For best results, send at least 3 photos where:": "Para mejores resultados, envía al menos 3 fotos donde:",
    "Baby's face is": "La cara del bebé sea",
    "clearly visible and well-lit": "claramente visible y bien iluminada",
    "Photos are taken from": "Las fotos sean tomadas desde",
    "different angles": "diferentes ángulos",
    "At least one photo shows the": "Al menos una foto muestre la",
    "full face (front view)": "cara completa (vista frontal)",
    "Avoid blurry, dark, or covered face photos": "Evita fotos borrosas, oscuras o con la cara tapada"
  };

  var dictTargeted = {
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
      "chk_top_bar": "🔒 Pago Seguro y Encriptado — Protegido con SSL · Tus datos están 100% seguros",
      "chk_title": "🍼 SnapiBaby",
      "chk_subtitle": "Entorno Seguro y Encriptado 🔒 · Fotos enviadas a tu email en minutos.",
      "chk_step1": "👤 1. Tus Datos (A donde enviaremos tus fotos)",
      "chk_cashback_title": "¡Regístrate y recibe todo en tu bandeja de entrada!",
      "chk_cashback_sub": "Tus <strong>fotos HD</strong>, <strong>cupones de cashback</strong> exclusivos y las últimas noticias de <strong>SnapiBaby</strong> — directo a ti.",
      "chk_name_placeholder": "Tu nombre completo (ej. María García)",
      "chk_email_placeholder": "Tu mejor correo electrónico",
      "chk_cashback_btn": "✨ Confirmar y Recibir Mis Fotos",
      "chk_cashback_success": "🎉 ¡Estás dentro! Tus fotos serán enviadas a este correo. El cupón <strong>SNAPI10</strong> también va en camino — ¡10% de descuento en tu próximo pedido!",
      "chk_step2": "💳 2. Pago Seguro",
      "chk_secure_title": "Pago 100% Seguro",
      "chk_secure_sub": "Tus datos están encriptados con SSL de 256 bits.<br>Procesado de forma segura vía Stripe.",
      "chk_payment_method": "💳 Forma de Pago",
      "chk_summary_title": "🛒 Resumen de Orden",
      "chk_delivery_time": "Enviado a tu email en 15 a 30 min.",
      "chk_pkg_price": "Precio del Paquete",
      "chk_bump_text": "+ Marcos Premium y Edición",
      "chk_total": "Total:",
      "chk_btn": "Completar Pago 🚀",
      "chk_guarantee": "🛡️ Garantía de Devolución del 100% — Libre de riesgos por 7 días",
      "chk_terms": "Al hacer clic arriba, confirmas nuestros <a href='terms.html' style='color:var(--primary);'>Términos de Servicio</a> y <a href='privacy.html' style='color:var(--primary);'>Política de Privacidad</a>. Tus fotos serán entregadas al email proporcionado.",
      
      // ── upsell.html ──
      "up_top": "¡ESPERA! TU ORDEN NO ESTÁ COMPLETA",
      "up_title": "¡No cierres esta página!",
      "up_sub": "Agrega nuestra oferta más popular y ahorra en grande hoy.",
      
      // ── success.html ──
      "suc_title": "¡Orden Confirmada! 🎉",
      "suc_subtitle": "Nuestra IA ya está trabajando en las fotos de tu bebé.",
      "suc_done": "Recibirás un email con los resultados en los próximos 15-30 minutos.",
      "suc_btn": "Ver estado de mi orden"
    }
  };

  function translateTextNodes(node) {
    if (node.nodeType === 3) {
      var text = node.nodeValue;
      var replaced = false;
      for (var key in dictTextNode) {
        if (text.includes(key)) {
          text = text.replace(new RegExp(key, 'g'), dictTextNode[key]);
          replaced = true;
        }
      }
      if (replaced) {
        node.nodeValue = text;
      }
    } else if (node.nodeType === 1 && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
      for (var i = 0; i < node.childNodes.length; i++) {
        translateTextNodes(node.childNodes[i]);
      }
    }
  }

  function applyTranslations() {
    var lang = new URLSearchParams(window.location.search).get('lang') || localStorage.getItem('snapi_lang') || 'en';
    // Pega país salvo no localStorage
    var savedCountry = localStorage.getItem('snapi_user_country');
    var countryLangMap = {'MX':'es','ES':'es','AR':'es','CO':'es','PE':'es','VE':'es','CL':'es','EC':'es','GT':'es','CU':'es','BO':'es','DO':'es','HN':'es','PY':'es','SV':'es','NI':'es','CR':'es','PA':'es','UY':'es','PR':'es'};
    if (savedCountry && countryLangMap[savedCountry]) lang = 'es';
    if (navigator.language.startsWith('es') && lang === 'en') lang = 'es'; if(new URLSearchParams(window.location.search).get('lang')) { localStorage.setItem('snapi_lang', new URLSearchParams(window.location.search).get('lang')); } // Fallback
    
    if (lang !== 'es') return;
    
    // 1) Translate generic text nodes across the entire page (useful for checkout, upsell, success)
    setTimeout(function() { translateTextNodes(document.body); }, 50);
    setTimeout(function() { translateTextNodes(document.body); }, 800);
    setTimeout(function() { translateTextNodes(document.body); }, 2000);

    var t = dictTargeted.es;
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
      var topbar = document.querySelector('.trust-top-bar');
      if (topbar) topbar.textContent = t.chk_top_bar;
      
      var banner = document.querySelector('img[src="checkout.jpeg"]');
      if (banner) banner.src = "checkout_es.jpg";
      
      var h2 = document.querySelector('.site-header h2');
      if (h2) h2.textContent = t.chk_title;
      var p = document.querySelector('.site-header p');
      if (p) p.textContent = t.chk_subtitle;
      
      var cards = document.querySelectorAll('.card-header');
      if (cards[0]) cards[0].textContent = t.chk_step1;
      if (cards[1]) cards[1].textContent = t.chk_step2;
      
      var cbTitle = document.querySelector('.cashback-box h4');
      if (cbTitle) cbTitle.textContent = t.chk_cashback_title;
      var cbSub = document.querySelector('.cashback-box p');
      if (cbSub) cbSub.innerHTML = t.chk_cashback_sub;
      
      var cbName = document.getElementById('cashbackName');
      if (cbName) cbName.placeholder = t.chk_name_placeholder;
      var cbEmail = document.getElementById('cashbackEmail');
      if (cbEmail) cbEmail.placeholder = t.chk_email_placeholder;
      var cbBtn = document.querySelector('.cashback-btn');
      if (cbBtn) cbBtn.textContent = t.chk_cashback_btn;
      var cbSuc = document.getElementById('cashbackSuccess');
      if (cbSuc) cbSuc.innerHTML = t.chk_cashback_success;
      
      var secTitle = document.querySelector('.secure-badge-text h5');
      if (secTitle) secTitle.textContent = t.chk_secure_title;
      var secSub = document.querySelector('.secure-badge-text p');
      if (secSub) secSub.innerHTML = t.chk_secure_sub;
      
      var payLbl = document.querySelector('.form-group label');
      if (payLbl && payLbl.textContent.includes('Payment')) payLbl.textContent = t.chk_payment_method;
      
      var sumCards = document.querySelectorAll('.card-header');
      if (sumCards.length > 2) sumCards[2].textContent = t.chk_summary_title;
      
      var sumDeliv = document.querySelector('.plan-preview span');
      if (sumDeliv) sumDeliv.textContent = t.chk_delivery_time;
      
      var items = document.querySelectorAll('.summary-item span');
      items.forEach(function(i) {
        if (i.textContent.includes('Package Price')) i.textContent = t.chk_pkg_price;
        if (i.textContent.includes('+ Premium Frames')) i.textContent = t.chk_bump_text;
        if (i.textContent.includes('Total:')) i.textContent = t.chk_total;
      });
      
      var btn2 = document.getElementById('btn-buy');
      if (btn2) {
        btn2.textContent = t.chk_btn;
        btn2.dataset.defaultLabel = t.chk_btn;
      }
      var guar = document.querySelector('.guarantee-badge');
      if (guar) guar.textContent = t.chk_guarantee;
      
      var terms = document.querySelector('.security-note');
      if (terms) terms.innerHTML = t.chk_terms;
      
      setTimeout(function() {
        var pName = document.getElementById('plan-name');
        if (pName && pName.textContent.includes('Photos')) {
          pName.textContent = pName.textContent.replace('Photos', 'Fotos');
        }
        var btnBuy = document.getElementById('btn-buy');
        if (btnBuy && btnBuy.textContent.includes('Complete Purchase')) {
          btnBuy.textContent = t.chk_btn;
          btnBuy.dataset.defaultLabel = t.chk_btn;
        }
      }, 500);
    }
    
    // --- UPSELL.HTML ---
    if (path.includes('upsell.html')) {
      var upTop = document.querySelector('.order-badge');
      if (upTop) upTop.innerHTML = '<span>✓</span> ' + t.suc_title + ' — ' + t.up_top;
      var upH1 = document.querySelector('h1');
      if (upH1) upH1.innerHTML = '¡Estas fechas solo ocurren<br><span>una vez al año.</span>';
      var upP = document.querySelector('.upsell-sub');
      if (upP) upP.textContent = 'Ya aseguraste los recuerdos de tu bebé. Pero las fiestas pasan rápido — y estos son los momentos que desearías haber capturado.';
    }

    // --- SUCCESS.HTML ---
    if (path.includes('success.html')) {
      var h2s = document.querySelector('.container h2');
      if (h2s) h2s.textContent = t.suc_title;
      var p1 = document.querySelector('.container p');
      if (p1) p1.textContent = t.suc_subtitle;
      var p2 = document.querySelectorAll('.container p')[1];
      if (p2) p2.textContent = t.suc_done;
      var btnS = document.querySelector('.btn');
      if (btnS) btnS.textContent = t.suc_btn;
    }
  }

  applyTranslations();

})();
