'use strict'

//-------------

require('dotenv').config();

//--
const express = require('express');
const bodyParser = require('body-parser')
const app = express();
require('express-ws')(app);

app.use(bodyParser.json());

const webSocket = require('ws');

//--

const axios = require('axios');

//---- CORS policy - Update this section as needed ----

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "OPTIONS,GET,POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
  next();
});

//---

// ONLY if needed - For self-signed certificate in chain - In test environment
// Must leave next line as a comment in production environment
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

//---- DeepGram ASR engine ----

const dgApiKey = process.env.DEEPGRAM_API_KEY;
const dgWsListenEndpoint = process.env.DEEPGRAM_WS_LISTEN_ENDPOINT_URL;
let dgSttDiarize = process.env.DEEPGRAM_STT_DIARIZE == "true" ? true : false;
let dgSttLanguageCode = process.env.DEEPGRAM_STT_LANGUAGE;
const dgSttModel = process.env.DEEPGRAM_STT_MODEL;
const dgSttSmartFormat = process.env.DEEPGRAM_STT_SMART_FORMAT;

//--- Websocket server (for WebSockets from Vonage Voice API platform)- Deepgram transcribe live streaming audio ---

app.ws('/socket', async (ws, req) => {

  console.log('>>> Vonage WebSocket established');

  const webhookUrl = req.query.webhook_url;
  const sessionId = req.query.session_id;
  const outboundPstn = req.query.outbound_pstn == "true" ? true : false;
  let sendAudioToDg = true;

  if (outboundPstn) {
    sendAudioToDg = false;
  }

  console.log('webhook URL:', webhookUrl);
  console.log('session ID:', sessionId);
  console.log('PSTN outbound call:', outboundPstn);

  //---

  let dgJwt = null;

  try { 
    
    const response = await axios.post('https://api.deepgram.com/v1/auth/grant',
      {
      },
      {
        headers: {
          "Authorization": 'Token ' + dgApiKey,
        }
      }
    );

    // console.log('reponse:', response)
    
    dgJwt = response.data.access_token;
    // console.log('dgJwt:', dgJwt);
  
  } catch (error) {
    
    console.log('\n>>> Failed to get a Deepgram JWT:', error);
  
  }

  //--

  if (req.query.diarize) {
    dgSttDiarize = req.query.diarize;   // ability to override to true on a per session basis (per incoming WebSocket)
  }

  //--

  if (req.query.language_code) {
    dgSttLanguageCode = req.query.language_code; // ability to override to true on a per session basis (per incoming WebSocket)
  }

  //--

  let dgWsOpen = false;

  //--

  console.log('Creating WebSocket connection to DeepGram');

  const wsDGUri = dgWsListenEndpoint + '?callback=' + webhookUrl + 
  '&diarize=' + dgSttDiarize + '&encoding=linear16&sample_rate=16000' + 
  '&language=' + dgSttLanguageCode + '&model=' + dgSttModel + '&punctuate=true' + '&endpointing=10' + 
  '&extra=session_id:' + sessionId + '&extra=language_code:' + dgSttLanguageCode;
 
  console.log('Deepgram WebSocket URI:', wsDGUri);

  const wsDG = new webSocket("wss://" + wsDGUri, {
    // "headers": {"Authorization": "Token " + dgApiKey}
    "headers": {"Authorization": "Bearer " + dgJwt}
  });

  //--

  wsDG.on('error', async (event) => {

    console.log('WebSocket to Deepgram error:', event);

  });  

  //-- 

  wsDG.on('open', () => {
      console.log('WebSocket to Deepgram opened');
      dgWsOpen = true;
  });

  //--

  wsDG.on('message', async(msg, isBinary) =>  {

    // const response = JSON.parse(msg);
    // console.log("\n", response);

    console.log("\nReceived Deegpram data:", msg);
    console.log("\nReceived Deegpram data is binary:", isBinary);

  });

  //--

  wsDG.on('close', async () => {

    dgWsOpen = false; // stop sending audio payload to Deepgram platform
    
    console.log("Deepgram WebSocket closed");
  });

  //---------------

  ws.on('message', async (msg) => {
    
    if (typeof msg === "string") {
    
      console.log("\n>>> Websocket text message:", msg);

      if (JSON.parse(msg).digit == '8') {
        sendAudioToDg = true;
        console.log('\n>>> PSTN call has been answered');
      }
    
    } else {

      if (dgWsOpen && sendAudioToDg) {
      
          wsDG.send(msg);
          // process.stdout.write(".");

      }  

    }

  });

  //--

  ws.on('close', async () => {

    dgWsOpen = false;

    wsDG.close();
    
    console.log("Vonage WebSocket closed");
  });

  //--

  console.log('>>> sendAudioToDg:', sendAudioToDg);


  if (!sendAudioToDg) {

    let timer = setInterval( () => {

      if (dgWsOpen) {
        const keepAliveMsg = JSON.stringify({ type: "KeepAlive" });
        wsDG.send(keepAliveMsg);
        // process.stdout.write(".");
      }  

      if(sendAudioToDg) {
        clearInterval(timer);
        console.log('\n>>> Stop sending keep-alive silence packets to DG STT')
      }

    }, 5000) // every 5 sec (must be a few secs under 10 sec to avoid DG STT connection time out)

  }

});

//--- If this application is hosted on VCR (Vonage Cloud Runtime) serverless infrastructure --------

app.get('/_/health', async(req, res) => {

  res.status(200).send('Ok');

});

//=========================================

const port = process.env.VCR_PORT || process.env.PORT || 6000;

app.listen(port, () => console.log(`Connector application listening on port ${port}!`));

//------------

