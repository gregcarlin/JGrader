var assert = require('assert');

var errorCode = require('../../../util/errorCode');

describe('Error codes', function() {
  describe('Get message', function() {
    it('should be able to retrieve basic messages', function() {
      assert.equal(errorCode(301), 'An unknown error has occurred.');
    });

    it('should properly format more complex messages', function() {
      assert.equal(errorCode(351, 'ma dick'), 'ma dick could not be removed, please reload the page and try again.');
    });
  });

  describe('jgError', function() {
    var err = errorCode.jgError(301);

    it('should generate an error', function() {
      assert(err);
      assert.equal(err.jgCode, 301);
      assert.equal(err.message, 'An unknown error has occurred.');
    });
  });
});
