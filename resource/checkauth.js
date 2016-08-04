module.exports = function checkAuth(key, envelope, next ) {
	const userKey = envelope.headers.bearer;
	if ( !key || userKey === key ) {
		return next();
	} else {
		return {status: 401, data: {message: "unauthorized"}};
	}
};
