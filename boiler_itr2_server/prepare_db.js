var mongoose = require('mongoose');
var winston = require('winston');
var config=require('./config');
const Boiler = require('./models/boiler')

async function preparedb(){
    let boiler = await Boiler.findOne({id:"367"})    
    if(!boiler){
        boiler = new Boiler({id:367,name:"Boiler NC1",setpoint:{hc:30,lc:20},autoDecision:true})
        await boiler.save()
    }
    console.log('setup complted, press ctrl+c to terminate')
}

mongoose.connect(config.mongodb,{ server: { reconnectTries: Number.MAX_VALUE } }, function(err) {
    if(err) {
         winston.log('info', 'Couldnt connect to MongoDB:',err);
    } else {
        winston.log('info', 'Connected to MongoDB');
        preparedb()
    }
});
