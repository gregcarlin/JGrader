require('./common');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'JGrader' });
});

module.exports = router;