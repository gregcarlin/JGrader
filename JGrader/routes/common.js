// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

express = require('express');
creds   = require('./credentials');
// router must be required separately otherwise routers will interfere with each other

async = require('async');
var crypto = require('crypto');
var mailgun = require('mailgun-js')({
  apiKey: creds.mailgun_key,
  domain: 'jgrader.com'
});

mysql      = require('mysql');
connection = mysql.createPool({
  connectionLimit    : 10,
  host               : process.env.SQL_HOST || creds.mysql_host,
  port               : process.env.SQL_PORT || creds.mysql_port,
  database           : process.env.SQL_DB || creds.mysql_db,
  user               : process.env.SQL_USER || creds.mysql_user,
  password           : process.env.SQL_PASS || creds.mysql_pass,
  multipleStatements : true
});

process.on('SIGINT', function() { // on ^C
  connection.end(function(err) { // close mysql connection
    process.exit(); // also do normal exit stuff
  });
});

var renderGeneric = function(page, vars, group, res) {
  express().render(page + '.ejs', vars, function(err, html) {
    if (err) {
      console.log(err);
    } else {
      vars.content = html;
      res.render(group + '/genericDashboard', vars);
    }
  });
}

renderGenericTeacher = function(page, vars, res) {
  renderGeneric('teacher/' + page, vars, 'teacher', res);
}

renderGenericStudent = function(page, vars, res) {
  renderGeneric('student/' + page, vars, 'student', res);
}

// convert a hash to a user id. calls finish(id) when done. id is null if log in fails (due to error or incorrect data).
logIn = function(hash, db, finish) {
  if(hash) {
    connection.query("SELECT `id` FROM `sessions-" + db + "` WHERE `hash` = ?", [hash], function(err, rows) {
      if(err || rows.length <= 0) {
        finish(null);
      } else {
        finish(rows[0].id);
      }
    });
  } else {
    finish(null);
  }
}

// attempt to authenticate user. calls finish(id, mustResetPass) if id is found, otherwise redirects user to sign in page.
// mustResetPass is a flag to indicate whether or not a message should be displayed asking the user to reset his or her password.
var authenticate = function(hash, req, res, next, db, finish) {
  logIn(hash, db, function(id) {
    if(id) {
      connection.query("SELECT `pass_reset_hash` FROM `" + db + "` WHERE `id` = ?", [id], function(err, rows) {
        if (err) {
          res.redirect('/sign-in?error=There was an error authenticating your information. Please sign in again.&redirect=' + req.originalUrl);
          err.handled = true;
          return next(err);
        }

        if (rows.length <= 0) {
          res.redirect('/sign-in?error=There was an error authenticating your information. Please sign in again.&redirect=' + req.originalUrl);
        } else {
          finish(id, rows[0].pass_reset_hash == null ? false : true);
        }
      });
    } else {
      res.redirect('/sign-in?error=There was an error authenticating your information. Please sign in again.&redirect=' + req.originalUrl);
    }
  });
}

authTeacher = function(hash, req, res, next, finish) {
  authenticate(hash, req, res, next, 'teachers', finish);
}

authStudent = function(hash, req, res, next, finish) {
  authenticate(hash, req, res, next, 'students', finish);
}

authTA = function(hash, req, res, next, finish) {
  authenticate(hash, req, res, next, 'assistants', finish);
}

// retrieves the first and last names of a user
var getInfo = function(id, db, finish) {
  connection.query("SELECT `fname`,`lname` FROM `" + db + "` WHERE `id` = ?", [id], function(err, rows) {
    if (err) {
      finish(null, null);
    } else {
      finish(rows[0].fname, rows[0].lname);
    }
  });
}

getInfoTeacher = function(id, finish) {
  getInfo(id, 'teachers', finish);
}

getInfoStudent = function(id, finish) {
  getInfo(id, 'students', finish);
}

getInfoTA = function(id, finish) {
  getInfo(id, 'assistants', finish);
}

// checks to see if a parameter is set and its length is greater than 0
isSet = function(param) {
  return param && param.length > 0;
}

// finds out which database hash is logged into.
// note: may be an issue if hash appears in more than one sessions table.
// calls finish(id, name-of-db) when done, finish(null, null) if db not found.
getDatabase = function(hash, finish) {
  logIn(hash, 'students', function(id) {
    if(id) {
      finish(id, 'students');
    } else {
      logIn(hash, 'teachers', function(id) {
        if(id) {
          finish(id, 'teachers');
        } else {
          logIn(hash, 'assistants', function(id) {
            if(id) {
              finish(id, 'assistants');
            } else {
              finish(null, null);
            }
          });
        }
      });
    }
  });
}

// http://stackoverflow.com/questions/646628/how-to-check-if-a-string-startswith-another-string
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}

signIn = function(dbType, userID, res, finish) {
  var hash = crypto.randomBytes(20).toString('hex'); // http://stackoverflow.com/a/14869745/720889
  res.cookie('hash', hash);
  var db = 'sessions-' + dbType;
  connection.query('INSERT INTO ?? VALUES(?, ?)', [db, userID, hash], finish);
};

var plainMimePrefixes = ['text'];
var plainMimes = ['application/octet-stream'];
isAscii = function(mime) {
  for(i in plainMimePrefixes) {
    if(mime.startsWith(plainMimePrefixes[i] + '/')) return true;
  }
  for(i in plainMimes) {
    if(plainMimes[i] == mime) return true;
  }
  return false;
};

transporter = {
  sendMail: function(options, callback) {
    options.from = options.from || 'no-reply@jgrader.com';
    options.to = options.to || 'contact@jgrader.com';
    mailgun.messages().send(options, callback);
  }
};

// modules.exports not required because everything needed is global
