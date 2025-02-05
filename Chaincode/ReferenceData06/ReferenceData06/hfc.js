/**
 * Copyright 2016 IBM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * Licensed Materials - Property of IBM
 * © Copyright IBM Corp. 2016
 */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
 * "hfc" stands for "Hyperledger Fabric Client".
 * The Hyperledger Fabric Client SDK provides APIs through which a client can interact with a Hyperledger Fabric blockchain.
 *
 * Terminology:
 * 1) member - an identity for participating in the blockchain.  There are different types of members (users, peers, etc).
 * 2) member services - services related to obtaining and managing members
 * 3) registration - The act of adding a new member identity (with specific privileges) to the system.
 *               This is done by a member with the 'registrar' privilege.  The member is called a registrar.
 *               The registrar specifies the new member privileges when registering the new member.
 * 4) enrollment - Think of this as completing the registration process.  It may be done by the new member with a secret
 *               that it has obtained out-of-band from a registrar, or it may be performed by a middle-man who has
 *               delegated authority to act on behalf of the new member.
 *
 * These APIs have been designed to support two pluggable components.
 * 1) Pluggable key value store which is used to retrieve and store keys associated with a member.
 *    Call Chain.setKeyValStore() to override the default key value store implementation.
 *    For the default implementations, see FileKeyValStore and SqlKeyValStore (TBD).
 * 2) Pluggable member service which is used to register and enroll members.
 *    Call Chain.setMemberService() to override the default implementation.
 *    For the default implementation, see MemberServices.
 *    NOTE: This makes member services pluggable from the client side, but more work is needed to make it compatible on
 *          the server side transaction processing path.
 */
process.env.GRPC_SSL_CIPHER_SUITES = process.env.GRPC_SSL_CIPHER_SUITES
    ? process.env.GRPC_SSL_CIPHER_SUITES
    : 'ECDHE-RSA-AES128-GCM-SHA256:' +
        'ECDHE-RSA-AES128-SHA256:' +
        'ECDHE-RSA-AES256-SHA384:' +
        'ECDHE-RSA-AES256-GCM-SHA384:' +
        'ECDHE-ECDSA-AES128-GCM-SHA256:' +
        'ECDHE-ECDSA-AES128-SHA256:' +
        'ECDHE-ECDSA-AES256-SHA384:' +
        'ECDHE-ECDSA-AES256-GCM-SHA384';
var debugModule = require('debug');
var fs = require('fs');
var urlParser = require('url');
var grpc = require('grpc');
var util = require('util');
var jsrsa = require('jsrsasign');
var elliptic = require('elliptic');
var sha3 = require('js-sha3');
var BN = require('bn.js');
var Set = require('es6-set');
var HashTable = require('hashtable');
var crypto = require("./crypto");
var stats = require("./stats");
var sdk_util = require("./sdk_util");
var events = require('events');
var debug = debugModule('hfc'); // 'hfc' stands for 'Hyperledger Fabric Client'
var asn1 = jsrsa.asn1;
var asn1Builder = require('asn1');
var _caProto = grpc.load(__dirname + "/protos/ca.proto").protos;
var _fabricProto = grpc.load(__dirname + "/protos/fabric.proto").protos;
var _chaincodeProto = grpc.load(__dirname + "/protos/chaincode.proto").protos;
var net = require('net');
var DEFAULT_SECURITY_LEVEL = 256;
var DEFAULT_HASH_ALGORITHM = "SHA3";
var CONFIDENTIALITY_1_2_STATE_KD_C6 = 6;
var _chains = {};
// A request to get a batch of TCerts
var GetTCertBatchRequest = (function () {
    function GetTCertBatchRequest(name, enrollment, num, attrs) {
        this.name = name;
        this.enrollment = enrollment;
        this.num = num;
        this.attrs = attrs;
    }
    ;
    return GetTCertBatchRequest;
}());
exports.GetTCertBatchRequest = GetTCertBatchRequest;
// This is the object that is delivered as the result with the "submitted" event
// from a Transaction object for a **deploy** operation.
var EventDeploySubmitted = (function () {
    // The transaction ID of a deploy transaction which was successfully submitted.
    function EventDeploySubmitted(uuid, chaincodeID) {
        this.uuid = uuid;
        this.chaincodeID = chaincodeID;
    }
    ;
    return EventDeploySubmitted;
}());
exports.EventDeploySubmitted = EventDeploySubmitted;
// This is the object that is delivered as the result with the "complete" event
// from a Transaction object for a **deploy** operation.
// TODO: This class may change once the real event processing is added.
var EventDeployComplete = (function () {
    function EventDeployComplete(uuid, chaincodeID, result) {
        this.uuid = uuid;
        this.chaincodeID = chaincodeID;
        this.result = result;
    }
    ;
    return EventDeployComplete;
}());
exports.EventDeployComplete = EventDeployComplete;
// This is the data that is delivered as the result with the "submitted" event
// from a Transaction object for an **invoke** operation.
var EventInvokeSubmitted = (function () {
    // The transaction ID of an invoke transaction which was successfully submitted.
    function EventInvokeSubmitted(uuid) {
        this.uuid = uuid;
    }
    ;
    return EventInvokeSubmitted;
}());
exports.EventInvokeSubmitted = EventInvokeSubmitted;
// This is the object that is delivered as the result with the "complete" event
// from a Transaction object for a **invoke** operation.
// TODO: This class may change once the real event processing is added.
var EventInvokeComplete = (function () {
    function EventInvokeComplete(result) {
        this.result = result;
    }
    ;
    return EventInvokeComplete;
}());
exports.EventInvokeComplete = EventInvokeComplete;
// This is the object that is delivered as the result with the "complete" event
// from a Transaction object for a **query** operation.
var EventQueryComplete = (function () {
    function EventQueryComplete(result) {
        this.result = result;
    }
    ;
    return EventQueryComplete;
}());
exports.EventQueryComplete = EventQueryComplete;
// This is the data that is delivered as the result with the "error" event
// from a Transaction object for any of the following operations:
// **deploy**, **invoke**, or **query**.
var EventTransactionError = (function () {
    // The transaction ID of an invoke transaction which was successfully submitted.
    function EventTransactionError(error) {
        this.error = error;
        if (error && error.msg && isFunction(error.msg.toString)) {
            this.msg = error.msg.toString();
        }
        else if (isFunction(error.toString)) {
            this.msg = error.toString();
        }
    }
    ;
    return EventTransactionError;
}());
exports.EventTransactionError = EventTransactionError;
(function (PrivacyLevel) {
    PrivacyLevel[PrivacyLevel["Nominal"] = 0] = "Nominal";
    PrivacyLevel[PrivacyLevel["Anonymous"] = 1] = "Anonymous";
})(exports.PrivacyLevel || (exports.PrivacyLevel = {}));
var PrivacyLevel = exports.PrivacyLevel;
// The base Certificate class
var Certificate = (function () {
    function Certificate(cert, privateKey, 
        /** Denoting if the Certificate is anonymous or carrying its owner's identity. */
        privLevel) {
        this.cert = cert;
        this.privateKey = privateKey;
        this.privLevel = privLevel;
    }
    Certificate.prototype.encode = function () {
        return this.cert;
    };
    return Certificate;
}());
exports.Certificate = Certificate;
/**
 * Enrollment certificate.
 */
var ECert = (function (_super) {
    __extends(ECert, _super);
    function ECert(cert, privateKey) {
        _super.call(this, cert, privateKey, PrivacyLevel.Nominal);
        this.cert = cert;
        this.privateKey = privateKey;
    }
    return ECert;
}(Certificate));
/**
 * Transaction certificate.
 */
var TCert = (function (_super) {
    __extends(TCert, _super);
    function TCert(publicKey, privateKey) {
        _super.call(this, publicKey, privateKey, PrivacyLevel.Anonymous);
        this.publicKey = publicKey;
        this.privateKey = privateKey;
    }
    return TCert;
}(Certificate));
exports.TCert = TCert;
var Transaction = (function () {
    function Transaction(pb, chaincodeID) {
        this.pb = pb;
        this.chaincodeID = chaincodeID;
    }
    ;
    return Transaction;
}());
exports.Transaction = Transaction;
/**
 * The class representing a chain with which the client SDK interacts.
 */
