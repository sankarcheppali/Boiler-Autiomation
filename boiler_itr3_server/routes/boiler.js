const express = require('express');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise
const router = express.Router();
const winston = require('winston');
const Boiler = require('../models/boiler')
const mq = require('../mq')
router.post('/add',async (req,res,next)=>{
    let {id,setpoint,name,description} = req.body
    let boiler = new Boiler({id,setpoint,name,description})
    await boiler.save()
    winston.log('info',`new boiler with id ${id} is added`)
    return res.json({success:true,boiler})
})

router.post('/update',async (req,res,next)=>{
    let {id,setpoint} = req.body
    let boiler = await Boiler.findOne({id})
    if(boiler){
        boiler.setpoint = setpoint
        winston.log('info',`boiler updated with new setpoints ${setpoint}`)
        let hc = Math.round((setpoint.hc* 10)*(3300/4096))
        let lc = Math.round((setpoint.lc* 10)*(3300/4096))
        mq.publishToDevice(id,{setpoint:{hc,lc}})
        await boiler.save()
        return res.json({success:true,boiler})
    }else{
        winston.log('error',`could not find any boiler with id ${id}`)
        return res.json({success:false,message:'could not find boiler with given id'})
    }
})

module.exports = router