package main

import (
	"errors"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/hyperledger/fabric/core/chaincode/shim/crypto/attr"
)

// consts associated with TCert
const (
	role = "role"
	TRUE = true
	FALSE = false
)

type certificateHandler struct{

}
// NewCertHandler creates a new reference to CertHandler
func NewCertHandler() *certificateHandler {
	return &certificateHandler{}
}

// isAuthorized checks if the transaction invoker has the appropriate role
// stub: chaincodestub
// requiredRole: required role; this function will return true if invoker has this role
func (t *certificateHandler) isAuthorized(stub shim.ChaincodeStubInterface, requiredRole string) (bool, error) {
	//read transaction invoker's role, and verify that is the same as the required role passed in
	return stub.VerifyAttribute(role, []byte(requiredRole))
}


// isEntitled checks if the transaction invoker has the appropriate role
// stub: chaincodestub
// requiredLicense: required License; this function will return true if invoker has this license
func (t *certificateHandler) isEntitled(stub shim.ChaincodeStubInterface, licenseKey string, licenseValue string) (bool, string, error) {
	//read transaction invoker's role, and verify that is the same as the required role passed in
	//ReadCertAttribute(attributeName string) ([]byte, error)
	//return stub.VerifyAttribute(licenseKey, []byte(licenseValue))
	attrValue, err := stub.ReadCertAttribute(licenseKey)
	//cobgid
	if licenseValue == "co" {
		myLogger.Debugf("attrValue %s", string(attrValue))
		subtr := attrValue[0:2]
		myLogger.Debugf("common subtr %s", string(subtr))
		if licenseValue == string(subtr) {
			return TRUE, string(attrValue), nil
		}
		return FALSE, "none", err
	} else if licenseValue == "bg" {
		myLogger.Debugf("attrValue %s", string(attrValue))
		subtr := attrValue[2:4]
		myLogger.Debugf("bbg subtr %s", string(subtr))
		if licenseValue == string(subtr) {
			return TRUE, string(attrValue), nil
		}
		return FALSE, "none", err
	}  else if licenseValue == "id" {
		myLogger.Debugf("attrValue %s", string(attrValue))
		subtr := attrValue[4:6]
		myLogger.Debugf("idc subtr %s", string(subtr))
		if licenseValue == string(subtr) {
			return TRUE, string(attrValue), nil
		}
		return FALSE, "none", err
	} else if licenseValue == "cobgid" {
		//subtr := attrValue
		if licenseValue == string(attrValue) {
			return TRUE, string(attrValue), nil
		}
		return FALSE, "none", err
	}
	return FALSE, string(attrValue), err
/*
	if string(attrValue) == licenseValue {
		return TRUE, nil
	}else{
		return FALSE, err
	}
*/
}


// getLicenceIDsFromAttribute retrieves Licence IDs stored in  TCert attributes
// cert: TCert to read Licence IDs from
// attributeNames: attribute names inside TCert that stores the entity's Licence IDs
func (t *certificateHandler) getLicenceIDsFromAttribute(cert []byte, attributeNames []string) ([]string, error) {
	if cert == nil || attributeNames == nil {
		return nil, errors.New("cert or LicenceIDs list is empty")
	}

	//decleare return object (slice of account IDs)
	var licenceIds []string

	// for each attribute name, look for that attribute name inside TCert,
	// the correspounding value of that attribute is the licence ID
	for _, attributeName := range attributeNames {
		myLogger.Debugf("get value from attribute = v%", attributeName)
		//get the attribute value from the corresbonding attribute name
		licenceID, err := attr.GetValueFrom(attributeName, cert)
		if err != nil {
			myLogger.Errorf("system error %v", err)
			return nil, errors.New("unable to find user contact information")
		}

		licenceIds = append(licenceIds, string(licenceID))
	}

	myLogger.Debugf("ids = %v", licenceIds)
	return licenceIds, nil
}

// getLicenceIDsFromAttribute retrieves Licence IDs stored in  TCert attributes
// cert: TCert to read Licence IDs from
// attributeNames: attribute names inside TCert that stores the entity's Licence IDs
func (t *certificateHandler) CheckLicenceIDFromAttribute(cert []byte, attributeNames []string ) (bool, error) {

	if cert == nil || attributeNames == nil {
		return FALSE , errors.New("cert or LicenceIDs list is empty")
	}
	// for each attribute name, look for that attribute name inside TCert,
	// the correspounding value of that attribute is the licence ID
	for _, attributeName := range attributeNames {
		myLogger.Debugf("get value from attribute = v%", attributeName)
		//get the attribute value from the corresbonding attribute name
		licenceID, err := attr.GetValueFrom(attributeName, cert)
		if err != nil {
			myLogger.Errorf("system error %v", err)
			return FALSE, errors.New("unable to find user contact information")
		}
		if licenceID != nil {
			return TRUE, nil
		}
	}
	myLogger.Debugf("Licence not found !!")
	return FALSE, errors.New("Licence not found !!")
}


