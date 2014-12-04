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

// convert a hash to a user id
var authenticate = function(hash, res, db, finish) {
  if(hash) {
    connection.query("SELECT `id` FROM `sessions-" + db + "` WHERE `hash` = ?", [hash], function(err, rows) {
      if(err || rows.length <= 0) {
        res.redirect('/');
      } else {
        finish(rows[0].id);
      }
    });
  } else {
    res.redirect('/');
  }
}

authTeacher = function(hash, res, finish) {
  authenticate(hash, res, 'teachers', finish);
}

authStudent = function(hash, res, finish) {
  authenticate(hash, res, 'students', finish);
}

// modules.exports not required because everything is global