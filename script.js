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

// AWS IoT Core + Cognito MQTT over WebSocket connection
// Requiere: AWS SDK, AWS IoT Device SDK

// 1. Agrega los scripts en tu index.html antes de </body>:
// <script src="https://sdk.amazonaws.com/js/aws-sdk-2.1.24.min.js"></script>
// <script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>

// 2. Configura los datos de tu cuenta
const region = 'us-east-1';
const identityPoolId = 'us-east-1:3513500b-d2a5-4c55-b502-6c0ff4c71c2b';
const iotEndpoint = 'wss://aud5ctk8s2dkk-ats.iot.us-east-1.amazonaws.com/mqtt';
const topic = 'topicC';

// 3. Inicializa AWS Cognito para obtener credenciales temporales
AWS.config.region = region;
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: identityPoolId
});

AWS.config.credentials.get(function(err) {
    if (err) {
        console.error('Error obteniendo credenciales Cognito:', err);
        return;
    }
    const credentials = AWS.config.credentials;
    const requestUrl = SigV4Utils.getSignedUrl(iotEndpoint, region, credentials);
    const client = mqtt.connect(requestUrl);

    client.on('connect', function() {
        console.log('Conectado a AWS IoT Core');
        client.subscribe(topic, function(err) {
            if (err) {
                console.error('Error al suscribirse:', err);
            } else {
                console.log('Suscrito a', topic);
            }
        });
    });

    client.on('message', function(topic, message) {
        // Actualiza el valor en la web
        document.getElementById('comp-hiperbola').textContent = message.toString();
    });
});

// 4. Utilidad para firmar la URL con SigV4 (necesario para AWS IoT)
const SigV4Utils = {
    getSignedUrl: function(endpoint, region, credentials) {
        const time = new Date();
        const dateStamp = time.toISOString().replace(/[-:]/g, '').replace(/\..*$/, '');
        const amzdate = dateStamp + 'Z';
        const service = 'iotdevicegateway';
        const algorithm = 'AWS4-HMAC-SHA256';
        const method = 'GET';
        const canonicalUri = '/mqtt';
        const host = endpoint.replace(/^wss:\/\//, '');
        const credentialScope = dateStamp.substr(0,8) + '/' + region + '/' + service + '/aws4_request';
        const canonicalQuerystring = 'X-Amz-Algorithm=' + algorithm +
            '&X-Amz-Credential=' + encodeURIComponent(credentials.accessKeyId + '/' + credentialScope) +
            '&X-Amz-Date=' + amzdate +
            '&X-Amz-SignedHeaders=host';
        const canonicalHeaders = 'host:' + host + '\n';
        const payloadHash = AWS.util.crypto.sha256('', 'hex');
        const canonicalRequest = method + '\n' + canonicalUri + '\n' + canonicalQuerystring + '\n' + canonicalHeaders + '\nhost\n' + payloadHash;
        const stringToSign = algorithm + '\n' + amzdate + '\n' + credentialScope + '\n' + AWS.util.crypto.sha256(canonicalRequest, 'hex');
        const signingKey = SigV4Utils.getSignatureKey(credentials.secretAccessKey, dateStamp.substr(0,8), region, service);
        const signature = AWS.util.crypto.hmac(signingKey, stringToSign, 'hex');
        return endpoint + '?' + canonicalQuerystring + '&X-Amz-Signature=' + signature + '&X-Amz-Security-Token=' + encodeURIComponent(credentials.sessionToken);
    },
    getSignatureKey: function(key, dateStamp, regionName, serviceName) {
        const kDate = AWS.util.crypto.hmac('AWS4' + key, dateStamp, 'buffer');
        const kRegion = AWS.util.crypto.hmac(kDate, regionName, 'buffer');
        const kService = AWS.util.crypto.hmac(kRegion, serviceName, 'buffer');
        const kSigning = AWS.util.crypto.hmac(kService, 'aws4_request', 'buffer');
        return kSigning;
    }
};