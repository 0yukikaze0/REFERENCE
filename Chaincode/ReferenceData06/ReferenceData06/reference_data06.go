package main
import (
	"errors"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	//"encoding/base64"
	//"encoding/binary"
	"github.com/op/go-logging"
	"encoding/json"
	"fmt"
	"reflect"
)

var myLogger = logging.MustGetLogger("ref_data")

type ReferenceDataChainCode struct {

}
/*
type Security struct {
	SecurityData struct {
			     CommonData []struct {
				     Field string `json:"field",`
				     Value string `json:"value"`
			     } `json:"commonData", omitempty`
			     BBGData []struct {
				     Field string `json:"field"`
				     Value string `json:"value"`
			     } `json:"BBGData", omitempty`
			     IDCData []struct {
				     Field string `json:"field"`
				     Value string `json:"value"`
			     } `json:"IDCData", omitempty`
			     ReutersData []struct {
				     Field string `json:"field"`
				     Value string `json:"value"`
			     } `json:"ReutersData", omitempty`
		     } `json:"SecurityData"`
}*/

var repHandler = NewRepositoryHandler()
var certHandler = NewCertHandler()

// args[0]: Admin's TCert
// args[1]: attribute name inside the Admin's TCert that contains Admins account ID
// args[2]: amount to be assigned to this investor's account ID
func (t *ReferenceDataChainCode) newSecuritySetup(stub shim.ChaincodeStubInterface, args string) ([]byte, error) {

	//import all security attributes
	myLogger.Debugf("+++++++++++++++++++++++++++++++ New Security Setup +++++++++++++++++++++++++++++++++")

	if len(args) == 0 {
		return nil, errors.New("newSecuritySetup Incorrect number of arguments. Expecting 1")
	}
	// check if invoker has administrator role
	/*
	isAuthorized, err := certHandler.isAuthorized(stub, "admin")
	if !isAuthorized {
		myLogger.Errorf("system error %v", err)
		return nil, errors.New("user is not aurthorized to setup a security")
	} */

	attribute := "licencekey"
	attribute_value := "cobgid"
	isEntitled, licenseKey, err := certHandler.isEntitled(stub, attribute, attribute_value)
	if err != nil {
		myLogger.Errorf("system error %v", err)
		return nil, errors.New("user is not aurthorized to setup a security")
	}
	if !isEntitled {
		myLogger.Fatal("Attribute not verified.")
		return nil, errors.New("user is not aurthorized to setup a security")
	}
	myLogger.Debugf("User is entitled for setting up security for licenseKey: %v!!", licenseKey)
	/*
	User, err := base64.StdEncoding.DecodeString(args[0])
	if err != nil {
		myLogger.Errorf("system error %v", err)
		return nil, errors.New("Failed decoding owner")
	}*/

	var arbitrary_json map[string]interface{}
	var SecurityData map[string]interface{}
	var commonData []interface{}
	//var BBGData []interface{}
	//var IDCData []interface{}

	err = json.Unmarshal([]byte(args), &arbitrary_json)
	if err != nil {
		fmt.Println("Error parsing JSON: ", err)
	}

	fmt.Println(arbitrary_json)
	//fmt.Println(arbitrary_json["commonData"].(string))
	//fmt.Printf("%v", arbitrary_json["SecurityData"].(map[string]interface{})["commonData"])
	//fmt.Printf("%v", arbitrary_json["commonData"].(map[string]interface{})["masterSecID"])
	var masterSecID string
	var refClientID string
	var refSecType string
	var createDateTime string
	SecurityData = arbitrary_json["SecurityData"].(map[string]interface{})
	for key, value := range SecurityData {
		//fmt.Printf("index:%s  value:%v  kind:%s  type:%s\n", key, value, reflect.TypeOf(value).Kind(), reflect.TypeOf(value))
		switch key{
		case "commonData":
			var newArgs []string
			//fmt.Println("commonData ", key, value)
			commonData = SecurityData["commonData"].([]interface{})
			for key1, value1 := range commonData {
				fmt.Printf("Common Data index:%s  value1:%v  kind:%s  type:%s\n", key1, value1, reflect.TypeOf(value1).Kind(), reflect.TypeOf(value1))
			//	fmt.Printf("masterSecID: %s \n",value1.(map[string]interface{})["masterSecID"].(string))
				masterSecID = value1.(map[string]interface{})["masterSecID"].(string)
				refClientID = value1.(map[string]interface{})["refClientID"].(string)
				refSecType = value1.(map[string]interface{})["refSecType"].(string)
				createDateTime = value1.(map[string]interface{})["createDateTime"].(string)
			}

			newArgs = append(newArgs, masterSecID)
			newArgs = append(newArgs, refClientID)
			newArgs = append(newArgs, "coxxxx")
			newArgs = append(newArgs, "A")
			newArgs = append(newArgs, refSecType)

			comJSON, err := json.Marshal(value)
			if err != nil {
				myLogger.Debugf("Error Marshalling commonData: %s", err)
			}
			//Retrive licenseKey
			//get UTC timestamp
			//HASHING PENDING
			newArgs = append(newArgs, string(comJSON))
			myLogger.Debugf("comJSON: %s", string(comJSON))
			newArgs = append(newArgs, createDateTime)
			newArgs = append(newArgs, "HASH")
			newArgs = append(newArgs, "1")

			repHandler.newSecurity(stub, newArgs)

		case "BBGData":
			var newArgs []string
			fmt.Println("BBG Data Value", key, value)
			//BBGData = SecurityData["BBGData"].([]interface{})
			//for key1, value1 := range BBGData {
			//	fmt.Printf("BBGData index:%s  value1:%v  kind:%s  type:%s\n", key1, value1, reflect.TypeOf(value1).Kind(), reflect.TypeOf(value1))
				//fmt.Printf("masterSecID111: %v \n",value1.(map[string]interface{})["masterSecID"])
			//}
			newArgs = append(newArgs, masterSecID)
			newArgs = append(newArgs, refClientID)
			newArgs = append(newArgs, "xxbgxx")
			newArgs = append(newArgs, "A")
			newArgs = append(newArgs, refSecType)

			bbgJSON, err := json.Marshal(value)
			if err != nil {
				myLogger.Debugf("Error Marshalling bbgJSON: %s", err)
			}
			newArgs = append(newArgs, string(bbgJSON))
			myLogger.Debugf("bbgJSON: %s", string(bbgJSON))
			newArgs = append(newArgs, createDateTime)
			newArgs = append(newArgs, "HASH")
			newArgs = append(newArgs, "1")

			repHandler.newSecurity(stub, newArgs)

		case "IDCData":
			var newArgs []string
			fmt.Println("IDC Data Value ", key, value)
			//IDCData = SecurityData["IDCData"].([]interface{})
			//for key1, value1 := range IDCData {
			//	fmt.Printf("IDCData index:%s  value1:%v  kind:%s  type:%s\n", key1, value1, reflect.TypeOf(value1).Kind(), reflect.TypeOf(value1))
				//fmt.Printf("masterSecID111: %v \n",value1.(map[string]interface{})["masterSecID"])
			//}
			newArgs = append(newArgs, masterSecID)
			newArgs = append(newArgs, refClientID)
			newArgs = append(newArgs, "xxxxid")
			newArgs = append(newArgs, "A")
			newArgs = append(newArgs, refSecType)

			idcJSON, err := json.Marshal(value)
			if err != nil {
				myLogger.Debugf("Error Marshalling idcJSON: %s", err)
			}
			newArgs = append(newArgs, string(idcJSON))
			myLogger.Debugf("idcJSON: %s", string(idcJSON))
			newArgs = append(newArgs, createDateTime)
			newArgs = append(newArgs, "HASH")
			newArgs = append(newArgs, "1")

			repHandler.newSecurity(stub, newArgs)
		}
	}

	return nil, nil
}

