#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// Update these with values suitable for your network.
const char* ssid = "wifi name";
const char* password = "wifi password";
const char* mqtt_server = "iot.eclipse.org";
#define mqtt_port 1883
#define MQTT_USER "username"
#define MQTT_PASSWORD "password"
#define MY_ID "367"
#define MQTT_PUBLISH_CH "/ic/ha/from/esp32/"
#define MQTT_RECEIVER_CH "/ic/ha/to/esp32/367/"
#define SENSOR_READING_PERIOD 3

#define ID_MAP_LENGTH 5
#define TEMPERATURE_SENOSR_IO 32
WiFiClient wifiClient;

/*id - GPIO
 * 1 - 4
 * 2 - 5
 * 3 - 16
 * 4 - 17
 */
 /* Sensor mapping
  *  GPIO32 - ADC4 - connected to temperature sensor
  */
int iomap[ID_MAP_LENGTH]={0,4,5,16,17};

PubSubClient client(wifiClient);

void setup_wifi() {
    delay(10);
    // We start by connecting to a WiFi network
    Serial.println();
    Serial.print("Connecting to ");
    Serial.println(ssid);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    randomSeed(micros());
    Serial.println("");
    Serial.println("WiFi connected");
    Serial.println("IP address: ");
    Serial.println(WiFi.localIP());
}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Create a random client ID
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    // Attempt to connect
    if (client.connect(clientId.c_str(),MQTT_USER,MQTT_PASSWORD)) {
      Serial.println("connected");
      //Once connected, publish an announcement...
      client.publish("/icircuit/presence/ESP32/", "hello world");
      // ... and resubscribe
      client.subscribe(MQTT_RECEIVER_CH);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // Wait 5 seconds before retrying
      delay(5000);
    }
  }
}


void callback(char* topic, byte *payload, unsigned int length) {
  //print recevied messages on the serial console
    Serial.println("-------new message from broker-----");
    Serial.print("channel:");
    Serial.println(topic);
    Serial.print("data:");  
    Serial.write(payload, length);
    Serial.println();
    StaticJsonBuffer<500> jsonBuffer;
    JsonObject& message = jsonBuffer.parseObject((char *)payload);
    if (!message.success()) {
      Serial.println("JSON parse failed");  
      return;
    }
    // loop through each switch and swith IO sate
    JsonArray& switches=message["switches"];
    int i=0,id,io_status;
    for(i=0;i<switches.size();i++){
      id=switches[i]["id"];
      io_status=switches[i]["status"];
      digitalWrite(iomap[id],io_status);
    }
    
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(500);// Set time out for 
  int i=0;
  for(i=0;i<ID_MAP_LENGTH;i++){
    pinMode(iomap[i],OUTPUT);
  }
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  reconnect();
}

void publishDataToMQTT(char *data){
  if (!client.connected()) {
    reconnect();
  }
  client.publish(MQTT_PUBLISH_CH, data);
}

void sendReadings(){
      StaticJsonBuffer<90> jsonBuffer;
      String data;
      JsonObject& root = jsonBuffer.createObject();
      root["id"] = MY_ID;
      root["tSensor"] = analogRead(TEMPERATURE_SENOSR_IO);
      root["relay"] = digitalRead(iomap[1]);  
      root.printTo(Serial);  
      root.printTo(data);
      uint8_t msg[100];
      data.getBytes(msg,100);
      msg[data.length()] = 0;
      publishDataToMQTT((char *)msg);
 }
void loop() {
   int i=0;
   for(i=0;i< SENSOR_READING_PERIOD*10;i++){
    client.loop();
    delay(100);
   }
   sendReadings();
 }