var Chain = (function () {
    function Chain(name) {
        // The peers on this chain to which the client can connect
        this.peers = [];
        // Security enabled flag
        this.securityEnabled = true;
        // A member cache associated with this chain
        // TODO: Make an LRU to limit size of member cache
        this.members = {};
        // The number of tcerts to get in each batch
        this.tcertBatchSize = 200;
        // Is in dev mode or network mode
        this.devMode = false;
        // If in prefetch mode, we prefetch tcerts from member services to help performance
        this.preFetchMode = true;
        // Temporary variables to control how long to wait for deploy and invoke to complete before
        // emitting events.  This will be removed when the SDK is able to receive events from the
        this.deployWaitTime = 30;
        this.invokeWaitTime = 5;
        this.name = name;
        this.eventHub = new EventHub();
    }
    /**
     * Get the chain name.
     * @returns The name of the chain.
     */
    Chain.prototype.getName = function () {
        return this.name;
    };
    /**
     * Add a peer given an endpoint specification.
     * @param url The URL of the peer.
     * @param opts Optional GRPC options.
     * @returns {Peer} Returns a new peer.
     */
    Chain.prototype.addPeer = function (url, opts) {
        //check to see if the peer is already part of the chain
        this.peers.forEach(function (peer) {
            if (peer.getUrl() === url) {
                var error = new Error();
                error.name = "DuplicatePeer";
                error.message = "Peer with URL " + url + " is already a member of the chain";
                throw error;
            }
        });
        var peer = new Peer(url, this, opts);
        this.peers.push(peer);
        return peer;
    };
    ;
    /**
     * Get the peers for this chain.
     */
    Chain.prototype.getPeers = function () {
        return this.peers;
    };
    /**
     * Get the member whose credentials are used to register and enroll other users, or undefined if not set.
     * @param {Member} The member whose credentials are used to perform registration, or undefined if not set.
     */
    Chain.prototype.getRegistrar = function () {
        return this.registrar;
    };
    /**
     * Set the member whose credentials are used to register and enroll other users.
     * @param {Member} registrar The member whose credentials are used to perform registration.
     */
    Chain.prototype.setRegistrar = function (registrar) {
        this.registrar = registrar;
    };
    /**
     * Set the member services URL
     * @param {string} url Member services URL of the form: "grpc://host:port" or "grpcs://host:port"
     * @param {GRPCOptions} opts optional GRPC options
     */
    Chain.prototype.setMemberServicesUrl = function (url, opts) {
        this.setMemberServices(newMemberServices(url, opts));
    };
    /**
     * Get the member service associated this chain.
     * @returns {MemberService} Return the current member service, or undefined if not set.
     */
    Chain.prototype.getMemberServices = function () {
        return this.memberServices;
    };
    ;
    /**
     * Set the member service associated this chain.  This allows the default implementation of member service to be overridden.
     */
    Chain.prototype.setMemberServices = function (memberServices) {
        this.memberServices = memberServices;
        if (memberServices instanceof MemberServicesImpl) {
            this.cryptoPrimitives = memberServices.getCrypto();
        }
    };
    ;
    /**
     * Get the eventHub service associated this chain.
     * @returns {eventHub} Return the current eventHub service, or undefined if not set.
     */
    Chain.prototype.getEventHub = function () {
        return this.eventHub;
    };
    ;
    /**
     * Set and connect to the peer to be used as the event source.
     */
    Chain.prototype.eventHubConnect = function (peerUrl, opts) {
        this.eventHub.setPeerAddr(peerUrl, opts);
        this.eventHub.connect();
    };
    ;
    /**
     * Set and connect to the peer to be used as the event source.
     */
    Chain.prototype.eventHubDisconnect = function () {
        this.eventHub.disconnect();
    };
    ;
    /**
     * Determine if security is enabled.
     */
    Chain.prototype.isSecurityEnabled = function () {
        return this.memberServices !== undefined;
    };
    /**
     * Determine if pre-fetch mode is enabled to prefetch tcerts.
     */
    Chain.prototype.isPreFetchMode = function () {
        return this.preFetchMode;
    };
    /**
     * Set prefetch mode to true or false.
     */
    Chain.prototype.setPreFetchMode = function (preFetchMode) {
        this.preFetchMode = preFetchMode;
    };
    /**
     * Enable or disable ECDSA mode for GRPC.
     */
    Chain.prototype.setECDSAModeForGRPC = function (enabled) {
        // TODO: Handle multiple chains in different modes appropriately; this will not currently work
        // since it is based env variables.
        if (enabled) {
            // Instruct boringssl to use ECC for tls.
            process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';
        }
        else {
            delete process.env.GRPC_SSL_CIPHER_SUITES;
        }
    };
    /**
     * Determine if dev mode is enabled.
     */
    Chain.prototype.isDevMode = function () {
        return this.devMode;
    };
    /**
     * Set dev mode to true or false.
     */
    Chain.prototype.setDevMode = function (devMode) {
        this.devMode = devMode;
    };
    /**
     * Get the deploy wait time in seconds.
     */
    Chain.prototype.getDeployWaitTime = function () {
        return this.deployWaitTime;
    };
    /**
     * Set the deploy wait time in seconds.
     * Node.js will automatically enforce a
     * minimum and maximum wait time.  If the
     * number of seconds is larger than 2147483,
     * less than 1, or not a number,
     * the actual wait time used will be 1 ms.
     * @param secs
     */
    Chain.prototype.setDeployWaitTime = function (secs) {
        this.deployWaitTime = secs;
    };
    /**
     * Get the invoke wait time in seconds.
     */
    Chain.prototype.getInvokeWaitTime = function () {
        return this.invokeWaitTime;
    };
    /**
     * Set the invoke wait time in seconds.
     * @param secs
     */
    Chain.prototype.setInvokeWaitTime = function (secs) {
        this.invokeWaitTime = secs;
    };
    /**
     * Get the key val store implementation (if any) that is currently associated with this chain.
     * @returns {KeyValStore} Return the current KeyValStore associated with this chain, or undefined if not set.
     */
    Chain.prototype.getKeyValStore = function () {
        return this.keyValStore;
    };
    /**
     * Set the key value store implementation.
     */
    Chain.prototype.setKeyValStore = function (keyValStore) {
        this.keyValStore = keyValStore;
    };
    /**
     * Get the tcert batch size.
     */
    Chain.prototype.getTCertBatchSize = function () {
        return this.tcertBatchSize;
    };
    /**
     * Set the tcert batch size.
     */
    Chain.prototype.setTCertBatchSize = function (batchSize) {
        this.tcertBatchSize = batchSize;
    };
    /**
     * Get the user member named 'name' or create
     * a new member if the member does not exist.
     * @param cb Callback of form "function(err,Member)"
     */
    Chain.prototype.getMember = function (name, cb) {
        var self = this;
        cb = cb || nullCB;
        if (!self.keyValStore)
            return cb(Error("No key value store was found.  You must first call Chain.configureKeyValStore or Chain.setKeyValStore"));
        if (!self.memberServices)
            return cb(Error("No member services was found.  You must first call Chain.configureMemberServices or Chain.setMemberServices"));
        self.getMemberHelper(name, function (err, member) {
            if (err)
                return cb(err);
            cb(null, member);
        });
    };
    /**
     * Get a user.
     * A user is a specific type of member.
     * Another type of member is a peer.
     */
    Chain.prototype.getUser = function (name, cb) {
        return this.getMember(name, cb);
    };
    // Try to get the member from cache.
    // If not found, create a new one.
    // If member is found in the key value store,
    //    restore the state to the new member, store in cache and return the member.
    // If there are no errors and member is not found in the key value store,
    //    return the new member.
    Chain.prototype.getMemberHelper = function (name, cb) {
        var self = this;
        // Try to get the member state from the cache
        var member = self.members[name];
        if (member)
            return cb(null, member);
        // Create the member and try to restore it's state from the key value store (if found).
        member = new Member(name, self);
        member.restoreState(function (err) {
            if (err)
                return cb(err);
            self.members[name] = member;
            cb(null, member);
        });
    };
    /**
     * Register a user or other member type with the chain.
     * @param registrationRequest Registration information.
     * @param cb Callback with registration results
     */
    Chain.prototype.register = function (registrationRequest, cb) {
        var self = this;
        self.getMember(registrationRequest.enrollmentID, function (err, member) {
            if (err)
                return cb(err);
            member.register(registrationRequest, cb);
        });
    };
    /**
     * Enroll a user or other identity which has already been registered.
     * If the user has already been enrolled, this will still succeed.
     * @param name The name of the user or other member to enroll.
     * @param secret The secret of the user or other member to enroll.
     * @param cb The callback to return the user or other member.
     */
    Chain.prototype.enroll = function (name, secret, cb) {
        var self = this;
        self.getMember(name, function (err, member) {
            if (err)
                return cb(err);
            member.enroll(secret, function (err) {
                if (err)
                    return cb(err);
                return cb(null, member);
            });
        });
    };
    /**
     * Register and enroll a user or other member type.
     * This assumes that a registrar with sufficient privileges has been set.
     * @param registrationRequest Registration information.
     * @params
     */
    Chain.prototype.registerAndEnroll = function (registrationRequest, cb) {
        var self = this;
        self.getMember(registrationRequest.enrollmentID, function (err, member) {
            if (err)
                return cb(err);
            if (member.isEnrolled()) {
                debug("already enrolled");
                return cb(null, member);
            }
            member.registerAndEnroll(registrationRequest, function (err) {
                if (err)
                    return cb(err);
                return cb(null, member);
            });
        });
    };
    /**
     * Send a transaction to a peer.
     * @param tx A transaction
     * @param eventEmitter An event emitter
     */
    Chain.prototype.sendTransaction = function (tx, eventEmitter) {
        var _this = this;
        if (this.peers.length === 0) {
            return eventEmitter.emit('error', new EventTransactionError(util.format("chain %s has no peers", this.getName())));
        }
        var peers = this.peers;
        var trySendTransaction = function (pidx) {
            if (pidx >= peers.length) {
                eventEmitter.emit('error', new EventTransactionError("None of " + peers.length + " peers reponding"));
                return;
            }
            var p = urlParser.parse(peers[pidx].getUrl());
            var client = new net.Socket();
            var tryNext = function () {
                debug("Skipping unresponsive peer " + peers[pidx].getUrl());
                client.destroy();
                trySendTransaction(pidx + 1);
            };
            client.on('timeout', tryNext);
            client.on('error', tryNext);
            client.connect(p.port, p.hostname, function () {
                if (pidx > 0 && peers === _this.peers)
                    _this.peers = peers.slice(pidx).concat(peers.slice(0, pidx));
                client.destroy();
                peers[pidx].sendTransaction(tx, eventEmitter);
            });
        };
        trySendTransaction(0);
    };
    return Chain;
}());
exports.Chain = Chain;
/**
 * A member is an entity that transacts on a chain.
 * Types of members include end users, peers, etc.
 */
