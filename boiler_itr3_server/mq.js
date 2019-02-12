/*
maintains MQTT connection , that can be used by other modules

this should abstract the underlying messaging protocol
*/
var winston = require('winston');
var mqtt = require('mqtt');
var config=require('./config');
var mqOptions = config.mqttOptions;
var mqclient  = mqtt.connect(mqOptions);
let Boiler = require('./models/boiler')
var WebSocketServer = require('ws').Server
, wss = new WebSocketServer({ port: config.wsport });
var winston = require('winston');
winston.log('info','websocket on port '+config.wsport);

mqclient.on('connect', function () {
    winston.log('info','Connected to MQTT');
    mqclient.subscribe(config.BOILER_READINGS_CHN);
});
 
mqclient.on('message', function (topic, message) {
    winston.log('info','Topic : '+topic+',message:'+message.toString());
    if(topic == config.BOILER_READINGS_CHN){
       message = JSON.parse(message.toString())
       processBoilerMsg(message)
    } 
});
async function processBoilerMsg(message){
    let {id,tSensor,relay} = message
    let boiler = await Boiler.findOne({id})
    if(!boiler){
        winston.log('error',`could not find boiler with id ${id}`)
        return
    }
    if(boiler.readings){
        boiler.readings.push({tSensor,relay,timestamp:new Date()})
        await boiler.save()
    }else{
        boiler.readings = [{tSensor,relay,timestamp:new Date()}]
        await boiler.save()
    }
    let update = {id,setpoint:boiler.setpoint,tSensor,relay}
    sendUpdateToWSClients(update)
}
function publish(chnl,payload){
    var sp=JSON.stringify(payload)
    winston.log('info','publishg '+sp+' to chnl'+chnl);
    mqclient.publish(chnl,sp);
}
function publishToDevice(id,payload){
    let chnl = config.getReceiverChnlForBoiler(id)
    publish(chnl,payload)
}

let activeClients = {}
wss.on('connection', function connection(ws) {
	winston.log('info','new connection on ws');
    ws.json= function(data){
        ws.send(JSON.stringify(data));
    }
    ws.on('message', function incoming(message) {
        let {requestType,id} = JSON.parse(message)
        if(requestType == 'monitor'){
            activeClients[id] = ws
        }
  });
});

function sendUpdateToWSClients(update){
    let {id} = update
    if(activeClients[id]){
        activeClients[id].json(update)
    }
}

module.exports={publish:publish,publishToDevice};

