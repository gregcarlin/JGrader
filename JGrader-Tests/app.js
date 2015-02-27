// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

const Browser = require('zombie');
const assert  = require('assert');

Browser.localhost('jgrader.com', 3000);

const browser = new Browser();
//browser.visit();

//module.exports = app;
