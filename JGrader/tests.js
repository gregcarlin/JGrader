const url = 'http://127.0.0.1:3000/';
const creds = require('./routes/credentials');

casper.test.begin('Homepage and Failed Sign In', function(test) {
  casper.start(url, function() {
    test.assertTitle('jGrader');
    test.assertExists('input[name="email"]');
    test.assertExists('input[name="password"]');

    this.fillSelectors('form', { // only form on the page
      'input[name="email"]'    : 'test71@test.com',
      'input[name="password"]' : 'incorrect'
    }, true); // true means submit form
  });

  casper.then(function() {
    test.assertTitle('Sign In | jGrader');
    test.assertExists('div.alert-danger');
    test.assertSelectorHasText('div.alert-danger', 'Incorrect email or password.');
  });

  casper.run(function() {
    test.done();
  });
});

casper.test.begin('Teacher Sign In', function(test) {
  casper.start(url + 'sign-in/', function() {
    test.assertTitle('Sign In | jGrader');
    test.assertExists('input[name="email"]');
    test.assertExists('input[name="password"]');

    this.fillSelectors('form', {
      'input[name="email"]'    : creds.teacher_user,
      'input[name="password"]' : creds.teacher_pass
    }, true);
  });

  casper.then(function() {
    test.assertTitle('Your Sections | jGrader');
  });

  casper.run(function() {
    test.done();
  });
});

