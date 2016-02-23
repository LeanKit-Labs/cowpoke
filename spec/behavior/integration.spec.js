require( "../setup" );

function testUpgrade() {

var baseURL = "http://example.com";
var nock = require( "nock" );
var integration = require( "../../resource/environment/integration.js" );

var rancherHost = nock( baseURL );

rancherHost.get( "/v1" ).reply( 200, {
    links: {
        projects: baseURL + "/v1/projects"
	}
});
rancherHost.get( "/v1/projects" ).reply( 200, {
	data: [{
	   id: "l0l",
	   name: "Test",
	   state: "active",
	   links: {
			environments: baseURL + "/v1/projects/l0l/environments",
			containers: baseURL + "/v1/projects/l0l/containers",
			services: baseURL + "/v1/projects/l0l/services"
       }
	}]
});
rancherHost.get( "/v1/projects/l0l/services" ).reply( 200, {
    data: [
	   {
	       id: "svc0102",
		   name: "Service 02",
		   accountId: "l0l",
		   environmentId: "s01",
		   description: "A test service",
		   state: "active",
		   launchConfig: {
		      imageUuid: "docker:arob/cowpoke:arobson_cowpoke_develop_0.1.0_1_abcdef"
			},
			actions: {
				upgrade: baseURL + "/v1/projects/l0l/environments/s01/services/svc0102?action=upgrade"
			}
		},
		{
			id: "svc0103",
			name: "Service 03",
			accountId: "l0l",
			environmentId: "s01",
			description: "A test service",
			state: "active",
			launchConfig: {
				imageUuid: "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef"
			},
			actions: {
				upgrade: baseURL + "/v1/projects/l0l/environments/s01/services/svc0103?action=upgrade"
			}
		}
	]
} );
                
/*rancherHost.post( "/v1/projects/l0l/environments/s01/services/svc0103?action=upgrade", expectedBody ).reply( 200, {
		id: "svc0103",
		name: "Service 03",
		accountId: "l0l",
	    environmentId: "s01",
		description: "A test service",
		state: "active",
		launchConfig: {
			imageUuid: "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_2_123efg"
		},
		actions: {
			upgrade: baseURL + "/v1/projects/l0l/environments/s01/services/svc0103?action=upgrade"
		}
});*/
                                
rancherHost.get( "/v1/projects/l0l/environments" ).reply( 200, {
	data: [ {
		id: "s01",
		name: "Stack 1",
		accountId: "l0l",
		description: "A test stack",
		state: "active",
		links: {
			services: baseURL + "/v1/projects/l0l/environments/s01/services"
		}
	} ]
} );
                    
rancherHost.get( "/v1/projects/l0l/environments/s01/services" ).reply( 200, {
	data: [{
		id: "svc0102",
		name: "Service 02",
		accountId: "l0l",
		environmentId: "s01",
		description: "A test service",
		state: "active",
		launchConfig: {
			imageUuid: "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef"
		},
		actions: {
		  upgrade: baseURL + "/v1/projects/l0l/environments/s01/services/svc0102?action=upgrade"
	    }
	}]
} );      
                        
                        
/*rancherHost.post( "/v1/projects/l0l/environments/s01/services/svc0102?action=upgrade", expectedBody ).reply( 200, {
	id: "svc0102",
	name: "Service 02",
	accountId: "l0l",
	environmentId: "s01",
	description: "A test service",
	state: "active",
	launchConfig: {
		imageUuid: "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_2_123efg"
	},
	actions: {
		upgrade: baseURL + "/v1/projects/l0l/environments/s01/services/svc0102?action=upgrade"
	}
} );      
                            
 rancherHost.post( "/v1/projects/l0l/environments/s01/services/svc0102?action=upgrade", expectedBody ).reply( 200, {
	id: "svc0102",
	name: "Service 02",
	accountId: "l0l",
	environmentId: "s01",
	description: "A test service",
	state: "active",
	launchConfig: {
		imageUuid: "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_1_123efg"
	},
	actions: {
		upgrade: baseURL + "/v1/projects/l0l/environments/s01/services/svc0102?action=upgrade"
	}
} );*/
                                             
console.log("running upgrade");
    return integration.upgrade({data: {image: "arob/cowpoke:arobson_cowpoke_master_0.6.0_1_abcdef"}})
}
testUpgrade().then(console.log)