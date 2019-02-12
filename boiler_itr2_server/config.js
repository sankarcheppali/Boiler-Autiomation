var config = {
    mongodb: "mongodb://localhost:27017/boiler",
    waport:4083,
    wsport:4084,
    mqttOptions:{   
	    host:"iot.eclipse.org",
        port: 1883,
        username:"",
        password:""
     },
    BOILER_READINGS_CHN:'/ic/ha/from/esp32/',
    AUTO_DECISION:true,
    getReceiverChnlForBoiler:(id)=>`/ic/ha/to/esp32/${id}/`,
};

module.exports = config;