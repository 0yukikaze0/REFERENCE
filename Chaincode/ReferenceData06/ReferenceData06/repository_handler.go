package main

import (
	"errors"
	"github.com/hyperledger/fabric/core/chaincode/shim"
)

const (
	tableColumnSecurityHashMapping = "SecurityHashMapping"
	columnMasterSecID   = "masterSecID"
	colmnnRefClientID = "refClientID"
	columnLicenceKey = "licenceKey"
	columnRefSecurityType = "refSecType"
	columnActiveFlag = "activeFlag"
	columnSecurityData = "securityData"
	columnCreateTimestamp = "createTimestamp"
	columnHashDigest = "hashDigest"
	columnSecurityVersion = "securityVersion"
)

//RepositoryHandler provides APIs used to perform operations on CC's KV store
type repositoryHandler struct {
}

// NewRepositoryHandler create a new reference to CertHandler
func NewRepositoryHandler() *repositoryHandler {
	return &repositoryHandler{}
}

// createTable initiates a new reference data repository table in the chaincode state
// stub: chaincodestub
func (t *repositoryHandler) createSecurityHashMappingTable(stub shim.ChaincodeStubInterface) (error) {
	// Create security hashing table
	return stub.CreateTable(tableColumnSecurityHashMapping, []*shim.ColumnDefinition{
		&shim.ColumnDefinition{Name: columnMasterSecID, Type: shim.ColumnDefinition_STRING, Key: true},
		&shim.ColumnDefinition{Name: colmnnRefClientID, Type: shim.ColumnDefinition_STRING, Key: true},
		&shim.ColumnDefinition{Name: columnLicenceKey, Type: shim.ColumnDefinition_STRING, Key: true},
		&shim.ColumnDefinition{Name: columnActiveFlag, Type: shim.ColumnDefinition_STRING, Key: true},
		&shim.ColumnDefinition{Name: columnRefSecurityType, Type: shim.ColumnDefinition_STRING, Key: false},
		&shim.ColumnDefinition{Name: columnSecurityData, Type: shim.ColumnDefinition_STRING, Key: false},
		&shim.ColumnDefinition{Name: columnCreateTimestamp, Type: shim.ColumnDefinition_STRING, Key: false},
		&shim.ColumnDefinition{Name: columnHashDigest, Type: shim.ColumnDefinition_STRING, Key: false},
		&shim.ColumnDefinition{Name: columnSecurityVersion, Type: shim.ColumnDefinition_STRING, Key: false},
	});
}
/*
func (t *repositoryHandler) createSecurityDataTable(stub shim.ChaincodeStubInterface) (error) {
	// Create security data table
	return stub.CreateTable(tableColumnSecurityData, []*shim.ColumnDefinition{
		&shim.ColumnDefinition{Name: columnMasterSecID, Type: shim.ColumnDefinition_STRING, Key: true},
		&shim.ColumnDefinition{Name: colmnnRefClientID, Type: shim.ColumnDefinition_STRING, Key: true},
		&shim.ColumnDefinition{Name: columnActiveFlag, Type: shim.ColumnDefinition_STRING, Key: true},
		&shim.ColumnDefinition{Name: columnRefSecurityType, Type: shim.ColumnDefinition_STRING, Key: false},
		&shim.ColumnDefinition{Name: columnSecurityData, Type: shim.ColumnDefinition_STRING, Key: false},
		&shim.ColumnDefinition{Name: columnSecurityVersion, Type: shim.ColumnDefinition_STRING, Key: false},
	});
}
*/
// newSecurity adds the record row associated with an Security ID on the chaincode state table
func (t *repositoryHandler) newSecurity(stub shim.ChaincodeStubInterface, args []string) (error){

	myLogger.Debugf("insert security= %v", args[0])

	//insert a new row for this security ID
	ok, err := stub.InsertRow(tableColumnSecurityHashMapping, shim.Row{
		Columns: []*shim.Column{
			&shim.Column{Value: &shim.Column_String_{String_: args[0]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[1]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[2]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[3]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[4]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[5]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[6]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[7]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[8]}},
		},
	})

	if !ok && err == nil {
		myLogger.Errorf("system error %v", err)
		return errors.New("Security exists in SecurityHashMapping Table!")
	}

	return nil
}

