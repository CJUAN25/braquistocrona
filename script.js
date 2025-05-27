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

// Estado global para guardar los últimos datos de cada trayectoria
const trayectorias = {
  recta: { inicio: '-', medio: '-', final: '-' },
  braquistocrona: { inicio: '-', medio: '-', final: '-' },
  hiperbola: { inicio: '-', medio: '-', final: '-' }
};

// --- NUEVA LÓGICA DE CONFIGURACIÓN Y CÁLCULOS ---
window.addEventListener('DOMContentLoaded', () => {
    // Cargar valores de localStorage o usar predeterminados para cada trayectoria
    const campos = [
        'd1-recta','d2-recta','d1-braqui','d2-braqui','d1-hiper','d2-hiper','masa'
    ];
    campos.forEach(id => {
        const input = document.getElementById(id);
        if (input && localStorage.getItem(id)) input.value = localStorage.getItem(id);
    });

    // Validación y guardado de configuración
    document.getElementById('config-form').addEventListener('submit', function(e) {
        e.preventDefault();
        let valid = true;
        campos.forEach(id => {
            const input = document.getElementById(id);
            const error = document.getElementById(id+'-error');
            if (!input.value || Number(input.value) <= 0) {
                error.textContent = 'Valor inválido';
                valid = false;
            } else {
                error.textContent = '';
            }
        });
        if (!valid) return;
        // Guardar en localStorage
        campos.forEach(id => {
            localStorage.setItem(id, document.getElementById(id).value);
        });
        document.getElementById('save-config').textContent = '¡Guardado!';
        setTimeout(() => document.getElementById('save-config').textContent = 'Guardar configuración', 1200);
    });
});

// --- MODO OSCURO ---
const darkToggle = document.getElementById('dark-mode-toggle');
darkToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    this.textContent = document.body.classList.contains('dark-mode') ? '☀️ Modo claro' : '🌙 Modo oscuro';
});

// --- SPINNER DE CARGA ---
function showSpinner() {
    document.getElementById('spinner').style.display = 'block';
}
function hideSpinner() {
    document.getElementById('spinner').style.display = 'none';
}
showSpinner();

// --- INDICADOR DE CONEXIÓN ---
function setConnectionStatus(connected) {
    const el = document.getElementById('connection-status');
    if (connected) {
        el.textContent = '🟢 Conectado a AWS IoT Core';
        el.classList.add('connected');
    } else {
        el.textContent = '🔴 Desconectado';
        el.classList.remove('connected');
    }
}

// --- CÁLCULOS FÍSICOS ---
function calcularMetricas(t_inicio, t_medio, t_final, d1_cm, d2_cm, masa_g) {
    // Convertir a segundos y metros
    const d1_m = d1_cm / 100;
    const d2_m = d2_cm / 100;
    const masa_kg = masa_g / 1000;
    const t1 = (t_medio - t_inicio) / 1000;
    const t2 = (t_final - t_medio) / 1000;
    const t_total = (t_final - t_inicio) / 1000;
    // Evitar divisiones por cero o negativas
    const v1 = t1 > 0 ? d1_m / t1 : 0;
    const v2 = t2 > 0 ? d2_m / t2 : 0;
    const v_avg = t_total > 0 ? (d1_m + d2_m) / t_total : 0;
    const a = t_total > 0 ? (2 * (d1_m + d2_m)) / (t_total * t_total) : 0;
    const E_k = 0.5 * masa_kg * v_avg * v_avg;
    return {
        v1: isFinite(v1) ? v1 : 0,
        v2: isFinite(v2) ? v2 : 0,
        v_avg: isFinite(v_avg) ? v_avg : 0,
        a: isFinite(a) ? a : 0,
        E_k: isFinite(E_k) ? E_k : 0
    };
}

