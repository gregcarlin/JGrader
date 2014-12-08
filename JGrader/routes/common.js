express = require('express');
creds   = require('./credentials');
// router must be required separately otherwise routers will interfere with each other

mysql      = require('mysql');
connection = mysql.createConnection({
  host     : creds.mysql_host,
  port     : creds.mysql_port,
  database : creds.mysql_db,
  user     : creds.mysql_user,
  password : creds.mysql_pass,
  multipleStatements: true
});
connection.connect(); // we should probably close this at some point [connection.end()]

var renderGeneric = function(page, vars, group, res) {
  express().render(page + '.ejs', vars, function(err, html) {
    if(err) {
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

// attempt to authenticate user. calls finish(id) if id is found, otherwise redirects user to landing page.
var authenticate = function(hash, res, db, finish) {
  logIn(hash, db, function(id) {
    if(id) {
      finish(id);
    } else {
      res.redirect('/');
    }
  });
}

authTeacher = function(hash, res, finish) {
  authenticate(hash, res, 'teachers', finish);
}

authStudent = function(hash, res, finish) {
  authenticate(hash, res, 'students', finish);
}

authTA = function(hash, res, finish) {
  authenticate(hash, res, 'assistants', finish);
}

// modules.exports not required because everything is global
