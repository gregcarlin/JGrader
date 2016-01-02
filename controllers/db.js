// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var mysql = require('mysql');

var creds = require('../util/credentials');
if (process.env.MODE === 'TEST' && creds.mysql_db !== 'Jgrader-test') {
  console.log('MODE IS TEST BUT DB IS NOT TEST. ABORTING.');
  throw new Error('MODE IS TEST BUT DB MAY BE LIVE');
  return;
}

var db = process.env.DB_MODE === 'local';
var connection = mysql.createPool({
  connectionLimit    : 10,
  host               : process.env.SQL_HOST || (db ? '127.0.0.1' : creds.mysql_host),
  port               : process.env.SQL_PORT || (db ? 3306 : creds.mysql_port),
  database           : process.env.SQL_DB || creds.mysql_db,
  user               : process.env.SQL_USER || (db ? 'root' : creds.mysql_user),
  password           : process.env.SQL_PASS || (db ? '' : creds.mysql_pass),
  multipleStatements : true
});

process.on('SIGINT', function() { // on ^C
  connection.end(function(err) { // close mysql connection
    process.exit(); // also do normal exit stuff
  });
});

module.exports = connection;
