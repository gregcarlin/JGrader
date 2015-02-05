require('./common');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  var hash = req.cookies.hash;
  tryRedirect(hash, res, 'teacher', function() {
    tryRedirect(hash, res, 'student', function() {
      tryRedirect(hash, res, 'assistant', function() {
        res.render('index');
      });
    });
  });
});

router.get('/log-out', function(req, res) {
  var hash = req.cookies.hash;
  res.clearCookie('hash');
  // todo only delete from where we need to?
  connection.query("DELETE FROM `sessions-teachers` WHERE `hash` = ?", [hash]);
  connection.query("DELETE FROM `sessions-students` WHERE `hash` = ?", [hash]);
  connection.query("DELETE FROM `sessions-assistants` WHERE `hash` = ?", [hash]);
  res.redirect('/');
});

router.get('/feedback', function(req, res) {
  // we don't actually need to authenticate here, if someone's not logged in they can see the form but they'll get an error trying to submit it
  res.render('feedback');
});

router.post('/feedback', function(req, res) {
  var type = req.param('type');
  if(!type || (type != 'question' && type != 'comment' && type != 'complaint' && type != 'other')) {
    type = 'other';
  }
  getDatabase(req.cookies.hash, function(id, db) {
    if(id) {
      connection.query("SELECT `user`,`fname`,`lname` FROM `" + db + "` WHERE `id` = ?", [id], function(err, result) {
        if(err && debug) throw err;

        connection.query("INSERT INTO `feedback` VALUES(NULL, ?, ?, ?, ?, ?, ?, ?)", [result[0].user, result[0].fname, result[0].lname, db.substring(0, db.length - 1), req.headers['user-agent'], type, req.param('feedback')], function(err) {
          if(err && debug) throw err;
          res.render('feedback', {success: 'Thank you for your feedback!'});
        });
      });
    } else {
      res.render('feedback', {error: 'You must be logged in to submit feedback.'});
    }
  });
});

// if hash is set to a valid user in the given db they are redirected to that section, otherwise finish is called.
var tryRedirect = function(hash, res, db, finish) {
  logIn(hash, db + 's', function(id) {
    if(id) {
      res.redirect('/' + db);
    } else {
      finish();
    }
  });
}

var gitUpdate = function(req, res) {
  exec('git pull', {}, function(error, stdout, stderr) {
    res.json({stdout: stdout, stderr: stderr});
  });
}

router.get('/git-update', gitUpdate);
router.post('/git-update', gitUpdate);

module.exports = router;