var Member = (function () {
    /**
     * Constructor for a member.
     * @param cfg {string | RegistrationRequest} The member name or registration request.
     * @returns {Member} A member who is neither registered nor enrolled.
     */
    function Member(cfg, chain) {
        this.tcertGetterMap = {};
        if (util.isString(cfg)) {
            this.name = cfg;
        }
        else if (util.isObject(cfg)) {
            var req = cfg;
            this.name = req.enrollmentID || req.name;
            this.roles = req.roles || ['fabric.user'];
            this.affiliation = req.affiliation;
        }
        this.chain = chain;
        this.memberServices = chain.getMemberServices();
        this.keyValStore = chain.getKeyValStore();
        this.keyValStoreName = toKeyValStoreName(this.name);
        this.tcertBatchSize = chain.getTCertBatchSize();
    }
    /**
     * Get the member name.
     * @returns {string} The member name.
     */
    Member.prototype.getName = function () {
        return this.name;
    };
    /**
     * Get the chain.
     * @returns {Chain} The chain.
     */
    Member.prototype.getChain = function () {
        return this.chain;
    };
    ;
    /**
     * Get the member services.
     * @returns {MemberServices} The member services.
     */
    Member.prototype.getMemberServices = function () {
        return this.memberServices;
    };
    ;
    /**
     * Get the roles.
     * @returns {string[]} The roles.
     */
    Member.prototype.getRoles = function () {
        return this.roles;
    };
    ;
    /**
     * Set the roles.
     * @param roles {string[]} The roles.
     */
    Member.prototype.setRoles = function (roles) {
        this.roles = roles;
    };
    ;
    /**
     * Get the affiliation.
     * @returns {string} The affiliation.
     */
    Member.prototype.getAffiliation = function () {
        return this.affiliation;
    };
    ;
    /**
     * Set the affiliation.
     * @param affiliation The affiliation.
     */
    Member.prototype.setAffiliation = function (affiliation) {
        this.affiliation = affiliation;
    };
    ;
    /**
     * Get the transaction certificate (tcert) batch size, which is the number of tcerts retrieved
     * from member services each time (i.e. in a single batch).
     * @returns The tcert batch size.
     */
    Member.prototype.getTCertBatchSize = function () {
        if (this.tcertBatchSize === undefined) {
            return this.chain.getTCertBatchSize();
        }
        else {
            return this.tcertBatchSize;
        }
    };
    /**
     * Set the transaction certificate (tcert) batch size.
     * @param batchSize
     */
    Member.prototype.setTCertBatchSize = function (batchSize) {
        this.tcertBatchSize = batchSize;
    };
    /**
     * Get the enrollment info.
     * @returns {Enrollment} The enrollment.
     */
    Member.prototype.getEnrollment = function () {
        return this.enrollment;
    };
    ;
    /**
     * Determine if this name has been registered.
     * @returns {boolean} True if registered; otherwise, false.
     */
    Member.prototype.isRegistered = function () {
        return this.enrollmentSecret !== undefined;
    };
    /**
     * Determine if this name has been enrolled.
     * @returns {boolean} True if enrolled; otherwise, false.
     */
    Member.prototype.isEnrolled = function () {
        return this.enrollment !== undefined;
    };
    /**
     * Register the member.
     * @param cb Callback of the form: {function(err,enrollmentSecret)}
     */
    Member.prototype.register = function (registrationRequest, cb) {
        var self = this;
        cb = cb || nullCB;
        if (registrationRequest.enrollmentID !== self.getName()) {
            return cb(Error("registration enrollment ID and member name are not equal"));
        }
        var enrollmentSecret = this.enrollmentSecret;
        if (enrollmentSecret) {
            debug("previously registered, enrollmentSecret=%s", enrollmentSecret);
            return cb(null, enrollmentSecret);
        }
        self.memberServices.register(registrationRequest, self.chain.getRegistrar(), function (err, enrollmentSecret) {
            debug("memberServices.register err=%s, secret=%s", err, enrollmentSecret);
            if (err)
                return cb(err);
            self.enrollmentSecret = enrollmentSecret;
            self.saveState(function (err) {
                if (err)
                    return cb(err);
                cb(null, enrollmentSecret);
            });
        });
    };
    /**
     * Enroll the member and return the enrollment results.
     * @param enrollmentSecret The password or enrollment secret as returned by register.
     * @param cb Callback to report an error if it occurs
     */
    Member.prototype.enroll = function (enrollmentSecret, cb) {
        var self = this;
        cb = cb || nullCB;
        var enrollment = self.enrollment;
        if (enrollment) {
            debug("Previously enrolled, [enrollment=%j]", enrollment);
            return cb(null, enrollment);
        }
        var req = { enrollmentID: self.getName(), enrollmentSecret: enrollmentSecret };
        debug("Enrolling [req=%j]", req);
        self.memberServices.enroll(req, function (err, enrollment) {
            debug("[memberServices.enroll] err=%s, enrollment=%j", err, enrollment);
            if (err)
                return cb(err);
            self.enrollment = enrollment;
            // Generate queryStateKey
            self.enrollment.queryStateKey = self.chain.cryptoPrimitives.generateNonce();
            // Save state
            self.saveState(function (err) {
                if (err)
                    return cb(err);
                // Unmarshall chain key
                // TODO: during restore, unmarshall enrollment.chainKey
                debug("[memberServices.enroll] Unmarshalling chainKey");
                var ecdsaChainKey = self.chain.cryptoPrimitives.ecdsaPEMToPublicKey(self.enrollment.chainKey);
                self.enrollment.enrollChainKey = ecdsaChainKey;
                cb(null, enrollment);
            });
        });
    };
    /**
     * Perform both registration and enrollment.
     * @param cb Callback of the form: {function(err,{key,cert,chainKey})}
     */
    Member.prototype.registerAndEnroll = function (registrationRequest, cb) {
        var self = this;
        cb = cb || nullCB;
        var enrollment = self.enrollment;
        if (enrollment) {
            debug("previously enrolled, enrollment=%j", enrollment);
            return cb(null);
        }
        self.register(registrationRequest, function (err, enrollmentSecret) {
            if (err)
                return cb(err);
            self.enroll(enrollmentSecret, function (err, enrollment) {
                if (err)
                    return cb(err);
                cb(null);
            });
        });
    };
    /**
     * Issue a deploy request on behalf of this member.
     * @param deployRequest {Object}
     * @returns {TransactionContext} Emits 'submitted', 'complete', and 'error' events.
     */
    Member.prototype.deploy = function (deployRequest) {
        debug("Member.deploy");
        var tx = this.newTransactionContext();
        tx.deploy(deployRequest);
        return tx;
    };
    /**
     * Issue a invoke request on behalf of this member.
     * @param invokeRequest {Object}
     * @returns {TransactionContext} Emits 'submitted', 'complete', and 'error' events.
     */
    Member.prototype.invoke = function (invokeRequest) {
        debug("Member.invoke");
        var tx = this.newTransactionContext();
        tx.invoke(invokeRequest);
        return tx;
    };
    /**
     * Issue a query request on behalf of this member.
     * @param queryRequest {Object}
     * @returns {TransactionContext} Emits 'submitted', 'complete', and 'error' events.
     */
    Member.prototype.query = function (queryRequest) {
        debug("Member.query");
        var tx = this.newTransactionContext();
        tx.query(queryRequest);
        return tx;
    };
    /**
     * Create a transaction context with which to issue build, deploy, invoke, or query transactions.
     * Only call this if you want to use the same tcert for multiple transactions.
     * @param {Object} tcert A transaction certificate from member services.  This is optional.
     * @returns A transaction context.
     */
    Member.prototype.newTransactionContext = function (tcert) {
        return new TransactionContext(this, tcert);
    };
    /**
     * Get a user certificate.
     * @param attrs The names of attributes to include in the user certificate.
     * @param cb A GetTCertCallback
     */
    Member.prototype.getUserCert = function (attrs, cb) {
        this.getNextTCert(attrs, cb);
    };
    /**
   * Get the next available transaction certificate with the appropriate attributes.
   * @param cb
   */
    Member.prototype.getNextTCert = function (attrs, cb) {
        var self = this;
        if (!self.isEnrolled()) {
            return cb(Error(util.format("user '%s' is not enrolled", self.getName())));
        }
        var key = getAttrsKey(attrs);
        debug("Member.getNextTCert: key=%s", key);
        var tcertGetter = self.tcertGetterMap[key];
        if (!tcertGetter) {
            debug("Member.getNextTCert: key=%s, creating new getter", key);
            tcertGetter = new TCertGetter(self, attrs, key);
            self.tcertGetterMap[key] = tcertGetter;
        }
        return tcertGetter.getNextTCert(cb);
    };
    /**
     * Save the state of this member to the key value store.
     * @param cb Callback of the form: {function(err}
     */
    Member.prototype.saveState = function (cb) {
        var self = this;
        self.keyValStore.setValue(self.keyValStoreName, self.toString(), cb);
    };
    /**
     * Restore the state of this member from the key value store (if found).  If not found, do nothing.
     * @param cb Callback of the form: function(err}
     */
    Member.prototype.restoreState = function (cb) {
        var self = this;
        self.keyValStore.getValue(self.keyValStoreName, function (err, memberStr) {
            if (err)
                return cb(err);
            // debug("restoreState: name=%s, memberStr=%s", self.getName(), memberStr);
            if (memberStr) {
                // The member was found in the key value store, so restore the state.
                self.fromString(memberStr);
            }
            cb(null);
        });
    };
    /**
     * Get the current state of this member as a string
     * @return {string} The state of this member as a string
     */
    Member.prototype.fromString = function (str) {
        var state = JSON.parse(str);
        if (state.name !== this.getName())
            throw Error("name mismatch: '" + state.name + "' does not equal '" + this.getName() + "'");
        this.name = state.name;
        this.roles = state.roles;
        this.affiliation = state.affiliation;
        this.enrollmentSecret = state.enrollmentSecret;
        this.enrollment = state.enrollment;
    };
    /**
     * Save the current state of this member as a string
     * @return {string} The state of this member as a string
     */
    Member.prototype.toString = function () {
        var self = this;
        var state = {
            name: self.name,
            roles: self.roles,
            affiliation: self.affiliation,
            enrollmentSecret: self.enrollmentSecret,
            enrollment: self.enrollment
        };
        return JSON.stringify(state);
    };
    return Member;
}());
exports.Member = Member;
/**
 * A transaction context emits events 'submitted', 'complete', and 'error'.
 * Each transaction context uses exactly one tcert.
 */
