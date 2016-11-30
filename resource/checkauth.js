module.exports = function checkAuth( key, envelope, next ) {
	const userKey = envelope.headers.bearer;
	return ( !key || userKey === key ) ? next() : { status: 401, data: { message: "unauthorized" } };
};
