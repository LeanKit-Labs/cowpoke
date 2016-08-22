const path = require( "path" );
const PouchDB = require( "pouchdb" );
const config = require( "configya" )( {
	pouchdb: {
		path: path.join( process.cwd(), "./data" )
	}
}, "./config.json" );

function insert( db, doc ) {
	doc._id = doc.name;
	return db.put(doc);
}

function remove( db, docName ) {
	return db.remove( docName );
}

function update( db , doc) {
	return db.get(doc.name).then( datum => {
		doc._id = doc.name;
		doc._rev = datum._rev;
		return db.put(doc);
	});
}

module.exports = function( fileName ) {
	const dbPath = path.join( config.pouchdb.path, fileName );
	const db = new PouchDB(dbPath);
	return {
		fetch: function( docName ) {
			if (docName) {
				return db.get(docName);
			} else {
				return db.allDocs({"include_docs": true}).then(elms => elms.rows.map(elm => elm.doc));
			}
		},
		insert: insert.bind( null, db ),
		remove: remove.bind( null, db ),
		update: update.bind( null, db )
	};
};
