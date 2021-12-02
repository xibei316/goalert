package main

import (
	"fmt"
	"time"

	"github.com/evanw/esbuild/pkg/api"
)

func main() {

	// toggle build/serve functionality here
	serve := true

	buildOpts := api.BuildOptions{
		EntryPoints: []string{"web/src/app/index.tsx"},
		EntryNames:  "/static/[name]",
		Bundle:      true,
		Outfile:     "app.js",
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
			"js": `document.head.insertAdjacentHTML("beforeend", "<link rel=\"stylesheet\" href=\"/static/app.css\" />");`,
		},
	}

	if !serve {
		buildOpts.Watch = &api.WatchMode{
			OnRebuild: func(result api.BuildResult) {
				if len(result.Errors) > 0 {
					fmt.Printf("UI build failed: %d errors\n", len(result.Errors))
					for i := 0; i < len(result.Errors); i++ {
						fmt.Println("Error (UI): " + result.Errors[i].Text)
					}
				} else {
					fmt.Printf("UI build succeeded: %d warnings\n", len(result.Warnings))
				}
			},
		}
	}

	if serve {
		server, err := api.Serve(api.ServeOptions{
			Port: 3035,
		}, buildOpts)

		if err != nil {
			fmt.Println(err.Error())
		} else {
			fmt.Printf("serving...\n")
			time.Sleep(10 * time.Minute)
			server.Stop()
			fmt.Printf("stopped serving\n")
		}

	} else {
		result := api.Build(buildOpts)
		fmt.Printf("watching...\n")
		time.Sleep(10 * time.Minute)
		result.Stop()
		fmt.Printf("stopped watching\n")
	}
}
