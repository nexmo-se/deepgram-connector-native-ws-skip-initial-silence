# Deepgram ASR Connector - Direct WebSocket Real-Time Audio Streaming - Skip initial silence

You can use this Connector code to send audio from a Vonage API voice call to Deepgram Speech-to-Text (STT) engine for real-time transcription via WebSocket without using a Deepgram npm library.

It also avoids transmitting the silence audio packets to Deepgram until PSTN callee has answered the PSTN outbound call.

## About this Connector code

This connector makes use of the WebSockets feature of [Vonage Voice API](https://developer.vonage.com/en/voice/voice-api/concepts/websockets).

When a voice call is established, the peer Voice API application triggers a WebSocket connection to this Connector then streams the audio from the voice call in real time. 

See https://github.com/nexmo-se/outbound-pstn-with-websocket-app as **the peer Voice API application** using this Connector code to stream audio from voice calls in real-time to Deepgram STT engine.

## Transcripts

Speech transcripts are directly posted via webhooks to the URL specified by the Voice API when creating the WebSocket to this connector.

## Set up

### Get your credentials from Deepgram

Sign up with or log in to [Deepgram](https://deepgram.com/).</br>

Create or use an existing Deepgram API key,
take note of it (as it will be needed as **`DEEPGRAM_API_KEY`** in the next section).</br>

### Local deployment

For a `local deployment`, you may use ngrok (an Internet tunneling service) for both this Connector application and the [Voice API application](https://github.com/nexmo-se/voice-to-ai-engines) with [multiple ngrok tunnels](https://ngrok.com/docs/agent/config/v2/#tunnel-configurations).

To do that, [download and install ngrok](https://ngrok.com/download).</br>
Sign in or sign up with [ngrok](https://ngrok.com/), from the ngrok web UI menu, follow the **Setup and Installation** guide.

Set up two domains, one to forward to the local port 6000 (as this Connector application will be listening on port 6000), the other one to the local port 8000 for the [Voice API application](https://github.com/nexmo-se/voice-to-ai-engines).

Start ngrok to start both tunnels that forward to local ports 6000 and 8000, e.g.<br>
`ngrok start httpbin demo` (per this [sample yaml configuration file](https://ngrok.com/docs/agent/config/v2/#define-two-tunnels-named-httpbin-and-demo), but needs port 6000 and 8000 as actual values)

please take note of the ngrok **Enpoint URL** that forwards to local port 6000 as it will be needed when setting the [Voice API application](https://github.com/nexmo-se/voice-to-ai-engines),
that URL looks like:</br>
`xxxxxxxx.ngrok.xxx` (for ngrok), or `myserver.mycompany.com:32000`<br>
(as **`PROCESSOR_SERVER`** in one of the next sections),<br>
no `port` is necessary with ngrok as public host name,<br>
that host name to specify must not have leading protocol text such as `https://`, `wss://`, nor trailing `/`.

Copy the `.env.example` file over to a new file called `.env`:
```bash
cp .env.example .env
```

Update the value of parameter **`DEEPGRAM_API_KEY`** in the .env file<br>

Depending on your use case, you may update the other paramaters in the .env file.

For example, to use Deepgram Nova-3 Medical model, set<br>
**`DEEPGRAM_ASR_MODEL`** to **`nova-3-medical`**.

Have Node.js installed on your system, this application has been tested with Node.js version 22.16.<br>

Install node modules with the command:<br>
 ```bash
npm install
```

Launch the application:<br>
```bash
node deepgram-connector
```

Default local (not public!) of this application server `port` is: 8000.

### Voice API application

Set up the peer Voice API application per the instructions in its [repository](https://github.com/nexmo-se/outbound-pstn-with-websocket-app).

Call out a phone from that application to have the call transcribed by Deepgram STT (Speech-to-Text) engine.