/*
// updateSecurity replaces the record row associated with an Security ID on the chaincode state table
func (t *repositoryHandler) updateSecurity(stub shim.ChaincodeStubInterface, args []string) (error){

	myLogger.Debugf("update security= %v", args[0])

	//replace the old record row associated with the Security ID with the new record row
	ok, err := stub.ReplaceRow(tableColumn, shim.Row{
		Columns: []*shim.Column{
			&shim.Column{Value: &shim.Column_String_{String_: args[0]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[1]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[2]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[3]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[4]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[5]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[6]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[7]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[8]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[9]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[10]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[11]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[12]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[13]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[14]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[15]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[16]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[17]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[18]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[19]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[20]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[21]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[22]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[23]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[24]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[25]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[26]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[27]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[28]}},
			&shim.Column{Value: &shim.Column_String_{String_: args[29]}}},
		})

	if !ok && err == nil {
		myLogger.Errorf("system error %v", err)
		return errors.New("Failed to replace security !")
	}

	return nil

}


// deleteSecurity deletes the record row associated with an masterSecID on the chaincode state table
func (t *repositoryHandler) deleteSecurity(stub shim.ChaincodeStubInterface, masterSecID string) (error) {

	myLogger.Debugf("Delete MasterSecID = %v", masterSecID)

	//delete record matching account ID passed in
	err := stub.DeleteRow(
		tableColumn,
		[]shim.Column{shim.Column{Value: &shim.Column_String_{String_: masterSecID}}},
	)

	if err != nil {
		myLogger.Errorf("system error %v", err)
		return errors.New("Error in deleting security record")
	}
	return nil

}
*/
// querySecurity returns the record row matching a correponding Security ID on the chaincode state table
func (t *repositoryHandler) querySecurity(stub shim.ChaincodeStubInterface, masterSecID string, refClientID string, licenseKey string) ([]byte, error) {

	var secdata []byte
	myLogger.Debugf("Query security")
	row, err := t.querySecurityTable(stub, masterSecID, refClientID, licenseKey)
	if err != nil {
		return []byte("EMPTY"), err
	}
	if len(row.Columns) == 0 || row.Columns[5] == nil {
		return []byte("EMPTY"), errors.New("row or column value not found")
	}

	myLogger.Debugf("Query security = %v ", row.Columns[5].GetString_())
	//returns security long name
	secdata = []byte(row.Columns[5].GetString_())
	return secdata, nil
	//return row.Columns[5], nil
}
/*
// querySecurity returns the record row matching a correponding Security ID on the chaincode state table
func (t *repositoryHandler) querySecurityType(stub shim.ChaincodeStubInterface, masterSecID string) (string, error) {

	myLogger.Debugf("Query security")
	row, err := t.querySecurityTable(stub, masterSecID)
	if err != nil {
		return "EMPTY", err
	}

	if len(row.Columns) == 0 || row.Columns[2] == nil {
		return "EMPTY", errors.New("row or column value not found")
	}


	myLogger.Debugf("Query security = %v ", row.Columns[2].GetString_())

	//returns security type
	return row.Columns[2].GetString_(), nil
}
*/


func (t *repositoryHandler) querySecurityTable(stub shim.ChaincodeStubInterface, masterSecID string, refClientID string, licenseKey string ) (shim.Row, error) {

	var columns []shim.Column
	columns = append(columns, shim.Column{Value: &shim.Column_String_{String_: masterSecID}})
	columns = append(columns, shim.Column{Value: &shim.Column_String_{String_: refClientID}})
	columns = append(columns, shim.Column{Value: &shim.Column_String_{String_: licenseKey}})
	columns = append(columns, shim.Column{Value: &shim.Column_String_{String_: "A"}})
	myLogger.Debugf("Query security table!")

	return stub.GetRow(tableColumnSecurityHashMapping, columns)
}

