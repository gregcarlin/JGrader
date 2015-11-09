// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var express      = require('express');
var path         = require('path');
var favicon      = require('serve-favicon');
var logger       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var useragent    = require('express-useragent');
var compression  = require('compression');
var minify       = require('express-minify');

var index   = require('./routes/index');
var signIn  = require('./routes/sign-in');
var signUp  = require('./routes/sign-up');
var teacher = require('./routes/teacher');
var student = require('./routes/student');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json({
  verify: function(req, res, buf, encoding) {
    req.rawBody = buf.toString();
  }
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(minify());
app.use(express.static(path.join(__dirname, 'public'), {maxAge: 21600000})); // 6-hr cache
app.use(useragent.express());

// alert users with unsupported browsers/devices
app.use(function(req, res, next) {
  var ua = req.useragent;
  var nosupport = true;

  if (ua) {
    ua.isiOS = ua.isiPad || ua.isiPod || ua.isiPhone;
    ua.Version = ua.Version || ua.version;
    ua.majorVersion = ua.Version ?
                        (typeof ua.Version == "number" ?
                          ua.Version :
                          parseInt(ua.Version
                                   .substring(0, ua.Version.indexOf('.')))
                        ) :
                        Number.NaN;

    var nosupport = ua.isOpera && (ua.isAndroid || ua.isiOS);
    nosupport = nosupport || (ua.isSafari && ua.isWindows);
    nosupport = nosupport ||
                (isNaN(ua.majorVersion) || (ua.isIE && ua.majorVersion <= 8));
  }

  res.locals.nosupport = nosupport;

  next();
});

// takes post variables success and error (in url query) and passes them to ejs for rendering
app.use(function(req, res, next) {
  if (req.query.error) res.locals.error = req.query.error;
  if (req.query.success) res.locals.success = req.query.success;
  next();
});

app.use('/', index);
app.use('/sign-in', signIn);
app.use('/sign-up', signUp);
app.use('/teacher', teacher);
app.use('/student', student);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  if (err.userMessage) return; // user error, no need to report

  console.error(err);
  console.error(err.stack);
  if (!err.handled) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  }
});

module.exports = app;
