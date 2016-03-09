var util = require("../../src/util");
require( "../setup" );

describe('ShouldUpgrade', function () {
    var imageData = util.getImageInfo("arob/cowpoke:arobson_cowpoke_master_0.6.0_1_abcdef");
    var service = {
        "id": "svc0102",
        "name": "Service 02",
        "environmentId": "l0l",
        "environmentName": "Test",
        "stackId": "s01",
        "stackName": "",
        "description": "A test service",
        "state": "upgraded",
        "launchConfig": {
            "imageUuid": "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef"
        },
        "droneImage": "arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef",
        "buildInfo": {
            "newImage": "arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef",
            "docker": {
                "image": "cowpoke",
                "repo": "arob",
                "tag": "arobson_cowpoke_master_0.1.0_1_abcdef"
            },
            "owner": "arobson",
            "repository": "cowpoke",
            "branch": "master",
            "version": "0.1.0",
            "build": "1",
            "commit": "abcdef"
        },
        "transition": {
            "error": false
        }
    };
    
    it('should return that service should be upgraded', function (done) {
        expect(util.shouldUpgrade(service, imageData)).to.equal(true);
        done();
    });
    
    
});