// --- ACTUALIZAR UI CON NUEVAS MÉTRICAS ---
function actualizarTarjeta(tray, t_inicio, t_medio, t_final) {
    // Obtener configuración específica por trayectoria
    let d1 = 29, d2 = 29;
    if (tray === 'recta') {
        d1 = Number(localStorage.getItem('d1-recta') || 29);
        d2 = Number(localStorage.getItem('d2-recta') || 29);
    } else if (tray === 'braquistocrona') {
        d1 = Number(localStorage.getItem('d1-braqui') || 30);
        d2 = Number(localStorage.getItem('d2-braqui') || 29);
    } else if (tray === 'hiperbola') {
        d1 = Number(localStorage.getItem('d1-hiper') || 33);
        d2 = Number(localStorage.getItem('d2-hiper') || 33);
    }
    const masa = Number(localStorage.getItem('masa') || 30);
    const met = calcularMetricas(t_inicio, t_medio, t_final, d1, d2, masa);
    // IDs por trayectoria
    let prefix = '';
    if (tray === 'recta') prefix = 'recta';
    if (tray === 'braquistocrona') prefix = 'braqui';
    if (tray === 'hiperbola') prefix = 'hiper';
    document.getElementById(`${prefix}-vel1`).textContent = met.v1 ? met.v1.toFixed(2) : '–';
    document.getElementById(`${prefix}-vel2`).textContent = met.v2 ? met.v2.toFixed(2) : '–';
    document.getElementById(`${prefix}-vavg`).textContent = met.v_avg ? met.v_avg.toFixed(2) : '–';
    document.getElementById(`${prefix}-ace`).textContent = met.a ? met.a.toFixed(2) : '–';
    document.getElementById(`${prefix}-ener`).textContent = met.E_k ? met.E_k.toFixed(2) : '–';
    // También actualizar tabla comparativa
    if (tray === 'recta') document.getElementById('comp-recta-vavg').textContent = met.v_avg ? met.v_avg.toFixed(2) : '–';
    if (tray === 'braquistocrona') document.getElementById('comp-braqui-vavg').textContent = met.v_avg ? met.v_avg.toFixed(2) : '–';
    if (tray === 'hiperbola') document.getElementById('comp-hiper-vavg').textContent = met.v_avg ? met.v_avg.toFixed(2) : '–';
    // --- GRÁFICA MODERNA CON CHART.JS ---
    let chart;
    function actualizarGrafica() {
        const ctx = document.getElementById('resultChart').getContext('2d');
        const labels = ['Recta', 'Braquistócrona', 'Hipérbola'];
        const tiempos = [
            parseFloat(document.getElementById('comp-recta').textContent) || 0,
            parseFloat(document.getElementById('comp-braquistocrona').textContent) || 0,
            parseFloat(document.getElementById('comp-hiperbola').textContent) || 0
        ];
        const vprom = [
            parseFloat(document.getElementById('comp-recta-vavg').textContent) || 0,
            parseFloat(document.getElementById('comp-braqui-vavg').textContent) || 0,
            parseFloat(document.getElementById('comp-hiper-vavg').textContent) || 0
        ];
        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Tiempo Final (ms)',
                        data: tiempos,
                        backgroundColor: 'rgba(19, 124, 58, 0.7)',
                        borderRadius: 8,
                    },
                    {
                        label: 'Velocidad Promedio (m/s)',
                        data: vprom,
                        backgroundColor: 'rgba(13, 71, 161, 0.7)',
                        borderRadius: 8,
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true, labels: { font: { family: 'Inter', size: 14 } } },
                    title: { display: false }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: '#e0e0e0' }, beginAtZero: true }
                },
                animation: { duration: 900, easing: 'easeOutQuart' }
            }
        });
    }

    // Llama a actualizarGrafica cada vez que se actualizan los resultados
    actualizarGrafica();
    return met.v_avg;
}

// --- GANADOR ---
function actualizarGanador() {
    const vRecta = parseFloat(document.getElementById('comp-recta-vavg').textContent) || 0;
    const vBraqui = parseFloat(document.getElementById('comp-braqui-vavg').textContent) || 0;
    const vHiper = parseFloat(document.getElementById('comp-hiper-vavg').textContent) || 0;
    let max = Math.max(vRecta, vBraqui, vHiper);
    let ganador = '';
    if (max === 0) {
        document.getElementById('winner-message').textContent = '';
        return;
    }
    if (max === vRecta) ganador = 'Recta';
    if (max === vBraqui) ganador = 'Braquistócrona';
    if (max === vHiper) ganador = 'Hipérbola';
    document.getElementById('winner-message').textContent = `🥇 La curva ganadora fue: ${ganador} (velocidad promedio: ${max.toFixed(2)} m/s)`;
}

