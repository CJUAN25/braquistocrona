const API_URL = 'http://[IP_DEL_ESP32]/api/tiempos';
const connectionStatus = document.getElementById('connection-status');
const refreshButton = document.getElementById('refresh-button');

// Elementos de tarjetas
const rectaInicio = document.getElementById('recta-inicio');
const rectaMedio = document.getElementById('recta-medio');
const rectaFinal = document.getElementById('recta-final');
const braqInicio = document.getElementById('braquistocrona-inicio');
const braqMedio = document.getElementById('braquistocrona-medio');
const braqFinal = document.getElementById('braquistocrona-final');
const hiperInicio = document.getElementById('hiperbola-inicio');
const hiperMedio = document.getElementById('hiperbola-medio');
const hiperFinal = document.getElementById('hiperbola-final');

// Elementos de tabla comparativa
const compRecta = document.getElementById('comp-recta');
const compRectaRes = document.getElementById('comp-recta-resultado');
const compBraq = document.getElementById('comp-braquistocrona');
const compBraqRes = document.getElementById('comp-braquistocrona-resultado');
const compHiper = document.getElementById('comp-hiperbola');
const compHiperRes = document.getElementById('comp-hiperbola-resultado');

const adaptiveMessage = document.getElementById('adaptive-message');

async function fetchData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error en la conexión');
        const data = await response.json();
        updateUI(data);
        connectionStatus.textContent = `🟢 Conectado a ESP32: [IP]`;
        connectionStatus.classList.add('connected');
    } catch (error) {
        connectionStatus.textContent = '🔴 Desconectado';
        connectionStatus.classList.remove('connected');
        resetUI();
    }
}

function updateUI(data) {
    // Tarjetas
    rectaInicio.textContent = data.inicio_recta + ' ms';
    rectaMedio.textContent = data.medio_recta + ' ms';
    rectaFinal.textContent = data.final_recta + ' ms';
    braqInicio.textContent = data.inicio_braquistocrona + ' ms';
    braqMedio.textContent = data.medio_braquistocrona + ' ms';
    braqFinal.textContent = data.final_braquistocrona + ' ms';
    hiperInicio.textContent = data.inicio_hiperbola + ' ms';
    hiperMedio.textContent = data.medio_hiperbola + ' ms';
    hiperFinal.textContent = data.final_hiperbola + ' ms';

    // Tabla comparativa
    compRecta.textContent = data.final_recta + ' ms';
    compBraq.textContent = data.final_braquistocrona + ' ms';
    compHiper.textContent = data.final_hiperbola + ' ms';

    // Ganador
    const tiempos = [
        { nombre: 'recta', valor: data.final_recta },
        { nombre: 'braquistocrona', valor: data.final_braquistocrona },
        { nombre: 'hiperbola', valor: data.final_hiperbola }
    ];
    const min = Math.min(...tiempos.map(t => t.valor));
    tiempos.forEach(t => {
        if (t.valor === min) {
            if (t.nombre === 'recta') compRectaRes.textContent = '✅ Ganador';
            if (t.nombre === 'braquistocrona') compBraqRes.textContent = '✅ Ganador';
            if (t.nombre === 'hiperbola') compHiperRes.textContent = '✅ Ganador';
        } else {
            if (t.nombre === 'recta') compRectaRes.textContent = '❌ Más lento';
            if (t.nombre === 'braquistocrona') compBraqRes.textContent = '❌ Más lento';
            if (t.nombre === 'hiperbola') compHiperRes.textContent = '❌ Más lento';
        }
    });

    // Mensaje adaptativo
    if (min === data.final_braquistocrona) {
        adaptiveMessage.textContent = `🎉 ¡La curva braquistócrona ha ganado con un tiempo de ${data.final_braquistocrona} ms!`;
    } else if (min === data.final_recta) {
        adaptiveMessage.textContent = `⚠️ ¡Sorpresa! La trayectoria recta ganó con ${data.final_recta} ms.`;
    } else {
        adaptiveMessage.textContent = `⚠️ ¡Sorpresa! La trayectoria hipérbola ganó con ${data.final_hiperbola} ms.`;
    }
}

function resetUI() {
    // Vacía los valores si se pierde conexión
    [rectaInicio, rectaMedio, rectaFinal, braqInicio, braqMedio, braqFinal, hiperInicio, hiperMedio, hiperFinal].forEach(e => e.textContent = '–');
    [compRecta, compBraq, compHiper, compRectaRes, compBraqRes, compHiperRes].forEach(e => e.textContent = '–');
    adaptiveMessage.textContent = 'Esperando datos del ESP32…';
}

refreshButton.addEventListener('click', fetchData);
setInterval(fetchData, 1000);
fetchData();