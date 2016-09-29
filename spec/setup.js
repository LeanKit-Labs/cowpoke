require("babel-polyfill");
global._ = require( "lodash" );
var chai = require( "chai" );
chai.use( require( "chai-as-promised" ) );
global.should = chai.should();
global.expect = chai.expect;
global.bluebird = require("bluebird");
global.fs = require( "fs" );
global.sinon = require( "sinon" );
chai.use( require( "sinon-chai" ) );
require( "sinon-as-promised" );

/* global _, bluebird  */

function deepCompare( a, b, k ) {
	var diffs = [];
	if ( b === undefined ) {
		diffs.push( "expected " + k + " to equal " + a + " but was undefined " );
	} else if ( _.isObject( a ) || _.isArray( a ) ) {
		_.each( a, function( v, c ) {
			var key = k ? [k, c].join( "." ) : c;
			diffs = diffs.concat( deepCompare( a[c], b[c], key ) );
		} );
	} else {
		/* eslint-disable eqeqeq */
		var equal = a == b;
		/* eslint-enable eqeqeq */
		if ( !equal ) {
			diffs.push( "expected " + k + " to equal " + a + " but got " + b );
		}
	}
	return diffs;
}

chai.Assertion.addMethod( "partiallyEql", function( partial ) {
	var obj = this._obj;
	if ( !obj.then ) {
		obj = bluebird.resolve( obj );
	}
	var self = this;
	return obj.then( function( actual ) {
		var diffs = deepCompare( partial, actual );
		return self.assert(
			diffs.length === 0,
			diffs.join( "\n\t" )
		);
	} );
} );
