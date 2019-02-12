var mongoose = require('mongoose');
var schema = mongoose.Schema({
  id:String,
  name:String,
  description:String,
  setpoint:{
      hc:Number,
      lc:Number
  },
  readings:[{}],
  autoDecision:Boolean,
});
var model=mongoose.model('boiler',schema);
module.exports=model;