// --- INTEGRACIÓN AWS IOT MQTT CON COGNITO (NO MODIFICAR) ---
AWS.config.region = "us-east-1";
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: "us-east-1:5b759c5d-979e-4b61-9b47-bb5056bef846",
});
AWS.config.credentials.get(function (err) {
  if (err) {
    setConnectionStatus(false);
    return;
  }
  const accessKeyId = AWS.config.credentials.accessKeyId;
  const secretKey = AWS.config.credentials.secretAccessKey;
  const sessionToken = AWS.config.credentials.sessionToken;
  const endpoint = "wss://aud5ctk8s2dkk-ats.iot.us-east-1.amazonaws.com/mqtt";
  const clientId = "webClient-" + (Math.floor(Math.random() * 100000) + 1);
  const signRequest = getSignedUrl({
    accessKeyId,
    secretKey,
    sessionToken,
    region: AWS.config.region,
    host: "aud5ctk8s2dkk-ats.iot.us-east-1.amazonaws.com",
    path: "/mqtt",
    service: "iotdevicegateway",
  });
  const client = mqtt.connect(signRequest, {
    clientId,
    protocol: "wss",
    accessKeyId,
    secretKey,
    sessionToken,
    region: AWS.config.region,
    protocolId: "MQTT",
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
    resubscribe: true,
  });
  client.on("connect", function () {
    setConnectionStatus(true);
    // Suscribirse a los topics de interés
    client.subscribe("modelo/recta");
    client.subscribe("modelo/braquistocrona");
    client.subscribe("modelo/hiperbola");
    hideSpinner();
  });
  client.on("close", function () {
    setConnectionStatus(false);
  });
  client.on("offline", function () {
    setConnectionStatus(false);
  });
  client.on("reconnect", function () {
    setConnectionStatus(false);
  });
  client.on("error", function () {
    setConnectionStatus(false);
  });
  client.on("message", function (topic, message) {
    try {
      const data = JSON.parse(message.toString());
      // Esperado: { t_inicio, t_medio, t_final }
      let tray = '';
      if (topic === "modelo/recta") tray = 'recta';
      if (topic === "modelo/braquistocrona") tray = 'braquistocrona';
      if (topic === "modelo/hiperbola") tray = 'hiperbola';
      // Actualizar tiempos
      if (tray === 'recta') {
        document.getElementById('recta-inicio').textContent = data.t_inicio ?? '–';
        document.getElementById('recta-medio').textContent = data.t_medio ?? '–';
        document.getElementById('recta-final').textContent = data.t_final ?? '–';
        document.getElementById('comp-recta').textContent = data.t_final ?? '–';
      }
      if (tray === 'braquistocrona') {
        document.getElementById('braquistocrona-inicio').textContent = data.t_inicio ?? '–';
        document.getElementById('braquistocrona-medio').textContent = data.t_medio ?? '–';
        document.getElementById('braquistocrona-final').textContent = data.t_final ?? '–';
        document.getElementById('comp-braquistocrona').textContent = data.t_final ?? '–';
      }
      if (tray === 'hiperbola') {
        document.getElementById('hiperbola-inicio').textContent = data.t_inicio ?? '–';
        document.getElementById('hiperbola-medio').textContent = data.t_medio ?? '–';
        document.getElementById('hiperbola-final').textContent = data.t_final ?? '–';
        document.getElementById('comp-hiperbola').textContent = data.t_final ?? '–';
      }
      // Cálculos físicos y actualización de métricas
      if (data.t_inicio && data.t_medio && data.t_final) {
        actualizarTarjeta(tray, data.t_inicio, data.t_medio, data.t_final);
        actualizarGanador();
      }
    } catch (e) {
      // Error de parseo
    }
  });
});