var TransactionContext = (function (_super) {
    __extends(TransactionContext, _super);
    function TransactionContext(member, tcert) {
        _super.call(this);
        this.member = member;
        this.chain = member.getChain();
        this.memberServices = this.chain.getMemberServices();
        this.tcert = tcert;
        this.nonce = this.chain.cryptoPrimitives.generateNonce();
        this.complete = false;
        this.timeoutId = null;
    }
    /**
     * Get the member with which this transaction context is associated.
     * @returns The member
     */
    TransactionContext.prototype.getMember = function () {
        return this.member;
    };
    /**
     * Get the chain with which this transaction context is associated.
     * @returns The chain
     */
    TransactionContext.prototype.getChain = function () {
        return this.chain;
    };
    ;
    /**
     * Get the member services, or undefined if security is not enabled.
     * @returns The member services
     */
    TransactionContext.prototype.getMemberServices = function () {
        return this.memberServices;
    };
    ;
    /**
     * Emit a specific event provided an event listener is already registered.
     */
    TransactionContext.prototype.emitMyEvent = function (name, event) {
        var self = this;
        setTimeout(function () {
            // Check if an event listener has been registered for the event
            var listeners = self.listeners(name);
            // If an event listener has been registered, emit the event
            if (listeners && listeners.length > 0) {
                self.emit(name, event);
            }
        }, 0);
    };
    /**
     * Issue a deploy transaction.
     * @param deployRequest {Object} A deploy request of the form: { chaincodeID, payload, metadata, uuid, timestamp, confidentiality: { level, version, nonce }
   */
    TransactionContext.prototype.deploy = function (deployRequest) {
        debug("TransactionContext.deploy");
        debug("Received deploy request: %j", deployRequest);
        var self = this;
        // Get a TCert to use in the deployment transaction
        self.getMyTCert(function (err) {
            if (err) {
                debug('Failed getting a new TCert [%s]', err);
                self.emitMyEvent('error', new EventTransactionError(err));
                return self;
            }
            debug("Got a TCert successfully, continue...");
            self.newBuildOrDeployTransaction(deployRequest, false, function (err, deployTx) {
                if (err) {
                    debug("Error in newBuildOrDeployTransaction [%s]", err);
                    self.emitMyEvent('error', new EventTransactionError(err));
                    return self;
                }
                debug("Calling TransactionContext.execute");
                return self.execute(deployTx);
            });
        });
        return self;
    };
    /**
     * Issue an invoke transaction.
     * @param invokeRequest {Object} An invoke request of the form: XXX
     */
    TransactionContext.prototype.invoke = function (invokeRequest) {
        debug("TransactionContext.invoke");
        debug("Received invoke request: %j", invokeRequest);
        var self = this;
        // Get a TCert to use in the invoke transaction
        self.setAttrs(invokeRequest.attrs);
        self.getMyTCert(function (err, tcert) {
            if (err) {
                debug('Failed getting a new TCert [%s]', err);
                self.emitMyEvent('error', new EventTransactionError(err));
                return self;
            }
            debug("Got a TCert successfully, continue...");
            self.newInvokeOrQueryTransaction(invokeRequest, true, function (err, invokeTx) {
                if (err) {
                    debug("Error in newInvokeOrQueryTransaction [%s]", err);
                    self.emitMyEvent('error', new EventTransactionError(err));
                    return self;
                }
                debug("Calling TransactionContext.execute");
                return self.execute(invokeTx);
            });
        });
        return self;
    };
    /**
     * Issue an query transaction.
     * @param queryRequest {Object} A query request of the form: XXX
     */
    TransactionContext.prototype.query = function (queryRequest) {
        debug("TransactionContext.query");
        debug("Received query request: %j", queryRequest);
        var self = this;
        // Get a TCert to use in the query transaction
        self.setAttrs(queryRequest.attrs);
        self.getMyTCert(function (err, tcert) {
            if (err) {
                debug('Failed getting a new TCert [%s]', err);
                self.emitMyEvent('error', new EventTransactionError(err));
                return self;
            }
            debug("Got a TCert successfully, continue...");
            self.newInvokeOrQueryTransaction(queryRequest, false, function (err, queryTx) {
                if (err) {
                    debug("Error in newInvokeOrQueryTransaction [%s]", err);
                    self.emitMyEvent('error', new EventTransactionError(err));
                    return self;
                }
                debug("Calling TransactionContext.execute");
                return self.execute(queryTx);
            });
        });
        return self;
    };
    /**
     * Get the attribute names associated
     */
    TransactionContext.prototype.getAttrs = function () {
        return this.attrs;
    };
    /**
     * Set the attributes for this transaction context.
     */
    TransactionContext.prototype.setAttrs = function (attrs) {
        this.attrs = attrs;
    };
    /**
     * Execute a transaction
     * @param tx {Transaction} The transaction.
     */
    TransactionContext.prototype.execute = function (tx) {
        debug('Executing transaction');
        var self = this;
        // Get the TCert
        self.getMyTCert(function (err, tcert) {
            if (err) {
                debug('Failed getting a new TCert [%s]', err);
                return self.emit('error', new EventTransactionError(err));
            }
            if (tcert) {
                // Set nonce
                tx.pb.setNonce(self.nonce);
                // Process confidentiality
                debug('Process Confidentiality...');
                self.processConfidentiality(tx);
                debug('Sign transaction...');
                // Add the tcert
                tx.pb.setCert(tcert.publicKey);
                // sign the transaction bytes
                var txBytes = tx.pb.toBuffer();
                var derSignature = self.chain.cryptoPrimitives.ecdsaSign(tcert.privateKey.getPrivate('hex'), txBytes).toDER();
                // debug('signature: ', derSignature);
                tx.pb.setSignature(new Buffer(derSignature));
                debug('Send transaction...');
                debug('Confidentiality: ', tx.pb.getConfidentialityLevel());
                if (tx.pb.getConfidentialityLevel() == _fabricProto.ConfidentialityLevel.CONFIDENTIAL &&
                    tx.pb.getType() == _fabricProto.Transaction.Type.CHAINCODE_QUERY) {
                    // Need to send a different event emitter so we can catch the response
                    // and perform decryption before sending the real complete response
                    // to the caller
                    var emitter = new events.EventEmitter();
                    emitter.on("complete", function (event) {
                        debug("Encrypted: [%j]", event);
                        event.result = self.decryptResult(event.result);
                        debug("Decrypted: [%j]", event);
                        self.emit("complete", event);
                    });
                    emitter.on("error", function (event) {
                        self.emit("error", event);
                    });
                    self.getChain().sendTransaction(tx, emitter);
                }
                else {
                    var txType = tx.pb.getType();
                    var uuid_1 = tx.pb.getTxid();
                    var eh_1 = self.getChain().getEventHub();
                    // async deploy and invokes need to maintain
                    // tx context(completion status(self.complete))
                    if (txType == _fabricProto.Transaction.Type.CHAINCODE_DEPLOY) {
                        self.cevent = new EventDeployComplete(uuid_1, tx.chaincodeID);
                        self.waitTime = self.getChain().getDeployWaitTime();
                    }
                    else if (txType == _fabricProto.Transaction.Type.CHAINCODE_INVOKE) {
                        self.cevent = new EventInvokeComplete("Tx " + uuid_1 + " complete");
                        self.waitTime = self.getChain().getInvokeWaitTime();
                    }
                    eh_1.registerTxEvent(uuid_1, function (uuid) {
                        self.complete = true;
                        if (self.timeoutId) {
                            clearTimeout(self.timeoutId);
                        }
                        eh_1.unregisterTxEvent(uuid);
                        self.emit("complete", self.cevent);
                    });
                    self.getChain().sendTransaction(tx, self);
                    // sync query can be skipped as response
                    // is processed and event generated in sendTransaction
                    // no timeout processing is necessary
                    if (txType != _fabricProto.Transaction.Type.CHAINCODE_QUERY) {
                        debug("waiting %d seconds before emitting complete event", self.waitTime);
                        self.timeoutId = setTimeout(function () {
                            debug("timeout uuid=", uuid_1);
                            if (!self.complete)
                                // emit error if eventhub connect otherwise
                                // emit a complete event as done previously
                                if (eh_1.isconnected())
                                    self.emit("error", "timed out waiting for transaction to complete");
                                else
                                    self.emit("complete", self.cevent);
                            else
                                eh_1.unregisterTxEvent(uuid_1);
                        }, self.waitTime * 1000);
                    }
                }
            }
            else {
                debug('Missing TCert...');
                return self.emit('error', new EventTransactionError('Missing TCert.'));
            }
        });
        return self;
    };
    TransactionContext.prototype.getMyTCert = function (cb) {
        var self = this;
        if (!self.getChain().isSecurityEnabled() || self.tcert) {
            debug('[TransactionContext] TCert already cached.');
            return cb(null, self.tcert);
        }
        debug('[TransactionContext] No TCert cached. Retrieving one.');
        this.member.getNextTCert(self.attrs, function (err, tcert) {
            if (err)
                return cb(err);
            self.tcert = tcert;
            return cb(null, tcert);
        });
    };
    TransactionContext.prototype.processConfidentiality = function (transaction) {
        // is confidentiality required?
        if (transaction.pb.getConfidentialityLevel() != _fabricProto.ConfidentialityLevel.CONFIDENTIAL) {
            // No confidentiality is required
            return;
        }
        debug('Process Confidentiality ...');
        var self = this;
        // Set confidentiality level and protocol version
        transaction.pb.setConfidentialityProtocolVersion('1.2');
        // Generate transaction key. Common to all type of transactions
        var txKey = self.chain.cryptoPrimitives.eciesKeyGen();
        debug('txkey [%j]', txKey.pubKeyObj.pubKeyHex);
        debug('txKey.prvKeyObj %j', txKey.prvKeyObj.toString());
        var privBytes = self.chain.cryptoPrimitives.ecdsaPrivateKeyToASN1(txKey.prvKeyObj.prvKeyHex);
        debug('privBytes %s', privBytes.toString());
        // Generate stateKey. Transaction type dependent step.
        var stateKey;
        if (transaction.pb.getType() == _fabricProto.Transaction.Type.CHAINCODE_DEPLOY) {
            // The request is for a deploy
            stateKey = new Buffer(self.chain.cryptoPrimitives.aesKeyGen());
        }
        else if (transaction.pb.getType() == _fabricProto.Transaction.Type.CHAINCODE_INVOKE) {
            // The request is for an execute
            // Empty state key
            stateKey = new Buffer([]);
        }
        else {
            // The request is for a query
            debug('Generate state key...');
            stateKey = new Buffer(self.chain.cryptoPrimitives.hmacAESTruncated(self.member.getEnrollment().queryStateKey, [CONFIDENTIALITY_1_2_STATE_KD_C6].concat(self.nonce)));
        }
        // Prepare ciphertexts
        // Encrypts message to validators using self.enrollChainKey
        var chainCodeValidatorMessage1_2 = new asn1Builder.Ber.Writer();
        chainCodeValidatorMessage1_2.startSequence();
        chainCodeValidatorMessage1_2.writeBuffer(privBytes, 4);
        if (stateKey.length != 0) {
            debug('STATE KEY %j', stateKey);
            chainCodeValidatorMessage1_2.writeBuffer(stateKey, 4);
        }
        else {
            chainCodeValidatorMessage1_2.writeByte(4);
            chainCodeValidatorMessage1_2.writeLength(0);
        }
        chainCodeValidatorMessage1_2.endSequence();
        debug(chainCodeValidatorMessage1_2.buffer);
        debug('Using chain key [%j]', self.member.getEnrollment().chainKey);
        var ecdsaChainKey = self.chain.cryptoPrimitives.ecdsaPEMToPublicKey(self.member.getEnrollment().chainKey);
        var encMsgToValidators = self.chain.cryptoPrimitives.eciesEncryptECDSA(ecdsaChainKey, chainCodeValidatorMessage1_2.buffer);
        transaction.pb.setToValidators(encMsgToValidators);
        // Encrypts chaincodeID using txKey
        // debug('CHAINCODE ID %j', transaction.chaincodeID);
        var encryptedChaincodeID = self.chain.cryptoPrimitives.eciesEncrypt(txKey.pubKeyObj, transaction.pb.getChaincodeID().buffer);
        transaction.pb.setChaincodeID(encryptedChaincodeID);
        // Encrypts payload using txKey
        // debug('PAYLOAD ID %j', transaction.payload);
        var encryptedPayload = self.chain.cryptoPrimitives.eciesEncrypt(txKey.pubKeyObj, transaction.pb.getPayload().buffer);
        transaction.pb.setPayload(encryptedPayload);
        // Encrypt metadata using txKey
        if (transaction.pb.getMetadata() != null && transaction.pb.getMetadata().buffer != null) {
            debug('Metadata [%j]', transaction.pb.getMetadata().buffer);
            var encryptedMetadata = self.chain.cryptoPrimitives.eciesEncrypt(txKey.pubKeyObj, transaction.pb.getMetadata().buffer);
            transaction.pb.setMetadata(encryptedMetadata);
        }
    };
    TransactionContext.prototype.decryptResult = function (ct) {
        var key = new Buffer(this.chain.cryptoPrimitives.hmacAESTruncated(this.member.getEnrollment().queryStateKey, [CONFIDENTIALITY_1_2_STATE_KD_C6].concat(this.nonce)));
        debug('Decrypt Result [%s]', ct.toString('hex'));
        return this.chain.cryptoPrimitives.aes256GCMDecrypt(key, ct);
    };
    /**
     * Create a deploy transaction.
     * @param request {Object} A BuildRequest or DeployRequest
     */
    TransactionContext.prototype.newBuildOrDeployTransaction = function (request, isBuildRequest, cb) {
        debug("newBuildOrDeployTransaction");
        var self = this;
        // Determine if deployment is for dev mode or net mode
        if (self.chain.isDevMode()) {
            // Deployment in developent mode. Build a dev mode transaction.
            this.newDevModeTransaction(request, isBuildRequest, function (err, tx) {
                if (err) {
                    return cb(err);
                }
                else {
                    return cb(null, tx);
                }
            });
        }
        else {
            // Deployment in network mode. Build a net mode transaction.
            this.newNetModeTransaction(request, isBuildRequest, function (err, tx) {
                if (err) {
                    return cb(err);
                }
                else {
                    return cb(null, tx);
                }
            });
        }
    }; // end newBuildOrDeployTransaction
    /**
     * Create a development mode deploy transaction.
     * @param request {Object} A development mode BuildRequest or DeployRequest
     */
    TransactionContext.prototype.newDevModeTransaction = function (request, isBuildRequest, cb) {
        debug("newDevModeTransaction");
        var self = this;
        // Verify that chaincodeName is being passed
        if (!request.chaincodeName || request.chaincodeName === "") {
            return cb(Error("missing chaincodeName in DeployRequest"));
        }
        var tx = new _fabricProto.Transaction();
        if (isBuildRequest) {
            tx.setType(_fabricProto.Transaction.Type.CHAINCODE_BUILD);
        }
        else {
            tx.setType(_fabricProto.Transaction.Type.CHAINCODE_DEPLOY);
        }
        // Set the chaincodeID
        var chaincodeID = new _chaincodeProto.ChaincodeID();
        chaincodeID.setName(request.chaincodeName);
        debug("newDevModeTransaction: chaincodeID: " + JSON.stringify(chaincodeID));
        tx.setChaincodeID(chaincodeID.toBuffer());
        // Construct the ChaincodeSpec
        var chaincodeSpec = new _chaincodeProto.ChaincodeSpec();
        // Set Type -- GOLANG is the only chaincode language supported at this time
        chaincodeSpec.setType(_chaincodeProto.ChaincodeSpec.Type.GOLANG);
        // Set chaincodeID
        chaincodeSpec.setChaincodeID(chaincodeID);
        // Set ctorMsg
        var chaincodeInput = new _chaincodeProto.ChaincodeInput();
        chaincodeInput.setArgs(prepend(request.fcn, request.args));
        chaincodeSpec.setCtorMsg(chaincodeInput);
        // Construct the ChaincodeDeploymentSpec (i.e. the payload)
        var chaincodeDeploymentSpec = new _chaincodeProto.ChaincodeDeploymentSpec();
        chaincodeDeploymentSpec.setChaincodeSpec(chaincodeSpec);
        tx.setPayload(chaincodeDeploymentSpec.toBuffer());
        // Set the transaction UUID
        tx.setTxid(request.chaincodeName);
        // Set the transaction timestamp
        tx.setTimestamp(sdk_util.GenerateTimestamp());
        // Set confidentiality level
        if (request.confidential) {
            debug("Set confidentiality level to CONFIDENTIAL");
            tx.setConfidentialityLevel(_fabricProto.ConfidentialityLevel.CONFIDENTIAL);
        }
        else {
            debug("Set confidentiality level to PUBLIC");
            tx.setConfidentialityLevel(_fabricProto.ConfidentialityLevel.PUBLIC);
        }
        // Set request metadata
        if (request.metadata) {
            tx.setMetadata(request.metadata);
        }
        // Set the user certificate data
        if (request.userCert) {
            // cert based
            var certRaw = new Buffer(self.tcert.publicKey);
            // debug('========== Invoker Cert [%s]', certRaw.toString('hex'));
            var nonceRaw = new Buffer(self.nonce);
            var bindingMsg = Buffer.concat([certRaw, nonceRaw]);
            // debug('========== Binding Msg [%s]', bindingMsg.toString('hex'));
            this.binding = new Buffer(self.chain.cryptoPrimitives.hash(bindingMsg), 'hex');
            // debug('========== Binding [%s]', this.binding.toString('hex'));
            var ctor = chaincodeSpec.getCtorMsg().toBuffer();
            // debug('========== Ctor [%s]', ctor.toString('hex'));
            var txmsg = Buffer.concat([ctor, this.binding]);
            // debug('========== Payload||binding [%s]', txmsg.toString('hex'));
            var mdsig = self.chain.cryptoPrimitives.ecdsaSign(request.userCert.privateKey.getPrivate('hex'), txmsg);
            var sigma = new Buffer(mdsig.toDER());
            // debug('========== Sigma [%s]', sigma.toString('hex'));
            tx.setMetadata(sigma);
        }
        tx = new Transaction(tx, request.chaincodeName);
        return cb(null, tx);
    };
    /**
     * Create a network mode deploy transaction.
     * @param request {Object} A network mode BuildRequest or DeployRequest
     */
    TransactionContext.prototype.newNetModeTransaction = function (request, isBuildRequest, cb) {
        debug("newNetModeTransaction");
        var self = this;
        // Verify that chaincodePath is being passed
        if (!request.chaincodePath || request.chaincodePath === "") {
            return cb(Error("missing chaincodePath in DeployRequest"));
        }
        // Determine the user's $GOPATH
        var goPath = process.env['GOPATH'];
        debug("$GOPATH: " + goPath);
        // Compose the path to the chaincode project directory
        var projDir = goPath + "/src/" + request.chaincodePath;
        debug("projDir: " + projDir);
        // Compute the hash of the chaincode deployment parameters
        var hash = sdk_util.GenerateParameterHash(request.chaincodePath, request.fcn, request.args);
        // Compute the hash of the project directory contents
        hash = sdk_util.GenerateDirectoryHash(goPath + "/src/", request.chaincodePath, hash);
        debug("hash: " + hash);
        // Compose the Dockerfile commands
        var dockerFileContents = "from hyperledger/fabric-baseimage" + "\n" +
            "COPY . $GOPATH/src/build-chaincode/" + "\n" +
            "WORKDIR $GOPATH" + "\n\n" +
            "RUN go install build-chaincode && cp src/build-chaincode/vendor/github.com/hyperledger/fabric/peer/core.yaml $GOPATH/bin && mv $GOPATH/bin/build-chaincode $GOPATH/bin/%s";
        // Substitute the hashStrHash for the image name
        dockerFileContents = util.format(dockerFileContents, hash);
        // Add the certificate path on the server, if it is being passed in
        debug("type of request.certificatePath: " + typeof (request.certificatePath));
        debug("request.certificatePath: " + request.certificatePath);
        if (request.certificatePath !== "" && request.certificatePath !== undefined) {
            debug("Adding COPY certificate.pem command");
            dockerFileContents = dockerFileContents + "\n" + "COPY certificate.pem %s";
            dockerFileContents = util.format(dockerFileContents, request.certificatePath);
        }
        // Create a Docker file with dockerFileContents
        var dockerFilePath = projDir + "/Dockerfile";
        fs.writeFile(dockerFilePath, dockerFileContents, function (err) {
            if (err) {
                debug(util.format("Error writing file [%s]: %s", dockerFilePath, err));
                return cb(Error(util.format("Error writing file [%s]: %s", dockerFilePath, err)));
            }
            debug("Created Dockerfile at [%s]", dockerFilePath);
            // Create the .tar.gz file of the chaincode package
            var targzFilePath = "/tmp/deployment-package.tar.gz";
            // Create the compressed archive
            sdk_util.GenerateTarGz(projDir, targzFilePath, function (err) {
                if (err) {
                    debug(util.format("Error creating deployment archive [%s]: %s", targzFilePath, err));
                    return cb(Error(util.format("Error creating deployment archive [%s]: %s", targzFilePath, err)));
                }
                debug(util.format("Created deployment archive at [%s]", targzFilePath));
                //
                // Initialize a transaction structure
                //
                var tx = new _fabricProto.Transaction();
                //
                // Set the transaction type
                //
                if (isBuildRequest) {
                    tx.setType(_fabricProto.Transaction.Type.CHAINCODE_BUILD);
                }
                else {
                    tx.setType(_fabricProto.Transaction.Type.CHAINCODE_DEPLOY);
                }
                //
                // Set the chaincodeID
                //
                var chaincodeID = new _chaincodeProto.ChaincodeID();
                chaincodeID.setName(hash);
                debug("chaincodeID: " + JSON.stringify(chaincodeID));
                tx.setChaincodeID(chaincodeID.toBuffer());
                //
                // Set the payload
                //
                // Construct the ChaincodeSpec
                var chaincodeSpec = new _chaincodeProto.ChaincodeSpec();
                // Set Type -- GOLANG is the only chaincode language supported at this time
                chaincodeSpec.setType(_chaincodeProto.ChaincodeSpec.Type.GOLANG);
                // Set chaincodeID
                chaincodeSpec.setChaincodeID(chaincodeID);
                // Set ctorMsg
                var chaincodeInput = new _chaincodeProto.ChaincodeInput();
                chaincodeInput.setArgs(prepend(request.fcn, request.args));
                chaincodeSpec.setCtorMsg(chaincodeInput);
                debug("chaincodeSpec: " + JSON.stringify(chaincodeSpec));
                // Construct the ChaincodeDeploymentSpec and set it as the Transaction payload
                var chaincodeDeploymentSpec = new _chaincodeProto.ChaincodeDeploymentSpec();
                chaincodeDeploymentSpec.setChaincodeSpec(chaincodeSpec);
                // Read in the .tar.zg and set it as the CodePackage in ChaincodeDeploymentSpec
                fs.readFile(targzFilePath, function (err, data) {
                    if (err) {
                        debug(util.format("Error reading deployment archive [%s]: %s", targzFilePath, err));
                        return cb(Error(util.format("Error reading deployment archive [%s]: %s", targzFilePath, err)));
                    }
                    debug(util.format("Read in deployment archive from [%s]", targzFilePath));
                    chaincodeDeploymentSpec.setCodePackage(data);
                    tx.setPayload(chaincodeDeploymentSpec.toBuffer());
                    //
                    // Set the transaction ID
                    //
                    tx.setTxid(hash);
                    //
                    // Set the transaction timestamp
                    //
                    tx.setTimestamp(sdk_util.GenerateTimestamp());
                    //
                    // Set confidentiality level
                    //
                    if (request.confidential) {
                        debug("Set confidentiality level to CONFIDENTIAL");
                        tx.setConfidentialityLevel(_fabricProto.ConfidentialityLevel.CONFIDENTIAL);
                    }
                    else {
                        debug("Set confidentiality level to PUBLIC");
                        tx.setConfidentialityLevel(_fabricProto.ConfidentialityLevel.PUBLIC);
                    }
                    //
                    // Set request metadata
                    //
                    if (request.metadata) {
                        tx.setMetadata(request.metadata);
                    }
                    //
                    // Set the user certificate data
                    //
                    if (request.userCert) {
                        // cert based
                        var certRaw = new Buffer(self.tcert.publicKey);
                        // debug('========== Invoker Cert [%s]', certRaw.toString('hex'));
                        var nonceRaw = new Buffer(self.nonce);
                        var bindingMsg = Buffer.concat([certRaw, nonceRaw]);
                        // debug('========== Binding Msg [%s]', bindingMsg.toString('hex'));
                        self.binding = new Buffer(self.chain.cryptoPrimitives.hash(bindingMsg), 'hex');
                        // debug('========== Binding [%s]', self.binding.toString('hex'));
                        var ctor = chaincodeSpec.getCtorMsg().toBuffer();
                        // debug('========== Ctor [%s]', ctor.toString('hex'));
                        var txmsg = Buffer.concat([ctor, self.binding]);
                        // debug('========== Payload||binding [%s]', txmsg.toString('hex'));
                        var mdsig = self.chain.cryptoPrimitives.ecdsaSign(request.userCert.privateKey.getPrivate('hex'), txmsg);
                        var sigma = new Buffer(mdsig.toDER());
                        // debug('========== Sigma [%s]', sigma.toString('hex'));
                        tx.setMetadata(sigma);
                    }
                    //
                    // Clean up temporary files
                    //
                    // Remove the temporary .tar.gz with the deployment contents and the Dockerfile
                    fs.unlink(targzFilePath, function (err) {
                        if (err) {
                            debug(util.format("Error deleting temporary archive [%s]: %s", targzFilePath, err));
                            return cb(Error(util.format("Error deleting temporary archive [%s]: %s", targzFilePath, err)));
                        }
                        debug("Temporary archive deleted successfully ---> " + targzFilePath);
                        fs.unlink(dockerFilePath, function (err) {
                            if (err) {
                                debug(util.format("Error deleting temporary file [%s]: %s", dockerFilePath, err));
                                return cb(Error(util.format("Error deleting temporary file [%s]: %s", dockerFilePath, err)));
                            }
                            debug("File deleted successfully ---> " + dockerFilePath);
                            //
                            // Return the deploy transaction structure
                            //
                            tx = new Transaction(tx, hash);
                            return cb(null, tx);
                        }); // end delete Dockerfile
                    }); // end delete .tar.gz
                }); // end reading .tar.zg and composing transaction
            }); // end writing .tar.gz
        }); // end writing Dockerfile
    };
    /**
     * Create an invoke or query transaction.
     * @param request {Object} A build or deploy request of the form: { chaincodeID, payload, metadata, uuid, timestamp, confidentiality: { level, version, nonce }
     */
    TransactionContext.prototype.newInvokeOrQueryTransaction = function (request, isInvokeRequest, cb) {
        var self = this;
        // Verify that chaincodeID is being passed
        if (!request.chaincodeID || request.chaincodeID === "") {
            return cb(Error("missing chaincodeID in InvokeOrQueryRequest"));
        }
        // Create a deploy transaction
        var tx = new _fabricProto.Transaction();
        if (isInvokeRequest) {
            tx.setType(_fabricProto.Transaction.Type.CHAINCODE_INVOKE);
        }
        else {
            tx.setType(_fabricProto.Transaction.Type.CHAINCODE_QUERY);
        }
        // Set the chaincodeID
        var chaincodeID = new _chaincodeProto.ChaincodeID();
        chaincodeID.setName(request.chaincodeID);
        debug("newInvokeOrQueryTransaction: request=%j, chaincodeID=%s", request, JSON.stringify(chaincodeID));
        tx.setChaincodeID(chaincodeID.toBuffer());
        // Construct the ChaincodeSpec
        var chaincodeSpec = new _chaincodeProto.ChaincodeSpec();
        // Set Type -- GOLANG is the only chaincode language supported at this time
        chaincodeSpec.setType(_chaincodeProto.ChaincodeSpec.Type.GOLANG);
        // Set chaincodeID
        chaincodeSpec.setChaincodeID(chaincodeID);
        // Set ctorMsg
        var chaincodeInput = new _chaincodeProto.ChaincodeInput();
        chaincodeInput.setArgs(prepend(request.fcn, request.args));
        chaincodeSpec.setCtorMsg(chaincodeInput);
        // Construct the ChaincodeInvocationSpec (i.e. the payload)
        var chaincodeInvocationSpec = new _chaincodeProto.ChaincodeInvocationSpec();
        chaincodeInvocationSpec.setChaincodeSpec(chaincodeSpec);
        tx.setPayload(chaincodeInvocationSpec.toBuffer());
        // Set the transaction UUID
        tx.setTxid(sdk_util.GenerateUUID());
        // Set the transaction timestamp
        tx.setTimestamp(sdk_util.GenerateTimestamp());
        // Set confidentiality level
        if (request.confidential) {
            debug('Set confidentiality on');
            tx.setConfidentialityLevel(_fabricProto.ConfidentialityLevel.CONFIDENTIAL);
        }
        else {
            debug('Set confidentiality on');
            tx.setConfidentialityLevel(_fabricProto.ConfidentialityLevel.PUBLIC);
        }
        if (request.metadata) {
            tx.setMetadata(request.metadata);
        }
        if (request.userCert) {
            // cert based
            var certRaw = new Buffer(self.tcert.publicKey);
            // debug('========== Invoker Cert [%s]', certRaw.toString('hex'));
            var nonceRaw = new Buffer(self.nonce);
            var bindingMsg = Buffer.concat([certRaw, nonceRaw]);
            // debug('========== Binding Msg [%s]', bindingMsg.toString('hex'));
            this.binding = new Buffer(self.chain.cryptoPrimitives.hash(bindingMsg), 'hex');
            // debug('========== Binding [%s]', this.binding.toString('hex'));
            var ctor = chaincodeSpec.getCtorMsg().toBuffer();
            // debug('========== Ctor [%s]', ctor.toString('hex'));
            var txmsg = Buffer.concat([ctor, this.binding]);
            // debug('========== Pyaload||binding [%s]', txmsg.toString('hex'));
            var mdsig = self.chain.cryptoPrimitives.ecdsaSign(request.userCert.privateKey.getPrivate('hex'), txmsg);
            var sigma = new Buffer(mdsig.toDER());
            // debug('========== Sigma [%s]', sigma.toString('hex'));
            tx.setMetadata(sigma);
        }
        tx = new Transaction(tx, request.chaincodeID);
        return cb(null, tx);
    };
    return TransactionContext;
}(events.EventEmitter));
exports.TransactionContext = TransactionContext; // end TransactionContext
// A class to get TCerts.
// There is one class per set of attributes requested by each member.
var TCertGetter = (function () {
    /**
    * Constructor for a member.
    * @param cfg {string | RegistrationRequest} The member name or registration request.
    * @returns {Member} A member who is neither registered nor enrolled.
    */
    function TCertGetter(member, attrs, key) {
        this.tcerts = [];
        this.arrivalRate = new stats.Rate();
        this.getTCertResponseTime = new stats.ResponseTime();
        this.getTCertWaiters = [];
        this.gettingTCerts = false;
        this.member = member;
        this.attrs = attrs;
        this.key = key;
        this.chain = member.getChain();
        this.memberServices = member.getMemberServices();
        this.tcerts = [];
    }
    /**
    * Get the chain.
    * @returns {Chain} The chain.
    */
    TCertGetter.prototype.getChain = function () {
        return this.chain;
    };
    ;
    TCertGetter.prototype.getUserCert = function (cb) {
        this.getNextTCert(cb);
    };
    /**
    * Get the next available transaction certificate.
    * @param cb
    */
    TCertGetter.prototype.getNextTCert = function (cb) {
        var self = this;
        self.arrivalRate.tick();
        var tcert = self.tcerts.length > 0 ? self.tcerts.shift() : undefined;
        if (tcert) {
            return cb(null, tcert);
        }
        else {
            if (!cb)
                throw Error("null callback");
            self.getTCertWaiters.push(cb);
        }
        if (self.shouldGetTCerts()) {
            self.getTCerts();
        }
    };
    // Determine if we should issue a request to get more tcerts now.
    TCertGetter.prototype.shouldGetTCerts = function () {
        var self = this;
        // Do nothing if we are already getting more tcerts
        if (self.gettingTCerts) {
            debug("shouldGetTCerts: no, already getting tcerts");
            return false;
        }
        // If there are none, then definitely get more
        if (self.tcerts.length == 0) {
            debug("shouldGetTCerts: yes, we have no tcerts");
            return true;
        }
        // If we aren't in prefetch mode, return false;
        if (!self.chain.isPreFetchMode()) {
            debug("shouldGetTCerts: no, prefetch disabled");
            return false;
        }
        // Otherwise, see if we should prefetch based on the arrival rate
        // (i.e. the rate at which tcerts are requested) and the response
        // time.
        // "arrivalRate" is in req/ms and "responseTime" in ms,
        // so "tcertCountThreshold" is number of tcerts at which we should
        // request the next batch of tcerts so we don't have to wait on the
        // transaction path.  Note that we add 1 sec to the average response
        // time to add a little buffer time so we don't have to wait.
        var arrivalRate = self.arrivalRate.getValue();
        var responseTime = self.getTCertResponseTime.getValue() + 1000;
        var tcertThreshold = arrivalRate * responseTime;
        var tcertCount = self.tcerts.length;
        var result = tcertCount <= tcertThreshold;
        debug(util.format("shouldGetTCerts: %s, threshold=%s, count=%s, rate=%s, responseTime=%s", result, tcertThreshold, tcertCount, arrivalRate, responseTime));
        return result;
    };
    // Call member services to get more tcerts
    TCertGetter.prototype.getTCerts = function () {
        var self = this;
        var req = {
            name: self.member.getName(),
            enrollment: self.member.getEnrollment(),
            num: self.member.getTCertBatchSize(),
            attrs: self.attrs
        };
        debug("HDEBUG Request :[%s] [%s] [%s]", req.name, req.num, req.attrs);
        self.getTCertResponseTime.start();
        self.memberServices.getTCertBatch(req, function (err, tcerts) {
            if (err) {
                self.getTCertResponseTime.cancel();
                // Error all waiters
                while (self.getTCertWaiters.length > 0) {
                    self.getTCertWaiters.shift()(err);
                }
                return;
            }
            self.getTCertResponseTime.stop();
            // Add to member's tcert list
            while (tcerts.length > 0) {
                self.tcerts.push(tcerts.shift());
            }
            // Allow waiters to proceed
            while (self.getTCertWaiters.length > 0 && self.tcerts.length > 0) {
                var waiter = self.getTCertWaiters.shift();
                waiter(null, self.tcerts.shift());
            }
        });
    };
    return TCertGetter;
}()); // end TCertGetter
/**
 * The Peer class represents a peer to which HFC sends deploy, invoke, or query requests.
 */