func (t *ReferenceDataChainCode) Invoke(stub shim.ChaincodeStubInterface, function string, args []string) ([]byte, error) {
	myLogger.Debugf("********************************Invoke****************************************")

	myLogger.Info("[ReferenceDataChainCode] Invoke")
	if len(args) != 1 {
		return nil, errors.New(" Invoke: Incorrect number of arguments. Expecting 1")
	}

	var jsonData = args[0]
	myLogger.Debugf("Invoke JSON Data: %s", string(jsonData))

	if function == "newSecuritySetup" {
		// New security setup in a prime copy
		return t.newSecuritySetup(stub, jsonData)
	}/*else if function == "getSecurityInformation" {
		// Update on the security in a prime copy
		return t.getSecurityInformation(stub, args)
	}
	/*else if function == "UpdateSecuritySetup" {
		// Update on the security in a prime copy
		return t.UpdateSecuritySetup(stub, args)
	} else if function == "InactivateSecurity" {
		// Inactivate the security in a prime copy
		return t.InactivateSecurity(stub, args)
	}*/

	return nil, errors.New("Received unknown function invocation")
}

func (t *ReferenceDataChainCode) Query(stub shim.ChaincodeStubInterface, function string, args []string) ([]byte, error) {
	myLogger.Debugf("********************************Query****************************************")

	myLogger.Info("[ReferenceDataChainCode] Query")
	if len(args) != 3 {
		return nil, errors.New("Query :Incorrect number of arguments. Expecting 3")
	}

	// Handle different functions

	if function == "getSecurityInformation" {
		return t.getSecurityInformation(stub, args)
	}

	return nil, errors.New("Received unknown function query invocation with function " + function)

}