function getSignedUrl({
  accessKeyId,
  secretKey,
  sessionToken,
  region,
  host,
  path,
  service,
}) {
  const protocol = "wss";
  const method = "GET";
  const now = new Date();
  const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzdate.slice(0, 8);
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalQuerystring = `X-Amz-Algorithm=${algorithm}&X-Amz-Credential=${encodeURIComponent(
    accessKeyId + "/" + credentialScope
  )}&X-Amz-Date=${amzdate}&X-Amz-SignedHeaders=host`;

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";
  const payloadHash = CryptoJS.SHA256("").toString(CryptoJS.enc.Hex);

  const canonicalRequest = [
    method,
    path,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    algorithm,
    amzdate,
    credentialScope,
    CryptoJS.SHA256(canonicalRequest).toString(CryptoJS.enc.Hex),
  ].join("\n");

  function sign(key, msg) {
    return CryptoJS.HmacSHA256(msg, key);
  }

  function getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = sign("AWS4" + key, dateStamp);
    const kRegion = sign(kDate, regionName);
    const kService = sign(kRegion, serviceName);
    const kSigning = sign(kService, "aws4_request");
    return kSigning;
  }

  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = CryptoJS.HmacSHA256(stringToSign, signingKey).toString(
    CryptoJS.enc.Hex
  );

  let signedUrl = `${protocol}://${host}${path}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
  if (sessionToken) {
    signedUrl += `&X-Amz-Security-Token=${encodeURIComponent(sessionToken)}`;
  }

  return signedUrl;
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

    // Limpiar resultados previos
    compRectaRes.textContent = '';
    compBraqRes.textContent = '';
    compHiperRes.textContent = '';

    // Ganador
    const tiempos = [
        { nombre: 'recta', valor: Number(data.final_recta) },
        { nombre: 'braquistocrona', valor: Number(data.final_braquistocrona) },
        { nombre: 'hiperbola', valor: Number(data.final_hiperbola) }
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
    if (min === Number(data.final_braquistocrona)) {
        adaptiveMessage.textContent = `🎉 ¡La curva braquistócrona ha ganado con un tiempo de ${data.final_braquistocrona} ms!`;
    } else if (min === Number(data.final_recta)) {
        adaptiveMessage.textContent = `⚠️ ¡Sorpresa! La trayectoria recta ganó con ${data.final_recta} ms.`;
    } else {
        adaptiveMessage.textContent = `⚠️ ¡Sorpresa! La trayectoria hipérbola ganó con ${data.final_hiperbola} ms.`;
    }
    hideSpinner(); // Oculta el spinner cuando llegan datos
}

function resetUI() {
    // Vacía los valores si se pierde conexión
    [rectaInicio, rectaMedio, rectaFinal, braqInicio, braqMedio, braqFinal, hiperInicio, hiperMedio, hiperFinal].forEach(e => e.textContent = '–');
    [compRecta, compBraq, compHiper, compRectaRes, compBraqRes, compHiperRes].forEach(e => e.textContent = '–');
    adaptiveMessage.textContent = 'Esperando datos del ESP32…';
    showSpinner(); // Muestra el spinner cuando se reinicia
}

// Spinner de carga
function showSpinner() {
    document.getElementById('spinner').style.display = 'block';
}
function hideSpinner() {
    document.getElementById('spinner').style.display = 'none';
}

// Mostrar spinner al inicio
showSpinner();

// Elimina el botón de actualizar y crea solo el botón de borrar datos, estilizado
const clearButton = document.createElement('button');
clearButton.textContent = 'Borrar datos';
clearButton.id = 'clear-button';
clearButton.className = 'clear-btn';
// Elimina el botón de actualizar del DOM si existe
if (refreshButton) refreshButton.remove();
// Ubica el botón al lado de la tabla comparativa
const comparisonSection = document.getElementById('comparison');
if (comparisonSection) {
  // Si ya existe un contenedor, no lo dupliques
  let clearBtnContainer = document.getElementById('clear-btn-container');
  if (!clearBtnContainer) {
    clearBtnContainer = document.createElement('div');
    clearBtnContainer.id = 'clear-btn-container';
    clearBtnContainer.style.width = '100%';
    clearBtnContainer.style.display = 'flex';
    clearBtnContainer.style.justifyContent = 'center';
    clearBtnContainer.style.alignItems = 'center';
    clearBtnContainer.style.marginTop = '0';
    comparisonSection.appendChild(clearBtnContainer);
  }
  clearBtnContainer.appendChild(clearButton);
}

clearButton.addEventListener('click', function() {
  trayectorias.recta = { inicio: '-', medio: '-', final: '-' };
  trayectorias.braquistocrona = { inicio: '-', medio: '-', final: '-' };
  trayectorias.hiperbola = { inicio: '-', medio: '-', final: '-' };
  updateUI({
    inicio_recta: '-', medio_recta: '-', final_recta: '-',
    inicio_braquistocrona: '-', medio_braquistocrona: '-', final_braquistocrona: '-',
    inicio_hiperbola: '-', medio_hiperbola: '-', final_hiperbola: '-'
  });
});

// Cargar Chart.js dinámicamente si no está
(function cargarChartJs() {
    if (!window.Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => setTimeout(actualizarGrafica, 500);
        document.head.appendChild(script);
    }
})();