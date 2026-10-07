(function() {
  var dict = {
    es: {
      // ── app.html ──
      "app_title": "1. Sube las fotos de tu bebé",
      "app_subtitle": "Sube fotos simples de la cara de tu bebé (recomendado: 4 a 8 fotos)",
      "app_upload_btn": "Haz clic para subir o arrastra las fotos aquí",
      "app_req_title": "Para resultados mágicos:",
      "app_req_1": "✓ <strong>Sin chupón ni gorritos</strong> que tapen la cara",
      "app_req_2": "✓ <strong>Solo el bebé</strong> en la foto",
      "app_req_3": "✓ <strong>Cara completa visible</strong>",
      "app_baby_name_label": "¿Cómo se llama tu bebé?",
      "app_next_btn": "Siguiente: Elegir Tema y Plan →",
      
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
      var btn = document.querySelector('.btn-primary');
      if (btn) btn.textContent = t.app_next_btn;
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
