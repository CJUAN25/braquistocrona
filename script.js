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

// --- INTEGRACIÓN AWS IOT MQTT CON COGNITO ---
AWS.config.region = "us-east-1";
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: "us-east-1:5b759c5d-979e-4b61-9b47-bb5056bef846",
});

AWS.config.credentials.get(function (err) {
  if (err) {
    connectionStatus.textContent = '🔴 Error al obtener credenciales AWS';
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
    connectionStatus.textContent = '🟢 Conectado a AWS IoT';
    connectionStatus.classList.add('connected');
    // Suscribirse a los topics de interés
    client.subscribe("modelo/recta");
    client.subscribe("modelo/braquistocrona");
    client.subscribe("modelo/hiperbola");
  });

  client.on("message", function (topic, message) {
    try {
      const data = JSON.parse(message.toString());
      if (topic === "modelo/recta") {
        trayectorias.recta = {
          inicio: data.tiempo ?? '-',
          medio: data.tiempo_medio ?? '-',
          final: data.tiempo_final ?? '-'
        };
      } else if (topic === "modelo/braquistocrona") {
        trayectorias.braquistocrona = {
          inicio: data.tiempo ?? '-',
          medio: data.tiempo_medio ?? '-',
          final: data.tiempo_final ?? '-'
        };
      } else if (topic === "modelo/hiperbola") {
        trayectorias.hiperbola = {
          inicio: data.tiempo ?? '-',
          medio: data.tiempo_medio ?? '-',
          final: data.tiempo_final ?? '-'
        };
      }
      // Refresca la UI con todos los datos actuales
      updateUI({
        inicio_recta: trayectorias.recta.inicio,
        medio_recta: trayectorias.recta.medio,
        final_recta: trayectorias.recta.final,
        inicio_braquistocrona: trayectorias.braquistocrona.inicio,
        medio_braquistocrona: trayectorias.braquistocrona.medio,
        final_braquistocrona: trayectorias.braquistocrona.final,
        inicio_hiperbola: trayectorias.hiperbola.inicio,
        medio_hiperbola: trayectorias.hiperbola.medio,
        final_hiperbola: trayectorias.hiperbola.final
      });
    } catch (e) {
      connectionStatus.textContent = '🔴 Error al procesar mensaje MQTT';
    }
  });

  client.on("error", function (error) {
    connectionStatus.textContent = '🔴 Error de conexión AWS IoT';
    connectionStatus.classList.remove('connected');
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
    // Actualizar nuevas columnas de la tabla comparativa
    actualizarTarjeta('recta', Number(data.inicio_recta), Number(data.medio_recta), Number(data.final_recta));
    actualizarTarjeta('braquistocrona', Number(data.inicio_braquistocrona), Number(data.medio_braquistocrona), Number(data.final_braquistocrona));
    actualizarTarjeta('hiperbola', Number(data.inicio_hiperbola), Number(data.medio_hiperbola), Number(data.final_hiperbola));

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

    // Actualiza la gráfica después de actualizar la tabla
    actualizarGrafica();
}

function resetUI() {
    // Vacía los valores si se pierde conexión
    [rectaInicio, rectaMedio, rectaFinal, braqInicio, braqMedio, braqFinal, hiperInicio, hiperMedio, hiperFinal].forEach(e => e.textContent = '–');
    [compRecta, compBraq, compHiper, compRectaRes, compBraqRes, compHiperRes].forEach(e => e.textContent = '–');
    adaptiveMessage.textContent = 'Esperando datos del ESP32…';
}

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

// Gráfica Chart.js para mostrar velocidades y tiempos
// Se actualiza automáticamente al recibir datos nuevos
let chart;
function actualizarGrafica() {
    // Obtener datos de la tabla comparativa
    const labels = ['Recta', 'Braquistócrona', 'Hipérbola'];
    const tiempos = [
        parseFloat(document.getElementById('comp-recta').textContent) || 0,
        parseFloat(document.getElementById('comp-braquistocrona').textContent) || 0,
        parseFloat(document.getElementById('comp-hiperbola').textContent) || 0
    ];
    const velocidades = [
        parseFloat(document.getElementById('comp-recta-vavg').textContent) || 0,
        parseFloat(document.getElementById('comp-braqui-vavg').textContent) || 0,
        parseFloat(document.getElementById('comp-hiper-vavg').textContent) || 0
    ];
    const ctx = document.getElementById('resultChart').getContext('2d');
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Tiempo Final (ms)',
                    data: tiempos,
                    backgroundColor: ['#1976d2cc','#2e7d32cc','#ffb300cc'],
                    borderRadius: 8,
                    yAxisID: 'y',
                },
                {
                    label: 'Velocidad promedio (m/s)',
                    data: velocidades,
                    backgroundColor: ['#1976d2','#2e7d32','#ffb300'],
                    borderRadius: 8,
                    yAxisID: 'y1',
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top', labels: { font: { family: 'Inter', size: 14 } } },
                title: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Tiempo (ms)', color: '#1976d2', font: { family: 'Inter', weight: 'bold' } },
                    grid: { color: '#e0e0e0' },
                    ticks: { color: '#1976d2', font: { family: 'Inter' } }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: { display: true, text: 'Velocidad (m/s)', color: '#2e7d32', font: { family: 'Inter', weight: 'bold' } },
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#2e7d32', font: { family: 'Inter' } }
                }
            }
        }
    });
}

