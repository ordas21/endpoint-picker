'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { findInResponses, expandNeedles } = require('../match.js');

function entry(partial) {
  return Object.assign(
    {
      id: 1,
      url: 'https://example.com/api',
      method: 'GET',
      status: 200,
      ms: 40,
      contentType: 'application/json',
      body: '',
      truncated: false,
      operationName: null,
      requestId: null,
      caller: null,
      at: 1,
    },
    partial
  );
}

test('exact field beats a longer string that only contains the text', function () {
  const matches = findInResponses(
    [
      entry({
        id: 1,
        url: 'https://example.com/api/note',
        body: JSON.stringify({ note: 'Ships via London dock' }),
        at: 2,
      }),
      entry({
        id: 2,
        url: 'https://example.com/api/artists',
        body: JSON.stringify({ artists: [{ name: 'Ada Lovelace', city: 'London' }] }),
        at: 1,
      }),
    ],
    ['London'],
    'https://example.com'
  );
  assert.equal(matches[0].url, 'https://example.com/api/artists');
  assert.equal(matches[0].path, 'artists[0].city');
  assert.equal(matches[0].matchType, 'exact');
  assert.equal(matches[0].value, 'London');
});

test('does not treat object keys as values', function () {
  const matches = findInResponses(
    [entry({ body: JSON.stringify({ name: 'Ada' }) })],
    ['name'],
    'https://example.com'
  );
  assert.equal(matches.length, 0);
});

test('short text only matches the whole value', function () {
  const matches = findInResponses(
    [entry({ body: JSON.stringify({ name: 'Ada Lovelace', code: 'Ad' }) })],
    ['Ad'],
    'https://example.com'
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0].path, 'code');
  assert.equal(matches[0].matchType, 'exact');
});

test('collapses whitespace before comparing', function () {
  const matches = findInResponses(
    [entry({ body: JSON.stringify({ name: 'Ada  Lovelace' }) })],
    ['Ada Lovelace'],
    'https://example.com'
  );
  assert.equal(matches[0].matchType, 'exact');
  assert.equal(matches[0].path, 'name');
});

test('reads an XSSI-prefixed JSON body', function () {
  const matches = findInResponses(
    [entry({ body: ")]}'\n" + JSON.stringify({ title: 'Brass compass' }) })],
    ['Brass compass'],
    'https://example.com'
  );
  assert.equal(matches[0].path, 'title');
  assert.equal(matches[0].matchType, 'exact');
});

test('matches a number against its text form', function () {
  const matches = findInResponses(
    [entry({ body: JSON.stringify({ user: { id: 18 } }) })],
    ['18'],
    'https://example.com'
  );
  assert.equal(matches[0].path, 'user.id');
  assert.equal(matches[0].matchType, 'exact');
});

test('plain text responses still report the endpoint', function () {
  const matches = findInResponses(
    [entry({ url: 'https://example.com/plain', contentType: 'text/plain', body: 'Hello from the edge' })],
    ['Hello from the edge'],
    'https://example.com'
  );
  assert.equal(matches[0].matchType, 'exact');
  assert.equal(matches[0].path, null);
  assert.equal(matches[0].url, 'https://example.com/plain');
});

test('walks JSON that was stored as a string', function () {
  const matches = findInResponses(
    [
      entry({
        body: JSON.stringify({ payload: JSON.stringify({ user: { name: 'Ada Lovelace' } }) }),
      }),
    ],
    ['Ada Lovelace'],
    'https://example.com'
  );
  assert.equal(matches[0].matchType, 'exact');
  assert.equal(matches[0].path, 'payload.user.name');
});

test('skips a short word buried in a huge HTML field', function () {
  const huge = 'x'.repeat(2500) + ' name ' + 'y'.repeat(100);
  const matches = findInResponses(
    [entry({ body: JSON.stringify({ html: huge }) })],
    ['name'],
    'https://example.com'
  );
  assert.equal(matches.length, 0);
});

test('same-origin boost does not outrank an exact value elsewhere', function () {
  const matches = findInResponses(
    [
      entry({
        id: 2,
        url: 'https://example.com/note',
        body: JSON.stringify({ note: 'London bridge is fine' }),
      }),
      entry({
        id: 1,
        url: 'https://cdn.other.test/api',
        body: JSON.stringify({ city: 'London' }),
      }),
    ],
    ['London'],
    'https://example.com'
  );
  assert.equal(matches[0].url, 'https://cdn.other.test/api');
  assert.equal(matches[0].matchType, 'exact');
});

test('keeps the GraphQL operation name on the match', function () {
  const matches = findInResponses(
    [
      entry({
        method: 'POST',
        url: 'https://example.com/graphql',
        operationName: 'ArtistQuery',
        caller: 'https://example.com/app.js:20:3',
        body: JSON.stringify({ data: { artist: { name: 'Grace Hopper' } } }),
      }),
    ],
    ['Grace Hopper'],
    'https://example.com'
  );
  assert.equal(matches[0].operationName, 'ArtistQuery');
  assert.equal(matches[0].caller, 'https://example.com/app.js:20:3');
  assert.equal(matches[0].path, 'data.artist.name');
});

test('lists one field once when several pieces of the clicked text hit it', function () {
  const matches = findInResponses(
    [entry({ body: JSON.stringify({ artists: [{ name: 'Ada Lovelace' }] }) })],
    ['Ada Lovelace', 'Lovelace'],
    'https://example.com'
  );
  const named = matches.filter(function (match) {
    return match.path === 'artists[0].name';
  });
  assert.equal(named.length, 1);
  assert.equal(named[0].matchType, 'exact');
});

test('expandNeedles adds a currency-stripped number and drops punctuation', function () {
  const needles = expandNeedles(['$1,200', '!!!', 'Ada Lovelace']);
  assert.ok(needles.includes('1200'));
  assert.ok(needles.includes('$1,200') || needles.includes('$1,200'.replace(/\s+/g, ' ')));
  assert.equal(needles.includes('!!!'), false);
  const matches = findInResponses(
    [entry({ body: JSON.stringify({ price: 1200 }) })],
    needles,
    'https://example.com'
  );
  assert.equal(matches[0].path, 'price');
  assert.equal(matches[0].matchType, 'exact');
});
