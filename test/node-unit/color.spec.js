'use strict';

var assert = require('assert');
var childProcess = require('child_process');
var path = require('path');

describe('Mocha', function () {
  this.timeout(4000);

  it('should not output colors to pipe', function (done) {
    var command = [path.join('bin', 'mocha'), '--grep', 'missing-test'];

    // avoid forcing the hand of `supports-color`
    delete process.env.FORCE_COLOR;

    childProcess.execFile(process.execPath, command, function (err, stdout, stderr) {
      if (err) {
        return done(err);
      }

      assert(stdout.indexOf('[90m') === -1);

      done();
    });
  });
});
