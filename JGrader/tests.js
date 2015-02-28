casper.test.begin('Homepage', function(test) {
  casper.start('http://127.0.0.1:3000', function() {
    test.assertTitle('jGrader');
    test.assertExists('input[name="email"]');
    test.assertExists('input[name="password"]');

    this.fillSelectors('form', {
      'input[name="email"]' : 'test71@test.com',
      'input[name="password"]' : 'incorrect'
    }, true);
  });

  casper.then(function() {
    test.assertTitle('Sign In | jGrader');
    test.assertExists('div.alert-danger');
    test.assertSelectorHasText('div.alert-danger', 'Incorrect');
  });

  casper.run(function() {
    test.done();
  });
});

