// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

express = require('express');
creds   = require('../util/credentials');
queries = require('../queries/queries');
// router must be required separately otherwise routers will interfere with each other

//var db = require('../controllers/db');

var renderGeneric = function(page, vars, group, res) {
  express().render(page + '.ejs', vars, function(err, html) {
    if (err) {
      console.log(err);
    } else {
      vars.content = html;
      res.render(group + '/genericDashboard', vars);
    }
  });
};

renderGenericTeacher = function(page, vars, res) {
  renderGeneric('teacher/' + page, vars, 'teacher', res);
};

renderGenericStudent = function(page, vars, res) {
  renderGeneric('student/' + page, vars, 'student', res);
};

// modules.exports not required because everything needed is global
