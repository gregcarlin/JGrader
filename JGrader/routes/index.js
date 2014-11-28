var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

router.post('/', function(req, res) {
  var email = req.param('email');
  var pass = req.param('password');
  if(email && pass) {
    // todo authenticate and redirect
    
  } else {
    res.render('index', { title: 'Express', error: 'All fields are required.', email: email });
  }
});

module.exports = router;
