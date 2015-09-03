const creds = require('../credentials');
const url   = creds.url;
const fs    = require('fs');

// start with some helpful methods for later

// sign in with a given username and password
const signIn = function(user, pass, test, page) {
  test.assertTitle('Sign In | jGrader');
  test.assertExists('input[name="email"]');
  test.assertExists('input[name="password"]');

  page.fillSelectors('form', {
    'input[name="email"]'    : user,
    'input[name="password"]' : pass
  }, true);
};

// a test that only asserts the title of the page. name = test name, path = url path (after base url), title = what page title should be
const testTitle = function(name, path, title) {
  casper.test.begin(name, function(test) {
    casper.start(url + path, function() {
      test.assertTitle(title);
    });

    casper.run(function() {
      test.done();
    });
  });
};

// a test that only asserts that the page loaded with a 200 status code. name = test name, path = url path (after base url)
const testLoad = function(name, path) {
  casper.test.begin(name, function(test) {
    casper.start(url + path, function() {
      test.assertHttpStatus(200);
    });

    casper.run(function() {
      test.done();
    });
  });
};

casper.test.begin('Homepage and Failed Sign In', function(test) {
  casper.start(url, function() {
    test.assertTitle('jGrader | A Cloud-Based Grading System for AP Computer Science');
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
    signIn(creds.teacher_user, creds.teacher_pass, test, this);
  });

  casper.then(function() {
    test.assertTitle('Your Classes | jGrader');
    test.assertUrlMatch(/\/teacher\/section/);
  });

  casper.run(function() {
    test.done();
  });
});

testTitle('Teacher Class List', 'teacher/section', 'Your Classes | jGrader');
// there is no csv for section list
testTitle('Teacher Assignment List', 'teacher/assignment', 'Your Assignments | jGrader');
testLoad('Teacher Assignment List CSV', 'teacher/assignment.csv');
testTitle('Teacher Student List', 'teacher/student', 'Your Students | jGrader');
testLoad('Teacher Student List CSV', 'teacher/student.csv');

// don't think this is needed with our current set-up. either way, good to test.
casper.test.begin('Sign Out', function(test) {
  casper.start(url + 'log-out/', function() {});

  casper.then(function() {
    test.assertTitle('jGrader | A Cloud-Based Grading System for AP Computer Science');
  });

  casper.run(function() {
    test.done();
  });
});

casper.test.begin('Student Sign In', function(test) {
  casper.start(url + 'sign-in/', function() {
    signIn(creds.student_user, creds.student_pass, test, this);
  });

  casper.then(function() {
    test.assertTitle('Your Classes | jGrader');
    test.assertUrlMatch(/\/student\/section/);
  });

  casper.run(function() {
    test.done();
  });
});

testTitle('Student Class List', 'student/section', 'Your Classes | jGrader');
testTitle('Student Assignment List', 'student/assignment', 'Your Assignments | jGrader');

const submitFiles = function(test, files) {
  casper.start(url + 'student/assignment/34?forceFallback=true', function() {
    var paths = [];
    for (var i=0; i<files.length; i++) {
      paths.push('./test_files/' + files[i]);
    }
    this.page.uploadFile('input[type="file"]', paths);
    this.click('input[type="submit"]');
  });
  
  casper.then(function() {
    test.assertTitle('AssignmentA | jGrader');
    this.each(this.getElementsInfo('.alert-warning'), function(self, item) {
      // this is the only allowed warning
      test.assert(item.text.indexOf('Your browser is not supported. Consider upgrading to a newer one.') > -1);
    });
    var tabs = this.getElementsInfo('.nav-tabs li[role="presentation"]');
    test.assertEquals(tabs.length, files.length);
    for (var i=0; i<tabs.length; i++) {
      test.assertEquals(tabs[i].text, files[i]);
    }
  });

  casper.then(function() {
    this.click('#resubmit');
    this.click('.btn-danger');
    this.wait(1000);
  });

  casper.then(function() {
    test.assertExists('#student-upload');
  });

  casper.run(function() {
    test.done();
  });
};

casper.test.begin('Simple Submission', function(test) {
  submitFiles(test, ['Hello.java']);
});

casper.test.begin('Two File Submission', function(test) {
  submitFiles(test, ['DependA.java', 'DependB.java']);
});
