"use strict";
/*!
governify-project-poetisa-metrics 1.1.1, built on: 2018-05-21
Copyright (C) 2018 ISA group
http://www.isa.us.es/
https://github.com/isa-group/governify-project-poetisa-metrics

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>. */



const expect = require('chai').expect;
const lib = require('../../src/backend');

/*
 * USE MOCHA AND CHAI for testing your code
 */
describe('First Level test', function () {
  this.timeout(10000);
  it('Execute', done => {
    let result = lib.myfunction('test', '1');

    expect(result).to.be.equal('test-1');

    done();
  });
});