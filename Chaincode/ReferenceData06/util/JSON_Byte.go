package main
import (
	"fmt"
	"os"
	"encoding/json"
	"io/ioutil"
)


func main() {

	var buf []byte
	first := [{"convPrice":"","convRatio":"","convStartDate":"","issueFirstCouponDate":"2921","issueFirstSettleDate":"IBMTEST1","refDayCountID":"30360","refFirstCpnTypeID":"IBM TEST Inc11"}]
	buf, err = json.Marshal(first)
	fmt.Printf("buf : %v\n", buf)





}