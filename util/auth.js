var crypto = require('crypto');

var db = require('../controllers/db');

// convert a hash to a user id. calls finish(id) when done. id is null if log in fails (due to error or incorrect data).
var logIn = module.exports.logIn = function(hash, dbName, finish) {
  if (hash) {
    db.query("SELECT `id` FROM `sessions-" + dbName + "` \
              WHERE `hash` = ?", [hash], function(err, rows) {
      if (err || rows.length <= 0) {
        finish(null);
      } else {
        finish(rows[0].id);
      }
    });
  } else {
    finish(null);
  }
};

// finds out which database hash is logged into.
// note: may be an issue if hash appears in more than one sessions table.
// calls finish(id, name-of-db) when done, finish(null, null) if db not found.
/*module.exports.getDatabase = function(hash, finish) {
  logIn(hash, 'students', function(id) {
    if (id) {
      finish(id, 'students');
    } else {
      logIn(hash, 'teachers', function(id) {
        if (id) {
          finish(id, 'teachers');
        } else {
          logIn(hash, 'assistants', function(id) {
            if (id) {
              finish(id, 'assistants');
            } else {
              finish(null, null);
            }
          });
        }
      });
    }
  });
};*/

// attempt to authenticate user. calls finish(id, mustResetPass) if id is found, otherwise redirects user to sign in page.
// mustResetPass is a flag to indicate whether or not a message should be displayed asking the user to reset his or her password.
var authenticate = function(hash, req, res, next, dbName, finish) {
  logIn(hash, dbName, function(id) {
    if (id) {
      db.query("SELECT `pass_reset_hash` FROM `" + dbName + "` \
                WHERE `id` = ?", [id], function(err, rows) {
        if (err) {
          res.redirect('/sign-in?' +
                      'error=' +
                      'There was an error authenticating your information.' +
                      ' Please sign in again.&redirect=' + req.originalUrl);
          err.handled = true;
          return next(err);
        }

        if (rows.length <= 0) {
          res.redirect('/sign-in?' +
                      'error=' +
                      'There was an error authenticating your information.' +
                      ' Please sign in again.&redirect=' + req.originalUrl);
        } else {
          finish(id, rows[0].pass_reset_hash == null ? false : true);
        }
      });
    } else {
      res.redirect('/sign-in?' +
                   'error=There was an error authenticating your information.' +
                   ' Please sign in again.&redirect=' + req.originalUrl);
    }
  });
};

module.exports.authTeacher = function(hash, req, res, next, finish) {
  authenticate(hash, req, res, next, 'teachers', finish);
};

module.exports.authStudent = function(hash, req, res, next, finish) {
  authenticate(hash, req, res, next, 'students', finish);
};

module.exports.authTA = function(hash, req, res, next, finish) {
  authenticate(hash, req, res, next, 'assistants', finish);
};

module.exports.signIn = function(dbType, userID, res, finish) {
  var hash = crypto.randomBytes(20).toString('hex'); // http://stackoverflow.com/a/14869745/720889
  res.cookie('hash', hash);
  var dbName = 'sessions-' + dbType;
  db.query('INSERT INTO ?? VALUES(?, ?)', [dbName, userID, hash], finish);
};
