var util = require('util');

var table = {
  0: null, // everything OK

  // 1-299 = error caused by user
  1: 'That is not a valid value.',
  2: 'Invalid due date.',
  3: 'No invitations were sent because no valid sections were selected.',
  50: 'Invalid state,',
  51: 'You cannot remove files after students have already submitted code.',

  // 300-599 = operation error (neither user nor programmer is at fault, eg. db connection timeout)
  300: 'An error has occurred, please reload the page and try again.',
  350: 'File could not be removed, please reload the page and try again.',
  351: '%s could not be removed, please reload the page and try again.'

  // 600-999 = programmer/system errors
};

module.exports = function(code) {
  arguments[0] = table[arguments[0]];
  return util.format.apply(this, arguments);
};
