var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

router.post('/login', function(req, res){
  res.render('index', { title: 'Post Test'} );
});

module.exports = router;
