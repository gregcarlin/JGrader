var assert = require('assert');

var general = require('../../../util/general');

describe('General', function() {
  describe('String starts with', function() {
    it('should return true when string a starts with b', function() {
      assert(general.stringStartsWith('outer', 'out'));
      assert(general.stringStartsWith('outer space', 'out'));
      assert(general.stringStartsWith('another', 'a'));
      assert(general.stringStartsWith('another', 'another'));
    });

    it('should return false when string a doesn\'t start with b', function() {
      assert(!general.stringStartsWith('hello', 'ello'));
      assert(!general.stringStartsWith('hello', 'helo'));
      assert(!general.stringStartsWith('yoyoyo', 'yoyoyoy'));
    });
  });

  describe('Is ascii', function() {
    it('should return true when it\'s ascii', function() {
      assert(general.isAscii('text/plain'));
      assert(general.isAscii('text/anything'));
      assert(general.isAscii('application/octet-stream'));
    });

    it('should return false when it\'s not ascii', function() {
      assert(!general.isAscii('application/other'));
      assert(!general.isAscii('image/png'));
    });
  });
});