var Peer = (function () {
    /**
     * Constructs a Peer given its endpoint configuration settings
     * and returns the new Peer.
     * @param {string} url The URL with format of "grpcs://host:port".
     * @param {Chain} chain The chain of which this peer is a member.
     * @param {GRPCOptions} optional GRPC options to use with the gRPC,
     * protocol (that is, with TransportCredentials) including a root
     * certificate file, in PEM format, and hostnameOverride. A certificate
     * is required when using the grpcs (TLS) protocol.
     * @returns {Peer} The new peer.
     */
    function Peer(url, chain, opts) {
        /**
         * Send a transaction to this peer.
         * @param tx A transaction
         * @param eventEmitter The event emitter
         */
        this.sendTransaction = function (tx, eventEmitter) {
            var self = this;
            debug("peer.sendTransaction");
            // Send the transaction to the peer node via grpc
            // The rpc specification on the peer side is:
            //     rpc ProcessTransaction(Transaction) returns (Response) {}
            self.peerClient.processTransaction(tx.pb, function (err, response) {
                if (err) {
                    debug("peer.sendTransaction: error=%j", err);
                    return eventEmitter.emit('error', new EventTransactionError(err));
                }
                debug("peer.sendTransaction: received %j", response);
                // Check transaction type here, as invoke is an asynchronous call,
                // whereas a deploy and a query are synchonous calls. As such,
                // invoke will emit 'submitted' and 'error', while a deploy/query
                // will emit 'complete' and 'error'.
                var txType = tx.pb.getType();
                switch (txType) {
                    case _fabricProto.Transaction.Type.CHAINCODE_DEPLOY:
                        if (response.status === "SUCCESS") {
                            // Deploy transaction has been completed
                            if (!response.msg || response.msg === "") {
                                eventEmitter.emit("error", new EventTransactionError("the deploy response is missing the transaction UUID"));
                            }
                            else {
                                var event_1 = new EventDeploySubmitted(response.msg.toString(), tx.chaincodeID);
                                debug("EventDeploySubmitted event: %j", event_1);
                                eventEmitter.emit("submitted", event_1);
                            }
                        }
                        else {
                            // Deploy completed with status "FAILURE" or "UNDEFINED"
                            eventEmitter.emit("error", new EventTransactionError(response));
                        }
                        break;
                    case _fabricProto.Transaction.Type.CHAINCODE_INVOKE:
                        if (response.status === "SUCCESS") {
                            // Invoke transaction has been submitted
                            if (!response.msg || response.msg === "") {
                                eventEmitter.emit("error", new EventTransactionError("the invoke response is missing the transaction UUID"));
                            }
                            else {
                                eventEmitter.emit("submitted", new EventInvokeSubmitted(response.msg.toString()));
                            }
                        }
                        else {
                            // Invoke completed with status "FAILURE" or "UNDEFINED"
                            eventEmitter.emit("error", new EventTransactionError(response));
                        }
                        break;
                    case _fabricProto.Transaction.Type.CHAINCODE_QUERY:
                        if (response.status === "SUCCESS") {
                            // Query transaction has been completed
                            eventEmitter.emit("complete", new EventQueryComplete(response.msg));
                        }
                        else {
                            // Query completed with status "FAILURE" or "UNDEFINED"
                            eventEmitter.emit("error", new EventTransactionError(response));
                        }
                        break;
                    default:
                        eventEmitter.emit("error", new EventTransactionError("processTransaction for this transaction type is not yet implemented!"));
                }
            });
        };
        this.url = url;
        this.chain = chain;
        var pem = getPemFromOpts(opts);
        opts = getOptsFromOpts(opts);
        this.ep = new Endpoint(url, pem);
        this.peerClient = new _fabricProto.Peer(this.ep.addr, this.ep.creds, opts);
    }
    /**
     * Get the chain of which this peer is a member.
     * @returns {Chain} The chain of which this peer is a member.
     */
    Peer.prototype.getChain = function () {
        return this.chain;
    };
    /**
     * Get the URL of the peer.
     * @returns {string} Get the URL associated with the peer.
     */
    Peer.prototype.getUrl = function () {
        return this.url;
    };
    /**
     * Remove the peer from the chain.
     */
    Peer.prototype.remove = function () {
        throw Error("TODO: implement");
    };
    return Peer;
}());
exports.Peer = Peer; // end Peer
/**
 * An endpoint currently takes only URL (currently).
 * @param url
 */