// Llama a actualizarGrafica() cada vez que se actualizan los datos de la tabla
// Puedes llamarlo al final de actualizarTarjeta o actualizarGanador

// Panel de configuración: validación, persistencia y feedback
window.addEventListener('DOMContentLoaded', () => {
    const d1Input = document.getElementById('d1');
    const d2Input = document.getElementById('d2');
    const masaInput = document.getElementById('masa');
    const successMsg = document.getElementById('config-success');
    // Cargar valores guardados
    if (localStorage.getItem('d1')) d1Input.value = localStorage.getItem('d1');
    if (localStorage.getItem('d2')) d2Input.value = localStorage.getItem('d2');
    if (localStorage.getItem('masa')) masaInput.value = localStorage.getItem('masa');
    // Guardar y validar
    document.getElementById('config-form').addEventListener('submit', function(e) {
        e.preventDefault();
        let valid = true;
        if (!d1Input.value || Number(d1Input.value) <= 0) {
            document.getElementById('d1-error').textContent = 'Valor inválido';
            document.getElementById('d1-error').setAttribute('aria-live', 'polite');
            valid = false;
        } else {
            document.getElementById('d1-error').textContent = '';
        }
        if (!d2Input.value || Number(d2Input.value) <= 0) {
            document.getElementById('d2-error').textContent = 'Valor inválido';
            document.getElementById('d2-error').setAttribute('aria-live', 'polite');
            valid = false;
        } else {
            document.getElementById('d2-error').textContent = '';
        }
        if (!masaInput.value || Number(masaInput.value) <= 0) {
            document.getElementById('masa-error').textContent = 'Valor inválido';
            document.getElementById('masa-error').setAttribute('aria-live', 'polite');
            valid = false;
        } else {
            document.getElementById('masa-error').textContent = '';
        }
        if (!valid) return;
        localStorage.setItem('d1', d1Input.value);
        localStorage.setItem('d2', d2Input.value);
        localStorage.setItem('masa', masaInput.value);
        successMsg.textContent = 'Configuración guardada correctamente';
        successMsg.setAttribute('aria-live', 'polite');
        setTimeout(() => successMsg.textContent = '', 2000);
    });
});

// Cálculos físicos y actualización de tarjetas
function calcularMetricas(t_inicio, t_medio, t_final, d1_cm, d2_cm, masa_g) {
    const d1_m = d1_cm / 100;
    const d2_m = d2_cm / 100;
    const masa_kg = masa_g / 1000;
    const t1 = (t_medio - t_inicio) / 1000;
    const t2 = (t_final - t_medio) / 1000;
    const t_total = (t_final - t_inicio) / 1000;
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

function actualizarTarjeta(tray, t_inicio, t_medio, t_final) {
    const d1 = Number(localStorage.getItem('d1') || 50);
    const d2 = Number(localStorage.getItem('d2') || 75);
    const masa = Number(localStorage.getItem('masa') || 30);
    const met = calcularMetricas(t_inicio, t_medio, t_final, d1, d2, masa);
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
    if (tray === 'recta') {
        document.getElementById('comp-recta-vavg').textContent = met.v_avg ? met.v_avg.toFixed(2) : '–';
        document.getElementById('comp-recta-ace').textContent = met.a ? met.a.toFixed(2) : '–';
        document.getElementById('comp-recta-ener').textContent = met.E_k ? met.E_k.toFixed(2) : '–';
    }
    if (tray === 'braquistocrona') {
        document.getElementById('comp-braqui-vavg').textContent = met.v_avg ? met.v_avg.toFixed(2) : '–';
        document.getElementById('comp-braqui-ace').textContent = met.a ? met.a.toFixed(2) : '–';
        document.getElementById('comp-braqui-ener').textContent = met.E_k ? met.E_k.toFixed(2) : '–';
    }
    if (tray === 'hiperbola') {
        document.getElementById('comp-hiper-vavg').textContent = met.v_avg ? met.v_avg.toFixed(2) : '–';
        document.getElementById('comp-hiper-ace').textContent = met.a ? met.a.toFixed(2) : '–';
        document.getElementById('comp-hiper-ener').textContent = met.E_k ? met.E_k.toFixed(2) : '–';
    }
}