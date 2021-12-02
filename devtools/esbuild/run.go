package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/evanw/esbuild/pkg/api"
	"github.com/r3labs/sse/v2"
)

//go:embed refresh.js
var refresh string

func main() {
	buildOpts := api.BuildOptions{
		EntryPoints: []string{"web/src/app/index.tsx"},
		EntryNames:  "/static/[name]",
		Bundle:      true,
		Outfile:     "web/src/build/app.js",
		Plugins:     []api.Plugin{},
		Write:       true,
		Loader: map[string]api.Loader{
			".js":   api.LoaderJSX,
			".md":   api.LoaderText,
			".png":  api.LoaderDataURL,
			".svg":  api.LoaderDataURL,
			".ico":  api.LoaderDataURL,
			".webp": api.LoaderDataURL,
		},
		AssetNames: "static/[hash]",
		Define: map[string]string{
			"global": "window",
		},
		Banner: map[string]string{
			"js": `document.head.insertAdjacentHTML("beforeend", "<link rel=\"stylesheet\" href=\"/static/app.css\" />");` + refresh + ";",
		},
	}

	eventSrv := sse.New()
	eventSrv.AutoReplay = false
	eventSrv.CreateStream("build")

	buildOpts.Watch = &api.WatchMode{
		OnRebuild: func(result api.BuildResult) {
			if len(result.Errors) > 0 {

				fmt.Printf("UI build failed: %d errors\n", len(result.Errors))
				for _, err := range result.Errors {
					fmt.Println("Error (UI): " + err.Text)
					var errEvent struct {
						Type    string `json:"type"`
						Message string `json:"message"`
					}
					errEvent.Type = "error"
					errEvent.Message = err.Text
					data, err := json.Marshal(errEvent)
					if err != nil {
						panic(err)
					}
					eventSrv.Publish("build", &sse.Event{
						Data: data,
					})
				}
				for i := 0; i < len(result.Errors); i++ {
				}
			} else {
				fmt.Printf("UI build succeeded: %d warnings\n", len(result.Warnings))
				var refreshEvent struct {
					Type string `json:"type"`
				}
				refreshEvent.Type = "refresh"
				data, err := json.Marshal(refreshEvent)
				if err != nil {
					panic(err)
				}
				eventSrv.Publish("build", &sse.Event{
					Data: data,
				})
			}
		},
	}

	result := api.Build(buildOpts)
	fmt.Println("build", result.Errors)

	mux := http.NewServeMux()
	mux.Handle("/static/_esbuild/refresh", eventSrv)
	mux.Handle("/", http.FileServer(http.Dir("web/src/build")))

	http.ListenAndServe(":3035", mux)

	result.Stop()

}
