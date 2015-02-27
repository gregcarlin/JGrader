// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

const Browser = require('zombie');
const assert  = require('assert');

Browser.localhost('jgrader.com', 3000);

const browser = new Browser();
browser.visit('/sign-in', function(error) {
  assert.ifError(error);

  browser.fill('input[name="email"]', 'test71@test.com');
  browser.fill('input[name="password"]', 'test');
  browser.pressButton('button[type="submit"]', function(error) {
    assert.ifError(error);

    browser.assert.success();
    browser.assert.text('title','Your Sections | JGrader');
  });
});

