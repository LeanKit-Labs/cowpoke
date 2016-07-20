const _ = require( "lodash" );
const path = require( "path" );
const when = require( "when" );
const nodeWhen = require( "when/node" );
const Datastore = require( "nedb" );
const config = require( "configya" )( {
	nedb: {
		path: path.join( process.cwd(), "./data" )
	}
}, "./config.json" );

function count( api, pattern ) {
	return api.count( pattern );
}

function fetch( api, pattern, map, continuation ) {
	continuation = continuation || {sort: {}};
	map = map || function( x ) {
		return x;
	};
	const apply = function( list ) {
		return _.map( list, map );
	};
	const op = api.raw.find( pattern ).sort( continuation.sort );
	const promise = nodeWhen.apply( op.exec.bind( op ) );
	return when.try( apply, promise );
}

function fetchPage( api, pattern, map, continuation ) {
	map = map || function( x ) {
		return x;
	};
	const limit = continuation.limit ? continuation.limit : continuation;
	const pageIndex = continuation.page ? continuation.page : 1;
	const skipCount = ( pageIndex - 1 ) * limit;
	const sort = continuation.sort || {};
	const apply = function( list ) {
		return _.map( list, map );
	};
	const op = api.raw.find( pattern ).sort( sort ).skip( skipCount ).limit( limit );
	const promise = nodeWhen.apply( op.exec.bind( op ) );
	return when.try( apply, promise )
		.then( function( data ) {
			data.continuation = {limit: limit, page: pageIndex, sort: sort};
			data.continuation.page++;
			return data;
		} )
		.then( null, function( e ) {
			console.log( e.stack );
		} )
		.catch( function( e ) {
			console.log( e.stack );
		} );
}

function insert( api, doc ) {
	return api.insert( doc );
}

function purge( api, key, all ) {
	return api.remove( key, {multi: all} );
}

function update( api, pattern, change ) {
	return api.update( pattern, change, {} );
}

function upsert( api, pattern, doc ) {
	return api.update( pattern, doc, {upsert: true} );
}

function wrap( db ) {
	return {
		raw: db,
		count: nodeWhen.lift( db.count ).bind( db ),
		find: nodeWhen.lift( db.find ).bind( db ),
		insert: nodeWhen.lift( db.insert ).bind( db ),
		remove: nodeWhen.lift( db.remove ).bind( db ),
		update: nodeWhen.lift( db.update ).bind( db )
	};
}

module.exports = function( fileName ) {
	const dbPath = path.join( config.nedb.path, fileName );
	const store = new Datastore( {filename: dbPath, autoload: true} );
	const api = wrap( store );
	store.persistence.compactDatafile();
	store.persistence.setAutocompactionInterval( 60000 );
	return {
		count: count.bind( null, api ),
		fetch: function( pattern, map, continuation ) {
			if ( ( _.isObject( continuation ) && continuation.limit ) || _.isNumber( continuation ) ) {
				return fetchPage( api, pattern, map, continuation );
			} else {
				return fetch( api, pattern, map, continuation );
			}
		},
		insert: insert.bind( null, api ),
		purge: purge.bind( null, api ),
		update: update.bind( null, api ),
		upsert: upsert.bind( null, api )
	};
};