var Endpoint = (function () {
    function Endpoint(url, pem) {
        var purl = parseUrl(url);
        var protocol;
        if (purl.protocol) {
            protocol = purl.protocol.toLowerCase().slice(0, -1);
        }
        if (protocol === 'grpc') {
            this.addr = purl.host;
            this.creds = grpc.credentials.createInsecure();
        }
        else if (protocol === 'grpcs') {
            this.addr = purl.host;
            this.creds = grpc.credentials.createSsl(new Buffer(pem));
        }
        else {
            var error = new Error();
            error.name = "InvalidProtocol";
            error.message = "Invalid protocol: " + protocol +
                ".  URLs must begin with grpc:// or grpcs://";
            throw error;
        }
    }
    return Endpoint;
}());
/**
 * MemberServicesImpl is the default implementation of a member services client.
 */
var MemberServicesImpl = (function () {
    /**
     * MemberServicesImpl constructor
     * @param config The config information required by this member services implementation.
     * @returns {MemberServices} A MemberServices object.
     */
    function MemberServicesImpl(url, opts) {
        var pem = getPemFromOpts(opts);
        opts = getOptsFromOpts(opts);
        var ep = new Endpoint(url, pem);
        this.ecaaClient = new _caProto.ECAA(ep.addr, ep.creds, opts);
        this.ecapClient = new _caProto.ECAP(ep.addr, ep.creds, opts);
        this.tcapClient = new _caProto.TCAP(ep.addr, ep.creds, opts);
        this.tlscapClient = new _caProto.TLSCAP(ep.addr, ep.creds, opts);
        this.cryptoPrimitives = new crypto.Crypto(DEFAULT_HASH_ALGORITHM, DEFAULT_SECURITY_LEVEL);
    }
    /**
     * Get the security level
     * @returns The security level
     */
    MemberServicesImpl.prototype.getSecurityLevel = function () {
        return this.cryptoPrimitives.getSecurityLevel();
    };
    /**
     * Set the security level
     * @params securityLevel The security level
     */
    MemberServicesImpl.prototype.setSecurityLevel = function (securityLevel) {
        this.cryptoPrimitives.setSecurityLevel(securityLevel);
    };
    /**
     * Get the hash algorithm
     * @returns {string} The hash algorithm
     */
    MemberServicesImpl.prototype.getHashAlgorithm = function () {
        return this.cryptoPrimitives.getHashAlgorithm();
    };
    /**
     * Set the hash algorithm
     * @params hashAlgorithm The hash algorithm ('SHA2' or 'SHA3')
     */
    MemberServicesImpl.prototype.setHashAlgorithm = function (hashAlgorithm) {
        this.cryptoPrimitives.setHashAlgorithm(hashAlgorithm);
    };
    /**
     * Get the crypto object.
     */
    MemberServicesImpl.prototype.getCrypto = function () {
        return this.cryptoPrimitives;
    };
    /**
     * Register the member and return an enrollment secret.
     * @param req Registration request with the following fields: name, role
     * @param registrar The identity of the registrar (i.e. who is performing the registration)
     * @param cb Callback of the form: {function(err,enrollmentSecret)}
     */
    MemberServicesImpl.prototype.register = function (req, registrar, cb) {
        var self = this;
        debug("MemberServicesImpl.register: req=%j", req);
        if (!req.enrollmentID)
            return cb(new Error("missing req.enrollmentID"));
        if (!registrar)
            return cb(new Error("chain registrar is not set"));
        // Create proto request
        var protoReq = new _caProto.RegisterUserReq();
        protoReq.setId({ id: req.enrollmentID });
        protoReq.setRole(rolesToMask(req.roles));
        protoReq.setAffiliation(req.affiliation);
        var attrs = req.attributes;
        if (Array.isArray(attrs)) {
            var pattrs = [];
            for (var i = 0; i < attrs.length; i++) {
                var attr = attrs[i];
                var pattr = new _caProto.Attribute();
                if (attr.name)
                    pattr.setName(attr.name);
                if (attr.value)
                    pattr.setValue(attr.value);
                if (attr.notBefore)
                    pattr.setNotBefore(attr.notBefore);
                if (attr.notAfter)
                    pattr.setNotAfter(attr.notAfter);
                pattrs.push(pattr);
            }
            protoReq.setAttributes(pattrs);
        }
        // Create registrar info
        var protoRegistrar = new _caProto.Registrar();
        protoRegistrar.setId({ id: registrar.getName() });
        if (req.registrar) {
            if (req.registrar.roles) {
                protoRegistrar.setRoles(req.registrar.roles);
            }
            if (req.registrar.delegateRoles) {
                protoRegistrar.setDelegateRoles(req.registrar.delegateRoles);
            }
        }
        protoReq.setRegistrar(protoRegistrar);
        // Sign the registration request
        var buf = protoReq.toBuffer();
        var signKey = self.cryptoPrimitives.ecdsaKeyFromPrivate(registrar.getEnrollment().key, 'hex');
        var sig = self.cryptoPrimitives.ecdsaSign(signKey, buf);
        protoReq.setSig(new _caProto.Signature({
            type: _caProto.CryptoType.ECDSA,
            r: new Buffer(sig.r.toString()),
            s: new Buffer(sig.s.toString())
        }));
        // Send the registration request
        self.ecaaClient.registerUser(protoReq, function (err, token) {
            debug("register %j: err=%j, token=%s", protoReq, err, token);
            if (cb)
                return cb(err, token ? token.tok.toString() : null);
        });
    };
    /**
     * Enroll the member and return an opaque member object
     * @param req Enrollment request with the following fields: name, enrollmentSecret
     * @param cb Callback of the form: {function(err,{key,cert,chainKey})}
     */
    MemberServicesImpl.prototype.enroll = function (req, cb) {
        var self = this;
        cb = cb || nullCB;
        debug("[MemberServicesImpl.enroll] [%j]", req);
        if (!req.enrollmentID)
            return cb(Error("req.enrollmentID is not set"));
        if (!req.enrollmentSecret)
            return cb(Error("req.enrollmentSecret is not set"));
        debug("[MemberServicesImpl.enroll] Generating keys...");
        // generate ECDSA keys: signing and encryption keys
        // 1) signing key
        var signingKeyPair = self.cryptoPrimitives.ecdsaKeyGen();
        var spki = new asn1.x509.SubjectPublicKeyInfo(signingKeyPair.pubKeyObj);
        // 2) encryption key
        var encryptionKeyPair = self.cryptoPrimitives.ecdsaKeyGen();
        var spki2 = new asn1.x509.SubjectPublicKeyInfo(encryptionKeyPair.pubKeyObj);
        debug("[MemberServicesImpl.enroll] Generating keys...done!");
        // create the proto message
        var eCertCreateRequest = new _caProto.ECertCreateReq();
        var timestamp = sdk_util.GenerateTimestamp();
        eCertCreateRequest.setTs(timestamp);
        eCertCreateRequest.setId({ id: req.enrollmentID });
        eCertCreateRequest.setTok({ tok: new Buffer(req.enrollmentSecret) });
        debug("[MemberServicesImpl.enroll] Generating request! %j", spki.getASN1Object().getEncodedHex());
        // public signing key (ecdsa)
        var signPubKey = new _caProto.PublicKey({
            type: _caProto.CryptoType.ECDSA,
            key: new Buffer(spki.getASN1Object().getEncodedHex(), 'hex')
        });
        eCertCreateRequest.setSign(signPubKey);
        debug("[MemberServicesImpl.enroll] Adding signing key!");
        // public encryption key (ecdsa)
        var encPubKey = new _caProto.PublicKey({
            type: _caProto.CryptoType.ECDSA,
            key: new Buffer(spki2.getASN1Object().getEncodedHex(), 'hex')
        });
        eCertCreateRequest.setEnc(encPubKey);
        debug("[MemberServicesImpl.enroll] Assding encryption key!");
        debug("[MemberServicesImpl.enroll] [Contact ECA] %j ", eCertCreateRequest);
        self.ecapClient.createCertificatePair(eCertCreateRequest, function (err, eCertCreateResp) {
            if (err) {
                debug("[MemberServicesImpl.enroll] failed to create cert pair: err=%j", err);
                return cb(err);
            }
            var cipherText = eCertCreateResp.tok.tok;
            var decryptedTokBytes = self.cryptoPrimitives.eciesDecrypt(encryptionKeyPair.prvKeyObj, cipherText);
            //debug(decryptedTokBytes);
            // debug(decryptedTokBytes.toString());
            // debug('decryptedTokBytes [%s]', decryptedTokBytes.toString());
            eCertCreateRequest.setTok({ tok: decryptedTokBytes });
            eCertCreateRequest.setSig(null);
            var buf = eCertCreateRequest.toBuffer();
            var signKey = self.cryptoPrimitives.ecdsaKeyFromPrivate(signingKeyPair.prvKeyObj.prvKeyHex, 'hex');
            //debug(new Buffer(sha3_384(buf),'hex'));
            var sig = self.cryptoPrimitives.ecdsaSign(signKey, buf);
            eCertCreateRequest.setSig(new _caProto.Signature({
                type: _caProto.CryptoType.ECDSA,
                r: new Buffer(sig.r.toString()),
                s: new Buffer(sig.s.toString())
            }));
            self.ecapClient.createCertificatePair(eCertCreateRequest, function (err, eCertCreateResp) {
                if (err)
                    return cb(err);
                debug('[MemberServicesImpl.enroll] eCertCreateResp : [%j]' + eCertCreateResp);
                var enrollment = {
                    key: signingKeyPair.prvKeyObj.prvKeyHex,
                    cert: eCertCreateResp.certs.sign.toString('hex'),
                    chainKey: eCertCreateResp.pkchain.toString('hex')
                };
                // debug('cert:\n\n',enrollment.cert)
                cb(null, enrollment);
            });
        });
    }; // end enroll
    /**
     * Get an array of transaction certificates (tcerts).
     * @param {Object} req Request of the form: {name,enrollment,num} where
     * 'name' is the member name,
     * 'enrollment' is what was returned by enroll, and
     * 'num' is the number of transaction contexts to obtain.
     * @param {function(err,[Object])} cb The callback function which is called with an error as 1st arg and an array of tcerts as 2nd arg.
     */
    MemberServicesImpl.prototype.getTCertBatch = function (req, cb) {
        var self = this;
        cb = cb || nullCB;
        var timestamp = sdk_util.GenerateTimestamp();
        // create the proto
        var tCertCreateSetReq = new _caProto.TCertCreateSetReq();
        tCertCreateSetReq.setTs(timestamp);
        tCertCreateSetReq.setId({ id: req.name });
        tCertCreateSetReq.setNum(req.num);
        if (req.attrs) {
            var attrs = [];
            debug("HDEBUG1 [%d]", req.attrs.length);
            for (var i = 0; i < req.attrs.length; i++) {
                attrs.push({ attributeName: req.attrs[i] });
            }
            tCertCreateSetReq.setAttributes(attrs);
            debug("HDEBUG2 [%s]", attrs);
        }
        // serialize proto
        var buf = tCertCreateSetReq.toBuffer();
        // sign the transaction using enrollment key
        var signKey = self.cryptoPrimitives.ecdsaKeyFromPrivate(req.enrollment.key, 'hex');
        var sig = self.cryptoPrimitives.ecdsaSign(signKey, buf);
        tCertCreateSetReq.setSig(new _caProto.Signature({
            type: _caProto.CryptoType.ECDSA,
            r: new Buffer(sig.r.toString()),
            s: new Buffer(sig.s.toString())
        }));
        debug("HDEBUG3 [%s]", tCertCreateSetReq);
        // send the request
        self.tcapClient.createCertificateSet(tCertCreateSetReq, function (err, resp) {
            if (err)
                return cb(err);
            // debug('tCertCreateSetResp:\n', resp);
        debug("HDEBUG4 CREATE CERT SET DONE!!");
            cb(null, self.processTCertBatch(req, resp));
        });
    };
    /**
     * Process a batch of tcerts after having retrieved them from the TCA.
     */
    MemberServicesImpl.prototype.processTCertBatch = function (req, resp) {
        var self = this;
        //
        // Derive secret keys for TCerts
        //
        var enrollKey = req.enrollment.key;
        var tCertOwnerKDFKey = resp.certs.key;
        var tCerts = resp.certs.certs;
        var byte1 = new Buffer(1);
        byte1.writeUInt8(0x1, 0);
        var byte2 = new Buffer(1);
        byte2.writeUInt8(0x2, 0);
        var tCertOwnerEncryptKey = self.cryptoPrimitives.hmac(tCertOwnerKDFKey, byte1).slice(0, 32);
        var expansionKey = self.cryptoPrimitives.hmac(tCertOwnerKDFKey, byte2);
        var tCertBatch = [];
        // Loop through certs and extract private keys
        for (var i = 0; i < tCerts.length; i++) {
            var tCert = tCerts[i];
            var x509Certificate = void 0;
            try {
                x509Certificate = new crypto.X509Certificate(tCert.cert);
            }
            catch (ex) {
                debug('Warning: problem parsing certificate bytes; retrying ... ', ex);
                continue;
            }
            // debug("HERE2: got x509 cert");
            // extract the encrypted bytes from extension attribute
            var tCertIndexCT = x509Certificate.criticalExtension(crypto.TCertEncTCertIndex);
            // debug('tCertIndexCT: ',JSON.stringify(tCertIndexCT));
            var tCertIndex = self.cryptoPrimitives.aesCBCPKCS7Decrypt(tCertOwnerEncryptKey, tCertIndexCT);
            // debug('tCertIndex: ',JSON.stringify(tCertIndex));
            var expansionValue = self.cryptoPrimitives.hmac(expansionKey, tCertIndex);
            // debug('expansionValue: ',expansionValue);
            // compute the private key
            var one = new BN(1);
            var k = new BN(expansionValue);
            var n = self.cryptoPrimitives.ecdsaKeyFromPrivate(enrollKey, 'hex').ec.curve.n.sub(one);
            k = k.mod(n).add(one);
            var D = self.cryptoPrimitives.ecdsaKeyFromPrivate(enrollKey, 'hex').getPrivate().add(k);
            var pubHex = self.cryptoPrimitives.ecdsaKeyFromPrivate(enrollKey, 'hex').getPublic('hex');
            D = D.mod(self.cryptoPrimitives.ecdsaKeyFromPublic(pubHex, 'hex').ec.curve.n);
            // Put private and public key in returned tcert
            var tcert = new TCert(tCert.cert, self.cryptoPrimitives.ecdsaKeyFromPrivate(D, 'hex'));
            tCertBatch.push(tcert);
        }
        if (tCertBatch.length == 0) {
            throw Error('Failed fetching TCertBatch. No valid TCert received.');
        }
        return tCertBatch;
    }; // end processTCertBatch
    return MemberServicesImpl;
}()); // end MemberServicesImpl
function newMemberServices(url, opts) {
    return new MemberServicesImpl(url, opts);
}
/**
 * A local file-based key value store.
 * This implements the KeyValStore interface.
 */
