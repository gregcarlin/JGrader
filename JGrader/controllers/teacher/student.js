// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

var async = require('async');

require('../../routes/common');

module.exports.invite = function(sectionIds, teacherId, emails, callback) {
  connection.query("SELECT `fname`,`lname` FROM `teachers` \
                    WHERE `id` = ?", [teacherId], function(err, result) {
    if (err || !result || result.length <= 0) {
      return callback(err || new Error());
    }

    connection.query("SELECT `id`,`name`,`code` FROM `sections` \
                      WHERE `teacher_id` = ?",
                      [teacherId], function(err, mySections) {
      if (err) return callback(err);

      var links = '';
      for (var i in sectionIds) {
        for (var j = 0; j < mySections.length; j++) {
          if (mySections[j].id == sectionIds[i]) {
            links += '<a href="http://jgrader.com/';
            links += 'student/section/joinSection/';
            links += mySections[j].code + '">';
            links += mySections[j].name + '</a><br />';
            break;
          }
        }
      }
      if (links.length <= 2) {
        var err = new Error();
        err.jgCode = 3;
        return callback(err);
      }

      var parsedEmails = emails.split(/[ ;(\r\n|\n|\r)]/);
      async.map(parsedEmails, function(email, cb) {
        if (email.indexOf('@') > 0) { // @ can't be first character (or last but we don't bother checking for that)
          var html = 'Your teacher, ' + result[0].fname + ' ' +
                      result[0].lname +
                      ' has invited you to join his or her class ' +
                      'on jGrader, the tool for collecting computer ' +
                      'science assignments in the cloud. ';
          html += 'In order to accept these invitations, ' +
                  'please click the link or links below.<br />';
          html += links;
          var mailOptions = {
            to: email,
            subject: result[0].fname + ' ' + result[0].lname +
                      ' has invited you to jGrader',
            html: html
          };
          transporter.sendMail(mailOptions, function(err, info) {
            cb(err, email);
          });
        } else {
          cb();
        }
      }, function(err, sentEmails) {
        if (err) return callback(err);
        var sent = sentEmails.join(', ');
        callback(null, sent);
      });
    });
  });
};
