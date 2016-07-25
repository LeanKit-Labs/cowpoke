function shouldUpgradeStack ( stack, catalog, branch, version ) {
	const stackInfo = stack.externalId.split("://")[1].split(":");
	const stackCatalog = stackInfo[0];
	const stackBranch = stackInfo[1];
	const stackVersion = stackInfo[2];
	return stackCatalog === catalog &&
		stackBranch === branch &&
		stackVersion === version &&
		parseInt(stackCatalog) < parseInt(version);
}

module.exports = {
	shouldUpgradeStack
};
