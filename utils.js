// ============================================================================
// 📁 ARCHIVO: src/utils.js
// 🎯 PROPÓSITO: Funciones utilitarias globales compartidas en todo el Frontend.
// ============================================================================

// Interceptor asíncrono para reemplazar el feo 'window.confirm()' del navegador
function customConfirm(mensaje, textoConfirmar = "Sí, continuar", colorConfirmar = "#ef4444") {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:10000; backdrop-filter:blur(4px);";
        
        const modal = document.createElement('div');
        modal.style.cssText = "background:white; padding:25px; border-radius:12px; max-width:400px; width:90%; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.2); animation:slideDown 0.3s ease-out;";
        
        const icon = document.createElement('div');
        icon.innerHTML = "⚠️";
        icon.style.cssText = "font-size:40px; margin-bottom:10px;";
        
        const texto = document.createElement('p');
        texto.innerText = mensaje;
        texto.style.cssText = "margin-bottom:20px; color:#1e293b; font-size:1.05rem; line-height:1.5;";
        
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = "display:flex; justify-content:center; gap:10px;";
        
        const btnCancel = document.createElement('button');
        btnCancel.innerText = "Cancelar";
        btnCancel.style.cssText = "padding:10px 15px; border:none; border-radius:8px; background:#e2e8f0; color:#475569; font-weight:bold; cursor:pointer; flex:1;";
        btnCancel.onclick = () => { document.body.removeChild(overlay); resolve(false); };
        
        const btnConfirm = document.createElement('button');
        btnConfirm.innerText = textoConfirmar;
        btnConfirm.style.cssText = `padding:10px 15px; border:none; border-radius:8px; background:${colorConfirmar}; color:white; font-weight:bold; cursor:pointer; flex:1;`;
        btnConfirm.onclick = () => { document.body.removeChild(overlay); resolve(true); };
        
        btnContainer.appendChild(btnCancel);
        btnContainer.appendChild(btnConfirm);
        modal.appendChild(icon);
        modal.appendChild(texto);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    });
}

// Interceptor asíncrono para reemplazar el simple 'window.alert()'
function customAlert(mensaje, colorBoton = "#2563eb") {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:10000; backdrop-filter:blur(4px);";
        
        const modal = document.createElement('div');
        modal.style.cssText = "background:white; padding:25px; border-radius:12px; max-width:400px; width:90%; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.2); animation:slideDown 0.3s ease-out;";
        
        const icon = document.createElement('div');
        icon.innerHTML = "ℹ️";
        icon.style.cssText = "font-size:40px; margin-bottom:10px;";
        
        const texto = document.createElement('p');
        texto.innerText = mensaje;
        texto.style.cssText = "margin-bottom:20px; color:#1e293b; font-size:1.05rem; line-height:1.5;";
        
        const btnConfirm = document.createElement('button');
        btnConfirm.innerText = "Aceptar";
        btnConfirm.style.cssText = `padding:10px 15px; border:none; border-radius:8px; background:${colorBoton}; color:white; font-weight:bold; cursor:pointer; width:100%;`;
        btnConfirm.onclick = () => { document.body.removeChild(overlay); resolve(); };
        
        modal.appendChild(icon);
        modal.appendChild(texto);
        modal.appendChild(btnConfirm);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    });
}