var FileKeyValStore = (function () {
    function FileKeyValStore(dir) {
        /**
         * Set the value associated with name.
         * @param name
         * @param cb function(err)
         */
        this.setValue = function (name, value, cb) {
            var path = this.dir + '/' + name;
            fs.writeFile(path, value, cb);
        };
        this.dir = dir;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }
    /**
     * Get the value associated with name.
     * @param name
     * @param cb function(err,value)
     */
    FileKeyValStore.prototype.getValue = function (name, cb) {
        var path = this.dir + '/' + name;
        fs.readFile(path, 'utf8', function (err, data) {
            if (err) {
                if (err.code !== 'ENOENT')
                    return cb(err);
                return cb(null, null);
            }
            return cb(null, data);
        });
    };
    return FileKeyValStore;
}()); // end FileKeyValStore
function toKeyValStoreName(name) {
    return "member." + name;
}
// Return a unique string value for the list of attributes.
function getAttrsKey(attrs) {
    if (!attrs)
        return "null";
    var key = "[]";
    for (var i = 0; i < attrs.length; i++) {
        key += "," + attrs[i];
    }
    return key;
}
// A null callback to use when the user doesn't pass one in
function nullCB() {
}
// Determine if an object is a string
function isString(obj) {
    return (typeof obj === 'string' || obj instanceof String);
}
// Determine if 'obj' is an object (not an array, string, or other type)
function isObject(obj) {
    return (!!obj) && (obj.constructor === Object);
}
function isFunction(fcn) {
    return (typeof fcn === 'function');
}
function parseUrl(url) {
    // TODO: find ambient definition for url
    var purl = urlParser.parse(url, true);
    return purl;
}
// Convert a list of member type names to the role mask currently used by the peer
function rolesToMask(roles) {
    var mask = 0;
    if (roles) {
        for (var role in roles) {
            switch (roles[role]) {
                case 'client':
                    mask |= 1;
                    break; // Client mask
                case 'peer':
                    mask |= 2;
                    break; // Peer mask
                case 'validator':
                    mask |= 4;
                    break; // Validator mask
                case 'auditor':
                    mask |= 8;
                    break; // Auditor mask
            }
        }
    }
    if (mask === 0)
        mask = 1; // Client
    return mask;
}
// Get the PEM from the options
function getPemFromOpts(opts) {
    if (isObject(opts))
        return opts.pem;
    return opts;
}
// Normalize opts
function getOptsFromOpts(opts) {
    if (typeof opts === 'object') {
        var optCopy = {};
        for (var prop in opts) {
            if (prop !== 'pem') {
                if (prop === 'hostnameOverride') {
                    optCopy['grpc.ssl_target_name_override'] = opts.hostnameOverride;
                    optCopy['grpc.default_authority'] = opts.hostnameOverride;
                }
                else {
                    optCopy[prop] = opts[prop];
                }
            }
        }
        return optCopy;
    }
    if (typeof opts === 'string') {
        // backwards compatible to handle pem as opts
        return { pem: opts };
    }
}
function endsWith(str, suffix) {
    return str.length >= suffix.length && str.substr(str.length - suffix.length) === suffix;
}
;
function prepend(item, list) {
    var l = list.slice();
    l.unshift(item);
    return l.map(function (x) { return new Buffer(x); });
}
;
/**
 * Create a new chain.  If it already exists, throws an Error.
 * @param name {string} Name of the chain.  It can be any name and has value only for the client.
 * @returns
 */
