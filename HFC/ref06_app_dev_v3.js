// Include the package from npm:
var hfc = require('/usr/local/lib/node_modules/hfc/lib/hfc.js');
var util = require('util');
var fs = require('fs');


var config = JSON.parse(fs.readFileSync('ref06_config_dev_v3.json', 'utf8'));


// Create a client chain.
var chain = hfc.newChain(config.chainName);

// Configure the KeyValStore which is used to store sensitive keys
// as so it is important to secure this storage.
var keyValStorePath = __dirname + "/" + config.KeyValStore;
chain.setKeyValStore(hfc.newFileKeyValStore(keyValStorePath));

chain.setMemberServicesUrl(config.ca.ca_url);
for (var i=0;i<config.peers.length;i++){
	chain.addPeer(config.peers[i].peer_url);
}
chain.setDevMode(true);

var testChaincodeID;
var deployer;
process.env['GOPATH'] = __dirname;

// Enroll "admin" which is already registered because it is
// listed in fabric/membersrvc/membersrvc.yaml with it's one time password.
chain.enroll(config.users[0].username, config.users[0].secret, function(err, admin) {
    if (err) return console.log(util.format("ERROR: failed to register admin, Error : %j \n", err));
    // Set this user as the chain's registrar which is authorized to register other users.

    chain.setRegistrar(admin);

    console.log("\nEnrolled admin successfully\n");
    var userName = config.users[1].username;
    var secretKey = config.users[1].secret;
        // registrationRequest
    /*var registrationRequest = {
        enrollmentID: userName,
        affiliation: config.users[1].affiliation
    };*/

    var enrollmentRequest = {
        name: userName,
        secret: secretKey
    };

    /*chain.registerAndEnroll(registrationRequest, function(err, user) {
        if (err) throw Error(" Failed to register and enroll " + userName + ": " + err);
        deployer = user;
        console.log("Enrolled %s successfully\n", userName);

        chain.setDeployWaitTime(config.deployWaitTime);
        //deployChaincode();
        //var args = getArgs(config.invokeRequest1);
        //invoke(args);

        var args = getArgs(config.queryRequest1);
        query(args);
    }); */

     console.log("\nEnrollement ID [%s] and secret [%s] \n", enrollmentRequest.name, enrollmentRequest.secret );
     chain.enroll(enrollmentRequest.name, enrollmentRequest.secret, function(err, user) {
        if (err) throw Error(" Failed to enroll " + userName + ": " + err);
        deployer = user;
        console.log("Enrolled %s successfully\n", userName);

        chain.setDeployWaitTime(config.deployWaitTime);
         //  deployChaincode();
         var args = getArgs(config.queryRequest1);
         query(args);
     });
});

function deployChaincode() {
    console.log(util.format("Deploying chaincode ... It will take about %j seconds to deploy \n", chain.getDeployWaitTime()))
    var args = getArgs(config.deployRequest);
    // Construct the deploy request
    var deployRequest = {
        chaincodePath: config.deployRequest.chaincodePath,
        chaincodeName: config.deployRequest.chaincodeName,
        // Function to trigger
        fcn: config.deployRequest.functionName,
        // Arguments to the initializing function
        args: args
    };

    // Trigger the deploy transaction
    var deployTx = deployer.deploy(deployRequest);

    // Print the deploy results
    deployTx.on('complete', function(results) {
        // Deploy request completed successfully
        testChaincodeID = results.chaincodeID;
        console.log(util.format("[ Chaincode ID : ", testChaincodeID+" ]\n"));
        console.log(util.format("Successfully deployed chaincode: request=%j, response=%j \n", deployRequest, results));
        //sleep(40000);
        //var args1 = getArgs(config.invokeRequest1);
    });
    deployTx.on('error', function(err) {
        // Deploy request failed
        console.log(util.format("Failed to deploy chaincode: request=%j, error=%j \n", deployRequest, err));
    });


}

function invoke(args) {
    // Construct the invoke request
    var invokeRequest = {
        // Name (hash) required for invoke
        chaincodeID: "mycc",
        // Function to trigger
        //fcn: config.invokeRequest.functionName,
        fcn: "getSecurityInformation",
        // Parameters for the invoke function
        args: args
    };

    // Trigger the invoke transaction
    var invokeTx = deployer.invoke(invokeRequest);

    invokeTx.on('complete', function(results) {
        // Invoke transaction completed?
        console.log(util.format("completed chaincode invoke transaction: request=%j, response=%j\n", invokeRequest, results));
        query(args);
    });
    invokeTx.on('error', function(err) {
        // Invoke transaction submission failed
        console.log(util.format("Failed to submit chaincode invoke transaction: request=%j, error=%j\n", invokeRequest, err));
    });

}

function query(args) {
    // Construct the query request
    var queryRequest = {
        // Name (hash) required for query
        chaincodeID: "mycc",
        // Function to trigger
        //fcn: config.queryRequest.functionName,
        fcn: "getSecurityInformation",
        // Existing state variable to retrieve
        args: args,
        attrs: ["licencekey"]
    };

    // Trigger the query transaction
    var queryTx = deployer.query(queryRequest);

    queryTx.on('complete', function(results) {
        // Query completed successfully
        console.log("Successfully queried  chaincode function: request=%j, value=%s \n", queryRequest, results.result.toString());
    });
    queryTx.on('error', function(err) {
        // Query failed
        console.log("Failed to query chaincode, function: request=%j, error=%j \n", queryRequest, err);
    });
}

function getArgs(request) {
	var args = [];
	for (var i=0;i<request.args.length;i++){
		args.push(request.args[i]);
	}
	return args;
}


function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}
