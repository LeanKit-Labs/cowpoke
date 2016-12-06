module.exports = function checkAuth( key, envelope, next ) {
	const userKey = envelope.headers.bearer;
	return ( !key || key === userKey ) ? next() : { status: 401, data: { message: "unauthorized" } };
};
