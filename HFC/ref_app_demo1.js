// Include the package from npm:
var hfc = require('/usr/local/lib/node_modules/hfc/lib/hfc.js');
var util = require('util');
var fs = require('fs');

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local'),Strategy;
var mysql = require('mysql');


var app = express();
var server = require('http').createServer(app);;
var io = require('socket.io').listen(server);

var config = JSON.parse(fs.readFileSync('ref06_config_dev_v2.json', 'utf8'));

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

var testChaincodeID = "mycc";
var deployer;
var username;
var password;
process.env['GOPATH'] = __dirname;

// Enroll "admin" which is already registered because it is
// listed in fabric/membersrvc/membersrvc.yaml with it's one time password.

// registrationRequest
server.listen(7050);
console.log("\nWeb HFC Server started\n");

var flag = "FALSE";
    

	io.on('connection', function (socket) {
		console.log("\nConnected for User login\n");
		 
		socket.on('setUsername',function(data) {
			console.log(data);
			username = data.Username;
			password = data.Password;
			
			/*
			var registrationRequest = {
				enrollmentID: config.users[1].username,
				affiliation: config.users[1].affiliation
			};
			*/
			//chain.registerAndEnroll(registrationRequest, function(err, user) {
			chain.enroll(username, password, function(err, user) {
				if (err) {
					socket.emit('loginfail',"Failed to enroll");
					throw Error(" \nFailed to enroll\n " + data.uname + ": " + err);
				}		
				chain.setRegistrar(user);
				console.log("\nEnrolled admin successfully\n");	
				deployer = user;
				if (flag == "FALSE" ) {
				    deployChaincode(user);
				    flag = "TRUE";
				}

				console.log("\nEnrolled %s successfully for user %s \n", data.uname, deployer);	
				socket.emit('loginsuccess',"Enrolled successfully");
				
				
				
				socket.on('setSecurity',function(data){
					
					console.log("Security data : %s", data);
					//var security_data = jsontoarray(data);
					//console.log("Array: "+security_data);

					invoke(deployer, data, socket);
				})
				
				socket.on('setSecurityFile',function(securitydata){
					console.log("Security data: ",securitydata);

					var sec_data = jsontoarray(securitydata);
                    console.log("Security Data1:"+(sec_data));
                    //var sec_data1=JSON.parse(sec_data);
                    
                    var stringJSON = [];
                    stringJSON.push(sec_data);
                    console.log("security data: "+stringJSON);
					/*securitydata.forEachAsync(function(data, index, arr, next) {
                            console.log(data);
                            setTimeout(function() {

                                        // Use next() to continue
                                        next();
                                    }, 2000);
                                     return true;
                                    }, function() {
                                            console.log('complete');
                                    });*/
					/*var sec_data = jsontoarray(securitydata);
					console.log("Security Data1:"+(sec_data));*/

                    				//invoke(deployer,sec_data1,socket);
					//var sec_data1 = jsontoarray(JSON.parse(sec_data));
                    /*console.log("inner_loop %s", sec_data1);
                    invoke(deployer,sec_data1,socket);*/
					/*var stringJSON = [];
					stringJSON.push(sec_data1);*/
					/*var sec_data2 = jsontoarray1((sec_data1));
					console.log(sec_data2);*/
					
					//console.log("security data: "+stringJSON);
					/*setTimeout(function loop(){
                    			    	console.log(sec_data1.shift());
                    			    	invoke(deployer,sec_data1,socket);
                    			    	if(sec_data1.length){
                    			    		invoke(deployer,sec_data1,socket);
                    			    		setTimeout(loop,8000);
                    			    	}
                    			    },15000);*/
					invoke(deployer,stringJSON, socket);

					
				})
				
				socket.on('corporateenquiry',function(data){
					console.log("Json: "+ data);
					var queryinput = jsontoarray1(data);
					console.log("Array: "+queryinput);
					query(deployer, queryinput, socket);
				});
				
			});
		});			
	});		

		

function jsontoarray(args){
	var array = [];
	for(var i in args)
		{
			array.push(args[i]);
		}
	return array[1];
}

function jsontoarray1(args){
	var array = [];
	for(var i in args)
		{
			array.push(args[i]);
		}
	return array;
}
function deployChaincode(deployer) {
    console.log(util.format("Deploying chaincode ... It will take about %j seconds to deploy \n", chain.getDeployWaitTime()))
    var args = getArgs(config.deployRequest);
    // Construct the deploy request
    var deployRequest = {
        chaincodePath: config.deployRequest.chaincodePath,
        chaincodeName: config.deployRequest.chaincodeName,
        // Function to trigger
        fcn: config.deployRequest.functionName,
        // Arguments to the initializing function
        args: args,
        attrs: ["licencekey"]
    };

    // Trigger the deploy transaction
    var deployTx = deployer.deploy(deployRequest);
    // Print the deploy results
    deployTx.on('complete', function(results) {
        // Deploy request completed successfully
        testChaincodeID = results.chaincodeID;
        console.log(util.format("[ Chaincode ID : ", testChaincodeID+" ]\n"));
        console.log(util.format("Successfully deployed chaincode: request=%j, response=%j \n", deployRequest, results));    
    });
    
    deployTx.on('error', function(err) {
        // Deploy request failed
        console.log(util.format("Failed to deploy chaincode: request=%j, error=%j \n", deployRequest, err));
    });

}

function invoke(deployer, args, socket) {
    // Construct the invoke request
    var invokeRequest = {
        // Name (hash) required for invoke
        chaincodeID: testChaincodeID,
        // Function to trigger
        //fcn: config.invokeRequest.functionName,
        fcn: "newSecuritySetup",
        // Parameters for the invoke function
        args: args,
        attrs: ["licencekey"]
    };

    // Trigger the invoke transaction
    var invokeTx = deployer.invoke(invokeRequest);

    invokeTx.on('complete', function(results) {
        // Invoke transaction completed?
        console.log(util.format("completed chaincode invoke transaction: request=%j, response=%j\n", invokeRequest, results));
		socket.emit('setupsuccess',"Security has been Setup successfully");
    });
    invokeTx.on('error', function(err) {
        // Invoke transaction submission failed
        console.log(util.format("Failed to submit chaincode invoke transaction: request=%j, error=%j\n", invokeRequest, err));
		socket.emit('setupfail',"Security setup has failed!");
    });

}

function query(deployer, args, socket) {
    // Construct the query request
    var queryRequest = {
        // Name (hash) required for query
        chaincodeID: testChaincodeID,
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
		socket.emit('querysuccess_corporate', results.result.toString());
		
    });
    queryTx.on('error', function(err) {
        // Query failed
        console.log("Failed to query chaincode, function: request=%j, error=%j \n", queryRequest, err);
		socket.emit('queryfail_corporate',"Security setup is not found!");
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
