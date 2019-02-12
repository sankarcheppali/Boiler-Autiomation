#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#define EEPROM_SIZE 128
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
int EEPROM_HC_ADDR=0,EEPROM_LC_ADDR=30;
volatile int updateSetpoint = 0;
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
float hc=30,lc=20;
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

void printSetpoint(float hc,float lc){
      Serial.println("setpoints");
      Serial.print("hc:");
      Serial.print(hc,2);
      Serial.print(" lc:");
      Serial.println(lc,2);  
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
    if(message.containsKey("switches")){
      Serial.println("updating switches");
      JsonArray& switches=message["switches"];
      int i=0,id,io_status;
      for(i=0;i<switches.size();i++){
        id=switches[i]["id"];
        io_status=switches[i]["status"];
        digitalWrite(iomap[id],io_status);
      }
    }
    if(message.containsKey("setpoint")){
      hc = message["setpoint"]["hc"];
      lc = message["setpoint"]["lc"];
      Serial.println("new setpoint available");
      printSetpoint(hc,lc);
      EEPROM.writeFloat(EEPROM_HC_ADDR, hc);
     EEPROM.writeFloat(EEPROM_LC_ADDR, lc);
     Serial.println("updated eeprom");
     EEPROM.commit();
    }
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(500);// Set time out for 
  if (!EEPROM.begin(EEPROM_SIZE)) {
    Serial.println("Failed to initialise EEPROM");
    Serial.println("Restarting...");
    delay(1000);
    ESP.restart();
  }
  
   hc = EEPROM.readFloat(EEPROM_HC_ADDR);
  if(hc>1000){
    hc = 30;
  }
  lc = EEPROM.readFloat(EEPROM_LC_ADDR);
  if(lc > 1000){
    lc = 20;
  }
  printSetpoint(hc,lc);
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
      int t = analogRead(TEMPERATURE_SENOSR_IO);
      root["tSensor"] = t;
      root["relay"] = digitalRead(iomap[1]);  
      root.printTo(Serial);  
      root.printTo(data);
      uint8_t msg[100];
      data.getBytes(msg,100);
      msg[data.length()] = 0;
      publishDataToMQTT((char *)msg);
      if(t > hc && digitalRead(iomap[1])){
         // switch off
         Serial.println("Switch off boiler");
         digitalWrite(iomap[1],false);
      }else if (t < lc && !digitalRead(iomap[1])){
         // switch on
         Serial.println("Switch on boiler");
         digitalWrite(iomap[1],true);
      }
 }
void loop() {
   int i=0;
   for(i=0;i< SENSOR_READING_PERIOD*10;i++){
    client.loop();
    delay(100);
   }
   sendReadings();
   
 }