func (t *ReferenceDataChainCode) getSecurityInformation(stub shim.ChaincodeStubInterface, args []string) ([]byte, error) {
	myLogger.Debugf("********************************getSecurityInformation****************************************")
	//var row []string
	//var comdata = make([]byte, 500)
	//var bbgdata = make([]byte, 500)
	//var idcdata = make([]byte, 500)
	//var reutersdata = make([]byte, 500)
	var finaldata []byte
	var value []byte
	//var buffer bytes.Buffer

	if len(args) != 3 {
		return nil, errors.New(" getSecurityInformation: Incorrect number of arguments. Expecting 3")
	}

	/*
	User, err := base64.StdEncoding.DecodeString(args[0])
	if err != nil {
		myLogger.Errorf("system error %v", err)
		return nil, errors.New("Failed decoding owner")
	}
	*/

	masterSecID := args[0]
	refClientID := args[1]
	licenseKey := args[2]

	myLogger.Debugf("Retriving security [%s][%s][%s]", string(masterSecID), string(refClientID), string(licenseKey))
	/*
	refSecType, err := repHandler.queryrefSecType(stub, masterSecID)
	if err != nil {
		return nil, err
	}

	licenceAttribute := string(refSecType) + "_license"
	myLogger.Debugf("License Attribute [%s]", string(licenceAttribute))
	*/
	// Retrieving Common Data ------------------------------------------------------
	//attribute := "licensekey"
	attribute := licenseKey
	attribute_value := "co"
	isEntitled, licenseKey, err := certHandler.isEntitled(stub, attribute, attribute_value)
	if !isEntitled {
		myLogger.Errorf("system error %v", err)
		return nil, errors.New("user is not aurthorized for common licences")
	}else {
		myLogger.Debugf("User is entitled for common licences!!")

		value, err = repHandler.querySecurity(stub, masterSecID, refClientID, "coxxxx")
		if err != nil {
			myLogger.Debugf("Failed retriving security [%s]: [%s]", string(masterSecID), err)
			//return nil, errors.New("Failed retriving security [%s]", string(masterSecID))
		}
		myLogger.Debugf("security Common data [%s]- [%s]", string(masterSecID), string(value))

		if string(value) != "EMPTY" {
			//convert row.column (string) to []byte (Big Endian)
			//copy(ret, value)
			//ret = binary.BigEndian.String(value)
			prefix := "{\"SecurityData\":{\"commonData\":"
			finaldata = append(finaldata, prefix...)
			finaldata = append(finaldata, value...)
			//buffer.WriteString(value)
			myLogger.Debugf("Common data collected")
			//		comdata = []byte(value)
		}
	}
	// Retrieving BBG Data ----------------------------------------------------------
	//attribute = "licensekey"
	//attribute = licenseKey
	attribute_value = "bg"
	isEntitled, licenseKey, err = certHandler.isEntitled(stub, attribute, attribute_value)
	if !isEntitled {
		myLogger.Errorf("system error %v", err)
		//return nil, errors.New("user is not aurthorized for BBG licences")
	}else {
		myLogger.Debugf("User is entitled for BBG licences!!")

		value, err = repHandler.querySecurity(stub, masterSecID, refClientID, "xxbgxx")
		if err != nil {
			myLogger.Debugf("Failed retriving security [%s]: [%s]", string(masterSecID), err)
			//return nil, errors.New("Failed retriving security [%s]", string(masterSecID))
		}
		myLogger.Debugf("security BBG Data [%s]- [%s]", string(masterSecID), string(value))

		if string(value) != "EMPTY" {
			//convert row.column (string) to []byte (Big Endian)
			//bbgdata = make([]byte, 500)
			//copy(ret, value)
			//ret = binary.BigEndian.String(value)
			//bbgdata = []byte(value)
			prefix := ",\"BBGData\":"
			finaldata = append(finaldata, prefix...)
			finaldata = append(finaldata, value...)
			//buffer.WriteString(value)
			myLogger.Debugf("BBG data collected")

		}
	}
	// Retrieving IDC Data ----------------------------------------------------------
	//attribute = "licensekey"
	//attribute = licenseKey
	attribute_value = "id"
	isEntitled, licenseKey, err = certHandler.isEntitled(stub, attribute, attribute_value)
	if !isEntitled {
		myLogger.Errorf("system error %v", err)
		//return nil, errors.New("user is not aurthorized for IDC licences")
	}else {
		myLogger.Debugf("User is entitled for IDC licences!!")

		value, err = repHandler.querySecurity(stub, masterSecID, refClientID, "xxxxid")
		if err != nil {
			myLogger.Debugf("Failed retriving security [%s]: [%s]", string(masterSecID), err)
			//return nil, errors.New("Failed retriving security [%s]", string(masterSecID))
		}
		myLogger.Debugf("security IDC data [%s]- [%s]", string(masterSecID), string(value))
		if string(value) != "EMPTY" {
			//convert row.column (string) to []byte (Big Endian)
			//idcdata = make([]byte, 500)
			//copy(ret, value)
			//ret = binary.BigEndian.String(value)
			//idcdata = []byte(value)
			prefix := ",\"IDCData\":"
			finaldata = append(finaldata, prefix...)
			finaldata = append(finaldata, value...)
			//buffer.WriteString(value)
			myLogger.Debugf("IDC data collected")

		}
	}
	//finaldata := make([]byte, 2000)
	//finaldata := append(comdata, bbgdata, idcdata, reutersdata)
	//reutersdata = []byte(value)
	suffix := "}}"
	finaldata = append(finaldata, suffix...)
	myLogger.Debugf("fina data [%s]- [%s]", string(masterSecID), string(finaldata))

	return finaldata, nil
}

func (t *ReferenceDataChainCode) Init(stub shim.ChaincodeStubInterface, function string, args []string) ([]byte, error) {
	myLogger.Debugf("********************************Init****************************************")

	myLogger.Info("[ReferenceDataChainCode] Init")
	if len(args) != 0 {
		return nil, errors.New("Init Incorrect number of arguments. Expecting 0")
	}

	//return nil, repHandler.createSecurityHashMappingTable(stub), repHandler.createSecurityDataTable(stub)
	return nil, repHandler.createSecurityHashMappingTable(stub)
}

func main() {
	//	primitives.SetSecurityLevel("SHA3", 256)
	err := shim.Start(new(ReferenceDataChainCode))
	if err != nil {
		myLogger.Debugf("Error starting ReferenceDataChainCode: %s", err)
	}

}