'use strict';

var Parser = require('..'),
  fs = require('fs'),
  assert = require('assert');

describe('Parser', function () {
  describe('#()', function () {
    it('should have default keyword spec when none is passed', function () {
      assert(Object.keys((new Parser()).keywordSpec.gettext).length > 0);
    });

    it('should convert old spec formats', function () {
      assert.deepEqual((new Parser({_: [0]})).keywordSpec, {_: {msgid: 0}});
      assert.deepEqual((new Parser({n_: [0, 1]})).keywordSpec, {n_: {msgid: 0, msgid_plural: 1}});

      var spec = new Parser({n_: [2, 1]}).keywordSpec.n_;
      assert.equal(Object.keys(spec).length, 2);
      assert.equal(spec.msgid_plural, 1);
      assert.equal(spec.msgid, 2);

      spec = new Parser({n_: [1, 2]}).keywordSpec.n_;
      assert.equal(Object.keys(spec).length, 2);
      assert.equal(spec.msgid, 1);
      assert.equal(spec.msgid_plural, 2);

      spec = new Parser({ngettext: ['msgid', 'msgid_plural']}).keywordSpec.ngettext;
      assert.equal(Object.keys(spec).length, 2);
      assert.equal(spec.msgid, 0);
      assert.equal(spec.msgid_plural, 1);
    });
  });

  describe('#parse()', function () {
    it('should return results', function (done) {
      fs.readFile(__dirname + '/fixtures/template.njk', {encoding: 'utf8'}, function (err, data) {
        if (err) {
          throw err;
        }

        var result = (new Parser()).parse(data);

        assert.equal(typeof result, 'object');
        assert('inside block' in result);
        assert('inside block inverse' in result);
        assert.equal(Object.keys(result).length, 8);
        assert.equal(result['Image description'].line.length, 2);

        done();
      });
    });

    it('should return plural results', function (done) {
      fs.readFile(__dirname + '/fixtures/plural.njk', {encoding: 'utf8'}, function (err, data) {
        if (err) {
          throw err;
        }

        var result = (new Parser()).parse(data);

        assert.equal(Object.keys(result).length, 2);
        assert.equal(result['default'].plural, 'defaults');

        done();
      });
    });

    it('should throw an error if there are mismatched plurals', function (done) {
      fs.readFile(__dirname + '/fixtures/mismatched-plurals.njk', {encoding: 'utf8'}, function (err, data) {
        if (err) {
          throw err;
        }

        assert.throws(function() { new Parser().parse(data); }, Error);

        done();
      });
    });

    it('should recognize subexpressions', function (done) {
      fs.readFile(__dirname + '/fixtures/subexpression.njk', {encoding: 'utf8'}, function (err, data) {
        if (err) {
          throw err;
        }

        var result = (new Parser()).parse(data);

        assert('subexpression' in result);
        assert('%s subexpression' in result);
        assert.equal(result['%s subexpression'].plural, '%s subexpressions');
        assert('%s %s subexpression' in result);
        assert.equal(result['%s %s subexpression'].plural, '%s %s subexpressions');
        assert('second' in result);
        assert('regular' in result);
        assert('%s %s other' in result);
        assert('nested %s' in result);
        assert('dummy_hash_text' in result);
        assert('dummy_hash_text_only' in result);
        assert.equal(9, Object.keys(result).length);

        done();
      });
    });
  
    it('should pass the comprehensive test', function (done) {
        fs.readFile(__dirname + '/fixtures/comprehensive.njk', {encoding: 'utf8'}, function (err, data) {
          if (err) {
            throw err;
          }

          var result = (new Parser()).parse(data);

          assert('First Block Test' in result);
          assert.equal(result['%d forLoopTest'].msgid_plural, '%d forLoopTests');
          assert('asyncEach Test' in result);
          assert('asyncAll Test' in result);
          assert.equal(result['%d macro'].msgid_plural, '%d macroPlural');
          assert('Welcome back, %(gt_username)!' in result);
          assert('The name of the item is: %(item_name)' in result);
          assert(!('This is just plain text.' in result));
          assert('Foo Bar' in result);
          assert.equal(result['%d bar'].msgid_plural, '%d foo');
          assert('HTML comments are parsed.' in result);
          assert('week_start_hack' in result);
          assert('Test String Comparison' in result);
          assert('True' in result);
          assert('False' in result);
          assert('If Expression Test' in result);
          assert('Foo True' in result);

          done();
        });
    });
  });

  it('should support skipping parameters', function (done) {
    fs.readFile(__dirname + '/fixtures/skip-params.njk', {encoding: 'utf8'}, function (err, data) {
      if (err) {
        throw err;
      }

      var result = new Parser({_: [1, 2]}).parse(data);

      assert.equal(result.msgid.msgid, 'msgid');
      assert.equal(result.msgid.msgid_plural, 'plural');

      done();
    });
  });

  it('should support extracting contexts', function (done) {
    fs.readFile(__dirname + '/fixtures/contexts.njk', {encoding: 'utf8'}, function (err, data) {
      if (err) {
        throw err;
      }

      var result = (new Parser({
        pgettext: {
          msgctxt: 0,
          msgid: 1
        },
        npgettext: {
          msgctxt: 0,
          msgid: 1,
          msgid_plural: 2
        }
      })).parse(data);

      var key = Parser.messageToKey('msgid', 'first context');
      assert(key in result);
      assert.equal(result[key].msgctxt, 'first context');

      key = Parser.messageToKey('msgid', 'second context');
      assert(key in result);
      assert.equal(result[key].msgctxt, 'second context');

      key = Parser.messageToKey('file', 'first context');
      assert(key in result);
      assert.equal(result[key].msgctxt, 'first context');
      assert.equal(result[key].msgid_plural, 'files');
      assert.equal(result[key].plural, 'files');

      key = Parser.messageToKey('file', 'second context');
      assert(key in result);
      assert.equal(result[key].msgctxt, 'second context');
      assert.equal(result[key].msgid_plural, 'files');
      assert.equal(result[key].plural, 'files');

      assert.equal(4, Object.keys(result).length);

      done();
    });
  });

  it('should support being called without `new`', function (done) {
    /* jshint newcap: false */
    fs.readFile(__dirname + '/fixtures/template.njk', {encoding: 'utf8'}, function (err, data) {
      if (err) {
        throw err;
      }

      var result = Parser().parse(data);

      assert('inside block' in result);

      done();
    });
  });
});
