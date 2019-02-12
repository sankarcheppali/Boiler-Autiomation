var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var helmet = require('helmet');
var validator = require('express-validator');
var app = express();
var winston = require('winston');
var config=require('./config');
winston.add(winston.transports.File, { filename: 'applog.log' });
var fs = require('fs');
var FileStreamRotator = require('file-stream-rotator');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
var logDirectory = path.join(__dirname, 'log')

// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
// create a rotating write stream
var accessLogStream = FileStreamRotator.getStream({
  date_format: 'YYYYMMDD',
  filename: path.join(logDirectory, 'access-%DATE%.log'),
  frequency: 'daily',
  verbose: false
});
app.use(helmet());
app.use(morgan('combined', {stream: accessLogStream}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(validator());
app.use(cookieParser());
app.use('/', express.static(__dirname + '/public'));
let mq = require('./mq')
let boiler = require('./routes/boiler')
app.use('/boiler',boiler)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    winston.log('error',err);  
    res.json({'success':false,'message': err});
});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  winston.log('error',err);  
  res.json({'success':false,'message': err});
});

mongoose.connect(config.mongodb,{ server: { reconnectTries: Number.MAX_VALUE } }, function(err) {
    if(err) {
         winston.log('info', 'Couldnt connect to MongoDB:',err);
    } else {
        winston.log('info', 'Connected to MongoDB');
    }
});

module.exports = app;



