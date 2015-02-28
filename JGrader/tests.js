//var page = require('webpage').create();

casper.test.begin('Homepage', 1, function(test) {
  //page.open('http://127.0.0.1:3000', function(status) {
  casper.start('http://127.0.0.1:3000', function() {
    test.assertTitle('jGrader');
  });

  casper.run(function() {
    test.done();
  });
});