function newChain(name) {
    var chain = _chains[name];
    if (chain)
        throw Error(util.format("chain %s already exists", name));
    chain = new Chain(name);
    _chains[name] = chain;
    return chain;
}
exports.newChain = newChain;
/**
 * Get a chain.  If it doesn't yet exist and 'create' is true, create it.
 * @param {string} chainName The name of the chain to get or create.
 * @param {boolean} create If the chain doesn't already exist, specifies whether to create it.
 * @return {Chain} Returns the chain, or null if it doesn't exist and create is false.
 */
function getChain(chainName, create) {
    var chain = _chains[chainName];
    if (!chain && create) {
        chain = newChain(chainName);
    }
    return chain;
}
exports.getChain = getChain;
/**
 * Create an instance of a FileKeyValStore.
 */
function newFileKeyValStore(dir) {
    return new FileKeyValStore(dir);
}
exports.newFileKeyValStore = newFileKeyValStore;
/**
 * The ChainCodeCBE is used internal to the EventHub to hold chaincode event registration callbacks.
 */
var ChainCodeCBE = (function () {
    function ChainCodeCBE(ccid, eventNameFilter, cb) {
        this.ccid = ccid;
        this.eventNameFilter = new RegExp(eventNameFilter);
        this.cb = cb;
    }
    return ChainCodeCBE;
}());
exports.ChainCodeCBE = ChainCodeCBE;
/**
 * The EventHub is used to distribute events from a specific event source(peer)
 */
var EventHub = (function () {
    function EventHub() {
        var _this = this;
        this.txCallback = function (event) {
            debug("txCallback event=%j", event);
            var eh = _this;
            event.transactions.forEach(function (transaction) {
                debug("transaction.txid=" + transaction.txid);
                var cb = eh.txRegistrants.get(transaction.txid);
                if (cb)
                    cb(transaction.txid);
            });
        };
        this.chaincodeRegistrants = new HashTable();
        this.blockRegistrants = new Set();
        this.txRegistrants = new HashTable();
        this.ep = null;
        this.connected = false;
    }
    EventHub.prototype.setPeerAddr = function (peeraddr, opts) {
        var pem = getPemFromOpts(opts);
        this.opts = getOptsFromOpts(opts);
        this.ep = new Endpoint(peeraddr, pem);
    };
    EventHub.prototype.isconnected = function () {
        return this.connected;
    };
    EventHub.prototype.connect = function () {
        if (this.connected)
            return;
        if (!this.ep)
            throw Error("Must set peer address before connecting.");
        this.events = grpc.load(__dirname + "/protos/events.proto").protos;
        this.client = new this.events.Events(this.ep.addr, this.ep.creds, this.opts);
        this.call = this.client.chat();
        this.connected = true;
        this.registerBlockEvent(this.txCallback);
        var eh = this; // for callback context
        this.call.on('data', function (event) {
            if (event.Event == "chaincodeEvent") {
                var cbtable = eh.chaincodeRegistrants.get(event.chaincodeEvent.chaincodeID);
                if (!cbtable) {
                    return;
                }
                cbtable.forEach(function (cbe) {
                    if (cbe.eventNameFilter.test(event.chaincodeEvent.eventName)) {
                        cbe.cb(event.chaincodeEvent);
                    }
                });
            }
            else if (event.Event == "block") {
                eh.blockRegistrants.forEach(function (cb) {
                    cb(event.block);
                });
            }
        });
        this.call.on('end', function () {
            eh.call.end();
            // clean up Registrants - should app get notified?
            eh.chaincodeRegistrants.clear();
            eh.blockRegistrants.clear();
        });
    };
    EventHub.prototype.disconnect = function () {
        if (!this.connected)
            return;
        this.unregisterBlockEvent(this.txCallback);
        this.call.end();
        this.connected = false;
    };
    EventHub.prototype.registerChaincodeEvent = function (ccid, eventname, callback) {
        if (!this.connected)
            return;
        var cb = new ChainCodeCBE(ccid, eventname, callback);
        var cbtable = this.chaincodeRegistrants.get(ccid);
        if (!cbtable) {
            cbtable = new Set();
            this.chaincodeRegistrants.put(ccid, cbtable);
            cbtable.add(cb);
            var register = { register: { events: [{ eventType: "CHAINCODE", chaincodeRegInfo: { chaincodeID: ccid, eventName: "" } }] } };
            this.call.write(register);
        }
        else {
            cbtable.add(cb);
        }
        return cb;
    };
    EventHub.prototype.unregisterChaincodeEvent = function (cbe) {
        if (!this.connected)
            return;
        var cbtable = this.chaincodeRegistrants.get(cbe.ccid);
        if (!cbtable) {
            debug("No event registration for ccid %s ", cbe.ccid);
            return;
        }
        cbtable.delete(cbe);
        if (cbtable.size <= 0) {
            var unregister = { unregister: { events: [{ eventType: "CHAINCODE", chaincodeRegInfo: { chaincodeID: cbe.ccid, eventName: "" } }] } };
            this.chaincodeRegistrants.remove(cbe.ccid);
            this.call.write(unregister);
        }
    };
    EventHub.prototype.registerBlockEvent = function (callback) {
        if (!this.connected)
            return;
        this.blockRegistrants.add(callback);
        if (this.blockRegistrants.size == 1) {
            var register = { register: { events: [{ eventType: "BLOCK" }] } };
            this.call.write(register);
        }
    };
    EventHub.prototype.unregisterBlockEvent = function (callback) {
        if (!this.connected)
            return;
        if (this.blockRegistrants.size <= 1) {
            var unregister = { unregister: { events: [{ eventType: "BLOCK" }] } };
            this.call.write(unregister);
        }
        this.blockRegistrants.delete(callback);
    };
    EventHub.prototype.registerTxEvent = function (txid, callback) {
        debug("reg txid " + txid);
        this.txRegistrants.put(txid, callback);
    };
    EventHub.prototype.unregisterTxEvent = function (txid) {
        this.txRegistrants.remove(txid);
    };
    return EventHub;
}());
exports.EventHub = EventHub;
//# sourceMappingURL=hfc.js.map
