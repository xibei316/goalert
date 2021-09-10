package main

import (
	"bufio"
	"fmt"
	"os"
	"regexp"
	"strings"
)

func main() {

	var pairs []string

	check := func(err error) {
		if err != nil {
			panic(err)
		}
	}

	f, err := os.Open("backward")
	check(err)

	scanner := bufio.NewScanner(f)
	scanner.Split(bufio.ScanLines)

	for scanner.Scan() {
		if strings.HasPrefix(scanner.Text(), "Link") {
			r := regexp.MustCompile("\\S+")
			res := r.FindAll([]byte(scanner.Text()), -1)

			old := string(res[2])
			new := string(res[1])

			pairs = append(pairs, "\n('"+old+"', '"+new+"')")
		}
	}

	values := strings.Join(pairs, ",")

	sql := "UPDATE schedules AS s SET time_zone = s2.new FROM (VALUES " + values + "\n) AS s2(old, new) WHERE s.time_zone = s2.old;"

	fmt.Print(sql)
}
