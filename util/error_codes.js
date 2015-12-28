var util = require('util');

var table = {
  0: null, // everything OK

  // 1-299 = error caused by user
  1: 'That is not a valid value.',
  2: 'Invalid due date.',
  3: 'No invitations were sent because no valid sections were selected.',
  4: 'Your code could not be compiled.',
  5: 'Some of your files have invalid names: Only alphanumeric characters and periods are allowed, and names must contain at least 6 characters.',
  6: 'You already submitted this!',
  7: 'You must submit at least one java file. Make sure they end in .java',
  8: 'No two files can share the same name.',
  9: 'You must enter a class code.',
  10: 'That is not a valid class code.',
  11: 'You are already enrolled in that class.',
  50: 'Invalid state.',
  51: 'You cannot remove files after students have already submitted code.',

  // 300-599 = operation error (neither user nor programmer is at fault, eg. db connection timeout)
  300: 'An error has occurred, please reload the page and try again.',
  301: 'An unknown error has occurred.',
  350: 'File could not be removed, please reload the page and try again.',
  351: '%s could not be removed, please reload the page and try again.',
  400: 'Unable to set main, please reload and try again.'

  // 600-999 = programmer/system errors
};

var getMessage = module.exports = function(code) {
  arguments[0] = table[arguments[0]];
  return util.format.apply(this, arguments);
};

module.exports.jgError = function(code) {
  var e = new Error(getMessage(code));
  e.jgCode = code;
  return e;
};

