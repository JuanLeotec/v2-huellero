// ============================================================
// main.js — arranque de la aplicación
// ============================================================
import { applySettings } from './core/state.js';
import { registerModule, navigate, initRouter } from './core/router.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { runSplash } from './components/splash.js';
import { attachRipple } from './core/utils.js';
import * as dashboard from './modules/dashboard.js';

applySettings();
attachRipple(document);

renderSidebar();
renderHeader();

registerModule('dashboard', dashboard);

// --- Módulos pendientes de Fase 4 (se activan en los próximos módulos aprobados) ---
['registros','marcas','semanal','calendario'].forEach(route => {
  registerModule(route, {
    render(first){
      if(!first) return;
      document.getElementById('view-' + route).innerHTML = `
        <div class="card" style="text-align:center;padding:60px 20px">
          <i data-lucide="hammer" style="width:34px;height:34px;color:var(--brand-blue-400)"></i>
          <h3 style="margin-top:14px;color:var(--gray-700)">Módulo en construcción</h3>
          <p style="color:var(--color-text-muted);font-size:var(--fs-sm);margin-top:6px">
            Este apartado se desarrollará en el siguiente bloque de la Fase 4, conservando exactamente la lógica actual.
          </p>
        </div>`;
      if(window.lucide) window.lucide.createIcons();
    }
  });
});

initRouter('dashboard');
