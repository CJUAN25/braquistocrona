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
        updateUI({
          inicio_recta: data.inicio ?? '-',
          medio_recta: data.medio ?? '-',
          final_recta: data.final ?? '-',
          inicio_braquistocrona: '-',
          medio_braquistocrona: '-',
          final_braquistocrona: '-',
          inicio_hiperbola: '-',
          medio_hiperbola: '-',
          final_hiperbola: '-'
        });
      } else if (topic === "modelo/braquistocrona") {
        updateUI({
          inicio_recta: '-',
          medio_recta: '-',
          final_recta: '-',
          inicio_braquistocrona: data.inicio ?? '-',
          medio_braquistocrona: data.medio ?? '-',
          final_braquistocrona: data.final ?? '-',
          inicio_hiperbola: '-',
          medio_hiperbola: '-',
          final_hiperbola: '-'
        });
      } else if (topic === "modelo/hiperbola") {
        updateUI({
          inicio_recta: '-',
          medio_recta: '-',
          final_recta: '-',
          inicio_braquistocrona: '-',
          medio_braquistocrona: '-',
          final_braquistocrona: '-',
          inicio_hiperbola: data.inicio ?? '-',
          medio_hiperbola: data.medio ?? '-',
          final_hiperbola: '-'
        });
      }
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
}

function resetUI() {
    // Vacía los valores si se pierde conexión
    [rectaInicio, rectaMedio, rectaFinal, braqInicio, braqMedio, braqFinal, hiperInicio, hiperMedio, hiperFinal].forEach(e => e.textContent = '–');
    [compRecta, compBraq, compHiper, compRectaRes, compBraqRes, compHiperRes].forEach(e => e.textContent = '–');
    adaptiveMessage.textContent = 'Esperando datos del ESP32…';
}