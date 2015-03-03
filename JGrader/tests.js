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

const signIn = function(user, pass, test, page) {
  test.assertTitle('Sign In | jGrader');
  test.assertExists('input[name="email"]');
  test.assertExists('input[name="password"]');

  page.fillSelectors('form', {
    'input[name="email"]'    : user,
    'input[name="password"]' : pass
  }, true);
};

const signOut = function() {
  casper.test.begin('Sign Out', function(test) {
    casper.start(url + 'log-out/', function() {});

    casper.then(function() {
      test.assertTitle('jGrader');
    });

    casper.run(function() {
      test.done();
    });
  });
};

casper.test.begin('Teacher Sign In', function(test) {
  casper.start(url + 'sign-in/', function() {
    signIn(creds.teacher_user, creds.teacher_pass, test, this);
  });

  casper.then(function() {
    test.assertTitle('Your Sections | jGrader');
    test.assertUrlMatch(/\/teacher\/section/);
  });

  casper.run(function() {
    test.done();
  });
});

signOut(); // don't think this is needed with our current set-up. either way, good to test.

casper.test.begin('Student Sign In', function(test) {
  casper.start(url + 'sign-in/', function() {
    signIn(creds.student_user, creds.student_pass, test, this);
  });

  casper.then(function() {
    test.assertTitle('Your Sections | jGrader');
    test.assertUrlMatch(/\/student\/section/);
  });

  casper.run(function() {
    test.done();
  });
});

