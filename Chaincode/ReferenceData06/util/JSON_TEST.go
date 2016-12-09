package main
import (
	"fmt"
	"os"
	"encoding/json"
	"io/ioutil"
	//"go-simplejson-master/simplejson"
	//"github.com/hyperledger/fabric/examples/chaincode/go/ReferenceData04/gabs-master"
	"reflect"
)


type Security struct {
	SecurityData struct {
			     CommonData []struct {
				     Field string `json:"field",`
				     Value string `json:"value"`
			     } `json:"commonData", omitempty`
			     BBG []struct {
				     Field string `json:"field"`
				     Value string `json:"value"`
			     } `json:"BBG", omitempty`
			     IDC []struct {
				     Field string `json:"field"`
				     Value string `json:"value"`
			     } `json:"IDC", omitempty`
			     Reuters []struct {
				     Field string `json:"field"`
				     Value string `json:"value"`
			     } `json:"Reuters", omitempty`
		     } `json:"SecurityData"`
}

type CommonDataStruct struct {
	Field string `json:"field",`
	Value string `json:"value"`
}

func main() {

	/*
	file, e := ioutil.ReadFile("./newjson")
	if e != nil {
	fmt.Printf("File error: %v\n", e)
	os.Exit(1)
	}
	fmt.Printf("%s\n", string(file))

	var newArgs []string
	//m := new(Dispatch)
	//var m interface{}
	var jsontype Security
	//var jsonString []string
	json.Unmarshal([]byte(file), &jsontype)
	fmt.Printf("Results: %v\n", jsontype)
	fmt.Printf("custom Results0: %v\n", jsontype.SecurityData.CommonData)
	fmt.Printf("custom Results1: %v\n", jsontype.SecurityData.CommonData)
	fmt.Printf("custom Results2: %v\n", jsontype.SecurityData.CommonData[0].Value)
	fmt.Printf("custom Results3: %v\n", jsontype.SecurityData.CommonData[1].Value)
	fmt.Printf("custom Results4: %v\n", jsontype.SecurityData.CommonData[2].Value)
	fmt.Printf("custom Results4: %v\n", jsontype.SecurityData.CommonData[3].Value)

	newArgs = append(newArgs, jsontype.SecurityData.CommonData[0].Value)
	newArgs = append(newArgs, jsontype.SecurityData.CommonData[1].Value)
	newArgs = append(newArgs, jsontype.SecurityData.CommonData[2].Value)
	newArgs = append(newArgs, jsontype.SecurityData.CommonData[3].Value)
//	jsontype.SecurityData.CommonData[1].Value, jsontype.SecurityData.CommonData[2].Value)
	fmt.Printf("newargs : %v\n", newArgs)

	fmt.Printf("len : %v\n", len(jsontype.SecurityData.CommonData))
	//var comjson CommonDataStruct
	//comjson = jsontype.SecurityData.CommonData
	json_com, err := json.Marshal(jsontype.SecurityData.CommonData)
	fmt.Printf("COM : %v %v\n", string(json_com), err)
	//{\"SecurityData\": {\"commonData\" : [{\"field\" : \"masterSecID\", \"value\" : \"IBM001\"}, {\"field\" : \"refClientID\", \"value\" : \"JPM01\"}, {\"field\" : \"licenceKey\", \"value\" : \"BBGEQ0101010\"}, {\"field\" : \"refSecType\", \"value\" : \"50\"}, {\"field\" : \"createDateTime\", \"value\" : \"11/17/2016 01:20\"}, {\"field\" : \"chanegDateTime\", \"value\" : \"11/17/2016 01:20\"}, {\"field\" : \"activeFlag\", \"value\" : \"A\"} ], \"BBGData\" : [{\"field\" : \"secIdCodeTypeId\", \"value\" : \"292\"}, {\"field\" : \"secCode\", \"value\" : \"IBMTEST\"}, {\"field\" : \"name\", \"value\" : \"IBM TEST Inc\"} ], \"IDCData\" : [{\"field\" : \"secIdCodeTypeId\", \"value\" : \"2921\"}, {\"field\" : \"secCode\", \"value\" : \"IBMTEST1\"}, {\"field\" : \"name\", \"value\" : \"IBM TEST Inc11\"} ] } }

	commonData = "\"commonData\" : [{\"field\" : \"masterSecID\", \"value\" : \"IBM001\"}, {\"field\" : \"refClientID\", \"value\" : \"JPM01\"}, {\"field\" : \"licenceKey\", \"value\" : \"BBGEQ0101010\"}, " +
		"{\"field\" : \"refSecType\", \"value\" : \"50\"}, {\"field\" : \"createDateTime\", \"value\" : \"11/17/2016 01:20\"}, {\"field\" : \"chanegDateTime\", \"value\" : \"11/17/2016 01:20\"}, {\"field\" : \"activeFlag\", \"value\" : \"A\"} ]"

	BBGData = "\"BBGData\" : [{\"field\" : \"secIdCodeTypeId\", \"value\" : \"292\"}, {\"field\" : \"secCode\", \"value\" : \"IBMTEST\"}, {\"field\" : \"name\", \"value\" : \"IBM TEST Inc\"} ]"
	IDCData = "\"IDCData\" : [{\"field\" : \"secIdCodeTypeId\", \"value\" : \"2921\"}, {\"field\" : \"secCode\", \"value\" : \"IBMTEST1\"}, {\"field\" : \"name\", \"value\" : \"IBM TEST Inc11\"} ] } }"
	*/

	file, e := ioutil.ReadFile("./newfmtjson")
	if e != nil {
		fmt.Printf("File error: %v\n", e)
		os.Exit(1)
	}
	fmt.Printf("%s\n", string(file))

	var arbitrary_json map[string]interface{}
	var SecurityData map[string]interface{}
	var commonData []interface{}

	err := json.Unmarshal([]byte(file), &arbitrary_json)
	if err != nil {
		fmt.Println("Error parsing JSON: ", err)
	}

	fmt.Println(arbitrary_json)
	//fmt.Println(arbitrary_json["commonData"].(string))
	//fmt.Printf("%v", arbitrary_json["SecurityData"].(map[string]interface{})["commonData"])
	//fmt.Printf("%v", arbitrary_json["commonData"].(map[string]interface{})["masterSecID"])

	SecurityData = arbitrary_json["SecurityData"].(map[string]interface{})
	for key, value := range SecurityData {
		fmt.Printf("index:%s  value:%v  kind:%s  type:%s\n", key, value, reflect.TypeOf(value).Kind(), reflect.TypeOf(value))
		switch key{
			case "commonData":
				fmt.Println("commonData ", key, value)
				commonData = SecurityData["commonData"].([]interface{})
				for key1, value1 := range commonData {
					fmt.Printf("Common Data index:%s  value1:%v  kind:%s  type:%s\n", key1, value1, reflect.TypeOf(value1).Kind(), reflect.TypeOf(value1))
					fmt.Printf("masterSecID111: %s \n",value1.(map[string]interface{})["masterSecID"].(string))
					fmt.Printf("refClientID: %s \n",value1.(map[string]interface{})["refClientID"].(string))
				}

				commJson, err := json.Marshal(value)
				fmt.Printf("COM JSON111: %v %v\n", string(commJson), err)
				//testComm := fmt.Sprintf("%v", value)
				//fmt.Printf("commonData STRING: %s \n",testComm)

			case "BBGData":
				fmt.Println("commonData ", key, value)
				commonData = SecurityData["commonData"].([]interface{})
				for key1, value1 := range commonData {
					fmt.Printf("BBGData index:%s  value1:%v  kind:%s  type:%s\n", key1, value1, reflect.TypeOf(value1).Kind(), reflect.TypeOf(value1))
					//fmt.Printf("masterSecID111: %v \n",value1.(map[string]interface{})["masterSecID"])
				}
			case "IDCData":
				fmt.Println("commonData ", key, value)
				commonData = SecurityData["commonData"].([]interface{})
				for key1, value1 := range commonData {
					fmt.Printf("IDCData index:%s  value1:%v  kind:%s  type:%s\n", key1, value1, reflect.TypeOf(value1).Kind(), reflect.TypeOf(value1))
					//fmt.Printf("masterSecID111: %v \n",value1.(map[string]interface{})["masterSecID"])
				}
			case "ReutersData":
				fmt.Println("commonData ", key, value)
				commonData = SecurityData["commonData"].([]interface{})
				for key1, value1 := range commonData {
					fmt.Printf("ReutersData index:%s  value1:%v  kind:%s  type:%s\n", key1, value1, reflect.TypeOf(value1).Kind(), reflect.TypeOf(value1))
					//fmt.Printf("masterSecID111: %v \n",value1.(map[string]interface{})["masterSecID"])
				}

		/*case "masterSecID":
			fmt.Println(":masterSecID ", key, value)
		case "IDCData":
			fmt.Println("IDCData ", key, value)*/
		}
	}

	//the_list := arbitrary_json[v].(map[string]interface{})

/*
	for key, value := range arbitrary_json {
		switch key:{
			case "commonData":
				fmt.Println("%v", value.(string))
			case "masterSecID":
				fmt.Println("%v", value.(string))
			case "IDCData":
				fmt.Println("%v", value.(string))
			}
	}
*/
	//for key, value := range itemsMap {
//		fmt.Println("%v %v", key, value)
//	}
}
